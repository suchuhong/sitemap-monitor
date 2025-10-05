# 快速参考 - 超时限制移除

## 🎯 核心变更

### 超时时间

```
8 秒 → 30 秒
```

### 默认行为

```
扫描 3 个站点 → 扫描所有到期站点
```

### 自动清理

```
每次自动清理 → 手动触发清理
```

## 🚀 快速命令

### 扫描所有站点

```bash
curl -X POST "http://localhost:3000/api/cron/scan" \
  -H "x-cron-token: YOUR_TOKEN"
```

### 限制扫描数量

```bash
curl -X POST "http://localhost:3000/api/cron/scan?max=5" \
  -H "x-cron-token: YOUR_TOKEN"
```

### 清理卡住的扫描

```bash
# 默认 60 分钟
curl -X POST "http://localhost:3000/api/cron/cleanup" \
  -H "x-cron-token: YOUR_TOKEN"

# 自定义 30 分钟
curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=30" \
  -H "x-cron-token: YOUR_TOKEN"
```

## 📝 环境变量

```env
# 可选，默认 30000
WEBHOOK_TIMEOUT_MS=30000
SLACK_TIMEOUT_MS=30000
```

## ⚙️ Cron 配置

### VPS / 云服务器

```bash
# 每小时扫描
0 * * * * curl -X POST "http://localhost:3000/api/cron/scan" -H "x-cron-token: TOKEN"

# 每天清理
0 2 * * * curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=120" -H "x-cron-token: TOKEN"
```

### Vercel（向后兼容）

```json
{
  "crons": [{
    "path": "/api/cron/scan?max=1",
    "schedule": "*/10 * * * *"
  }]
}
```

## 🔍 监控查询

### 查看扫描时间

```sql
SELECT 
  id,
  EXTRACT(EPOCH FROM (finished_at - started_at)) as duration_seconds
FROM sitemap_monitor_scans
WHERE finished_at IS NOT NULL
ORDER BY started_at DESC
LIMIT 10;
```

### 查看卡住的扫描

```sql
SELECT COUNT(*)
FROM sitemap_monitor_scans
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';
```

## 📚 文档链接

- [详细说明](docs/TIMEOUT_LIMITS_REMOVED.md)
- [迁移指南](docs/MIGRATION_TO_NO_TIMEOUT.md)
- [更新日志](CHANGELOG_TIMEOUT_REMOVAL.md)
- [完整总结](TIMEOUT_REMOVAL_SUMMARY.md)

## ⚠️ 重要提示

- ✅ 适合 VPS / 云服务器
- ⚠️ 不适合 Vercel Hobby/Free
- 📊 需要监控扫描时间
- 🔧 可能需要手动清理

## 🆘 快速故障排查

### 扫描失败

```bash
# 查看错误
psql $DATABASE_URL -c "
  SELECT error FROM sitemap_monitor_scans 
  WHERE status = 'failed' 
  ORDER BY started_at DESC LIMIT 5;
"
```

### 扫描卡住

```bash
# 手动清理
curl -X POST "http://localhost:3000/api/cron/cleanup" \
  -H "x-cron-token: YOUR_TOKEN"
```

### 回滚

```bash
git revert HEAD
git push origin main
```

---

**版本**: 2.0.0 | **日期**: 2025-10-05
