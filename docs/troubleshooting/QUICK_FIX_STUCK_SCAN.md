# 🚨 快速修复：清理卡住的扫描

## 问题

你的扫描卡在 `running` 状态，阻止了新的扫描创建。

日志显示：
```
[enqueueScan] Active scan found: 7bd40c6a-56a7-45c3-ab79-70ccb9b95ba4 (running)
```

## ✅ 快速解决方案

### 方法 1: 使用清理脚本（推荐）

```bash
DATABASE_URL="your-db-url" pnpm tsx scripts/cleanup-stuck-scan.ts
```

这会清理所有超过 5 分钟的卡住扫描。

**自定义超时时间**:
```bash
# 清理超过 1 分钟的扫描
DATABASE_URL="your-db-url" pnpm tsx scripts/cleanup-stuck-scan.ts 1

# 清理超过 10 分钟的扫描
DATABASE_URL="your-db-url" pnpm tsx scripts/cleanup-stuck-scan.ts 10
```

### 方法 2: 使用 API

```bash
curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=5" \
  -H "x-cron-token: YOUR_CRON_TOKEN"
```

### 方法 3: 直接在数据库中清理

```sql
-- 查看卡住的扫描
SELECT 
  id,
  site_id,
  status,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_running
FROM sitemap_monitor_scans
WHERE status = 'running'
ORDER BY started_at DESC;

-- 清理特定的扫描
UPDATE sitemap_monitor_scans
SET 
  status = 'failed',
  finished_at = NOW(),
  error = 'Manual cleanup - scan was stuck'
WHERE id = '7bd40c6a-56a7-45c3-ab79-70ccb9b95ba4';

-- 或清理所有超过 5 分钟的扫描
UPDATE sitemap_monitor_scans
SET 
  status = 'failed',
  finished_at = NOW(),
  error = 'Manual cleanup - scan timeout'
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '5 minutes';
```

## 🔄 清理后测试

清理完成后，再次点击"手动扫描"按钮。

**预期日志**:
```
[enqueueScan] Starting for site xxx
[enqueueScan] Found 8 existing scans for site xxx
[enqueueScan] Creating new scan yyy for site xxx
[enqueueScan] Successfully created scan yyy
[enqueueScan] Triggering background processing
[processQueuedScans] Starting, maxConcurrent: 1
[processQueuedScans] Found 1 queued scans
[processQueuedScans] Processing scan yyy
[executeScan] Starting scan yyy for site xxx
...
```

## 🛡️ 预防措施

### 1. 设置定期清理

在 crontab 中添加：

```bash
# 每小时清理一次超过 10 分钟的卡住扫描
0 * * * * DATABASE_URL="your-db-url" /path/to/node /path/to/scripts/cleanup-stuck-scan.ts 10
```

### 2. 使用 API 定期清理

```bash
# 每小时清理一次
0 * * * * curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=10" -H "x-cron-token: YOUR_TOKEN"
```

### 3. 监控扫描时间

创建监控脚本：

```bash
#!/bin/bash
# monitor-scans.sh

STUCK_COUNT=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*)
  FROM sitemap_monitor_scans
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '10 minutes';
")

if [ "$STUCK_COUNT" -gt 0 ]; then
  echo "⚠️  Found $STUCK_COUNT stuck scans"
  # 自动清理或发送告警
  DATABASE_URL="$DATABASE_URL" pnpm tsx scripts/cleanup-stuck-scan.ts 10
fi
```

## 🔍 为什么会卡住？

扫描可能因以下原因卡住：

1. **网络超时**: Sitemap 下载时间过长
2. **进程终止**: 服务器重启或崩溃
3. **数据库问题**: 连接中断或更新失败
4. **代码错误**: 未捕获的异常

## 📊 检查扫描历史

```sql
-- 查看该站点的所有扫描
SELECT 
  id,
  status,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at)) / 60 as duration_minutes,
  error
FROM sitemap_monitor_scans
WHERE site_id = 'c9c7be87-1bd8-4ab5-ba02-0b64202563cd'
ORDER BY started_at DESC
LIMIT 10;

-- 查看扫描统计
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration_seconds
FROM sitemap_monitor_scans
WHERE site_id = 'c9c7be87-1bd8-4ab5-ba02-0b64202563cd'
  AND finished_at IS NOT NULL
GROUP BY status;
```

## 💡 长期解决方案

如果扫描经常卡住，考虑：

1. **增加超时时间**: 已经从 8 秒增加到 30 秒
2. **优化 Sitemap**: 减少 URL 数量或分割大型 sitemap
3. **使用队列服务**: 如 Redis、BullMQ
4. **监控和告警**: 及时发现和处理卡住的扫描
5. **改进错误处理**: 确保所有错误都被正确捕获

## 📚 相关文档

- [调试指南](docs/DEBUG_MANUAL_SCAN.md)
- [诊断指南](SCAN_NOT_WORKING_DIAGNOSIS.md)
- [故障排查](docs/STUCK_SCANS_TROUBLESHOOTING.md)

---

**更新时间**: 2025年10月5日
