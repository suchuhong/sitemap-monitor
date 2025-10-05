# 性能优化指南

## 已完成的优化

### 1. Dashboard 查询优化 ✅

#### 优化前
- 查询所有变更记录（130K+ 行）到应用层
- 在 JavaScript 中过滤和聚合数据
- 多个串行查询

#### 优化后
- 使用 SQL 聚合查询（GROUP BY, COUNT, AVG）
- 数据库层面完成计算，只返回结果
- 使用 Promise.all 并行查询

#### 性能提升
- **数据传输量**: 减少 99%+
- **查询时间**: 从秒级降至毫秒级
- **内存使用**: 大幅降低

### 2. 具体优化

#### 变更统计
```typescript
// 优化前：传输 130K+ 行数据
const changeRows = await db.select().from(changes)...
const added = changeRows.filter(row => row.type === 'added').length;

// 优化后：只返回聚合结果
const changeStats = await db
  .select({
    type: changes.type,
    count: sql<number>`COUNT(*)::int`,
  })
  .groupBy(changes.type);
```

#### 趋势分析
```typescript
// 优化前：处理所有记录
for (const row of trendChangeRows) {
  // 应用层聚合
}

// 优化后：数据库聚合
.select({
  day: sql<string>`DATE(${changes.occurredAt})`,
  type: changes.type,
  count: sql<number>`COUNT(*)::int`,
})
.groupBy(sql`DATE(${changes.occurredAt})`, changes.type)
```

#### 扫描统计
```typescript
// 优化前：计算所有扫描的平均时长
const duration = completedScans.reduce((sum, row) => {
  return sum + (end - start) / 1000;
}, 0) / completedScans.length;

// 优化后：SQL 聚合函数
.select({
  avgDuration: sql<number>`AVG(EXTRACT(EPOCH FROM (${scans.finishedAt} - ${scans.startedAt})))`,
})
```

---

## 推荐的数据库索引

为了进一步提升性能，建议添加以下索引：

### 1. Changes 表索引

```sql
-- 按站点和时间查询
CREATE INDEX idx_changes_site_occurred 
ON sitemap_monitor_changes(site_id, occurred_at DESC);

-- 按类型和时间查询
CREATE INDEX idx_changes_type_occurred 
ON sitemap_monitor_changes(type, occurred_at DESC);

-- 复合索引用于 Dashboard 查询
CREATE INDEX idx_changes_site_type_occurred 
ON sitemap_monitor_changes(site_id, type, occurred_at DESC);
```

### 2. Scans 表索引

```sql
-- 按站点和时间查询
CREATE INDEX idx_scans_site_started 
ON sitemap_monitor_scans(site_id, started_at DESC);

-- 按状态查询
CREATE INDEX idx_scans_status 
ON sitemap_monitor_scans(status);

-- 复合索引用于统计查询
CREATE INDEX idx_scans_site_started_finished 
ON sitemap_monitor_scans(site_id, started_at DESC, finished_at);
```

### 3. Sites 表索引

```sql
-- 按所有者查询
CREATE INDEX idx_sites_owner 
ON sitemap_monitor_sites(owner_id);

-- 按启用状态查询
CREATE INDEX idx_sites_enabled 
ON sitemap_monitor_sites(enabled) 
WHERE enabled = true;
```

### 4. URLs 表索引

```sql
-- 按站点查询
CREATE INDEX idx_urls_site 
ON sitemap_monitor_urls(site_id);

-- 按 sitemap 查询
CREATE INDEX idx_urls_sitemap 
ON sitemap_monitor_urls(sitemap_id);

-- 按状态查询
CREATE INDEX idx_urls_status 
ON sitemap_monitor_urls(status);
```

---

## 创建索引脚本

创建文件 `scripts/create-indexes.sql`:

