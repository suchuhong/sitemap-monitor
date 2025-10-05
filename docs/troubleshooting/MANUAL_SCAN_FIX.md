# 手动扫描问题修复

## 🐛 问题

手动扫描之后没有扫描记录生成，任务状态也没有变更。

## 🔍 根本原因

1. **重复的状态更新**: `processQueuedScans` 在调用 `executeScan` 之前设置状态为 `running`，但 `executeScan` 内部也会设置，导致潜在的竞态条件。

2. **缺少日志**: 没有足够的日志来追踪扫描执行过程。

3. **异步执行**: `enqueueScan` 异步触发 `processQueuedScans`，如果进程提前终止，扫描可能不会完成。

## ✅ 已实施的修复

### 1. 移除重复的状态更新

**文件**: `lib/logic/scan.ts`

**修改前**:
```typescript
for (const scan of queuedScans) {
  try {
    // 更新状态为运行中
    await db
      .update(scans)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(scans.id, scan.id));

    // 执行扫描
    const result = await executeScan({ scanId: scan.id, siteId: scan.siteId });
```

**修改后**:
```typescript
for (const scan of queuedScans) {
  try {
    // executeScan 内部会将状态设置为 running，这里不需要重复设置
    // 执行扫描
    const result = await executeScan({ scanId: scan.id, siteId: scan.siteId });
```

### 2. 添加详细日志

在关键位置添加日志输出：

**enqueueScan**:
```typescript
console.log(`[enqueueScan] Created scan ${scanId} for site ${siteId}`);
processQueuedScans(1)
  .then(result => {
    console.log(`[enqueueScan] Background processing completed:`, result);
  })
  .catch(err => {
    console.error(`[enqueueScan] Background scan processing failed:`, err);
  });
```

**executeScan**:
```typescript
console.log(`[executeScan] Starting scan ${scanId} for site ${siteId}`);
// ...
console.log(`[executeScan] Updated scan ${scanId} status to running`);
// ...
console.log(`[executeScan] Scan ${scanId} completed with status: ${status}, totalUrls: ${totalUrls}, added: ${added}, removed: ${removed}, updated: ${updated}`);
```

### 3. 创建测试脚本

**文件**: `scripts/test-manual-scan.ts`

用于测试和调试手动扫描功能：

```bash
# 使用第一个站点
DATABASE_URL="your-db-url" pnpm tsx scripts/test-manual-scan.ts

# 指定站点 ID
DATABASE_URL="your-db-url" pnpm tsx scripts/test-manual-scan.ts <site-id>
```

### 4. 创建调试文档

**文件**: `docs/DEBUG_MANUAL_SCAN.md`

包含完整的调试步骤和常见问题解决方案。

## 🧪 测试步骤

### 1. 启动开发服务器

```bash
pnpm dev
```

### 2. 触发手动扫描

在浏览器中访问站点详情页面，点击"手动扫描"按钮。

### 3. 查看日志

在控制台中应该看到：

```
[enqueueScan] Created scan xxx-xxx-xxx for site yyy-yyy-yyy
[executeScan] Starting scan xxx-xxx-xxx for site yyy-yyy-yyy
[executeScan] Updated scan xxx-xxx-xxx status to running
[executeScan] Scan xxx-xxx-xxx completed with status: success, totalUrls: 100, added: 5, removed: 2, updated: 3
[enqueueScan] Background processing completed: { processed: 1, results: [...] }
```

### 4. 检查数据库

```sql
SELECT 
  id,
  status,
  started_at,
  finished_at,
  total_urls,
  added,
  removed,
  updated
FROM sitemap_monitor_scans
ORDER BY started_at DESC
LIMIT 5;
```

应该看到新的扫描记录，状态为 `success` 或 `failed`。

## 🔧 使用测试脚本

```bash
# 测试手动扫描
DATABASE_URL="postgresql://user:pass@host:5432/db" \
  pnpm tsx scripts/test-manual-scan.ts

# 输出示例：
# 📍 使用站点: https://example.com (site-id-123)
# 
# 🌐 站点信息:
#    URL: https://example.com
#    ID: site-id-123
#    启用: 是
# 
# 📊 最近的扫描记录:
#    - scan-1: success (12.50s) - 2025-10-05T10:00:00Z
#    - scan-2: success (11.20s) - 2025-10-05T09:00:00Z
# 
# 🚀 触发手动扫描...
# ✅ 扫描已入队:
#    Scan ID: scan-3
#    状态: queued
# 
# ⏳ 等待 5 秒后检查状态...
# 
# 📋 扫描状态更新:
#    ID: scan-3
#    状态: success
#    开始时间: 2025-10-05T11:00:00Z
#    结束时间: 2025-10-05T11:00:15Z
#    总 URL: 150
#    新增: 5
#    删除: 2
#    更新: 3
# 
# ✅ 扫描成功完成！
# ✨ 测试完成
```

## 📊 预期结果

### 成功的扫描

- ✅ 数据库中有新的扫描记录
- ✅ 状态为 `success`
- ✅ `finished_at` 有值
- ✅ `total_urls`, `added`, `removed`, `updated` 有正确的数值
- ✅ 日志中有完整的执行记录

### 失败的扫描

- ✅ 数据库中有新的扫描记录
- ✅ 状态为 `failed`
- ✅ `finished_at` 有值
- ✅ `error` 字段包含错误信息
- ✅ 日志中有错误记录

## 🚨 如果仍然有问题

### 1. 检查日志

查看完整的服务器日志，寻找错误信息：

```bash
pnpm dev 2>&1 | tee scan-debug.log
```

### 2. 检查数据库连接

```bash
DATABASE_URL="your-db-url" pnpm tsx -e "
  import { resolveDb } from './lib/db';
  const db = resolveDb();
  console.log('Database connected:', !!db);
"
```

### 3. 检查站点配置

确保站点有 sitemap：

```sql
SELECT 
  s.id,
  s.root_url,
  COUNT(sm.id) as sitemap_count
FROM sitemap_monitor_sites s
LEFT JOIN sitemap_monitor_sitemaps sm ON s.id = sm.site_id
GROUP BY s.id, s.root_url;
```

### 4. 手动清理卡住的扫描

```bash
curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=5" \
  -H "x-cron-token: YOUR_TOKEN"
```

### 5. 查看详细调试文档

参考 `docs/DEBUG_MANUAL_SCAN.md` 获取更多调试步骤。

## 📚 相关文档

- [调试指南](docs/DEBUG_MANUAL_SCAN.md) - 完整的调试步骤
- [超时限制移除](docs/TIMEOUT_LIMITS_REMOVED.md) - 超时相关的更改
- [故障排查](docs/STUCK_SCANS_TROUBLESHOOTING.md) - 卡住扫描的处理

## 💡 最佳实践

1. **始终查看日志**: 日志是诊断问题的第一手资料
2. **使用测试脚本**: 在生产环境前先测试
3. **定期清理**: 设置定期清理卡住的扫描
4. **监控指标**: 监控扫描成功率和平均时间

## ✨ 总结

通过以下修复，手动扫描功能应该能够正常工作：

1. ✅ 移除了重复的状态更新
2. ✅ 添加了详细的日志输出
3. ✅ 提供了测试脚本
4. ✅ 创建了调试文档

如果问题仍然存在，请使用测试脚本和调试文档进行进一步排查。

---

**修复时间**: 2025年10月5日
**版本**: 2.0.1
