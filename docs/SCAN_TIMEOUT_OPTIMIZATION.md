# 扫描超时优化指南

## 问题描述

在 Vercel 上部署时,每个站点的扫描执行时间可能超过 10 秒,导致函数超时。

## Vercel 限制

- **免费计划**: 10 秒执行时间限制
- **Hobby 计划**: 10 秒执行时间限制  
- **Pro 计划**: 60 秒执行时间限制
- **Enterprise 计划**: 900 秒执行时间限制

## 已实施的优化

### 1. 限制单次扫描站点数量

在 `vercel.json` 中设置 `max=1`,每次 cron 只扫描 1 个站点:

```json
{
  "crons": [
    {
      "path": "/api/cron/scan?max=1",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

### 2. 减少网络超时时间

将 sitemap 获取超时从 12 秒降低到 8 秒,确保在 Vercel 10 秒限制内完成:

```typescript
res = await retry(() => fetchWithCompression(sm.url, { timeout: 8000, headers }), 2);
```

### 3. 使用队列机制

扫描任务通过 `enqueueScan` 加入队列,异步处理:

```typescript
export async function enqueueScan(siteId: string) {
  const db = resolveDb() as any;
  const scanId = generateId();
  await db
    .insert(scans)
    .values({ id: scanId, siteId, status: "queued", startedAt: new Date() });
  scanQueue.push({ scanId, siteId });
  void processQueue();
  return { scanId };
}
```

## 进一步优化建议

### 1. 增加 Cron 频率

如果站点数量多,可以增加 cron 执行频率:

```json
{
  "crons": [
    {
      "path": "/api/cron/scan?max=1",
      "schedule": "*/5 * * * *"  // 每 5 分钟执行一次
    }
  ]
}
```

### 2. 使用外部队列服务

对于大规模应用,考虑使用:
- **Vercel Cron + Upstash Redis Queue**
- **Inngest** (推荐,专为长时间任务设计)
- **QStash** by Upstash
- **BullMQ** with Redis

示例使用 Inngest:

```typescript
import { inngest } from "./inngest/client";

export const scanSite = inngest.createFunction(
  { id: "scan-site" },
  { event: "site/scan.requested" },
  async ({ event, step }) => {
    const { siteId } = event.data;
    
    // 步骤 1: 获取 sitemaps
    const sitemaps = await step.run("fetch-sitemaps", async () => {
      // ...
    });
    
    // 步骤 2: 扫描每个 sitemap
    for (const sm of sitemaps) {
      await step.run(`scan-${sm.id}`, async () => {
        // ...
      });
    }
    
    return { success: true };
  }
);
```

### 3. 批量数据库操作

优化数据库写入,使用批量插入:

```typescript
// 批量插入 URLs
if (toAdd.length > 0) {
  const urlRecords = toAdd.map(detail => ({
    id: generateId(),
    siteId,
    sitemapId: sm.id,
    loc: detail.loc,
    lastmod: detail.lastmod,
    changefreq: detail.changefreq,
    priority: detail.priority,
    firstSeenAt: now,
    lastSeenAt: now,
    status: "active" as const,
  }));
  
  await db.insert(urls).values(urlRecords);
  
  // 批量插入 changes
  const changeRecords = urlRecords.map(url => ({
    id: generateId(),
    siteId,
    scanId,
    urlId: url.id,
    type: "added" as const,
    detail: url.loc,
    source: "scanner" as const,
  }));
  
  await db.insert(changes).values(changeRecords);
}
```

### 4. 设置 maxDuration (Pro 计划)

如果你有 Vercel Pro 计划,在 `vercel.json` 中设置:

```json
{
  "functions": {
    "app/api/cron/scan/route.ts": {
      "maxDuration": 60
    }
  }
}
```

或在 Next.js 路由中:

```typescript
export const maxDuration = 60; // Pro 计划最多 60 秒
export const dynamic = 'force-dynamic';
```

### 5. 分页处理大型 Sitemap

对于包含大量 URL 的 sitemap,分批处理:

```typescript
const BATCH_SIZE = 100;

for (let i = 0; i < list.length; i += BATCH_SIZE) {
  const batch = list.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

## 监控和调试

### 1. 添加性能日志

```typescript
const startTime = Date.now();
console.log(`[Scan ${scanId}] Starting scan for site ${siteId}`);

// ... 扫描逻辑 ...

const duration = Date.now() - startTime;
console.log(`[Scan ${scanId}] Completed in ${duration}ms`);
```

### 2. 使用 Vercel Analytics

在 Vercel Dashboard 中查看函数执行时间和超时情况。

### 3. 设置告警

当扫描失败时发送通知:

```typescript
if (errors.length) {
  await notifyError(siteId, {
    scanId,
    errors,
    duration,
  });
}
```

## 最佳实践

1. **保持 max=1**: 每次只扫描一个站点
2. **增加 cron 频率**: 从 10 分钟改为 5 分钟
3. **优化网络请求**: 使用 HTTP 缓存头 (ETag, Last-Modified)
4. **异步处理**: 使用队列而不是同步执行
5. **监控性能**: 记录每次扫描的执行时间
6. **优雅降级**: 超时时保存部分结果,下次继续

## 推荐配置

对于大多数应用,推荐以下配置:

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

这样每 5 分钟扫描 1 个站点,如果有 100 个站点,大约 8.3 小时可以完成一轮扫描。

## 故障排查

### 问题: 仍然超时

**解决方案**:
1. 检查 sitemap 大小,考虑分批处理
2. 减少数据库查询次数
3. 使用数据库连接池
4. 考虑升级到 Pro 计划

### 问题: 扫描不及时

**解决方案**:
1. 增加 cron 频率
2. 增加 maxSites 参数 (如果执行时间允许)
3. 使用优先级队列,优先扫描重要站点

### 问题: 数据库连接超限

**解决方案**:
1. 使用连接池
2. 确保正确关闭连接
3. 考虑使用 Serverless 友好的数据库 (如 Neon, PlanetScale)
