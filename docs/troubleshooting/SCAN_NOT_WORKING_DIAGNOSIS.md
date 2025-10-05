# 🚨 手动扫描不工作 - 快速诊断

## 问题描述

点击"手动扫描"按钮后，没有扫描记录生成。

## 🔍 立即诊断步骤

### 步骤 1: 运行诊断脚本

```bash
# 替换 <site-id> 为你的站点 ID
DATABASE_URL="your-db-url" pnpm tsx scripts/debug-scan-flow.ts <site-id>
```

这个脚本会检查：
- ✅ 站点是否存在
- ✅ 站点是否有 sitemap
- ✅ 是否有运行中的扫描
- ✅ 数据库写入是否正常

### 步骤 2: 查看浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 切换到 **Console** 标签
3. 点击"手动扫描"按钮
4. 查看是否有错误信息

**预期看到**:
```
(无错误信息，或者看到成功的 toast 提示)
```

**如果看到错误**:
- `Failed to fetch` → 服务器未运行或网络问题
- `401 Unauthorized` → 未登录或 session 过期
- `404 Not Found` → 站点不存在
- `500 Internal Server Error` → 服务器错误

### 步骤 3: 查看 Network 标签

1. 在开发者工具中切换到 **Network** 标签
2. 点击"手动扫描"按钮
3. 找到 `/api/sites/{id}/scan` 请求
4. 查看响应

**预期响应**:
```json
{
  "ok": true,
  "status": "queued",
  "scanId": "xxx-xxx-xxx"
}
```

**或者（如果已有扫描）**:
```json
{
  "ok": true,
  "status": "already_running",
  "scanId": "xxx-xxx-xxx"
}
```

### 步骤 4: 查看服务器日志

在运行 `pnpm dev` 的终端中查看日志。

**预期看到**:
```
[enqueueScan] Starting for site xxx
[enqueueScan] Found 0 existing scans for site xxx
[enqueueScan] Creating new scan yyy for site xxx
[enqueueScan] Successfully created scan yyy
[enqueueScan] Triggering background processing
[processQueuedScans] Starting, maxConcurrent: 1
[processQueuedScans] Found 1 queued scans
[processQueuedScans] Processing scan yyy
[executeScan] Starting scan yyy for site xxx
[executeScan] Updated scan yyy status to running
[executeScan] Scan yyy completed with status: success, totalUrls: 100, ...
[processQueuedScans] Scan yyy completed successfully
[processQueuedScans] Completed, processed 1 scans
[enqueueScan] Background processing completed: { processed: 1, results: [...] }
```

### 步骤 5: 检查数据库

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
LIMIT 5;
```

## 🐛 常见问题和解决方案

### 问题 1: 没有任何日志输出

**原因**: API 请求没有到达服务器

**解决方案**:
1. 确认服务器正在运行：`pnpm dev`
2. 检查浏览器控制台是否有网络错误
3. 确认 API 路径正确

### 问题 2: 日志显示 "Active scan found"

**原因**: 有卡住的扫描阻止了新扫描

**解决方案**:
```bash
# 清理卡住的扫描
curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=5" \
  -H "x-cron-token: YOUR_TOKEN"

# 或直接在数据库中清理
UPDATE sitemap_monitor_scans
SET status = 'failed', finished_at = NOW(), error = 'Manual cleanup'
WHERE status IN ('queued', 'running')
  AND started_at < NOW() - INTERVAL '5 minutes';
```

### 问题 3: 日志显示 "Failed to create scan"

**原因**: 数据库写入失败

**解决方案**:
1. 检查数据库连接：`echo $DATABASE_URL`
2. 检查数据库表是否存在
3. 检查数据库权限

### 问题 4: 日志显示 "Found 0 queued scans"

**原因**: 扫描记录创建后立即被处理，但 `processQueuedScans` 查询时已经不在队列中

**可能的情况**:
- 扫描执行太快
- 有并发问题

**解决方案**:
查看完整的日志，确认扫描是否真的完成了。

### 问题 5: 扫描记录创建了但状态一直是 "queued"

**原因**: `processQueuedScans` 没有被执行或失败了

**解决方案**:
1. 查看日志中是否有 `[processQueuedScans]` 相关的输出
2. 查看是否有错误信息
3. 手动触发队列处理：
```bash
curl -X POST "http://localhost:3000/api/cron/process-queue" \
  -H "x-cron-token: YOUR_TOKEN"
```

### 问题 6: 扫描记录创建了但状态一直是 "running"

**原因**: 扫描执行过程中出错，状态没有更新

**解决方案**:
1. 查看日志中的错误信息
2. 检查站点的 sitemap 是否可访问
3. 手动清理：
```bash
curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=5" \
  -H "x-cron-token: YOUR_TOKEN"
```

## 🔧 调试工具

### 工具 1: 诊断脚本

```bash
DATABASE_URL="..." pnpm tsx scripts/debug-scan-flow.ts <site-id>
```

### 工具 2: 测试脚本

```bash
DATABASE_URL="..." pnpm tsx scripts/test-manual-scan.ts <site-id>
```

### 工具 3: 数据库查询

```sql
-- 查看所有扫描状态
SELECT status, COUNT(*) as count
FROM sitemap_monitor_scans
GROUP BY status;

-- 查看卡住的扫描
SELECT id, site_id, status, started_at,
       EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_running
FROM sitemap_monitor_scans
WHERE status IN ('queued', 'running')
ORDER BY started_at DESC;

-- 查看最近的错误
SELECT id, site_id, error, started_at
FROM sitemap_monitor_scans
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 10;
```

## 📋 完整诊断清单

- [ ] 服务器正在运行（`pnpm dev`）
- [ ] 浏览器控制台无错误
- [ ] Network 标签显示 API 请求成功
- [ ] 服务器日志显示 `[enqueueScan]` 开始
- [ ] 服务器日志显示扫描记录创建成功
- [ ] 服务器日志显示 `[processQueuedScans]` 开始
- [ ] 服务器日志显示 `[executeScan]` 开始
- [ ] 服务器日志显示扫描完成
- [ ] 数据库中有新的扫描记录
- [ ] 扫描状态为 `success` 或 `failed`（不是 `queued` 或 `running`）

## 🆘 仍然无法解决？

收集以下信息并提交 Issue：

1. **诊断脚本输出**:
```bash
DATABASE_URL="..." pnpm tsx scripts/debug-scan-flow.ts <site-id> > diagnosis.txt 2>&1
```

2. **服务器日志**:
```bash
pnpm dev > server.log 2>&1
# 然后触发扫描
```

3. **浏览器 Network 截图**:
- 打开开发者工具 → Network
- 触发扫描
- 截图 `/api/sites/{id}/scan` 请求和响应

4. **数据库查询结果**:
```sql
SELECT * FROM sitemap_monitor_scans 
WHERE site_id = 'your-site-id' 
ORDER BY started_at DESC 
LIMIT 5;
```

5. **环境信息**:
- Node.js 版本: `node --version`
- 数据库类型和版本
- 操作系统

## 📚 相关文档

- [调试指南](docs/DEBUG_MANUAL_SCAN.md)
- [修复说明](MANUAL_SCAN_FIX.md)
- [故障排查](docs/STUCK_SCANS_TROUBLESHOOTING.md)

---

**更新时间**: 2025年10月5日
