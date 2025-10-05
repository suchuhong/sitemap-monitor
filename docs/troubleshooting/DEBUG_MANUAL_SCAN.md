# 手动扫描调试指南

## 🐛 问题描述

手动扫描之后没有扫描记录生成，任务状态也没有变更。

## 🔍 可能的原因

### 1. 异步执行问题

`enqueueScan` 函数异步触发 `processQueuedScans`，但不等待完成。如果进程在扫描完成前终止，状态不会更新。

### 2. 数据库连接问题

数据库连接可能在扫描过程中断开或超时。

### 3. 错误被静默捕获

扫描过程中的错误可能被捕获但没有正确记录。

### 4. 状态更新冲突

`processQueuedScans` 和 `executeScan` 都尝试更新状态，可能导致冲突。

## 🛠️ 调试步骤

### 步骤 1: 检查日志

启动开发服务器并查看日志：

```bash
pnpm dev
```

触发手动扫描后，查看控制台输出，应该看到：

```
[enqueueScan] Created scan xxx for site yyy
[enqueueScan] Background processing completed: { processed: 1, results: [...] }
[executeScan] Starting scan xxx for site yyy
[executeScan] Updated scan xxx status to running
[executeScan] Scan xxx completed with status: success, totalUrls: 100, added: 5, removed: 2, updated: 3
```

### 步骤 2: 使用测试脚本

运行测试脚本检查扫描功能：

```bash
# 使用第一个站点
DATABASE_URL="your-db-url" pnpm tsx scripts/test-manual-scan.ts

# 或指定站点 ID
DATABASE_URL="your-db-url" pnpm tsx scripts/test-manual-scan.ts <site-id>
```

脚本会：
1. 显示站点信息
2. 显示最近的扫描记录
3. 触发新的扫描
4. 等待 5 秒后检查状态

### 步骤 3: 检查数据库

直接查询数据库检查扫描记录：

```sql
-- 查看最近的扫描
SELECT 
  id,
  site_id,
  status,
  started_at,
  finished_at,
  total_urls,
  added,
  removed,
  updated,
  error
FROM sitemap_monitor_scans
ORDER BY started_at DESC
LIMIT 10;

-- 查看特定站点的扫描
SELECT 
  id,
  status,
  started_at,
  finished_at
FROM sitemap_monitor_scans
WHERE site_id = 'your-site-id'
ORDER BY started_at DESC
LIMIT 5;

-- 查看卡住的扫描
SELECT 
  id,
  site_id,
  status,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_running
FROM sitemap_monitor_scans
WHERE status IN ('queued', 'running')
ORDER BY started_at DESC;
```

### 步骤 4: 检查站点配置

确保站点配置正确：

```sql
SELECT 
  id,
  root_url,
  enabled,
  scan_priority,
  scan_interval_minutes
FROM sitemap_monitor_sites
WHERE id = 'your-site-id';
```

### 步骤 5: 检查 Sitemap 配置

确保站点有 sitemap：

```sql
SELECT 
  id,
  url,
  last_status
FROM sitemap_monitor_sitemaps
WHERE site_id = 'your-site-id';
```

## 🔧 已实施的修复

### 1. 移除重复的状态更新

**问题**: `processQueuedScans` 在调用 `executeScan` 之前设置状态为 `running`，但 `executeScan` 内部也会设置。

**修复**: 移除 `processQueuedScans` 中的状态更新，让 `executeScan` 统一处理。

```typescript
// 之前
await db.update(scans).set({ status: "running" }).where(eq(scans.id, scan.id));
const result = await executeScan({ scanId: scan.id, siteId: scan.siteId });

// 现在
// executeScan 内部会将状态设置为 running，这里不需要重复设置
const result = await executeScan({ scanId: scan.id, siteId: scan.siteId });
```

### 2. 添加详细日志

在关键位置添加日志输出：

- `enqueueScan`: 创建扫描和后台处理结果
- `executeScan`: 开始、状态更新、完成
- `processQueuedScans`: 处理结果

### 3. 改进错误处理

确保所有错误都被正确捕获和记录。

## 🚨 常见问题

### Q: 扫描一直显示 "queued" 状态

**可能原因**:
1. `processQueuedScans` 没有被调用
2. 数据库查询失败
3. 扫描任务被跳过

