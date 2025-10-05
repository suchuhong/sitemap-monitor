# 🚀 立即应用数据库迁移

## 📋 需要应用的迁移

1. **0002_optimize_url_uniques.sql**
   - 添加 URL 唯一约束 (sitemap_id, loc)
   - 添加 Sitemap 唯一约束 (site_id, url)
   - 优化 scans.status 默认值为 'queued'

2. **0003_add_sitemap_last_hash.sql**
   - 添加 sitemaps.last_hash 字段（用于内容哈希优化）

## ✅ 方法 1: 使用自动迁移脚本（推荐）

```bash
DATABASE_URL="your-database-url" pnpm tsx scripts/apply-pending-migrations.ts
```

**这个脚本会**:
- ✅ 自动检测数据库连接
- ✅ 应用两个待处理的迁移
- ✅ 验证迁移结果
- ✅ 处理重复应用的情况
- ✅ 提供详细的执行日志

**预期输出**:
```
🔄 应用待处理的数据库迁移

📡 步骤 1: 测试数据库连接
   ✅ 数据库连接正常

📝 步骤 2: 应用迁移 0002_optimize_url_uniques
   执行 SQL...
   ✅ 迁移 0002 应用成功
      - 添加 URL 唯一约束 (sitemap_id, loc)
      - 添加 Sitemap 唯一约束 (site_id, url)
      - 优化 scans.status 默认值为 'queued'

📝 步骤 3: 应用迁移 0003_add_sitemap_last_hash
   执行 SQL...
   ✅ 迁移 0003 应用成功
      - 添加 sitemaps.last_hash 字段

✅ 步骤 4: 验证迁移结果
   ✅ last_hash 字段存在
   ✅ 找到 X 个唯一约束
   ✅ scans.status 默认值: 'queued'

✨ 迁移完成

📊 迁移总结:
   - 0002_optimize_url_uniques: ✅ 已应用
   - 0003_add_sitemap_last_hash: ✅ 已应用

数据库已更新到最新版本！
```

## ✅ 方法 2: 使用 Drizzle 命令

```bash
pnpm db:migrate
```

## ✅ 方法 3: 手动执行 SQL

### 步骤 1: 连接数据库

```bash
psql "$DATABASE_URL"
```

### 步骤 2: 应用迁移 0002

```sql
-- 0002: Optimize URL uniqueness and indexes for performance

-- UNIQUE constraint for urls(sitemap_id, loc)
DO $$ BEGIN
  ALTER TABLE public.sitemap_monitor_urls
  ADD CONSTRAINT uq_urls_sitemap_loc UNIQUE (sitemap_id, loc);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional composite index
CREATE INDEX IF NOT EXISTS idx_urls_sitemap_loc
  ON public.sitemap_monitor_urls (sitemap_id, loc);

-- UNIQUE constraint for sitemaps(site_id, url)
DO $$ BEGIN
  ALTER TABLE public.sitemap_monitor_sitemaps
  ADD CONSTRAINT uq_sitemaps_site_url UNIQUE (site_id, url);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Make scans.status default to 'queued'
ALTER TABLE public.sitemap_monitor_scans
  ALTER COLUMN status SET DEFAULT 'queued';
```

### 步骤 3: 应用迁移 0003

```sql
-- 0003: Add last_hash to sitemaps for content hash short-circuit
ALTER TABLE public.sitemap_monitor_sitemaps
  ADD COLUMN IF NOT EXISTS last_hash text;
```

### 步骤 4: 验证

```sql
-- 检查 last_hash 字段
\d sitemap_monitor_sitemaps

-- 检查唯一约束
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name IN ('sitemap_monitor_urls', 'sitemap_monitor_sitemaps')
  AND constraint_type = 'UNIQUE';

-- 检查 scans.status 默认值
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'sitemap_monitor_scans'
  AND column_name = 'status';
```

## 🛡️ 安全建议

### 1. 备份数据库（强烈推荐）

```bash
# 备份整个数据库
pg_dump "$DATABASE_URL" > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# 或只备份相关表
pg_dump "$DATABASE_URL" \
  -t sitemap_monitor_urls \
  -t sitemap_monitor_sitemaps \
  -t sitemap_monitor_scans \
  > backup_tables.sql
```

### 2. 在测试环境先验证

如果有测试数据库，先在测试环境应用迁移。

### 3. 检查数据冲突

```sql
-- 检查是否有重复的 URL
SELECT sitemap_id, loc, COUNT(*)
FROM sitemap_monitor_urls
GROUP BY sitemap_id, loc
HAVING COUNT(*) > 1;

-- 检查是否有重复的 Sitemap
SELECT site_id, url, COUNT(*)
FROM sitemap_monitor_sitemaps
GROUP BY site_id, url
HAVING COUNT(*) > 1;
```

如果有重复数据，需要先清理：

```sql
-- 删除重复的 URL（保留最早的）
DELETE FROM sitemap_monitor_urls a
USING sitemap_monitor_urls b
WHERE a.id > b.id
  AND a.sitemap_id = b.sitemap_id
  AND a.loc = b.loc;

-- 删除重复的 Sitemap（保留最早的）
DELETE FROM sitemap_monitor_sitemaps a
USING sitemap_monitor_sitemaps b
WHERE a.id > b.id
  AND a.site_id = b.site_id
  AND a.url = b.url;
```

## ✅ 验证迁移成功

运行检查脚本：

```bash
DATABASE_URL="your-database-url" pnpm tsx scripts/check-database-status.ts
```

应该看到：
```
✅ last_hash 字段存在 (迁移 0003 已应用)
✅ 找到 X 个唯一约束
✅ scans.status 默认值: 'queued'
```

## 🎯 迁移后的下一步

1. **重启应用**:
   ```bash
   pnpm dev
   ```

2. **测试扫描功能**:
   - 访问站点详情页
   - 触发手动扫描
   - 验证扫描正常完成

3. **监控日志**:
   - 查看是否有数据库错误
   - 确认扫描状态正确更新

## 🆘 遇到问题？

### 问题 1: 唯一约束冲突

**错误**: `duplicate key value violates unique constraint`

**解决**: 先清理重复数据（见上面的 SQL）

### 问题 2: 权限不足

**错误**: `permission denied`

**解决**: 确保数据库用户有 ALTER TABLE 权限

### 问题 3: 连接失败

**错误**: `connection refused`

**解决**: 检查 DATABASE_URL 环境变量

## 📞 获取帮助

如果遇到问题：

1. 查看完整错误信息
2. 检查数据库日志
3. 运行 `check-database-status.ts` 查看当前状态
4. 提供错误信息和环境详情

---

**立即执行**:

```bash
DATABASE_URL="your-database-url" pnpm tsx scripts/apply-pending-migrations.ts
```

**预计时间**: < 1 分钟

**风险等级**: 低（迁移包含 IF NOT EXISTS 保护）

**建议**: 先备份数据库
