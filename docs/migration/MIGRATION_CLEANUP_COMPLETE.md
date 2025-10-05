# ✅ 迁移文件清理完成

## 🎯 清理内容

### 已删除的文件

1. **drizzle/0002_hot_whiplash.sql** ❌
   - 原因：重复的迁移文件
   - 内容：只添加 `last_hash` 字段
   - 替代：已被 `0003_add_sitemap_last_hash.sql` 替代

2. **drizzle/meta/0002_snapshot.json** ❌
   - 原因：对应已删除的迁移文件

### 已更新的文件

1. **drizzle/meta/_journal.json** ✅
   - 移除了 `0002_hot_whiplash` 条目
   - 添加了正确的迁移条目：
     - `0002_optimize_url_uniques`
     - `0003_add_sitemap_last_hash`

## 📊 当前迁移状态

### 迁移文件列表

```
drizzle/
├── 0000_burly_skaar.sql                    ✅ 初始数据库结构
├── 0001_add_performance_indexes.sql        ✅ 性能索引
├── 0002_optimize_url_uniques.sql           ⏳ 待应用
├── 0003_add_sitemap_last_hash.sql          ⏳ 待应用
└── meta/
    ├── _journal.json                       ✅ 已更新
    ├── 0000_snapshot.json                  ✅
    └── 0001_snapshot.json                  ✅
```

### 迁移日志 (_journal.json)

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "tag": "0000_burly_skaar"
    },
    {
      "idx": 1,
      "tag": "0001_add_performance_indexes"
    },
    {
      "idx": 2,
      "tag": "0002_optimize_url_uniques"        ← 新增
    },
    {
      "idx": 3,
      "tag": "0003_add_sitemap_last_hash"       ← 新增
    }
  ]
}
```

## 🚀 下一步：应用迁移

现在迁移文件已经清理完成，可以安全地应用待处理的迁移了。

### 方法 1: 使用自动迁移脚本（推荐）

```bash
DATABASE_URL="your-database-url" pnpm tsx scripts/apply-pending-migrations.ts
```

### 方法 2: 使用 Drizzle 命令

```bash
pnpm db:migrate
```

### 方法 3: 手动执行 SQL

```bash
# 应用迁移 0002
psql "$DATABASE_URL" -f drizzle/0002_optimize_url_uniques.sql

# 应用迁移 0003
psql "$DATABASE_URL" -f drizzle/0003_add_sitemap_last_hash.sql
```

## ✅ 验证清理结果

### 检查文件结构

```bash
# 查看迁移文件
ls -la drizzle/*.sql

# 应该看到：
# 0000_burly_skaar.sql
# 0001_add_performance_indexes.sql
# 0002_optimize_url_uniques.sql
# 0003_add_sitemap_last_hash.sql
```

### 检查迁移日志

```bash
cat drizzle/meta/_journal.json
```

应该看到 4 个条目，没有 `0002_hot_whiplash`。

## 📋 清理前后对比

### 清理前

```
迁移文件:
- 0000_burly_skaar.sql
- 0001_add_performance_indexes.sql
- 0002_hot_whiplash.sql          ← 重复
- 0002_optimize_url_uniques.sql
- 0003_add_sitemap_last_hash.sql

问题:
❌ 有两个 0002 迁移文件
❌ 0002_hot_whiplash 功能重复
❌ 迁移日志不一致
```

### 清理后

```
迁移文件:
- 0000_burly_skaar.sql
- 0001_add_performance_indexes.sql
- 0002_optimize_url_uniques.sql
- 0003_add_sitemap_last_hash.sql

状态:
✅ 迁移文件编号连续
✅ 没有重复功能
✅ 迁移日志一致
✅ 可以安全应用
```

## 🎯 待应用的迁移内容

### 0002_optimize_url_uniques

**功能**:
- 添加 URL 唯一约束 (sitemap_id, loc)
- 添加 Sitemap 唯一约束 (site_id, url)
- 优化 scans.status 默认值为 'queued'

**影响**:
- 防止重复 URL
- 防止重复 Sitemap
- 改进扫描状态管理

### 0003_add_sitemap_last_hash

**功能**:
- 添加 sitemaps.last_hash 字段

**影响**:
- 支持内容哈希优化
- 减少不必要的扫描

## 📚 相关文档

- **[APPLY_MIGRATIONS_NOW.md](APPLY_MIGRATIONS_NOW.md)** - 立即应用迁移指南
- **[DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md)** - 完整迁移文档

## ✨ 总结

### 已完成

- ✅ 删除重复的迁移文件 `0002_hot_whiplash.sql`
- ✅ 删除对应的 snapshot 文件
- ✅ 更新迁移日志 `_journal.json`
- ✅ 迁移文件结构清晰

### 下一步

1. **应用迁移**:
   ```bash
   DATABASE_URL="your-db-url" pnpm tsx scripts/apply-pending-migrations.ts
   ```

2. **验证迁移**:
   ```bash
   DATABASE_URL="your-db-url" pnpm tsx scripts/check-database-status.ts
   ```

3. **重启应用**:
   ```bash
   pnpm dev
   ```

---

**清理时间**: 2025年10月5日
**状态**: ✅ 完成
**下一步**: 应用迁移