**解决方案**:
```bash
# 查看日志
pnpm dev

# 手动触发队列处理
curl -X POST "http://localhost:3000/api/cron/process-queue" \
  -H "x-cron-token: YOUR_TOKEN"
```

### Q: 扫描一直显示 "running" 状态

**可能原因**:
1. 扫描超时
2. 进程被终止
3. 状态更新失败

**解决方案**:
```bash
# 清理卡住的扫描
curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=5" \
  -H "x-cron-token: YOUR_TOKEN"
```

### Q: 没有任何扫描记录

**可能原因**:
1. 数据库连接失败
2. 插入操作失败
3. 权限问题

**解决方案**:
```bash
# 检查数据库连接
DATABASE_URL="your-db-url" pnpm tsx -e "
  import { resolveDb } from './lib/db';
  const db = resolveDb();
  console.log('Database connected:', !!db);
"

# 检查表是否存在
psql "$DATABASE_URL" -c "\dt sitemap_monitor_*"
```

### Q: 扫描失败但没有错误信息

**可能原因**:
1. 错误被静默捕获
2. 日志级别设置不当
3. 错误信息未保存到数据库

**解决方案**:
- 查看服务器日志
- 检查数据库中的 `error` 字段
- 使用测试脚本获取详细信息

## 📊 监控建议

### 1. 设置日志监控

```bash
# 实时查看日志
pnpm dev | grep -E "\[enqueueScan\]|\[executeScan\]|\[processQueuedScans\]"
```

### 2. 定期检查卡住的扫描

```sql
-- 创建视图
CREATE VIEW stuck_scans AS
SELECT 
  id,
  site_id,
  status,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_running
FROM sitemap_monitor_scans
WHERE status IN ('queued', 'running')
  AND started_at < NOW() - INTERVAL '10 minutes';

-- 查询
SELECT * FROM stuck_scans;
```

### 3. 设置告警

```bash
#!/bin/bash
# check-stuck-scans.sh

STUCK_COUNT=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*)
  FROM sitemap_monitor_scans
  WHERE status IN ('queued', 'running')
    AND started_at < NOW() - INTERVAL '10 minutes';
")

if [ "$STUCK_COUNT" -gt 0 ]; then
  echo "⚠️  Found $STUCK_COUNT stuck scans"
  # 发送告警
fi
```

## 🔄 手动修复

### 清理卡住的扫描

```sql
-- 查看卡住的扫描
SELECT id, site_id, status, started_at
FROM sitemap_monitor_scans
WHERE status IN ('queued', 'running')
  AND started_at < NOW() - INTERVAL '10 minutes';

-- 手动标记为失败
UPDATE sitemap_monitor_scans
SET 
  status = 'failed',
  finished_at = NOW(),
  error = 'Manual cleanup - scan was stuck'
WHERE status IN ('queued', 'running')
  AND started_at < NOW() - INTERVAL '10 minutes';
```

### 重新触发扫描

```bash
# 使用 API
curl -X POST "http://localhost:3000/api/sites/{site-id}/scan" \
  -H "Cookie: session=YOUR_SESSION"

# 或使用测试脚本
DATABASE_URL="your-db-url" pnpm tsx scripts/test-manual-scan.ts <site-id>
```

## 📚 相关文档

- [超时限制移除说明](./TIMEOUT_LIMITS_REMOVED.md)
- [故障排查指南](./STUCK_SCANS_TROUBLESHOOTING.md)
- [扫描优化](./SCAN_TIMEOUT_OPTIMIZATION.md)

## 💡 最佳实践

1. **始终检查日志**: 日志是调试的第一手资料
2. **使用测试脚本**: 在修改代码前先用脚本验证
3. **定期清理**: 设置定期清理卡住的扫描
4. **监控指标**: 监控扫描成功率和平均时间
5. **备份数据**: 在进行重大修改前备份数据库

## 🆘 获取帮助

如果以上步骤都无法解决问题：

1. 收集以下信息：
   - 服务器日志
   - 数据库查询结果
   - 测试脚本输出
   - 环境配置

2. 提交 Issue 并附上收集的信息

3. 或在社区寻求帮助

---

**更新时间**: 2025年10月5日
