# Drizzle 迁移说明

## 迁移文件

### 0000_burly_skaar.sql
**创建时间**: 2025-10-04  
**描述**: 初始数据库架构
- 创建所有表（9个表）
- 创建外键约束
- 创建唯一约束

**包含的表**:
- sitemap_monitor_users
- sitemap_monitor_site_groups
- sitemap_monitor_sites
- sitemap_monitor_sitemaps
- sitemap_monitor_urls
- sitemap_monitor_scans
- sitemap_monitor_changes
- sitemap_monitor_webhooks
- sitemap_monitor_notification_channels

### 0001_add_performance_indexes.sql
**创建时间**: 2025-10-04  
**描述**: 添加性能优化索引
- 创建 14 个索引以优化查询性能
- 覆盖所有关键查询路径

**包含的索引**:
- Changes 表: 3 个索引
- Scans 表: 3 个索引
- Sites 表: 2 个索引
- URLs 表: 3 个索引
- Sitemaps 表: 1 个索引
- Notification Channels 表: 1 个索引
- Webhooks 表: 1 个索引

## 运行迁移

### 新环境部署

对于全新的数据库环境，运行：

```bash
# 设置环境变量
export DATABASE_URL="postgresql://..."

# 运行所有迁移
pnpm db:migrate
```

这将自动执行：
1. `0000_burly_skaar.sql` - 创建表结构
2. `0001_add_performance_indexes.sql` - 创建索引

### 现有环境更新

如果你已经运行了 `0000_burly_skaar.sql`，只需要添加索引：

**选项 1: 使用 Drizzle 迁移**
```bash
pnpm db:migrate
```

**选项 2: 使用索引创建脚本**
```bash
DATABASE_URL="..." npx tsx scripts/create-indexes.ts
```

两种方式效果相同，都会创建 14 个性能索引。

## 迁移顺序

迁移必须按顺序执行：

1. ✅ `0000_burly_skaar.sql` - 必须首先执行
2. ✅ `0001_add_performance_indexes.sql` - 在表创建后执行

Drizzle 会自动跟踪已执行的迁移，不会重复执行。

## 验证迁移

### 检查迁移状态

```bash
# 查看已执行的迁移
psql $DATABASE_URL -c "SELECT * FROM drizzle.__drizzle_migrations;"
```

### 验证索引

```bash
# 查看所有索引
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'sitemap_monitor_%'
ORDER BY tablename, indexname;
"
```

应该看到 24 个索引（包括主键和性能索引）。

### 验证数据

```bash
# 运行数据验证脚本
DATABASE_URL="..." npx tsx scripts/verify-migration.ts
```

## 回滚

### 回滚索引（如需要）

如果需要删除索引：

```sql
-- 删除所有性能索引
DROP INDEX IF EXISTS idx_changes_site_occurred;
DROP INDEX IF EXISTS idx_changes_type_occurred;
DROP INDEX IF EXISTS idx_changes_site_type_occurred;
DROP INDEX IF EXISTS idx_scans_site_started;
DROP INDEX IF EXISTS idx_scans_status;
DROP INDEX IF EXISTS idx_scans_site_started_finished;
DROP INDEX IF EXISTS idx_sites_owner;
DROP INDEX IF EXISTS idx_sites_enabled;
DROP INDEX IF EXISTS idx_urls_site;
DROP INDEX IF EXISTS idx_urls_sitemap;
DROP INDEX IF EXISTS idx_urls_status;
DROP INDEX IF EXISTS idx_sitemaps_site;
DROP INDEX IF EXISTS idx_notification_channels_site;
DROP INDEX IF EXISTS idx_webhooks_site;
```

**注意**: 通常不需要回滚索引，因为它们只会提升性能，不会影响功能。

## 性能影响

### 索引创建时间

基于 255,859 条记录的测试：

| 表 | 记录数 | 索引创建时间 |
|----|--------|-------------|
| Changes | 130,521 | ~7 秒 |
| URLs | 125,112 | ~1.5 秒 |
| Scans | 52 | <1 秒 |
| 其他 | 174 | <1 秒 |
| **总计** | **255,859** | **~10 秒** |

### 查询性能提升

预期性能提升：

| 查询类型 | 提升 |
|---------|------|
| 按站点查询变更 | 10x |
| 按类型查询变更 | 10x |
| Dashboard 统计 | 5x |
| 按站点查询扫描 | 10x |
| 按站点查询 URLs | 10x |

## 故障排除

### 问题: 迁移失败

**错误**: `relation "sitemap_monitor_users" does not exist`

**解决**: 确保先运行 `0000_burly_skaar.sql`

### 问题: 索引已存在

**错误**: `relation "idx_changes_site_occurred" already exists`

**解决**: 这是正常的，SQL 使用了 `IF NOT EXISTS`，会自动跳过已存在的索引。

### 问题: 权限不足

**错误**: `permission denied to create index`

**解决**: 确保数据库用户有 CREATE INDEX 权限。

## 最佳实践

1. **备份数据**: 在运行迁移前备份数据库
2. **测试环境**: 先在测试环境运行迁移
3. **监控性能**: 迁移后监控查询性能
4. **维护索引**: PostgreSQL 会自动维护索引

## 相关文档

- [Drizzle 迁移文档](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL 索引文档](https://www.postgresql.org/docs/current/indexes.html)
- 项目文档: `docs/PERFORMANCE_OPTIMIZATION.md`
- 索引报告: `INDEX_CREATION_REPORT.md`

---

*最后更新: 2025年10月4日*
