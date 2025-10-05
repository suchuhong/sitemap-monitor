# Vercel 部署指南

## 问题：Cron 扫描超时

### 原因分析

Vercel Serverless Functions 有执行时间限制：
- **Hobby 计划**: 10 秒
- **Pro 计划**: 60 秒
- **Enterprise 计划**: 900 秒

当前的 `/api/cron/scan` 实现会同步扫描所有站点，导致：
1. 扫描多个站点时超时
2. 请求被 Vercel 强制终止
3. 没有返回结果

### 解决方案

有三种解决方案：

---

## 方案 1: 限制每次扫描的站点数量（推荐）

修改 `lib/logic/scan.ts` 中的 `cronScan` 函数，每次只扫描少量站点。

### 实现步骤

1. 修改 `cronScan` 函数添加限制：

```typescript
export async function cronScan(maxSites = 3) {
  const db = resolveDb() as any;
  const now = Date.now();
  
  const activeSites = await db
    .select({
      id: sites.id,
      scanPriority: sites.scanPriority,
      scanIntervalMinutes: sites.scanIntervalMinutes,
      lastScanAt: sites.lastScanAt,
    })
    .from(sites)
    .where(eq(sites.enabled, true));

  const dueSites = activeSites
    .map((site) => {
      const intervalMinutes = site.scanIntervalMinutes ?? 1440;
      const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;
      const last = site.lastScanAt ? new Date(site.lastScanAt).getTime() : 0;
      return {
        ...site,
        isDue: !last || now - last >= intervalMs,
      };
    })
    .filter((site) => site.isDue)
    .sort((a, b) => {
      const priorityDiff = (b.scanPriority ?? 1) - (a.scanPriority ?? 1);
      if (priorityDiff !== 0) return priorityDiff;
      const aLast = a.lastScanAt ? new Date(a.lastScanAt).getTime() : 0;
      const bLast = b.lastScanAt ? new Date(b.lastScanAt).getTime() : 0;
      return aLast - bLast;
    })
    .slice(0, maxSites); // 限制数量

  const results: Array<Record<string, unknown>> = [];
  for (const site of dueSites) {
    try {
      const { scanId } = await enqueueScan(site.id);
      results.push({ siteId: site.id, scanId, status: "queued" });
    } catch (err) {
      results.push({
        siteId: site.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { 
    sitesChecked: activeSites.length, 
    dueCount: dueSites.length,
    queued: results.length, 
    results 
  };
}
```

2. 在 API 路由中使用：

```typescript
app.post("/cron/scan", async (c) => {
  // ... 认证代码 ...
  
  const maxSites = parseInt(c.req.query("max") || "3");
  const result = await cronScan(maxSites);
  return c.json(result);
});
```

3. 设置 Vercel Cron 更频繁地调用：

在 `vercel.json` 中：

