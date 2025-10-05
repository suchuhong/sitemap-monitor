# 数据迁移完成报告

## 迁移概述

✅ **迁移状态**: 成功完成  
📅 **完成时间**: 2025年10月4日  
🗄️ **源数据库**: SQLite (drizzle/local.sqlite, 63MB)  
🐘 **目标数据库**: PostgreSQL (Supabase)

## 迁移统计

### 总体数据

- **总记录数**: 255,859 条
- **迁移时间**: 约 3-5 分钟
- **数据完整性**: ✅ 100% 验证通过

### 详细统计

| 表名 | 记录数 | 状态 |
|------|--------|------|
| Users | 2 | ✅ |
| Site Groups | 1 | ✅ |
| Sites | 8 | ✅ |
| Sitemaps | 155 | ✅ |
| URLs | 125,112 | ✅ |
| Scans | 52 | ✅ |
| Changes | 130,521 | ✅ |
| Webhooks | 0 | ✅ |
| Notification Channels | 8 | ✅ |

## 迁移过程

### 1. 准备阶段

- ✅ 创建迁移脚本 `scripts/migrate-data.ts`
- ✅ 临时安装 better-sqlite3 用于读取 SQLite 数据
- ✅ 配置 PostgreSQL 连接

### 2. 执行阶段

迁移按以下顺序执行（遵循外键依赖关系）：

1. **Users** (基础表)
2. **Site Groups** (依赖 Users)
3. **Sites** (依赖 Users 和 Site Groups)
4. **Sitemaps** (依赖 Sites)
5. **URLs** (依赖 Sites 和 Sitemaps) - 分批处理，每批 1000 条
6. **Scans** (依赖 Sites) - 分批处理
7. **Changes** (依赖 Sites, Scans, URLs) - 分批处理
8. **Webhooks** (依赖 Sites)
9. **Notification Channels** (依赖 Sites)

### 3. 验证阶段

- ✅ 记录数验证通过
- ✅ 数据抽样检查通过
- ✅ 外键关系完整

## 技术细节

### 批量处理策略

对于大表（URLs, Scans, Changes），采用批量插入策略：
- **批次大小**: 1000 条/批
- **冲突处理**: `onConflictDoNothing()` - 跳过重复记录
- **进度显示**: 实时显示迁移进度

### 数据类型转换

| SQLite | PostgreSQL | 说明 |
|--------|-----------|------|
| `integer (timestamp)` | `timestamp` | 自动转换 |
| `integer (boolean)` | `boolean` | 自动转换 |
| `text` | `text` | 无需转换 |

### 表名映射

所有表名已添加 `sitemap_monitor_` 前缀：

```
users                    → sitemap_monitor_users
site_groups              → sitemap_monitor_site_groups
sites                    → sitemap_monitor_sites
sitemaps                 → sitemap_monitor_sitemaps
urls                     → sitemap_monitor_urls
scans                    → sitemap_monitor_scans
changes                  → sitemap_monitor_changes
webhooks                 → sitemap_monitor_webhooks
notification_channels    → sitemap_monitor_notification_channels
```

## 迁移脚本

### 执行命令

```bash
# 数据迁移
DATABASE_URL="postgresql://..." npx tsx scripts/migrate-data.ts

# 验证迁移
DATABASE_URL="postgresql://..." npx tsx scripts/verify-migration.ts
```

### 脚本文件

- `scripts/migrate-data.ts` - 主迁移脚本
- `scripts/verify-migration.ts` - 验证脚本

## 验证结果

### 记录数对比

| 表 | SQLite | PostgreSQL | 匹配 |
|----|--------|-----------|------|
| Users | 2 | 2 | ✅ |
| Site Groups | 1 | 1 | ✅ |
| Sites | 8 | 8 | ✅ |
| Sitemaps | 155 | 155 | ✅ |
| URLs | 125,112 | 125,112 | ✅ |
| Scans | 52 | 52 | ✅ |
| Changes | 130,521 | 130,521 | ✅ |
| Webhooks | 0 | 0 | ✅ |
| Notification Channels | 8 | 8 | ✅ |

### 数据完整性检查

```
✅ Users 表有数据
✅ Sites 表有数据
✅ URLs 表有数据
✅ 外键关系完整
✅ 时间戳格式正确
```

## 性能指标

### 迁移性能

- **URLs 表** (125,112 条): 约 2-3 分钟
- **Changes 表** (130,521 条): 约 2-3 分钟
- **其他表**: < 1 分钟
- **总耗时**: 约 3-5 分钟

### 数据库大小

- **SQLite**: 63 MB
- **PostgreSQL**: 预计相似或略大（包含索引）

## 后续步骤

### 已完成 ✅

- [x] 数据迁移完成
- [x] 数据验证通过
- [x] 迁移脚本已保存

### 建议操作

1. **备份 SQLite 数据库**
   ```bash
   cp drizzle/local.sqlite drizzle/local.sqlite.backup
   ```

2. **测试应用功能**
   ```bash
   pnpm dev
   # 测试所有功能是否正常
   ```

3. **性能优化**（可选）
   - 为常用查询字段添加索引
   - 分析查询性能
   - 优化慢查询

4. **清理工作**（可选）
   - 确认一切正常后，可以删除 SQLite 文件
   - 从 devDependencies 移除 better-sqlite3（如果不再需要）

## 注意事项

### ⚠️ 重要提醒

1. **保留 SQLite 备份**: 建议保留原 SQLite 数据库文件至少 1-2 周，以防需要回滚
2. **better-sqlite3 依赖**: 已保留在 devDependencies 中，以便将来可能需要再次运行迁移脚本
3. **时间戳**: PostgreSQL 使用原生 timestamp，显示格式可能与 SQLite 不同
4. **时区**: 确保应用正确处理时区问题

### 🔍 已知差异

- **时间戳显示**: PostgreSQL 返回 Date 对象，SQLite 返回数字
- **布尔值**: PostgreSQL 返回 true/false，SQLite 返回 0/1
- **NULL 处理**: 两者行为一致

## 回滚方案

如果需要回滚到 SQLite：

1. 切换回 main 分支
   ```bash
   git checkout main
   ```

2. 恢复 .env 配置
   ```bash
   # 使用 DB_URL 而非 DATABASE_URL
   ```

3. 重新安装依赖
   ```bash
   pnpm install
   ```

## 支持文档

- [PostgreSQL 迁移指南](./POSTGRESQL_MIGRATION_GUIDE.md)
- [迁移完成报告](./MIGRATION_COMPLETED.md)
- [Drizzle ORM 文档](https://orm.drizzle.team/)

## 联系支持

如有任何问题或疑虑，请：
1. 检查迁移日志
2. 运行验证脚本
3. 查看相关文档

---

**数据迁移成功完成！** 🎉

所有 255,859 条记录已安全迁移到 PostgreSQL 数据库。