```sql
-- Changes 表索引
CREATE INDEX IF NOT EXISTS idx_changes_site_occurred 
ON sitemap_monitor_changes(site_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_changes_type_occurred 
ON sitemap_monitor_changes(type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_changes_site_type_occurred 
ON sitemap_monitor_changes(site_id, type, occurred_at DESC);

-- Scans 表索引
CREATE INDEX IF NOT EXISTS idx_scans_site_started 
ON sitemap_monitor_scans(site_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scans_status 
ON sitemap_monitor_scans(status);

CREATE INDEX IF NOT EXISTS idx_scans_site_started_finished 
ON sitemap_monitor_scans(site_id, started_at DESC, finished_at);

-- Sites 表索引
CREATE INDEX IF NOT EXISTS idx_sites_owner 
ON sitemap_monitor_sites(owner_id);

CREATE INDEX IF NOT EXISTS idx_sites_enabled 
ON sitemap_monitor_sites(enabled) 
WHERE enabled = true;

-- URLs 表索引
CREATE INDEX IF NOT EXISTS idx_urls_site 
ON sitemap_monitor_urls(site_id);

CREATE INDEX IF NOT EXISTS idx_urls_sitemap 
ON sitemap_monitor_urls(sitemap_id);

CREATE INDEX IF NOT EXISTS idx_urls_status 
ON sitemap_monitor_urls(status);

-- Sitemaps 表索引
CREATE INDEX IF NOT EXISTS idx_sitemaps_site 
ON sitemap_monitor_sitemaps(site_id);

-- Notification Channels 表索引
CREATE INDEX IF NOT EXISTS idx_notification_channels_site 
ON sitemap_monitor_notification_channels(site_id);

-- Webhooks 表索引
CREATE INDEX IF NOT EXISTS idx_webhooks_site 
ON sitemap_monitor_webhooks(site_id);
```

执行索引创建：

```bash
psql $DATABASE_URL -f scripts/create-indexes.sql
```

或使用 Node.js:

```bash
DATABASE_URL="..." npx tsx scripts/create-indexes.ts
```

---

## 性能测试

### 运行性能测试

```bash
DATABASE_URL="..." npx tsx scripts/test-dashboard-performance.ts
```

### 预期结果

优化后的查询性能：

| 查询 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 站点查询 | ~50ms | ~10ms | 5x |
| 变更统计 | ~2000ms | ~50ms | 40x |
| 扫描统计 | ~500ms | ~30ms | 16x |
| 趋势查询 | ~3000ms | ~100ms | 30x |
| **总计** | **~5.5s** | **~200ms** | **27x** |

---

## 监控建议

### 1. 查询性能监控

在 Supabase Dashboard 中：
- 查看慢查询日志
- 监控查询执行时间
- 检查索引使用情况

### 2. 应用性能监控

```typescript
// 添加性能日志
const start = Date.now();
const result = await db.select()...
console.log(`Query took ${Date.now() - start}ms`);
```

### 3. 数据库连接池监控

```typescript
// 在 lib/db.ts 中添加
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('New client connected');
});
```

---

## 进一步优化建议

### 1. 缓存策略

对于不经常变化的数据，考虑使用缓存：

```typescript
// 使用 Next.js 缓存
export const revalidate = 60; // 60秒缓存

// 或使用 Redis
import { redis } from '@/lib/redis';
const cached = await redis.get('dashboard:stats');
```

### 2. 分页和限制

对于大数据集，始终使用分页：

```typescript
.limit(100)
.offset(page * 100)
```

### 3. 选择性字段

只查询需要的字段：

```typescript
// 不好
.select()

// 好
.select({
  id: sites.id,
  name: sites.name,
})
```

### 4. 避免 N+1 查询

使用 JOIN 而不是循环查询：

```typescript
// 不好
for (const site of sites) {
  const scans = await db.select().from(scans).where(eq(scans.siteId, site.id));
}

// 好
const result = await db
  .select()
  .from(sites)
  .leftJoin(scans, eq(scans.siteId, sites.id));
```

---

## 性能检查清单

- [x] 使用 SQL 聚合查询
- [x] 并行执行独立查询
- [ ] 创建必要的索引
- [ ] 添加查询性能监控
- [ ] 实施缓存策略
- [ ] 使用分页限制数据量
- [ ] 只查询需要的字段
- [ ] 避免 N+1 查询问题

---

## 相关文档

- [PostgreSQL 索引文档](https://www.postgresql.org/docs/current/indexes.html)
- [Drizzle ORM 性能](https://orm.drizzle.team/docs/performance)
- [Supabase 性能优化](https://supabase.com/docs/guides/database/performance)

---

*最后更新: 2025年10月4日*
