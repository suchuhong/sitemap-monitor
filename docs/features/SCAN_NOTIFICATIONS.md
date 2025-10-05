# 扫描完成通知功能

## 功能概述

系统现在会在每次扫描完成时发送通知，无论扫描成功还是失败。通知包含完整的扫描状态信息。

## 通知类型

### 1. 扫描完成通知 (scan.complete)

每次扫描完成时触发，包含以下信息：

**成功状态**：
- ✅ 扫描成功
- 总 Sitemap 数量
- 总 URL 数量
- 新增/删除/更新的 URL 数量
- 扫描耗时

**失败状态**：
- ❌ 扫描失败
- 错误信息
- 扫描耗时

### 2. 变更通知 (sitemap.change)

当扫描成功且有 URL 变更时触发（保持向后兼容）：
- 新增的 URL 数量
- 删除的 URL 数量
- 更新的 URL 数量

## 通知渠道

### Webhook

接收 JSON 格式的通知数据：

```json
{
  "type": "scan.complete",
  "siteId": "site_xxx",
  "siteSlug": "https://example.com",
  "scanId": "scan_xxx",
  "status": "success",
  "totalSitemaps": 3,
  "totalUrls": 150,
  "added": 5,
  "removed": 2,
  "updated": 3,
  "duration": 12500,
  "ts": 1696723200
}
```

失败示例：
```json
{
  "type": "scan.complete",
  "siteId": "site_xxx",
  "siteSlug": "https://example.com",
  "scanId": "scan_xxx",
  "status": "failed",
  "totalSitemaps": 0,
  "totalUrls": 0,
  "added": 0,
  "removed": 0,
  "updated": 0,
  "error": "Network timeout",
  "duration": 8000,
  "ts": 1696723200
}
```

### Email

接收格式化的 HTML 邮件：

**成功邮件**：
- 主题：`[Sitemap Monitor] ✅ 扫描成功 - example.com`
- 包含完整的统计信息和变更详情

**失败邮件**：
- 主题：`[Sitemap Monitor] ❌ 扫描失败 - example.com`
- 包含错误信息和诊断数据

### Slack

接收格式化的 Slack 消息：

**成功消息**：
```
✅ 扫描成功
站点: example.com

总 Sitemap 数: 3
总 URL 数: 150
新增: 5
删除: 2
更新: 3

扫描 ID: scan_xxx · 耗时: 12.50s · 时间: 2024-10-05 10:00:00
```

**失败消息**：
```
❌ 扫描失败
站点: example.com

错误信息: Network timeout

扫描 ID: scan_xxx · 耗时: 8.00s · 时间: 2024-10-05 10:00:00
```

## 配置通知渠道

### 通过 API

```bash
# 添加 Webhook 通知
curl -X POST "http://localhost:3000/api/sites/{siteId}/notifications" \
  -H "Cookie: session=your-session" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "webhook",
    "target": "https://your-webhook-url.com/endpoint",
    "secret": "your-webhook-secret"
  }'

# 添加 Email 通知
curl -X POST "http://localhost:3000/api/sites/{siteId}/notifications" \
  -H "Cookie: session=your-session" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "target": "admin@example.com"
  }'

# 添加 Slack 通知
curl -X POST "http://localhost:3000/api/sites/{siteId}/notifications" \
  -H "Cookie: session=your-session" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "slack",
    "target": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "secret": "optional-bearer-token"
  }'
```

### 环境变量配置

```env
# Webhook 配置
WEBHOOK_SECRET=your-default-webhook-secret
WEBHOOK_TIMEOUT_MS=8000

# Email 配置（Edge Runtime 中不可用）
EMAIL_FROM=noreply@example.com
EMAIL_SMTP_USER=your-smtp-user
EMAIL_SMTP_PASS=your-smtp-password
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587

# Slack 配置
SLACK_TIMEOUT_MS=8000
```

## Webhook 签名验证

所有 Webhook 请求都包含 `x-sitemap-signature` 头，用于验证请求来源：

```javascript
// Node.js 示例
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// 使用示例
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-sitemap-signature'];
  const body = JSON.stringify(req.body);
  
  if (!verifyWebhook(body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // 处理通知
  console.log('Scan complete:', req.body);
  res.status(200).send('OK');
});
```

## 通知数据字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 通知类型：`scan.complete` 或 `sitemap.change` |
| siteId | string | 站点 ID |
| siteSlug | string | 站点 URL |
| scanId | string | 扫描 ID |
| status | string | 扫描状态：`success` 或 `failed` |
| totalSitemaps | number | 总 Sitemap 数量 |
| totalUrls | number | 总 URL 数量 |
| added | number | 新增的 URL 数量 |
| removed | number | 删除的 URL 数量 |
| updated | number | 更新的 URL 数量 |
| error | string \| null | 错误信息（仅失败时） |
| duration | number | 扫描耗时（毫秒） |
| ts | number | Unix 时间戳（秒） |

## 测试通知

### 测试 Webhook

```bash
curl -X POST "http://localhost:3000/api/sites/{siteId}/test-webhook" \
  -H "Cookie: session=your-session"
```

这会发送一个测试通知到配置的所有通知渠道。

### 手动触发扫描

```bash
curl -X POST "http://localhost:3000/api/sites/{siteId}/scan" \
  -H "Cookie: session=your-session"
```

扫描完成后会自动发送通知。

## 通知失败处理

- 通知失败不会影响扫描结果
- 失败信息会记录到控制台日志
- Webhook 和 Slack 有 8 秒超时保护
- Email 在 Edge Runtime 中不可用（需要 Node.js Runtime）

## 最佳实践

1. **使用 Webhook 签名验证**：始终验证 `x-sitemap-signature` 头
2. **设置超时**：Webhook 端点应在 5 秒内响应
3. **异步处理**：收到通知后立即返回 200，异步处理业务逻辑
4. **错误重试**：实现重试机制处理临时失败
5. **监控通知**：记录通知接收情况，及时发现问题

## 示例：处理扫描完成通知

```javascript
// Express.js 示例
app.post('/webhook/sitemap-monitor', async (req, res) => {
  // 1. 验证签名
  const signature = req.headers['x-sitemap-signature'];
  if (!verifySignature(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  // 2. 立即响应（避免超时）
  res.status(200).send('OK');
  
  // 3. 异步处理通知
  const notification = req.body;
  
  if (notification.type === 'scan.complete') {
    if (notification.status === 'success') {
      console.log(`✅ 扫描成功: ${notification.siteSlug}`);
      console.log(`   新增: ${notification.added}, 删除: ${notification.removed}`);
      
      // 处理成功逻辑
      if (notification.added > 0) {
        await notifyTeam(`发现 ${notification.added} 个新页面`);
      }
    } else {
      console.error(`❌ 扫描失败: ${notification.siteSlug}`);
      console.error(`   错误: ${notification.error}`);
      
      // 处理失败逻辑
      await alertOps(`扫描失败: ${notification.error}`);
    }
  }
});
```

## 故障排查

### 通知未收到

1. 检查通知渠道配置：
```bash
curl "http://localhost:3000/api/sites/{siteId}/notifications" \
  -H "Cookie: session=your-session"
```

2. 查看服务器日志中的通知错误

3. 测试 Webhook 端点是否可访问

### Webhook 签名验证失败

1. 确保使用相同的 secret
2. 验证时使用原始请求体（不要解析后再序列化）
3. 检查签名算法是否为 HMAC-SHA256

### Email 通知不工作

Email 在 Edge Runtime 中不可用，需要：
1. 使用 Webhook 或 Slack 替代
2. 或部署到支持 Node.js Runtime 的环境
