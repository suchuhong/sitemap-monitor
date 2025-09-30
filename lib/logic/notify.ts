import crypto from "crypto";
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

export async function notifyChange(siteId: string, payload: ChangePayload) {
  const envelope = {
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
      console.log(`📧 [Email] ${channel.target}`, envelope);
    } else if (channel.type === "slack") {
      console.log(`💬 [Slack] ${channel.target}`, envelope);
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
  console.log(`[Webhook] POST ${channel.target}`, { body, sig });
  // real implementation: await fetch(channel.target, { method: "POST", headers: {...}, body })
}
