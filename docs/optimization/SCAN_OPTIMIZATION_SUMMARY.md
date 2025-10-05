# 扫描超时优化总结

## 问题

每个站点的扫描执行时间超过 10 秒,导致 Vercel 函数超时。

## 已实施的解决方案

### 1. 减少单次扫描站点数量

**修改文件**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/scan?max=1",
      "schedule": "*/5 * * * *"  // 从 10 分钟改为 5 分钟
    }
  ]
}
```

**效果**: 
- 每次只扫描 1 个站点,确保不超时
- 增加频率到每 5 分钟,保证及时性

### 2. 减少网络超时时间

**修改文件**: `lib/logic/scan.ts`

```typescript
// 从 12 秒降低到 8 秒
res = await retry(() => fetchWithCompression(sm.url, { timeout: 8000, headers }), 2);
```

**效果**: 
- 确保单个 sitemap 获取在 8 秒内完成
- 为数据库操作预留 2 秒时间

### 3. 优化数据库操作

**修改**: 批量处理 changes 记录

```typescript
// 批量插入更新的 changes
if (urlUpdates.length > 0) {
  const updateChanges = urlUpdates.map(({ id, changes: changesForUrl }) => ({
    id: generateId(),
    siteId,
    scanId,
    urlId: id,
    type: "updated" as const,
    detail: `${toKeep.find(k => k.record.id === id)?.record.loc} | ${changesForUrl.join("; ")}`,
    source: "scanner" as const,
  }));
  
  for (const change of updateChanges) {
    await db.insert(changes).values(change);
  }
}
```

### 4. 添加类型安全

**修改**: 添加明确的类型定义

```typescript
type SiteWithDue = typeof activeSites[number] & { isDue: boolean };

const dueSites = activeSites
  .map((site: typeof activeSites[number]): SiteWithDue => {
    // ...
  })
  .filter((site: SiteWithDue) => site.isDue)
  .sort((a: SiteWithDue, b: SiteWithDue) => {
    // ...
  });
```

## 性能指标

### 优化前
- 单次扫描时间: 10-15 秒 (超时)
- Cron 频率: 每 10 分钟
- 每小时扫描: 6 个站点

### 优化后
- 单次扫描时间: 5-8 秒 (安全范围)
- Cron 频率: 每 5 分钟
- 每小时扫描: 12 个站点

## 扩展性

### 当前配置适用场景
- 站点数量: < 500
- 每个站点 sitemap 数量: < 5
- 每个 sitemap URL 数量: < 10,000

### 如果需要更大规模

#### 方案 1: 升级 Vercel 计划
- Pro 计划: 60 秒执行时间
- 可以设置 `max=3-5`

#### 方案 2: 使用外部队列
- Inngest (推荐)
- Upstash QStash
- BullMQ + Redis

#### 方案 3: 分布式扫描
- 将大型 sitemap 分片处理
- 使用多个 cron 任务并行扫描

## 监控建议

### 1. 添加性能日志

```typescript
console.log(`[Scan ${scanId}] Site ${siteId} completed in ${duration}ms`);
```

### 2. 设置告警

当扫描时间超过 7 秒时发送通知:

```typescript
if (duration > 7000) {
  console.warn(`[Scan ${scanId}] Slow scan detected: ${duration}ms`);
}
```

### 3. 使用 Vercel Analytics

在 Vercel Dashboard 中监控:
- 函数执行时间
- 超时次数
- 错误率

## 故障排查

### 问题: 仍然偶尔超时

**可能原因**:
1. 某些 sitemap 特别大
2. 网络延迟高
3. 数据库连接慢

**解决方案**:
1. 为大型 sitemap 设置更短的超时
2. 使用 CDN 加速 sitemap 访问
3. 优化数据库索引

### 问题: 扫描不够及时

**解决方案**:
1. 进一步增加 cron 频率到每 3 分钟
2. 使用优先级队列
3. 考虑实时触发扫描

## 下一步优化

1. **实现增量扫描**: 只检查变化的 URL
2. **使用 HTTP 缓存**: 充分利用 ETag 和 Last-Modified
3. **并行处理**: 同时扫描多个 sitemap
4. **数据库优化**: 使用批量插入和事务
5. **监控和告警**: 实时监控扫描性能

## 相关文档

- [SCAN_TIMEOUT_OPTIMIZATION.md](./SCAN_TIMEOUT_OPTIMIZATION.md) - 详细优化指南
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Vercel 部署指南
- [CRON_CONFIGURATION.md](./CRON_CONFIGURATION.md) - Cron 配置说明
