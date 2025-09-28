import crypto from "crypto"
export async function notifyChange(siteId: string, payload: any) {
  const body = JSON.stringify({ type: "sitemap.change", siteId, ...payload, ts: Math.floor(Date.now()/1000) })
  // Real implementation would look up targetUrl/secret from DB and POST
  const secret = process.env.WEBHOOK_SECRET ?? ""
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex")
  console.log("[Webhook] payload:", body, "sig:", sig)
}
