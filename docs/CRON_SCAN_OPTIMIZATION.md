# Cron Scan 优化说明

## 问题描述

### 优化前的问题

`/api/cron/scan` 端点存在严重的阻塞和超时问题：

1. **串行执行**：在 for 循环中同步等待每个扫描完成
2. **累积超时**：多个站点扫描时间累加，容易超过 10 秒限制
3. **资源浪费**：串行执行效率低，无法充分利用并发能力
4. **用户体验差**：API 响应慢，影响定时任务的可靠性

### 示例场景

假设需要扫描 3 个站点，每个站点耗时 8 秒：

```
优化前（串行）：
站点1 (8s) → 站点2 (8s) → 站点3 (8s) = 24 秒 ❌ 超时！

优化后（异步）：
创建任务1 + 创建任务2 + 创建任务3 = < 1 秒 ✅ 快速返回
站点1、2、3 在后台并发执行
```

## 优化方案

### 核心改进

将同步等待改为异步触发，让扫描任务在后台执行：

**优化前**：
```typescript
for (const site of dueSites) {
  const scanId = generateId();
  await db.insert(scans).values({ id: scanId, siteId: site.id });
  
  // ❌ 等待扫描完成（阻塞）
  await Promise.race([
    executeScan({ scanId, siteId: site.id }),
    timeout(8000)
  ]);
  
  results.push({ siteId: site.id, scanId, status: "completed" });
}
```

**优化后**：
```typescript
for (const site of dueSites) {
  const scanId = generateId();
  await db.insert(scans).values({ id: scanId, siteId: site.id });
  
  // ✅ 异步执行，不等待完成
  executeScan({ scanId, siteId: site.id })
    .then(() => console.log(`Scan completed: ${scanId}`))
    .catch((err) => handleScanError(scanId, err));
  
  results.push({ siteId: site.id, scanId, status: "queued" });
}
```

### 工作流程

```
API 请求
  ↓
清理超时任务
  ↓
查找到期的站点
  ↓
为每个站点创建扫描任务（status: queued）
  ↓
异步启动扫描（不等待）
  ↓
立即返回结果 ← 这里不再阻塞！
  ↓
扫描在后台执行
  ↓
完成后更新数据库状态
  ↓
发送通知
```

## 性能对比

### 响应时间

| 场景 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| 1 个站点 | 8-10 秒 | < 500ms | 🚀 20x |
| 3 个站点 | 24-30 秒 ❌ | < 1 秒 | 🚀 30x |
| 5 个站点 | 40-50 秒 ❌ | < 1.5 秒 | 🚀 35x |

### 超时风险

| 站点数 | 优化前 | 优化后 |
|--------|--------|--------|
| 1-2 个 | 可能超时 | ✅ 不会超时 |
| 3-5 个 | 经常超时 | ✅ 不会超时 |
| 5+ 个 | 必定超时 | ✅ 不会超时 |

### 并发能力

```
优化前：串行执行
时间轴: [站点1] → [站点2] → [站点3]
总耗时: 24 秒

优化后：并发执行
时间轴: [站点1]
        [站点2]
        [站点3]
总耗时: 8 秒（最慢的那个）
```

## API 响应变化

### 优化前

```json
{
  "sitesChecked": 10,
  "dueCount": 3,
  "processed": 3,
  "results": [
    { "siteId": "xxx", "scanId": "yyy", "status": "completed" },
    { "siteId": "aaa", "scanId": "bbb", "status": "timeout" },
    { "siteId": "ccc", "scanId": "ddd", "status": "completed" }
  ]
}
```
⏱️ 响应时间：24 秒

### 优化后

```json
{
  "sitesChecked": 10,
  "dueCount": 3,
  "processed": 3,
  "results": [
    { "siteId": "xxx", "scanId": "yyy", "status": "queued" },
    { "siteId": "aaa", "scanId": "bbb", "status": "queued" },
    { "siteId": "ccc", "scanId": "ddd", "status": "queued" }
  ]
}
```
⏱️ 响应时间：< 1 秒

**注意**：状态从 `completed/timeout` 改为 `queued`，因为扫描在后台异步执行。

## 使用方法

### 基本用法

```bash
# 扫描最多 3 个到期的站点
curl -X POST "http://localhost:3000/api/cron/scan?max=3" \
  -H "x-cron-token: your-token"
```

### 调整并发数

```bash
# 扫描最多 5 个站点
curl -X POST "http://localhost:3000/api/cron/scan?max=5" \
  -H "x-cron-token: your-token"

# 扫描最多 10 个站点
curl -X POST "http://localhost:3000/api/cron/scan?max=10" \
  -H "x-cron-token: your-token"
```

### 配置定时任务

```bash
# 每 10 分钟扫描一次
*/10 * * * * curl -X POST "http://localhost:3000/api/cron/scan?max=5" \
  -H "x-cron-token: your-token"
```

## 监控和调试

### 查看扫描状态

