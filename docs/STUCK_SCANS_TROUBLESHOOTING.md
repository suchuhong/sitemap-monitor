# 卡住的扫描故障排查

## 问题描述

扫描任务一直显示"进行中"状态，这通常是因为 Vercel 函数超时导致的。当函数超时时，数据库中的扫描状态没有被更新，导致显示为永久"运行中"。

## 原因

1. **Vercel 函数超时**: 免费/Hobby 计划限制为 10 秒
2. **网络延迟**: Sitemap 下载时间过长
3. **数据量大**: URL 数量太多，处理时间超过限制
4. **数据库操作慢**: 大量插入/更新操作

## 解决方案

### 1. 自动清理（推荐）

系统现在会在每次 cron 运行时自动清理超过 15 分钟的卡住扫描。

### 2. 手动清理 - 使用 API

调用清理端点：

```bash
# 使用 CRON_TOKEN
curl -X POST "https://your-domain.vercel.app/api/cron/cleanup?token=YOUR_CRON_TOKEN"

# 或使用 Authorization header
curl -X POST "https://your-domain.vercel.app/api/cron/cleanup" \
  -H "Authorization: Bearer YOUR_CRON_TOKEN"
```

响应示例：
```json
{
  "ok": true,
  "cleaned": 3,
  "message": "Cleaned up 3 stuck scans"
}
```

### 3. 手动清理 - 使用脚本

运行清理脚本：

```bash
pnpm tsx scripts/cleanup-stuck-scans.ts
```

### 4. 手动清理 - 直接操作数据库

如果你有数据库访问权限：

```sql
-- 查看卡住的扫描
SELECT id, site_id, status, started_at, 
       EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_running
FROM sitemap_monitor_scans
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '15 minutes';

-- 清理卡住的扫描
UPDATE sitemap_monitor_scans
SET status = 'failed',
    finished_at = NOW(),
    error = 'Scan timeout - manually cleaned'
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '15 minutes';
```

## 预防措施

### 1. 优化配置

确保 `vercel.json` 配置正确：

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

### 2. 监控扫描时间

在 Vercel Dashboard 中查看函数执行时间：
- Functions → 选择函数 → Invocations
- 查看执行时间分布
- 识别超时的调用

### 3. 调整扫描策略

如果经常超时，考虑：

**选项 A: 减少单次扫描的站点数**
```json
{
  "path": "/api/cron/scan?max=1",  // 已经是最小值
  "schedule": "*/3 * * * *"         // 增加频率
}
```

**选项 B: 为大型站点设置更长的扫描间隔**

在站点设置中：
- 扫描间隔: 设置为更长时间（如 1440 分钟 = 24 小时）
- 扫描优先级: 降低优先级

**选项 C: 升级 Vercel 计划**
- Pro 计划: 60 秒执行时间
- Enterprise 计划: 900 秒执行时间

### 4. 使用外部队列服务

对于大规模应用，考虑使用：

**Inngest** (推荐)
```typescript
import { inngest } from "./inngest/client";

export const scanSite = inngest.createFunction(
  { id: "scan-site", timeout: "5m" },
  { event: "site/scan.requested" },
  async ({ event }) => {
    // 扫描逻辑
  }
);
```

**Upstash QStash**
```typescript
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN });

await qstash.publishJSON({
  url: "https://your-domain.vercel.app/api/scan-worker",
  body: { siteId: "..." },
});
```

## 当前优化

系统已实施以下优化：

### 1. 超时保护

每次扫描都有 8 秒超时保护：

```typescript
const scanPromise = executeScan({ scanId, siteId });
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error("Scan timeout")), 8000)
);

await Promise.race([scanPromise, timeoutPromise]);
```

### 2. 自动清理

每次 cron 运行时自动清理超过 15 分钟的卡住扫描。

### 3. 网络超时

Sitemap 获取超时设置为 8 秒：

```typescript
res = await retry(
  () => fetchWithCompression(sm.url, { timeout: 8000, headers }), 
  2
);
```

### 4. 批量操作

优化了数据库操作，减少往返次数。

## 监控和告警

### 设置 Vercel 告警

1. 进入 Vercel Dashboard
2. Settings → Notifications
3. 添加告警规则：
   - Function Errors
   - Function Timeouts
   - Function Duration > 8s

### 日志监控

查看 Vercel 日志：
```bash
vercel logs --follow
```

查找超时错误：
```bash
vercel logs | grep -i timeout
```

## 常见问题

### Q: 为什么扫描一直显示"进行中"？

A: 这是因为 Vercel 函数超时了，但数据库状态没有更新。使用上述清理方法解决。

### Q: 如何知道哪些站点容易超时？

A: 查看 Vercel 日志，或在数据库中查询：

```sql
SELECT s.root_url, COUNT(*) as timeout_count
FROM sitemap_monitor_scans sc
JOIN sitemap_monitor_sites s ON sc.site_id = s.id
WHERE sc.status = 'failed' 
  AND sc.error LIKE '%timeout%'
GROUP BY s.root_url
ORDER BY timeout_count DESC;
```

### Q: 可以增加超时时间吗？

A: 
- 免费/Hobby 计划: 不能，固定 10 秒
- Pro 计划: 可以设置 `maxDuration: 60`
- Enterprise 计划: 可以设置 `maxDuration: 900`

### Q: 如何临时禁用某个站点的扫描？

A: 在站点设置中将 "enabled" 设置为 false。

## 相关文档

- [SCAN_TIMEOUT_OPTIMIZATION.md](./SCAN_TIMEOUT_OPTIMIZATION.md) - 扫描超时优化
- [SCAN_OPTIMIZATION_SUMMARY.md](./SCAN_OPTIMIZATION_SUMMARY.md) - 优化总结
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Vercel 部署指南
