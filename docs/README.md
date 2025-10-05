# Sitemap Monitor 优化文档

## 📚 文档索引

### [队列系统优化](./QUEUE_OPTIMIZATION.md)
解决本地开发环境中队列任务不执行或卡住的问题。

**主要改进**：
- ✅ 基于数据库的可靠队列系统
- ✅ 非阻塞的异步任务处理
- ✅ 自动清理超时任务
- ✅ 防止重复扫描

### [Cron Scan 优化](./CRON_SCAN_OPTIMIZATION.md)
解决 `/api/cron/scan` 端点阻塞和超时问题。

**核心改进**：
- ✅ 从串行执行改为异步并发
- ✅ API 响应时间从 20+ 秒降至 < 1 秒
- ✅ 支持更多站点同时扫描
- ✅ 不再有超时风险

### [扫描完成通知](./SCAN_NOTIFICATIONS.md)
为所有扫描任务（成功/失败）添加完整的后端通知功能。

**支持的通知渠道**：
- 🔗 Webhook（推荐）
- 📧 Email
- 💬 Slack

**通知内容**：
- 扫描状态（成功/失败）
- 统计信息（Sitemap 数、URL 数、变更数）
- 错误信息（失败时）
- 扫描耗时

### [前端页面通知](./FRONTEND_NOTIFICATIONS.md)
在站点详情页面实时显示扫描完成通知。

**功能特性**：
- 🔔 自动监控扫描状态
- ⚡ 实时弹窗通知
- 🔄 自动刷新页面数据
- 📊 显示详细的扫描结果

## 🚀 快速开始

### 1. 配置环境变量

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Cron 保护
CRON_TOKEN=your-secret-token

# Webhook 配置
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_TIMEOUT_MS=8000

# Slack 配置
SLACK_TIMEOUT_MS=8000
```

### 2. 配置通知渠道

```bash
# 添加 Webhook 通知
curl -X POST "http://localhost:3000/api/sites/{siteId}/notifications" \
  -H "Cookie: session=your-session" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "webhook",
    "target": "http://localhost:4000/webhook",
    "secret": "your-webhook-secret"
  }'
```

### 3. 测试 Webhook 接收器

```bash
# 安装依赖
npm install express

# 运行示例接收器
node examples/webhook-receiver.js

# 在另一个终端触发扫描
curl -X POST "http://localhost:3000/api/sites/{siteId}/scan" \
  -H "Cookie: session=your-session"
```

## 🔧 API 端点

### 扫描管理

```bash
# 触发扫描（异步）
POST /api/sites/{siteId}/scan

# 处理队列中的任务（快速返回）
POST /api/cron/process-queue?max=3

# 清理超时任务
POST /api/cron/cleanup

# 定时扫描
POST /api/cron/scan?max=3
```

### 通知管理

```bash
# 获取通知渠道列表
GET /api/sites/{siteId}/notifications

# 添加通知渠道
POST /api/sites/{siteId}/notifications

# 删除通知渠道
DELETE /api/sites/{siteId}/notifications/{notificationId}

# 测试 Webhook
POST /api/sites/{siteId}/test-webhook
```

## 📊 监控和调试

### 查看队列状态

```sql
-- 查看排队中的任务
SELECT * FROM sitemap_monitor_scans WHERE status = 'queued';

-- 查看运行中的任务
SELECT * FROM sitemap_monitor_scans WHERE status = 'running';

-- 查看最近的扫描结果
SELECT id, site_id, status, started_at, finished_at, error
FROM sitemap_monitor_scans
ORDER BY started_at DESC
LIMIT 10;
```

### 手动清理卡住的任务

```sql
-- 将超过 15 分钟的运行中任务标记为失败
UPDATE sitemap_monitor_scans 
SET status = 'failed', 
    finished_at = NOW(),
    error = 'Manual cleanup - task stuck'
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '15 minutes';
```

## 🎯 最佳实践

### 队列管理

1. **避免重复扫描**：系统会自动检查是否已有活跃扫描
2. **定期清理**：设置 cron 任务定期清理超时任务
3. **监控队列**：关注 `queued` 和 `running` 状态的任务数量
4. **调整并发**：根据服务器负载调整 `maxConcurrent` 参数

### 通知配置

1. **使用 Webhook**：最可靠的通知方式，支持所有运行时
2. **验证签名**：始终验证 `x-sitemap-signature` 头
3. **快速响应**：Webhook 端点应在 5 秒内响应
4. **异步处理**：收到通知后立即返回 200，异步处理业务逻辑
5. **错误重试**：实现重试机制处理临时失败

### 生产环境

1. **设置 Cron Jobs**：
```json
{
  "crons": [
    {
      "path": "/api/cron/scan?max=3",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/process-queue?max=5",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 * * * *"
    }
  ]
}
```

2. **配置环境变量**：确保所有必需的环境变量都已设置
3. **监控日志**：关注扫描失败和通知失败的日志
4. **设置告警**：当扫描失败率过高时发送告警

## 🐛 故障排查

### 队列任务不执行

1. 检查数据库连接：`DATABASE_URL` 是否正确
2. 查看任务状态：是否卡在 `queued` 或 `running`
3. 手动触发处理：调用 `/api/cron/process-queue`
4. 清理超时任务：调用 `/api/cron/cleanup`

### 通知未收到

1. 检查通知渠道配置：`GET /api/sites/{siteId}/notifications`
2. 查看服务器日志：是否有通知发送错误
3. 测试 Webhook：调用 `/api/sites/{siteId}/test-webhook`
4. 验证端点可访问性：确保 Webhook URL 可以从服务器访问

### 扫描一直失败

1. 检查站点可访问性：手动访问 Sitemap URL
2. 查看错误信息：从数据库或通知中获取详细错误
3. 验证 Sitemap 格式：确保 XML 格式正确
4. 检查超时设置：可能需要增加超时时间

## 📝 更新日志

### v2.0 - 2024-10-05

**队列系统优化**：
- 移除内存队列，改用数据库队列
- 添加非阻塞的异步任务处理
- 实现自动清理超时任务
- 防止重复扫描

**Cron Scan 性能优化**：
- 从串行执行改为异步并发
- API 响应时间从 20+ 秒降至 < 1 秒
- 支持更多站点同时扫描
- 彻底解决超时问题

**通知功能增强**：
- 添加扫描完成通知（包含所有状态）
- 支持 Webhook、Email、Slack 三种渠道
- 提供详细的统计信息和错误信息
- 包含扫描耗时信息

**前端体验优化**：
- 添加扫描状态实时监控
- 扫描完成时自动弹窗通知
- 显示详细的扫描结果和耗时
- 自动刷新页面数据

**API 改进**：
- 新增 `/api/cron/process-queue` 端点
- 优化 `/api/cron/scan` 响应速度（20x 提升）
- 优化 `/api/sites/{siteId}/scan` 响应速度
- 改进错误处理和状态管理

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT
