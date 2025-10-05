# 数据库迁移指南

## 📋 本次会话的数据库变更

### ✅ 无需迁移

**好消息**: 本次会话中**没有新增任何数据库结构变更**。

所有的修改都是代码逻辑层面的：
- ✅ 扫描执行逻辑优化
- ✅ 日志增强
- ✅ 环境自适应执行
- ✅ 前端 UI 改进

### 📊 现有的数据库结构

当前数据库包含以下表：

1. **sitemap_monitor_users** - 用户表
2. **sitemap_monitor_site_groups** - 站点分组
3. **sitemap_monitor_sites** - 站点信息
4. **sitemap_monitor_sitemaps** - Sitemap 列表
5. **sitemap_monitor_urls** - URL 记录
6. **sitemap_monitor_scans** - 扫描历史
7. **sitemap_monitor_changes** - 变更记录
8. **sitemap_monitor_webhooks** - Webhook 配置
9. **sitemap_monitor_notification_channels** - 通知渠道

### 🔍 检测到的历史迁移文件

项目中存在以下迁移文件（可能是之前创建的）：

1. **0000_burly_skaar.sql** - 初始数据库结构
2. **0001_add_performance_indexes.sql** - 性能索引
3. **0002_optimize_url_uniques.sql** - URL 唯一性优化
4. **0003_add_sitemap_last_hash.sql** - Sitemap hash 字段

### ✅ 验证数据库状态

运行以下命令检查数据库是否是最新的：

```bash
# 检查数据库表
psql "$DATABASE_URL" -c "\dt sitemap_monitor_*"

# 检查 sitemaps 表结构
psql "$DATABASE_URL" -c "\d sitemap_monitor_sitemaps"
```

**预期输出应该包含**:
- `last_hash` 字段（如果迁移 0003 已应用）

### 🚀 如果需要应用迁移

如果你的数据库还没有应用最新的迁移，运行：

```bash
# 应用所有待处理的迁移
pnpm db:migrate

# 或手动应用特定迁移
psql "$DATABASE_URL" -f drizzle/0003_add_sitemap_last_hash.sql
```

### 📝 迁移状态检查

```sql
-- 检查 last_hash 字段是否存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sitemap_monitor_sitemaps' 
  AND column_name = 'last_hash';
```

**如果返回结果**: 迁移已应用 ✅
**如果无结果**: 需要应用迁移 ⚠️

## 🎯 本次会话的变更总结

### 代码变更（无需迁移）

1. **扫描逻辑优化** (`lib/logic/scan.ts`)
   - 环境自适应执行
   - 增强日志输出
   - 改进错误处理

2. **前端改进**
   - 运行中扫描警告组件
   - Toast 提示优化
   - Alert UI 组件

3. **新增工具脚本**
   - `check-running-scans.ts` - 检查运行中扫描
   - `force-cleanup-all-stuck.ts` - 强制清理
   - `diagnose-scan-issue.ts` - 诊断工具

4. **文档**
   - 多个故障排查和修复指南

### 数据库变更（本次会话）

**无** - 本次会话没有修改数据库结构

## 🔄 完整迁移流程（如果需要）

### 步骤 1: 备份数据库

```bash
# 备份整个数据库
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# 或只备份特定表
pg_dump "$DATABASE_URL" -t sitemap_monitor_sitemaps > sitemaps_backup.sql
```

### 步骤 2: 检查待处理的迁移

```bash
# 查看迁移文件
ls -la drizzle/*.sql

# 查看迁移日志
cat drizzle/meta/_journal.json
```

### 步骤 3: 应用迁移

```bash
# 使用 Drizzle 命令
pnpm db:migrate

# 或手动应用
psql "$DATABASE_URL" -f drizzle/0003_add_sitemap_last_hash.sql
```

### 步骤 4: 验证迁移

```sql
-- 检查表结构
\d sitemap_monitor_sitemaps

-- 检查数据
SELECT COUNT(*) FROM sitemap_monitor_sitemaps;
```

### 步骤 5: 测试应用

```bash
# 启动开发服务器
pnpm dev

# 测试扫描功能
# 访问站点详情页并触发扫描
```

## 🛡️ 安全建议

1. **始终备份**: 在应用迁移前备份数据库
2. **测试环境**: 先在测试环境验证迁移
3. **监控日志**: 应用迁移后监控应用日志
4. **回滚计划**: 准备好回滚脚本

## 📞 获取帮助

如果遇到迁移问题：

1. 检查错误日志
2. 验证数据库连接
3. 确认数据库权限
4. 查看迁移文件内容
5. 提交 Issue 并附上错误信息

## ✨ 总结

### 本次会话

- ✅ **无需数据库迁移**
- ✅ 所有变更都是代码层面
- ✅ 可以直接使用，无需额外操作

### 如果数据库不是最新的

- ⚠️ 运行 `pnpm db:migrate` 应用历史迁移
- ⚠️ 验证 `last_hash` 字段存在

### 下一步

1. 清理卡住的扫描（如果有）
2. 重启开发服务器
3. 测试扫描功能
4. 享受改进后的体验！

---

**更新时间**: 2025年10月5日
**数据库版本**: 0003
**需要迁移**: 否（本次会话）
