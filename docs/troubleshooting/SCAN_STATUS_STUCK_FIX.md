# 扫描状态卡住问题修复

## 问题描述

扫描任务已经完成，但状态仍然显示为 `running`（运行中），导致：
1. 用户看到错误的状态信息
2. 统计数据不准确
3. 可能影响后续扫描任务的调度

## 问题根源

### 1. 缺少状态更新的安全网

`executeScan` 函数中，如果数据库更新失败但没有抛出异常，状态就会卡在 `running`：

```typescript
// 问题代码
try {
  // ... 扫描逻辑 ...
  await db.update(scans).set({ status: "success" }); // ❌ 如果这里失败了？
} catch (error) {
  await db.update(scans).set({ status: "failed" });
  throw error;
}
// ❌ 没有 finally 块确保状态一定会被更新
```

### 2. 重复设置 running 状态

在 `startQueuedScans` 中，状态被设置为 `running` 两次：

```typescript
// 第一次：在 startQueuedScans 中
await db.update(scans).set({ status: "running" });

// 第二次：在 executeScan 开始时
await db.update(scans).set({ status: "running" });
```

这可能导致竞态条件。

### 3. 数据库更新失败没有被捕获

如果数据库更新操作失败，可能不会抛出异常，导致状态更新被静默忽略。

## 解决方案

### 1. 添加状态更新标志

使用 `statusUpdated` 标志跟踪状态是否已更新：

```typescript
async function executeScan({ scanId, siteId }: ScanJob) {
  let statusUpdated = false; // ✅ 添加标志
  
  try {
    // ... 扫描逻辑 ...
    await db.update(scans).set({ status: "success" });
    statusUpdated = true; // ✅ 标记已更新
  } catch (error) {
    await db.update(scans).set({ status: "failed" });
    statusUpdated = true; // ✅ 标记已更新
    throw error;
  } finally {
    // ✅ 安全网：如果状态还没更新，强制更新
    if (!statusUpdated) {
      await db.update(scans).set({ 
        status: "failed",
        error: "Status update failed - forced by safety net"
      });
    }
  }
}
```

### 2. 增强错误处理

为每个数据库更新操作添加 try-catch：

```typescript
try {
  await db.update(scans).set({ status: "success" });
  statusUpdated = true;
} catch (err) {
  console.error(`Failed to update scan status: ${scanId}`, err);
  throw err; // ✅ 确保错误被抛出
}
```

### 3. 移除重复的状态设置

在 `startQueuedScans` 中，不再手动设置 `running` 状态，让 `executeScan` 内部处理：

```typescript
// 优化前
await db.update(scans).set({ status: "running" }); // ❌ 重复
executeScan({ scanId, siteId });

// 优化后
executeScan({ scanId, siteId }); // ✅ 内部会设置 running
```

### 4. 添加详细日志

添加日志帮助调试：

```typescript
console.error(`[SAFETY NET] Scan ${scanId} status was not updated, forcing to failed`);
```

## 修复后的代码结构

```typescript
async function executeScan({ scanId, siteId }: ScanJob) {
  const db = resolveDb() as any;
  const startTime = new Date();
  let statusUpdated = false;
  
  // 1. 设置为 running
  try {
    await db.update(scans).set({ status: "running", startedAt: startTime });
  } catch (err) {
    console.error(`Failed to update scan status to running: ${scanId}`, err);
    throw err;
  }

  try {
    // 2. 执行扫描逻辑
    // ...
    
    // 3. 更新为 success/failed
    try {
      await db.update(scans).set({ status, finishedAt, ... });
      statusUpdated = true; // ✅ 标记已更新
    } catch (err) {
      console.error(`Failed to update scan status to ${status}: ${scanId}`, err);
      throw err;
    }
    
    return result;
  } catch (error) {
    // 4. 异常处理
    try {
      await db.update(scans).set({ status: "failed", ... });
      statusUpdated = true; // ✅ 标记已更新
    } catch (updateErr) {
      console.error(`Failed to update scan status to failed: ${scanId}`, updateErr);
    }
    throw error;
  } finally {
    // 5. 安全网：确保状态一定会被更新
    if (!statusUpdated) {
      console.error(`[SAFETY NET] Scan ${scanId} status was not updated, forcing to failed`);
      try {
        await db.update(scans).set({
          status: "failed",
          finishedAt: new Date(),
          error: "Status update failed - forced by safety net",
        });
      } catch (finalErr) {
        console.error(`[SAFETY NET] Failed to force update scan status: ${scanId}`, finalErr);
      }
    }
  }
}
```

