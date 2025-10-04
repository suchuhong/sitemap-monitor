# 快速修复卡住的扫描

## 🚨 问题：扫描一直显示"进行中"

这是因为 Vercel 函数超时了，但数据库状态没有更新。

## ✅ 快速解决方案

### 方法 1: 调用清理 API（最简单）

```bash
# 替换 YOUR_DOMAIN 和 YOUR_CRON_TOKEN
curl -X POST "https://YOUR_DOMAIN.vercel.app/api/cron/cleanup?token=YOUR_CRON_TOKEN"
```

**示例**:
```bash
curl -X POST "https://sitemap-monitor.vercel.app/api/cron/cleanup?token=abc123xyz"
```

**响应**:
```json
{
  "ok": true,
  "cleaned": 3,
  "message": "Cleaned up 3 stuck scans"
}
```

### 方法 2: 使用清理脚本

```bash
pnpm tsx scripts/cleanup-stuck-scans.ts
```

### 方法 3: 等待自动清理

系统会在下次 cron 运行时（每 5 分钟）自动清理超过 15 分钟的卡住扫描。

## 🔧 预防措施

### 1. 确保配置正确

检查 `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scan?max=1",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 2. 检查站点配置

对于容易超时的站点：
- 增加扫描间隔（如 24 小时）
- 降低扫描优先级
- 或临时禁用

### 3. 监控 Vercel 日志

```bash
vercel logs --follow
```

查找超时错误：
```bash
vercel logs | grep -i timeout
```

## 📊 检查当前状态

### 查看正在运行的扫描

在数据库中运行：

```sql
SELECT id, site_id, status, started_at,
       EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_running
FROM sitemap_monitor_scans
WHERE status = 'running'
ORDER BY started_at DESC;
```

### 查看最近的扫描

```sql
SELECT id, site_id, status, started_at, finished_at, error
FROM sitemap_monitor_scans
ORDER BY started_at DESC
LIMIT 20;
```

## 🆘 仍然有问题？

1. **检查 Vercel 函数日志**
   - 进入 Vercel Dashboard
   - Functions → 选择 `/api/cron/scan`
   - 查看 Invocations 和 Errors

2. **检查数据库连接**
   - 确保 `DATABASE_URL` 环境变量正确
   - 测试数据库连接

3. **升级 Vercel 计划**
   - Pro 计划提供 60 秒执行时间
   - 可以处理更大的站点

4. **考虑使用外部队列**
   - Inngest (推荐)
   - Upstash QStash
   - BullMQ + Redis

## 📚 更多信息

- [完整故障排查指南](./STUCK_SCANS_TROUBLESHOOTING.md)
- [扫描超时优化](./SCAN_TIMEOUT_OPTIMIZATION.md)
- [优化总结](./SCAN_OPTIMIZATION_SUMMARY.md)
