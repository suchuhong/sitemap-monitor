// Edge-compatible HMAC function using Web Crypto API
async function createHmacSignature(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Email functionality disabled in edge runtime - nodemailer requires Node.js modules
// To enable email notifications, deploy email-specific API routes with Node.js runtime
const EMAIL_DISABLED_IN_EDGE_RUNTIME = true;
import { resolveDb } from "@/lib/db";
import { notificationChannels, webhooks, sites } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export type ChangePayload = {
  scanId: string;
  added: number;
  removed: number;
  updated?: number;
  type?: string;
  [key: string]: unknown;
};

export type ScanCompletePayload = {
  scanId: string;
  status: "success" | "failed";
  totalSitemaps?: number;
  totalUrls?: number;
  added: number;
  removed: number;
  updated: number;
  error?: string | null;
  duration?: number; // 扫描耗时（毫秒）
};

type NotificationEnvelope = {
  type: string;
  siteId: string;
  siteSlug?: string;
  scanId?: string;
  status?: string;
  added?: number;
  removed?: number;
  updated?: number;
  totalSitemaps?: number;
  totalUrls?: number;
  error?: string | null;
  duration?: number;
  ts: number;
  [key: string]: unknown;
};

export async function notifyChange(siteId: string, payload: ChangePayload) {
  const db = resolveDb() as any;
  const siteInfo = await db
    .select({ id: sites.id, rootUrl: sites.rootUrl })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  const siteSummary = siteInfo[0];
  const siteSlug = siteSummary?.rootUrl ?? siteId;

  const envelope: NotificationEnvelope = {
    type: "sitemap.change",
    siteId,
    siteSlug,
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

/**
 * 发送扫描完成通知（包含所有状态：成功、失败等）
 */
export async function notifyScanComplete(siteId: string, payload: ScanCompletePayload) {
  const db = resolveDb() as any;
  const siteInfo = await db
    .select({ id: sites.id, rootUrl: sites.rootUrl })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  const siteSummary = siteInfo[0];
  const siteSlug = siteSummary?.rootUrl ?? siteId;

  const envelope: NotificationEnvelope = {
    type: "scan.complete",
    siteId,
    siteSlug,
    ...payload,
    ts: Math.floor(Date.now() / 1000),
  };

  const channels = await loadChannels(siteId);
  if (channels.length === 0) {
    // fallback to console to aid debugging
    console.log("[Notify] Scan Complete", envelope);
    return;
  }

  for (const channel of channels) {
    if (channel.type === "webhook") {
      await dispatchWebhook(channel, envelope);
    } else if (channel.type === "email") {
      await dispatchEmailScanComplete(channel, envelope);
    } else if (channel.type === "slack") {
      await dispatchSlackScanComplete(channel, envelope);
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
  const db = resolveDb() as any;
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
    ...custom.map((row: any) => ({
      id: row.id,
      type: row.type as ChannelRecord["type"],
      target: row.target,
      secret: row.secret,
    })),
    ...legacyWebhooks.map((row: any) => ({
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
  const sig = await createHmacSignature(secret, body);
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

let cachedTransporter: unknown | null | undefined;

async function dispatchEmail(channel: ChannelRecord, envelope: NotificationEnvelope) {
  const transporter = await getEmailTransporter() as any;
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
  const subject = `[Sitemap Monitor] 站点 ${envelope.siteSlug ?? envelope.siteId} 有新的 sitemap 变更`;
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

  // Email notifications disabled in edge runtime
  if (EMAIL_DISABLED_IN_EDGE_RUNTIME) {
    console.warn("[Email] email notifications disabled in edge runtime, use webhook/slack instead");
    cachedTransporter = null;
    return cachedTransporter;
  }

  // This code path should never be reached when EMAIL_DISABLED_IN_EDGE_RUNTIME is true
  console.error("[Email] unexpected code path - email should be disabled in edge runtime");
  cachedTransporter = null;
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
  const slug = envelope.siteSlug ?? envelope.siteId;
  return [
    `站点 ${slug} 触发 sitemap 变更通知。`,
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
  const text = `站点 *${envelope.siteSlug ?? envelope.siteId}* 有新的 sitemap 变更：${summary}`;
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

async function dispatchEmailScanComplete(channel: ChannelRecord, envelope: NotificationEnvelope) {
  const transporter = await getEmailTransporter() as any;
  if (!transporter) {
    console.warn("[Email] transporter unavailable, skip", { target: channel.target });
    return;
  }

  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_SMTP_USER;
  if (!from) {
    console.warn("[Email] EMAIL_FROM or EMAIL_SMTP_USER not configured, skip");
    return;
  }

  const statusEmoji = envelope.status === "success" ? "✅" : "❌";
  const statusText = envelope.status === "success" ? "成功" : "失败";
  const subject = `[Sitemap Monitor] ${statusEmoji} 扫描${statusText} - ${envelope.siteSlug ?? envelope.siteId}`;
  const html = buildScanCompleteEmailHtml(envelope);
  const text = buildScanCompleteEmailText(envelope);

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

async function dispatchSlackScanComplete(channel: ChannelRecord, envelope: NotificationEnvelope) {
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
      body: JSON.stringify(buildSlackScanCompletePayload(envelope)),
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

function buildScanCompleteEmailText(envelope: NotificationEnvelope) {
  const slug = envelope.siteSlug ?? envelope.siteId;
  const statusText = envelope.status === "success" ? "成功" : "失败";
  const lines = [
    `站点 ${slug} 扫描${statusText}`,
    `扫描 ID: ${envelope.scanId ?? "未知"}`,
    `状态: ${statusText}`,
  ];

  if (envelope.status === "success") {
    lines.push(`总 Sitemap 数: ${envelope.totalSitemaps ?? 0}`);
    lines.push(`总 URL 数: ${envelope.totalUrls ?? 0}`);
    lines.push(`新增: ${envelope.added ?? 0} / 删除: ${envelope.removed ?? 0} / 更新: ${envelope.updated ?? 0}`);
  } else {
    lines.push(`错误信息: ${envelope.error ?? "未知错误"}`);
  }

  if (envelope.duration) {
    lines.push(`耗时: ${(envelope.duration / 1000).toFixed(2)} 秒`);
  }

  lines.push(`时间: ${new Date(envelope.ts * 1000).toISOString()}`);
  lines.push("");
  lines.push("感谢使用 Sitemap Monitor。");

  return lines.join("\n");
}

function buildScanCompleteEmailHtml(envelope: NotificationEnvelope) {
  const statusEmoji = envelope.status === "success" ? "✅" : "❌";
  const statusText = envelope.status === "success" ? "成功" : "失败";
  const statusColor = envelope.status === "success" ? "#10b981" : "#ef4444";

  let detailsHtml = "";
  if (envelope.status === "success") {
    detailsHtml = `
      <p style="margin: 4px 0;">总 Sitemap 数：<strong>${envelope.totalSitemaps ?? 0}</strong></p>
      <p style="margin: 4px 0;">总 URL 数：<strong>${envelope.totalUrls ?? 0}</strong></p>
      <p style="margin: 4px 0;">
        变更统计：
        <span style="color: #10b981;">新增 ${envelope.added ?? 0}</span> / 
        <span style="color: #ef4444;">删除 ${envelope.removed ?? 0}</span> / 
        <span style="color: #3b82f6;">更新 ${envelope.updated ?? 0}</span>
      </p>
    `;
  } else {
    detailsHtml = `
      <p style="margin: 4px 0; color: #ef4444;">
        错误信息：<strong>${escapeHtml(envelope.error ?? "未知错误")}</strong>
      </p>
    `;
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a;">
      <h2 style="margin-bottom: 12px; color: ${statusColor};">
        ${statusEmoji} 站点扫描${statusText}
      </h2>
      <p style="margin: 4px 0;">站点：<strong>${escapeHtml(envelope.siteSlug ?? envelope.siteId)}</strong></p>
      <p style="margin: 4px 0;">扫描 ID：<strong>${escapeHtml(envelope.scanId ?? "未知")}</strong></p>
      <p style="margin: 4px 0;">状态：<strong style="color: ${statusColor};">${statusText}</strong></p>
      ${detailsHtml}
      ${envelope.duration ? `<p style="margin: 4px 0;">耗时：<strong>${(envelope.duration / 1000).toFixed(2)} 秒</strong></p>` : ""}
      <p style="margin: 4px 0;">时间：${new Date(envelope.ts * 1000).toLocaleString()}</p>
      <hr style="margin:16px 0;border:0;border-top:1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #64748b;">此邮件由 Sitemap Monitor 自动发送。</p>
    </div>
  `;
}

function buildSlackScanCompletePayload(envelope: NotificationEnvelope) {
  const statusEmoji = envelope.status === "success" ? "✅" : "❌";
  const statusText = envelope.status === "success" ? "成功" : "失败";
  const text = `${statusEmoji} 站点 *${envelope.siteSlug ?? envelope.siteId}* 扫描${statusText}`;

  const fields = [];
  
  if (envelope.status === "success") {
    fields.push(
      {
        type: "mrkdwn",
        text: `*总 Sitemap 数:*\n${envelope.totalSitemaps ?? 0}`,
      },
      {
        type: "mrkdwn",
        text: `*总 URL 数:*\n${envelope.totalUrls ?? 0}`,
      },
      {
        type: "mrkdwn",
        text: `*新增:*\n${envelope.added ?? 0}`,
      },
      {
        type: "mrkdwn",
        text: `*删除:*\n${envelope.removed ?? 0}`,
      },
      {
        type: "mrkdwn",
        text: `*更新:*\n${envelope.updated ?? 0}`,
      }
    );
  } else {
    fields.push({
      type: "mrkdwn",
      text: `*错误信息:*\n${envelope.error ?? "未知错误"}`,
    });
  }

  const contextText = [
    `扫描 ID: ${envelope.scanId ?? "未知"}`,
    envelope.duration ? `耗时: ${(envelope.duration / 1000).toFixed(2)}s` : null,
    `时间: ${new Date(envelope.ts * 1000).toLocaleString()}`,
  ].filter(Boolean).join(" · ");

  return {
    text,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${statusEmoji} 扫描${statusText}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `站点: *${envelope.siteSlug ?? envelope.siteId}*`,
        },
      },
      {
        type: "section",
        fields,
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: contextText,
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