## 测试方法

### 1. 正常扫描测试

```bash
# 触发扫描
curl -X POST "http://localhost:3000/api/sites/{siteId}/scan" \
  -H "Cookie: session=your-session"

# 等待完成后检查状态
psql $DATABASE_URL -c "
  SELECT id, status, started_at, finished_at, error
  FROM sitemap_monitor_scans
  WHERE id = 'scan_xxx';
"

# 应该看到：
# - status = 'success' 或 'failed'
# - finished_at 不为空
```

### 2. 数据库故障测试

模拟数据库更新失败：

```typescript
// 临时修改代码，模拟更新失败
await db.update(scans).set({ status: "success" });
throw new Error("Simulated DB error"); // 模拟失败
```

预期结果：
- finally 块会捕获并强制更新状态为 `failed`
- 日志中会看到 `[SAFETY NET]` 消息

### 3. 查找卡住的扫描

```sql
-- 查找运行超过 15 分钟的扫描
SELECT id, site_id, status, started_at,
       EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_running
FROM sitemap_monitor_scans
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '15 minutes'
ORDER BY started_at;
```

### 4. 手动修复卡住的扫描

```sql
-- 将卡住的扫描标记为失败
UPDATE sitemap_monitor_scans
SET status = 'failed',
    finished_at = NOW(),
    error = 'Manual fix - scan was stuck in running state'
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '15 minutes';
```

## 监控和告警

### 1. 监控卡住的扫描

创建一个监控脚本：

```bash
#!/bin/bash
# monitor-stuck-scans.sh

STUCK_COUNT=$(psql $DATABASE_URL -t -c "
  SELECT COUNT(*)
  FROM sitemap_monitor_scans
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '15 minutes';
")

if [ "$STUCK_COUNT" -gt 0 ]; then
  echo "⚠️  Found $STUCK_COUNT stuck scans!"
  # 发送告警
  curl -X POST "https://your-webhook-url" \
    -d "{\"text\": \"Found $STUCK_COUNT stuck scans\"}"
fi
```

### 2. 定期清理

添加到 crontab：

```bash
# 每小时检查一次
0 * * * * /path/to/monitor-stuck-scans.sh

# 每天清理一次
0 2 * * * curl -X POST "http://localhost:3000/api/cron/cleanup" \
  -H "x-cron-token: your-token"
```

### 3. 日志监控

监控日志中的关键词：

```bash
# 查找安全网触发的日志
grep "SAFETY NET" /var/log/app.log

# 查找状态更新失败的日志
grep "Failed to update scan status" /var/log/app.log
```

## 预防措施

### 1. 数据库连接池配置

确保数据库连接池配置合理：

```typescript
// lib/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // 最大连接数
  idleTimeoutMillis: 30000,   // 空闲超时
  connectionTimeoutMillis: 10000, // 连接超时
});
```

### 2. 添加数据库健康检查

```typescript
async function checkDatabaseHealth() {
  try {
    const db = resolveDb();
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (err) {
    console.error("Database health check failed:", err);
    return false;
  }
}
```

### 3. 使用事务

对于关键的状态更新，使用事务确保原子性：

```typescript
await db.transaction(async (tx) => {
  await tx.update(scans).set({ status: "success" });
  await tx.update(sites).set({ lastScanAt: new Date() });
});
```

## 相关文档

- [队列系统优化](./QUEUE_OPTIMIZATION.md)
- [Cron Scan 优化](./CRON_SCAN_OPTIMIZATION.md)
- [扫描状态筛选修复](./SCAN_STATUS_FIX.md)

## 总结

通过添加状态更新标志和 finally 安全网，现在可以确保扫描状态一定会被正确更新，不会再出现卡在 `running` 状态的问题。

**修复内容**：
- ✅ 添加 `statusUpdated` 标志跟踪状态
- ✅ 添加 finally 块作为安全网
- ✅ 增强错误处理和日志
- ✅ 移除重复的状态设置
- ✅ 确保数据库更新失败会被捕获

**预期效果**：
- ✅ 扫描完成后状态正确更新
- ✅ 即使数据库更新失败也会被捕获
- ✅ 详细的日志帮助调试
- ✅ 不再有卡住的扫描任务
