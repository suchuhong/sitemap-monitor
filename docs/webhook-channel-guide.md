# 通知渠道配置与调试指南

本文介绍如何在企业版模板中配置三类通知渠道：Webhook、Email、Slack，并给出调试要点。

## 1. 环境变量准备

在 `.env` 中增加以下可选配置：

```env
# 默认的 webhook 签名密钥（可被单个渠道覆盖）
WEBHOOK_SECRET=your-shared-secret

# 请求超时时间（毫秒，可选，默认 8000）
WEBHOOK_TIMEOUT_MS=8000

# 邮件发送配置（必需）
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASS=secret
EMAIL_SMTP_SECURE=false
EMAIL_FROM="Sitemap Monitor <noreply@example.com>"

# Slack 请求超时（可选，默认 8000ms）
SLACK_TIMEOUT_MS=8000
```

若某个站点渠道需要专属密钥，可在创建渠道时通过 `secret` 字段传入；未提供时回退到 `WEBHOOK_SECRET`。

## 2. 创建渠道

接口：`POST /api/sites/:siteId/notifications`

```bash
curl -X POST \
  -H "Cookie: session=<session-id>" \
  -H "Content-Type: application/json" \
  https://<host>/api/sites/<site-id>/notifications \
  -d '{
        "type": "webhook",
        "target": "https://example.com/webhook-endpoint",
        "secret": "optional-per-channel-secret"
      }'
```

创建成功返回：`{ "ok": true, "id": "<channel-id>" }`。

如需查看或删除渠道，可使用：

- `GET /api/sites/:siteId/notifications`
- `DELETE /api/sites/:siteId/notifications/:notificationId`

将 `type` 改为 `email` 或 `slack` 即可创建对应渠道：

- **Email**：`target` 为收件人地址。
- **Slack**：`target` 通常为 Slack Incoming Webhook URL；若希望使用 Bearer Token 认证，可在 `secret` 字段提供 token，系统会自动加入 `Authorization: Bearer <secret>` 头。

## 3. 事件负载

每次 sitemap 扫描产生变更（新增 / 删除 / 更新）且无错误时，会对目标 URL 发送 `POST` 请求，负载示例：

```json
{
  "type": "sitemap.change",
  "siteId": "9d7f...",
  "scanId": "2f35...",
  "added": 3,
  "removed": 1,
  "updated": 0,
  "ts": 1716204123
}
```

### Webhook 额外签名

HTTP 头部：

- `Content-Type: application/json`
- `User-Agent: SitemapMonitor/1.0`
- `X-Sitemap-Signature: <hex>` — 使用渠道密钥对原始请求体做 `HMAC-SHA256`

验证示例（Node.js）：

```ts
import crypto from "crypto";

function verifySignature(rawBody: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

建议在接收端启用原始请求体（raw body）读取，并在校验失败时返回 401。

## 4. Email 渠道调试

1. **环境变量**：确认邮件配置均已设置，`EMAIL_FROM` 支持显示名称，例如 `"Sitemap Monitor <noreply@example.com>"`。
2. **SMTP 验证**：服务启动时会尝试 `transporter.verify()`，若日志出现 `[Email] transporter verify failed`，请检查凭证与网络连通。
3. **白名单**：部分供应商（如 SendGrid API Key）需要在控制台允许发件地址。
4. **调试工具**：本地可使用 [MailHog](https://github.com/mailhog/MailHog) 或 [Ethereal Email](https://ethereal.email/) 捕获测试邮件。

## 5. Slack 渠道调试

1. **Webhook URL**：推荐使用 Slack 的 Incoming Webhook；若采用自建 API，可在 `secret` 中放置 Bearer Token。
2. **消息格式**：系统会发送包含 `text` 与 `blocks` 的 JSON，可在 Slack 中直接显示摘要与时间。
3. **排错**：失败时会输出 `[Slack] delivery failed ...` 日志，并附带响应正文；超时会记录 `[Slack] delivery timeout ...`。
4. **测试建议**：在 Slack 中创建单独频道用于验收通知，确认消息格式后再推广到生产频道。

## 6. Webhook 渠道调试

1. **观察日志**：应用会记录请求结果，例如：
   - 成功：静默或无日志
   - 失败：`[Webhook] delivery failed https://... (500)`
   - 超时：`[Webhook] delivery timeout ...`
2. **重放请求**：使用保存的 body 和签名，通过 `curl` 重放到接收端，确认服务端逻辑。
3. **签名比对**：确保使用同一密钥、同一字节序列（不要对 body 做格式化）。
4. **网络连通**：检查部署环境是否允许访问目标地址（防火墙、代理）。

## 7. 本地测试技巧

- 将 `target` 指向 `https://webhook.site/<uuid>`，即可在浏览器中实时查看请求与签名。
- 使用 `ngrok` 或 `cloudflared` 暴露本地服务，结合日志验证签名。
- 如果需要自定义重试策略，可在接收端返回非 2xx 状态，观察客户端日志。

## 8. 生产建议

- 使用 HTTPS 端点并限制来源 IP，增强安全性。
- 将 webhook 处理逻辑异步化，避免阻塞系统响应。
- 结合重试队列或告警，及时处理通知失败的事件。
- 邮件渠道建议开启 SPF/DKIM 及 DMARC，提升可达率。
- Slack 渠道可为不同站点创建独立 webhook，便于追踪与止损。
