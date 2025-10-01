import crypto from "crypto";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { db } from "@/lib/db";
import { notificationChannels, webhooks } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export type ChangePayload = {
  scanId: string;
  added: number;
  removed: number;
  updated?: number;
  type?: string;
  [key: string]: unknown;
};

type NotificationEnvelope = {
  type: string;
  siteId: string;
  scanId?: string;
  added?: number;
  removed?: number;
  updated?: number;
  ts: number;
  [key: string]: unknown;
};

export async function notifyChange(siteId: string, payload: ChangePayload) {
  const envelope: NotificationEnvelope = {
    type: "sitemap.change",
    siteId,
    ...payload,
    ts: Math.floor(Date.now() / 1000),
  };

  const channels = await loadChannels(siteId);
  if (channels.length === 0) {
    // fallback to console to aid debugging
    console.log("[Notify]", envelope);
    return;
  }

  for (const channel of channels) {
    if (channel.type === "webhook") {
      await dispatchWebhook(channel, envelope);
    } else if (channel.type === "email") {
      await dispatchEmail(channel, envelope);
    } else if (channel.type === "slack") {
      await dispatchSlack(channel, envelope);
    }
  }
}

type ChannelRecord = {
  id: string;
  type: "webhook" | "email" | "slack";
  target: string;
  secret?: string | null;
};

async function loadChannels(siteId: string): Promise<ChannelRecord[]> {
  const custom = await db
    .select({
      id: notificationChannels.id,
      type: notificationChannels.type,
      target: notificationChannels.target,
      secret: notificationChannels.secret,
    })
    .from(notificationChannels)
    .where(eq(notificationChannels.siteId, siteId));

  const legacyWebhooks = await db
    .select({
      id: webhooks.id,
      targetUrl: webhooks.targetUrl,
      secret: webhooks.secret,
    })
    .from(webhooks)
    .where(eq(webhooks.siteId, siteId));

  return [
    ...custom.map((row) => ({
      id: row.id,
      type: row.type as ChannelRecord["type"],
      target: row.target,
      secret: row.secret,
    })),
    ...legacyWebhooks.map((row) => ({
      id: row.id,
      type: "webhook" as const,
      target: row.targetUrl,
      secret: row.secret,
    })),
  ];
}

async function dispatchWebhook(channel: ChannelRecord, envelope: Record<string, unknown>) {
  const body = JSON.stringify(envelope);
  const secret = channel.secret ?? process.env.WEBHOOK_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const timeoutMs = normalizeTimeout(process.env.WEBHOOK_TIMEOUT_MS, 8000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(channel.target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "SitemapMonitor/1.0",
        "x-sitemap-signature": sig,
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await safeReadBody(res);
      console.error(
        `[Webhook] delivery failed ${channel.target} (${res.status})`,
        text ? { response: text } : undefined,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[Webhook] delivery timeout ${channel.target} (${timeoutMs}ms)`);
    } else {
      console.error(`[Webhook] delivery error ${channel.target}`, error);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeTimeout(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

async function safeReadBody(res: Response) {
  try {
    const text = await res.text();
    return text?.slice(0, 500);
  } catch {
    return undefined;
  }
}

let cachedTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null | undefined;

async function dispatchEmail(channel: ChannelRecord, envelope: NotificationEnvelope) {
  const transporter = await getEmailTransporter();
  if (!transporter) {
    console.warn("[Email] transporter unavailable, skip", { target: channel.target });
    return;
  }

  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_SMTP_USER;
  if (!from) {
    console.warn("[Email] EMAIL_FROM or EMAIL_SMTP_USER not configured, skip");
    return;
  }

  const summary = formatChangeSummary(envelope);
  const subject = `[Sitemap Monitor] 站点 ${envelope.siteId} 有新的 sitemap 变更`;
  const html = buildEmailHtml(envelope, summary);
  const text = buildEmailText(envelope, summary);

  try {
    await transporter.sendMail({
      from,
      to: channel.target,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(`[Email] delivery error ${channel.target}`, error);
  }
}

async function getEmailTransporter() {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const host = process.env.EMAIL_SMTP_HOST;
  const portRaw = process.env.EMAIL_SMTP_PORT ?? "587";
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;

  if (!host) {
    console.warn("[Email] EMAIL_SMTP_HOST missing, disable email notifications");
    cachedTransporter = null;
    return cachedTransporter;
  }

  const port = Number(portRaw);
  const secure = process.env.EMAIL_SMTP_SECURE === "true" || port === 465;

  const auth = user
    ? {
        user,
        pass: pass ?? undefined,
      }
    : undefined;

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    auth,
  });

  try {
    await cachedTransporter.verify();
  } catch (error) {
    console.error("[Email] transporter verify failed", error);
    cachedTransporter = null;
  }

  return cachedTransporter;
}

async function dispatchSlack(channel: ChannelRecord, envelope: NotificationEnvelope) {
  const timeoutMs = normalizeTimeout(process.env.SLACK_TIMEOUT_MS, 8000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(channel.target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "SitemapMonitor/1.0",
        ...(channel.secret ? { authorization: `Bearer ${channel.secret}` } : {}),
      },
      body: JSON.stringify(buildSlackPayload(envelope)),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await safeReadBody(res);
      console.error(
        `[Slack] delivery failed ${channel.target} (${res.status})`,
        text ? { response: text } : undefined,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[Slack] delivery timeout ${channel.target} (${timeoutMs}ms)`);
    } else {
      console.error(`[Slack] delivery error ${channel.target}`, error);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatChangeSummary(envelope: NotificationEnvelope) {
  const added = Number(envelope.added ?? 0);
  const removed = Number(envelope.removed ?? 0);
  const updated = Number(envelope.updated ?? 0);
  const parts = [
    `新增 ${added}`,
    `删除 ${removed}`,
    `更新 ${updated}`,
  ];
  return parts.join(" / ");
}

function buildEmailText(envelope: NotificationEnvelope, summary: string) {
  return [
    `站点 ${envelope.siteId} 触发 sitemap 变更通知。`,
    `扫描 ID: ${envelope.scanId ?? "未知"}`,
    `变更统计: ${summary}`,
    `时间: ${new Date(envelope.ts * 1000).toISOString()}`,
    "",
    "感谢使用 Sitemap Monitor。",
  ].join("\n");
}

function buildEmailHtml(envelope: NotificationEnvelope, summary: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a;">
      <h2 style="margin-bottom: 12px;">站点 ${escapeHtml(envelope.siteId)} 发生 sitemap 变更</h2>
      <p style="margin: 4px 0;">扫描 ID：<strong>${escapeHtml(envelope.scanId ?? "未知")}</strong></p>
      <p style="margin: 4px 0;">变更统计：<strong>${escapeHtml(summary)}</strong></p>
      <p style="margin: 4px 0;">时间：${new Date(envelope.ts * 1000).toLocaleString()}</p>
      <hr style="margin:16px 0;border:0;border-top:1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #64748b;">此邮件由 Sitemap Monitor 自动发送。</p>
    </div>
  `;
}

function buildSlackPayload(envelope: NotificationEnvelope) {
  const summary = formatChangeSummary(envelope);
  const text = `站点 *${envelope.siteId}* 有新的 sitemap 变更：${summary}`;
  return {
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `扫描 ID: ${envelope.scanId ?? "未知"} · 时间: ${new Date(
              envelope.ts * 1000,
            ).toLocaleString()}`,
          },
        ],
      },
    ],
  };
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
