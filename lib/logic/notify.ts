import crypto from "crypto";

export type ChangePayload = {
  scanId: string;
  added: number;
  removed: number;
  updated?: number;
  type?: string;
  [key: string]: unknown;
};

export async function notifyChange(siteId: string, payload: ChangePayload) {
  const body = JSON.stringify({
    type: "sitemap.change",
    siteId,
    ...payload,
    ts: Math.floor(Date.now() / 1000),
  });
  // Real implementation would look up targetUrl/secret from DB and POST
  const secret = process.env.WEBHOOK_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  console.log("[Webhook] payload:", body, "sig:", sig);
}