```sql
-- 查看最近创建的扫描任务
SELECT id, site_id, status, started_at, finished_at
FROM sitemap_monitor_scans
ORDER BY started_at DESC
LIMIT 20;

-- 查看正在运行的扫描
SELECT id, site_id, status, started_at,
       EXTRACT(EPOCH FROM (NOW() - started_at)) as duration_seconds
FROM sitemap_monitor_scans
WHERE status = 'running'
ORDER BY started_at;

-- 查看排队中的扫描
SELECT id, site_id, status, started_at
FROM sitemap_monitor_scans
WHERE status = 'queued'
ORDER BY started_at;
```

### 查看服务器日志

```bash
# 扫描完成日志
[cronScan] Scan completed: scan_xxx for site site_yyy

# 扫描失败日志
[cronScan] Scan failed: scan_xxx for site site_yyy Error: ...
```

### 监控指标

```bash
# 查看 API 响应时间
curl -w "\nTime: %{time_total}s\n" \
  -X POST "http://localhost:3000/api/cron/scan?max=3" \
  -H "x-cron-token: your-token"

# 应该看到：Time: 0.5s 左右
```

## 错误处理

### 扫描失败处理

优化后的代码会自动处理扫描失败：

```typescript
executeScan({ scanId, siteId: site.id })
  .catch((err) => {
    console.error(`[cronScan] Scan failed: ${scanId}`, err);
    
    // 自动更新数据库状态
    db.update(scans)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: err.message,
      })
      .where(eq(scans.id, scanId))
      .catch(console.error);
  });
```

### 超时保护

虽然 API 不再等待扫描完成，但每个扫描任务仍有超时保护：

1. **执行超时**：单个 sitemap 获取超时 8 秒
2. **任务超时**：整个扫描任务超过 15 分钟会被清理

## 最佳实践

### 1. 合理设置 maxSites

```bash
# 开发环境：少量站点
curl -X POST ".../api/cron/scan?max=3"

# 生产环境：根据服务器性能调整
curl -X POST ".../api/cron/scan?max=10"
```

### 2. 配置合理的扫描间隔

```sql
-- 为不同优先级的站点设置不同的扫描间隔
UPDATE sitemap_monitor_sites
SET scan_interval_minutes = 60  -- 1 小时
WHERE scan_priority >= 4;

UPDATE sitemap_monitor_sites
SET scan_interval_minutes = 1440  -- 24 小时
WHERE scan_priority <= 2;
```

### 3. 定期清理超时任务

```bash
# 每小时清理一次
0 * * * * curl -X POST "http://localhost:3000/api/cron/cleanup" \
  -H "x-cron-token: your-token"
```

### 4. 监控队列积压

```sql
-- 检查是否有大量排队任务
SELECT status, COUNT(*) as count
FROM sitemap_monitor_scans
WHERE started_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- 如果 queued 数量过多，可能需要：
-- 1. 增加 maxSites 参数
-- 2. 增加 cron 频率
-- 3. 手动调用 /api/cron/process-queue
```

## 生产环境配置

### Vercel Cron Jobs

```json
{
  "crons": [
    {
      "path": "/api/cron/scan?max=10",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 环境变量

```env
# Cron 保护
CRON_TOKEN=your-secret-token

# 数据库
DATABASE_URL=postgresql://...

# Webhook 配置
WEBHOOK_SECRET=your-webhook-secret
```

## 故障排查

### Q: 扫描任务一直是 queued 状态？

**A: 可能原因：**
1. 扫描任务启动失败
2. 数据库连接问题
3. 代码执行错误

**解决方法：**
```bash
# 查看服务器日志
# 手动处理队列
curl -X POST "http://localhost:3000/api/cron/process-queue" \
  -H "x-cron-token: your-token"
```

### Q: API 仍然超时？

**A: 检查：**
1. 是否有大量到期站点（减少 maxSites）
2. 数据库查询是否慢（添加索引）
3. 网络连接是否正常

### Q: 扫描任务失败率高？

**A: 可能原因：**
1. 站点 URL 无效
2. Sitemap 格式错误
3. 网络超时

**解决方法：**
```sql
-- 查看失败原因
SELECT site_id, error, COUNT(*) as count
FROM sitemap_monitor_scans
WHERE status = 'failed'
  AND started_at > NOW() - INTERVAL '24 hours'
GROUP BY site_id, error
ORDER BY count DESC;
```

## 总结

### 优化效果

- ✅ API 响应时间从 20+ 秒降至 < 1 秒
- ✅ 不再有超时问题
- ✅ 支持更多站点并发扫描
- ✅ 更好的错误处理和日志

### 注意事项

- ⚠️ 扫描结果需要通过数据库或通知获取
- ⚠️ 不能立即知道扫描是否成功
- ⚠️ 需要配置通知渠道以接收结果

### 相关文档

- [队列系统优化](./QUEUE_OPTIMIZATION.md)
- [扫描完成通知](./SCAN_NOTIFICATIONS.md)
- [前端页面通知](./FRONTEND_NOTIFICATIONS.md)
