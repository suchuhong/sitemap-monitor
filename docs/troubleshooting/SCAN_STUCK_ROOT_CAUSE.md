# 🔍 扫描卡在 Running 状态的根本原因分析

## 问题现象

手动触发扫描后，扫描任务一直处于 `running` 状态，无法完成。

## 🎯 根本原因

经过深入分析，发现了以下几个关键问题：

### 1. **异步执行在 Serverless 环境中的问题** ⚠️

**问题代码** (`lib/logic/scan.ts`):

```typescript
export async function enqueueScan(siteId: string) {
  // ... 创建扫描记录 ...
  
  // 异步触发处理，不等待完成
  processQueuedScans(1)
    .then(result => {
      console.log(`[enqueueScan] Background processing completed:`, result);
    })
    .catch(err => {
      console.error(`[enqueueScan] Background scan processing failed:`, err);
    });

  return { scanId, status: "queued" };
}
```

**问题**:
- API 请求立即返回（返回 `queued` 状态）
- `processQueuedScans` 异步执行
- 在 Serverless 环境（如 Vercel）中，一旦主请求返回，函数实例可能被冻结或终止
- 后台任务可能根本没有执行，或执行到一半被中断

**结果**:
- 扫描记录创建成功（状态为 `queued`）
- 但 `processQueuedScans` 可能没有真正执行
- 或者执行了但被中断，状态从 `queued` 变为 `running` 后就卡住了

### 2. **没有超时保护机制**

当前代码移除了 Vercel 超时限制后，没有任何超时保护：

```typescript
// 之前有 8 秒超时
res = await retry(() => fetchWithCompression(sm.url, { timeout: 8000, headers }), 2);

// 现在是 30 秒超时
res = await retry(() => fetchWithCompression(sm.url, { timeout: 30000, headers }), 2);
```

**问题**:
- 如果 sitemap 下载时间超过 30 秒，会抛出异常
- 但在 Serverless 环境中，函数可能在 10 秒时就被终止了
- 状态更新的 `finally` 块可能不会执行

### 3. **状态更新依赖 finally 块**

```typescript
finally {
  if (!statusUpdated) {
    console.error(`[SAFETY NET] Scan ${scanId} status was not updated, forcing to failed`);
    await db.update(scans).set({
      status: "failed",
      finishedAt: new Date(),
      error: "Status update failed - forced by safety net",
    });
  }
}
```

**问题**:
- 如果函数被强制终止，`finally` 块不会执行
- 状态永远停留在 `running`

## 🔬 验证方法

### 1. 检查日志

如果看到以下日志模式，说明问题确实存在：

```
[enqueueScan] Starting for site xxx
[enqueueScan] Creating new scan yyy for site xxx
[enqueueScan] Successfully created scan yyy
[enqueueScan] Triggering background processing
```

**但没有看到**:
```
[processQueuedScans] Starting, maxConcurrent: 1
[processQueuedScans] Found 1 queued scans
[executeScan] Starting scan yyy for site xxx
```

这说明 `processQueuedScans` 根本没有执行。

### 2. 检查数据库

```sql
-- 查看扫描状态
SELECT id, status, started_at, finished_at
FROM sitemap_monitor_scans
WHERE site_id = 'your-site-id'
ORDER BY started_at DESC
LIMIT 5;
```

如果看到：
- 状态为 `queued` 且一直不变 → `processQueuedScans` 没有执行
- 状态为 `running` 且一直不变 → 执行到一半被中断

## ✅ 解决方案

### 方案 1: 同步执行扫描（推荐用于非 Serverless）

修改 `enqueueScan` 函数，等待扫描完成：

```typescript
export async function enqueueScan(siteId: string) {
  const db = resolveDb() as any;
  const scanId = generateId();

  // 检查是否已有活动扫描
  const existingScans = await db
    .select()
    .from(scans)
    .where(eq(scans.siteId, siteId));

  const hasActiveScans = existingScans.some((scan: any) =>
    scan.status === "running" || scan.status === "queued"
  );

  if (hasActiveScans) {
    const activeScan = existingScans.find((s: any) => 
      s.status === "running" || s.status === "queued"
    );
    return {
      scanId: activeScan?.id,
      status: "already_running",
      message: "该站点已有扫描任务在执行中"
    };
  }

  // 创建扫描记录
  await db
    .insert(scans)
    .values({ id: scanId, siteId, status: "queued", startedAt: new Date() });

  // 🔧 修复: 同步执行扫描
  try {
    await executeScan({ scanId, siteId });
    return { scanId, status: "success" };
  } catch (err) {
    console.error(`[enqueueScan] Scan failed:`, err);
    return { scanId, status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
```

**优点**:
- 扫描一定会完成
- 状态一定会更新
- 适合 VPS、Docker 等长时间运行环境

**缺点**:
- API 响应时间变长（需要等待扫描完成）
- 不适合 Vercel 等 Serverless 环境

