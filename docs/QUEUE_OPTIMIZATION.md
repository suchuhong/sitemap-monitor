# 队列系统优化文档

## 问题描述

在本地开发环境中，扫描任务队列存在以下问题：
1. 任务不执行或一直保持在执行中状态
2. 内存队列在进程重启后丢失
3. 并发控制不可靠
4. 任务状态不一致

## 优化方案

### 1. 基于数据库的队列系统

**之前**：使用内存数组 `scanQueue` 和全局标志 `processing`
```typescript
const scanQueue: ScanJob[] = [];
let processing = false;
```

**现在**：使用数据库中的 `scans` 表作为队列，通过 `status` 字段管理任务状态

### 2. 改进的任务入队逻辑

**enqueueScan 函数优化**：
- 检查是否已有该站点的活跃扫描任务（running 或 queued）
- 避免重复创建扫描任务
- 立即尝试处理队列中的任务
- 返回更详细的状态信息

```typescript
export async function enqueueScan(siteId: string) {
  // 检查是否已有活跃扫描
  const hasActiveScans = existingScans.some((scan: any) => 
    scan.status === "running" || scan.status === "queued"
  );
  
  if (hasActiveScans) {
    return { 
      scanId: existingId,
      status: "already_running",
      message: "该站点已有扫描任务在执行中"
    };
  }
  
  // 创建新任务并立即处理
  await db.insert(scans).values({ id: scanId, siteId, status: "queued" });
  await processQueuedScans();
  
  return { scanId, status: "queued" };
}
```

### 3. 新增队列处理函数

**startQueuedScans**（异步，快速返回）：
- 从数据库中获取所有 `queued` 状态的任务
- 立即启动任务但不等待完成
- 适用于 API 端点，避免阻塞
- 支持并发控制（maxConcurrent 参数）

```typescript
export async function startQueuedScans(maxConcurrent = 1) {
  const queuedScans = await db
    .select()
    .from(scans)
    .where(eq(scans.status, "queued"))
    .limit(maxConcurrent);
  
  for (const scan of queuedScans) {
    await db.update(scans)
      .set({ status: "running" })
      .where(eq(scans.id, scan.id));
    
    // 异步执行，不等待完成
    executeScan({ scanId: scan.id, siteId: scan.siteId })
      .catch(err => handleScanError(scan.id, err));
  }
  
  return { started: queuedScans.length };
}
```

**processQueuedScans**（同步，等待完成）：
- 等待所有任务完成后返回
- 适用于定时任务或需要结果的场景
- 不推荐在 API 端点中使用（会阻塞）

### 4. 改进的 runScanNow 函数

- 直接将状态设置为 `running`（而不是 `queued`）
- 添加错误处理，确保失败时更新状态
- 使用 try-catch 包裹执行逻辑

### 5. 新增 API 端点

**POST /api/cron/process-queue**
- 处理数据库中排队的扫描任务
- 支持 `max` 参数控制并发数量
- 需要 CRON_TOKEN 认证

```bash
# 处理最多 3 个排队任务
curl -X POST "http://localhost:3000/api/cron/process-queue?max=3" \
  -H "x-cron-token: your-token"
```

## 使用方法

### 本地开发环境

1. **定时扫描**（快速返回，异步执行）：
```bash
curl -X POST "http://localhost:3000/api/cron/scan?max=3" \
  -H "x-cron-token: your-cron-token"

# 响应示例：
# {
#   "sitesChecked": 10,
#   "dueCount": 3,
#   "processed": 3,
#   "results": [
#     { "siteId": "xxx", "scanId": "yyy", "status": "queued" }
#   ]
# }
```

2. **手动触发队列处理**（快速返回，异步执行）：
```bash
curl -X POST "http://localhost:3000/api/cron/process-queue" \
  -H "x-cron-token: your-cron-token"

# 响应示例：
# {
#   "started": 2,
#   "scans": [
#     { "scanId": "xxx", "siteId": "yyy" },
#     { "scanId": "aaa", "siteId": "bbb" }
#   ],
#   "message": "已启动 2 个扫描任务"
# }
```

2. **设置定时任务**（可选）：
在 `.env` 中配置：
```env
CRON_TOKEN=your-secret-token
```

然后使用 cron 或其他调度工具定期调用：
```bash
# 每 10 分钟扫描一次到期的站点
*/10 * * * * curl -X POST "http://localhost:3000/api/cron/scan?max=5" -H "x-cron-token: your-secret-token"

# 每 5 分钟处理一次队列（可选，作为备份）
*/5 * * * * curl -X POST "http://localhost:3000/api/cron/process-queue?max=3" -H "x-cron-token: your-secret-token"
```

3. **清理卡住的任务**：
```bash
curl -X POST "http://localhost:3000/api/cron/cleanup" \
  -H "x-cron-token: your-cron-token"
```

### 生产环境

在 Vercel 或其他平台配置 Cron Jobs：

```json
{
  "crons": [
    {
      "path": "/api/cron/process-queue?max=3",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 * * * *"
    }
  ]
}
```

## 任务状态流转

```
queued → running → success/failed
   ↓         ↓
   └─────────┴──→ (超时) → failed
```

- **queued**: 任务已创建，等待执行
- **running**: 任务正在执行中
- **success**: 任务执行成功
- **failed**: 任务执行失败或超时

## 监控和调试

### 查看队列状态

```sql
-- 查看所有排队中的任务
SELECT * FROM sitemap_monitor_scans WHERE status = 'queued';

-- 查看运行中的任务
SELECT * FROM sitemap_monitor_scans WHERE status = 'running';

-- 查看超时的任务（超过 15 分钟）
SELECT * FROM sitemap_monitor_scans 
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '15 minutes';
```

### 手动修复卡住的任务

```sql
-- 将卡住的任务标记为失败
UPDATE sitemap_monitor_scans 
SET status = 'failed', 
    finished_at = NOW(),
    error = 'Manual cleanup - task stuck'
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '15 minutes';
```

## 优势

1. **可靠性**：基于数据库，任务不会因进程重启而丢失
2. **可追溯**：所有任务状态都记录在数据库中
3. **可恢复**：卡住的任务可以被自动清理和重试
4. **可扩展**：支持并发控制和批量处理
5. **易调试**：可以直接查询数据库了解任务状态
6. **非阻塞**：API 端点快速返回，任务在后台异步执行

## 扫描完成通知

系统现在会在每次扫描完成时发送通知（无论成功还是失败）。详见 [SCAN_NOTIFICATIONS.md](./SCAN_NOTIFICATIONS.md)

通知包含：
- ✅ 成功：统计信息、变更详情、耗时
- ❌ 失败：错误信息、耗时

支持的通知渠道：
- Webhook（推荐）
- Email（需要 Node.js Runtime）
- Slack

## 注意事项

1. 确保 `DATABASE_URL` 环境变量正确配置
2. 在生产环境中务必设置 `CRON_TOKEN` 保护 API 端点
3. 根据实际负载调整 `maxConcurrent` 参数
4. 定期运行 cleanup 任务清理超时的扫描
5. 监控数据库中 `queued` 和 `running` 状态的任务数量
6. 配置通知渠道以接收扫描完成通知
