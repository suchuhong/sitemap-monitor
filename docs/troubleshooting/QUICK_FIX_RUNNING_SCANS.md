# 🚨 快速修复：清理卡住的扫描任务

## 问题

扫描任务一直处于 `running` 状态，无法创建新的扫描。

## ✅ 快速解决方案（3 步）

### 步骤 1: 检查当前状态

```bash
DATABASE_URL="your-db-url" pnpm tsx scripts/check-running-scans.ts
```

这会显示：
- 有多少个运行中的扫描
- 有多少个排队中的扫描
- 每个扫描运行了多长时间
- 哪些扫描可能已卡住

### 步骤 2: 清理卡住的扫描

**方法 A: 使用清理脚本（推荐）**

```bash
# 清理超过 2 分钟的扫描
DATABASE_URL="your-db-url" pnpm tsx scripts/force-cleanup-all-stuck.ts 2

# 或清理超过 5 分钟的扫描（更安全）
DATABASE_URL="your-db-url" pnpm tsx scripts/force-cleanup-all-stuck.ts 5
```

**方法 B: 使用 API**

```bash
curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=2" \
  -H "x-cron-token: YOUR_CRON_TOKEN"
```

**方法 C: 直接 SQL（最快）**

```sql
-- 清理超过 2 分钟的扫描
UPDATE sitemap_monitor_scans
SET 
  status = 'failed',
  finished_at = NOW(),
  error = 'Manual cleanup - scan timeout'
WHERE status IN ('running', 'queued')
  AND started_at < NOW() - INTERVAL '2 minutes';
```

### 步骤 3: 验证清理结果

```bash
# 再次检查
DATABASE_URL="your-db-url" pnpm tsx scripts/check-running-scans.ts
```

应该显示：
```
✅ 没有运行中或排队中的扫描
```

## 🎯 现在可以正常扫描了

清理完成后：

1. 刷新站点详情页面
2. 黄色警告框应该消失
3. 点击"手动扫描"按钮
4. 应该能成功创建新的扫描

## 🛡️ 预防措施

### 1. 设置自动清理

在 crontab 中添加：

```bash
# 每 10 分钟清理一次超过 5 分钟的卡住扫描
*/10 * * * * DATABASE_URL="..." pnpm tsx /path/to/scripts/force-cleanup-all-stuck.ts 5
```

### 2. 监控扫描时间

创建监控脚本 `monitor-scans.sh`:

```bash
#!/bin/bash

STUCK_COUNT=$(DATABASE_URL="$DATABASE_URL" pnpm tsx scripts/check-running-scans.ts 2>&1 | grep "可能已卡住" | wc -l)

if [ "$STUCK_COUNT" -gt 0 ]; then
  echo "⚠️  Found stuck scans, cleaning up..."
  DATABASE_URL="$DATABASE_URL" pnpm tsx scripts/force-cleanup-all-stuck.ts 5
fi
```

### 3. 增加日志监控

在服务器日志中查找：

```bash
# 查找扫描开始但没有完成的日志
grep "\[executeScan\] Starting scan" server.log | tail -20
grep "\[executeScan\] Scan.*completed" server.log | tail -20
```

## 📊 理解扫描状态

### 正常流程

```
queued → running → success/failed
  ↓         ↓           ↓
 创建     执行中      完成
```

### 卡住的情况

```
queued → running → (卡住)
  ↓         ↓
 创建     执行中    ❌ 没有完成
```

**常见原因**:
1. 网络超时
2. 服务器重启
3. 数据库连接中断
4. 代码错误

## 🔍 深入诊断

### 查看特定扫描的详细信息

```sql
SELECT 
  id,
  site_id,
  status,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at)) / 60 as duration_minutes,
  total_urls,
  added,
  removed,
  updated,
  error
FROM sitemap_monitor_scans
WHERE id = 'your-scan-id';
```

### 查看站点的扫描历史

```sql
SELECT 
  id,
  status,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at)) / 60 as duration_minutes,
  error
FROM sitemap_monitor_scans
WHERE site_id = 'your-site-id'
ORDER BY started_at DESC
LIMIT 10;
```

### 查看扫描统计

```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration_seconds
FROM sitemap_monitor_scans
WHERE finished_at IS NOT NULL
  AND started_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## 🚨 紧急情况

### 清理所有扫描（谨慎使用）

```sql
-- ⚠️  警告: 这会清理所有运行中和排队中的扫描
UPDATE sitemap_monitor_scans
SET 
  status = 'failed',
  finished_at = NOW(),
  error = 'Emergency cleanup - all scans cleared'
WHERE status IN ('running', 'queued');
```

### 重置特定站点的扫描

```sql
-- 清理特定站点的所有活动扫描
UPDATE sitemap_monitor_scans
SET 
  status = 'failed',
  finished_at = NOW(),
  error = 'Site-specific cleanup'
WHERE site_id = 'your-site-id'
  AND status IN ('running', 'queued');
```

## 📚 相关脚本

| 脚本 | 用途 | 命令 |
|------|------|------|
| `check-running-scans.ts` | 检查运行中的扫描 | `pnpm tsx scripts/check-running-scans.ts` |
| `force-cleanup-all-stuck.ts` | 强制清理卡住的扫描 | `pnpm tsx scripts/force-cleanup-all-stuck.ts 2` |
| `cleanup-stuck-scan.ts` | 清理超时的扫描 | `pnpm tsx scripts/cleanup-stuck-scan.ts 5` |
| `debug-scan-flow.ts` | 调试扫描流程 | `pnpm tsx scripts/debug-scan-flow.ts <site-id>` |
| `test-manual-scan.ts` | 测试手动扫描 | `pnpm tsx scripts/test-manual-scan.ts <site-id>` |

## 💡 最佳实践

1. **定期检查**: 每天检查一次运行中的扫描
2. **自动清理**: 设置 cron 任务自动清理
3. **监控日志**: 查看扫描日志，发现异常
4. **优化配置**: 如果经常超时，考虑优化 sitemap 或增加资源
5. **及时处理**: 发现卡住的扫描立即清理

## 🆘 仍然有问题？

如果清理后仍然有问题：

1. **检查服务器日志**: 查看是否有错误信息
2. **检查数据库**: 确认数据库连接正常
3. **检查网络**: 确认能访问 sitemap URL
4. **重启服务**: 重启开发服务器或生产服务器
5. **联系支持**: 提供日志和诊断信息

## 📞 获取帮助

收集以下信息：

1. `check-running-scans.ts` 的输出
2. 服务器日志
3. 数据库查询结果
4. 扫描 ID 和站点 ID

---

**更新时间**: 2025年10月5日
**版本**: 1.0.0