### 方案 2: 使用独立的队列处理器（推荐用于 Serverless）

创建一个独立的 API 端点来处理队列：

```typescript
// app/api/[...hono]/route.ts

app.post("/cron/process-queue", async (c) => {
  // 认证检查
  const expectedToken = process.env.CRON_TOKEN;
  if (expectedToken) {
    // ... 认证逻辑 ...
  }

  // 处理队列中的扫描
  const result = await processQueuedScans(1);
  return c.json(result);
});
```

然后在 `vercel.json` 中配置 Cron：

```json
{
  "crons": [
    {
      "path": "/api/cron/process-queue",
      "schedule": "* * * * *"  // 每分钟执行一次
    }
  ]
}
```

**优点**:
- 适合 Serverless 环境
- API 响应快速
- 队列处理独立

**缺点**:
- 需要等待 Cron 触发（最多 1 分钟）
- 需要配置 Cron 任务

### 方案 3: 混合方案（最佳）

结合两种方案的优点：

```typescript
export async function enqueueScan(siteId: string) {
  const db = resolveDb() as any;
  const scanId = generateId();

  // 检查是否已有活动扫描
  const existingScans = await db
    .select()
    .from(scans)
    .where(eq(scans.siteId, siteId));

  const hasActiveScans = existingScans.some((scan: any) =>
    scan.status === "running" || scan.status === "queued"
  );

  if (hasActiveScans) {
    const activeScan = existingScans.find((s: any) => 
      s.status === "running" || s.status === "queued"
    );
    return {
      scanId: activeScan?.id,
      status: "already_running",
      message: "该站点已有扫描任务在执行中"
    };
  }

  // 创建扫描记录
  await db
    .insert(scans)
    .values({ id: scanId, siteId, status: "queued", startedAt: new Date() });

  // 🔧 根据环境选择执行方式
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    // Serverless: 返回 queued，等待 Cron 处理
    return { scanId, status: "queued" };
  } else {
    // 非 Serverless: 立即执行
    try {
      await executeScan({ scanId, siteId });
      return { scanId, status: "success" };
    } catch (err) {
      console.error(`[enqueueScan] Scan failed:`, err);
      return { scanId, status: "failed", error: err instanceof Error ? err.message : String(err) };
    }
  }
}
```

## 🧪 测试验证

### 1. 本地测试

```bash
# 启动开发服务器
pnpm dev

# 触发扫描
curl -X POST "http://localhost:3000/api/sites/{site-id}/scan" \
  -H "Cookie: session=YOUR_SESSION"

# 查看日志，应该看到完整的执行流程
```

### 2. 数据库验证

```sql
-- 查看扫描状态
SELECT id, status, started_at, finished_at,
       EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at)) as duration_seconds
FROM sitemap_monitor_scans
WHERE site_id = 'your-site-id'
ORDER BY started_at DESC
LIMIT 5;
```

应该看到：
- 状态为 `success` 或 `failed`（不是 `running` 或 `queued`）
- `finished_at` 有值

## 📊 临时解决方案

在修复代码之前，可以使用以下临时方案：

### 1. 定期清理卡住的扫描

```bash
# 每 5 分钟清理一次
*/5 * * * * DATABASE_URL="..." pnpm tsx scripts/force-cleanup-all-stuck.ts 2
```

### 2. 手动触发队列处理

```bash
# 手动处理队列
curl -X POST "http://localhost:3000/api/cron/process-queue" \
  -H "x-cron-token: YOUR_TOKEN"
```

### 3. 使用测试脚本直接扫描

```bash
# 绕过队列，直接扫描
DATABASE_URL="..." pnpm tsx scripts/test-manual-scan.ts <site-id>
```

## 🎯 推荐行动

1. **立即**: 运行清理脚本清理卡住的扫描
   ```bash
   DATABASE_URL="..." pnpm tsx scripts/force-cleanup-all-stuck.ts 2
   ```

2. **短期**: 设置定期清理 Cron
   ```bash
   */5 * * * * DATABASE_URL="..." pnpm tsx scripts/force-cleanup-all-stuck.ts 2
   ```

3. **长期**: 实施方案 3（混合方案）
   - 修改 `enqueueScan` 函数
   - 根据环境选择执行方式
   - 添加独立的队列处理 Cron

## 📚 相关文档

- [QUICK_FIX_RUNNING_SCANS.md](QUICK_FIX_RUNNING_SCANS.md) - 快速修复指南
- [TIMEOUT_REMOVAL_SUMMARY.md](TIMEOUT_REMOVAL_SUMMARY.md) - 超时移除总结
- [DEBUG_MANUAL_SCAN.md](docs/DEBUG_MANUAL_SCAN.md) - 调试指南

---

**分析时间**: 2025年10月5日
**严重程度**: 高
**影响范围**: 所有手动触发的扫描