```json
{
  "crons": [
    {
      "path": "/api/cron/scan?max=3",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**优点**:
- 简单易实现
- 不需要外部服务
- 适合站点数量不多的情况

**缺点**:
- 需要更频繁的 Cron 调用
- 可能需要多次调用才能扫描完所有站点

---

## 方案 2: 使用异步队列（推荐用于大量站点）

将扫描任务放入队列，立即返回，后台异步处理。

### 实现步骤

1. 修改 `cronScan` 只入队，不执行：

```typescript
export async function cronScan() {
  const db = resolveDb() as any;
  const now = Date.now();
  
  const activeSites = await db
    .select({
      id: sites.id,
      scanPriority: sites.scanPriority,
      scanIntervalMinutes: sites.scanIntervalMinutes,
      lastScanAt: sites.lastScanAt,
    })
    .from(sites)
    .where(eq(sites.enabled, true));

  const dueSites = activeSites
    .map((site) => {
      const intervalMinutes = site.scanIntervalMinutes ?? 1440;
      const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;
      const last = site.lastScanAt ? new Date(site.lastScanAt).getTime() : 0;
      return {
        ...site,
        isDue: !last || now - last >= intervalMs,
      };
    })
    .filter((site) => site.isDue)
    .sort((a, b) => {
      const priorityDiff = (b.scanPriority ?? 1) - (a.scanPriority ?? 1);
      if (priorityDiff !== 0) return priorityDiff;
      const aLast = a.lastScanAt ? new Date(a.lastScanAt).getTime() : 0;
      const bLast = b.lastScanAt ? new Date(b.lastScanAt).getTime() : 0;
      return aLast - bLast;
    });

  // 只入队，不等待执行
  const queued: string[] = [];
  for (const site of dueSites) {
    try {
      const { scanId } = await enqueueScan(site.id);
      queued.push(scanId);
    } catch (err) {
      console.error(`Failed to enqueue scan for site ${site.id}:`, err);
    }
  }

  // 立即返回
  return { 
    sitesChecked: activeSites.length, 
    dueCount: dueSites.length,
    queued: queued.length,
    message: "Scans queued for background processing"
  };
}
```

2. 创建单独的扫描执行端点：

```typescript
// 在 app/api/[...hono]/route.ts 中添加
app.post("/cron/process-queue", async (c) => {
  // ... 认证代码 ...
  
  // 处理队列中的一个任务
  if (scanQueue.length > 0) {
    const job = scanQueue.shift();
    if (job) {
      await executeScan(job);
      return c.json({ processed: true, remaining: scanQueue.length });
    }
  }
  
  return c.json({ processed: false, remaining: 0 });
});
```

3. 配置两个 Cron 任务：

```json
{
  "crons": [
    {
      "path": "/api/cron/scan",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/process-queue",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**优点**:
- 快速响应，不会超时
- 适合大量站点
- 解耦入队和执行

**缺点**:
- 需要两个 Cron 任务
- 队列在内存中，重启会丢失

---

## 方案 3: 使用外部队列服务（生产环境推荐）

使用 Upstash Redis、BullMQ 或其他队列服务。

### 使用 Upstash Redis

1. 安装依赖：

```bash
pnpm add @upstash/redis
```

2. 配置环境变量：

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

3. 创建队列管理器：

```typescript
// lib/queue/redis-queue.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function enqueueScanJob(siteId: string) {
  const scanId = generateId();
  await redis.lpush('scan-queue', JSON.stringify({ scanId, siteId }));
  return { scanId };
}

export async function dequeueScanJob() {
  const job = await redis.rpop('scan-queue');
  return job ? JSON.parse(job) : null;
}
```

4. 修改 cronScan：

```typescript
export async function cronScan() {
  // ... 查找需要扫描的站点 ...
  
  for (const site of dueSites) {
    await enqueueScanJob(site.id);
  }
  
  return { queued: dueSites.length };
}
```

5. 创建处理端点：

```typescript
app.post("/cron/process-scan", async (c) => {
  const job = await dequeueScanJob();
  if (job) {
    await executeScan(job);
    return c.json({ processed: true });
  }
  return c.json({ processed: false });
});
```

**优点**:
- 持久化队列
- 可扩展
- 生产环境稳定

**缺点**:
- 需要外部服务
- 增加成本

---

## 推荐配置

### 对于小型项目（< 10 个站点）

使用**方案 1**：

```typescript
// lib/logic/scan.ts
export async function cronScan(maxSites = 3) {
  // ... 限制扫描数量的实现
}
```

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/scan?max=3",
    "schedule": "*/10 * * * *"
  }]
}
```

### 对于中型项目（10-50 个站点）

使用**方案 2**：异步队列

### 对于大型项目（> 50 个站点）

使用**方案 3**：外部队列服务

---

## 调试技巧

### 1. 添加日志

```typescript
export async function cronScan(maxSites = 3) {
  console.log(`[cronScan] Starting scan, max sites: ${maxSites}`);
  
  // ... 代码 ...
  
  console.log(`[cronScan] Completed: ${results.length} sites queued`);
  return result;
}
```

### 2. 检查 Vercel 日志

在 Vercel Dashboard → Deployments → Functions 查看日志

### 3. 测试超时

```bash
# 本地测试
curl -X POST http://localhost:3000/api/cron/scan \
  -H "Authorization: Bearer your-token"

# Vercel 测试
curl -X POST https://your-app.vercel.app/api/cron/scan \
  -H "Authorization: Bearer your-token"
```

### 4. 监控执行时间

```typescript
app.post("/cron/scan", async (c) => {
  const start = Date.now();
  const result = await cronScan(3);
  const duration = Date.now() - start;
  
  console.log(`Scan completed in ${duration}ms`);
  
  return c.json({ ...result, duration });
});
```

---

## 常见问题

### Q: 为什么本地开发没问题，Vercel 就超时？

A: 本地没有时间限制，Vercel 有 10-60 秒的限制。

### Q: 可以增加 Vercel 函数超时时间吗？

A: 可以，但需要升级到 Pro 或 Enterprise 计划。

### Q: 队列会丢失吗？

A: 内存队列会在函数重启时丢失，使用 Redis 等持久化队列可以避免。

### Q: 如何确保所有站点都被扫描？

A: 使用方案 1，设置足够频繁的 Cron，或使用方案 3 的持久化队列。

---

## 当前配置（已实施）

项目已采用**方案 1**的优化配置：

### 代码修改

`lib/logic/scan.ts`:
```typescript
export async function cronScan(maxSites = 3) {
  // ... 代码 ...
  .slice(0, maxSites); // 限制每次扫描数量
}
```

`app/api/[...hono]/route.ts`:
```typescript
app.post("/cron/scan", async (c) => {
  // 支持通过查询参数限制扫描数量
  const maxParam = new URL(c.req.url).searchParams.get("max");
  const maxSites = maxParam ? parseInt(maxParam, 10) : 3;
  const result = await cronScan(maxSites);
  return c.json(result);
});
```

### Vercel Cron 配置

`vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/scan?max=1",
    "schedule": "*/10 * * * *"
  }]
}
```

**配置说明**:
- 每 10 分钟执行一次
- 每次扫描 1 个站点（最安全，不会超时）
- 8 个站点约 80 分钟完成一轮
- 每月消耗约 4,320 次函数调用

### 使用效果

✅ **不会超时** - 单个站点扫描在 10 秒内完成  
✅ **资源充足** - 仅占用 0.43% 的免费限额  
✅ **稳定可靠** - 每个站点约 80 分钟扫描一次  

详细配置说明请参考 [Cron 配置文档](CRON_CONFIGURATION.md)。

---

*文档更新时间: 2025年10月4日*
