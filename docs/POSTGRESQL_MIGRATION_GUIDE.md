# PostgreSQL 数据库迁移指南

本文档说明如何将 Sitemap Monitor 项目从 SQLite 迁移到 PostgreSQL (Supabase)。

## 迁移概述

- **原数据库**: SQLite (本地文件)
- **新数据库**: PostgreSQL (Supabase)
- **表名前缀**: 所有表名添加 `sitemap_monitor_` 前缀
- **数据库连接**: 使用 Supabase 连接池

## 步骤 1: 更新环境变量

### 1.1 修改 `.env` 文件

将原来的 SQLite 连接字符串：
```env
DB_URL=file:./drizzle/local.sqlite
```

替换为 PostgreSQL 连接字符串：
```env
DATABASE_URL="postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"
```

**注意**: 请将占位符替换为你的实际 Supabase 数据库连接信息。

### 1.2 更新 `.env.example` 文件

```env
DATABASE_URL="postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"
CRON_TOKEN=<random-long-token>
WEBHOOK_SECRET=<hmac-secret>
APP_BASE_URL=http://localhost:3000

# 邮件渠道配置
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASS=secret
EMAIL_SMTP_SECURE=false
EMAIL_FROM="Sitemap Monitor <noreply@example.com>"

# Slack / Webhook 可选超时 (毫秒)
# SLACK_TIMEOUT_MS=8000
# WEBHOOK_TIMEOUT_MS=8000
```

## 步骤 2: 更新依赖包

### 2.1 移除 SQLite 依赖

```bash
pnpm remove better-sqlite3 @types/better-sqlite3
```

### 2.2 添加 PostgreSQL 依赖

```bash
pnpm add pg
pnpm add -D @types/pg
```

## 步骤 3: 更新 Drizzle 配置

修改 `drizzle.config.ts` 文件：

```typescript
import type { Config } from "drizzle-kit";

export default {
  out: "./drizzle",
  schema: "./lib/drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: { 
    url: process.env.DATABASE_URL! 
  },
} satisfies Config;
```

**主要变更**:
- `dialect`: 从 `"sqlite"` 改为 `"postgresql"`
- `dbCredentials.url`: 从 `DB_URL` 改为 `DATABASE_URL`

## 步骤 4: 更新数据库 Schema

修改 `lib/drizzle/schema.ts` 文件，将所有表定义从 SQLite 迁移到 PostgreSQL。

### 4.1 主要变更点

1. **导入语句**: 从 `drizzle-orm/sqlite-core` 改为 `drizzle-orm/pg-core`
2. **表定义函数**: 从 `sqliteTable` 改为 `pgTable`
3. **数据类型**: 
   - `text()` → `text()` 或 `varchar()`
   - `integer()` → `integer()` 或 `bigint()`
   - `integer({ mode: "timestamp" })` → `timestamp()`
4. **表名**: 所有表名添加 `sitemap_monitor_` 前缀
5. **默认值**: SQLite 的 `sql\`(unixepoch())\`` 改为 PostgreSQL 的 `sql\`now()\``

### 4.2 新的表结构

所有表名将添加 `sitemap_monitor_` 前缀：

- `users` → `sitemap_monitor_users`
- `site_groups` → `sitemap_monitor_site_groups`
- `sites` → `sitemap_monitor_sites`
- `sitemaps` → `sitemap_monitor_sitemaps`
- `urls` → `sitemap_monitor_urls`
- `scans` → `sitemap_monitor_scans`
- `changes` → `sitemap_monitor_changes`
- `webhooks` → `sitemap_monitor_webhooks`
- `notification_channels` → `sitemap_monitor_notification_channels`

## 步骤 5: 更新数据库初始化代码

如果项目中有数据库初始化代码（通常在 `lib/drizzle/` 目录下），需要更新：

1. 将 `better-sqlite3` 的导入改为 `pg` 或使用 Drizzle 的 PostgreSQL 连接
2. 更新连接字符串的读取方式（从 `DB_URL` 改为 `DATABASE_URL`）

示例：

```typescript
// 原 SQLite 代码
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database(process.env.DB_URL!);
export const db = drizzle(sqlite);
```

改为：

```typescript
// 新 PostgreSQL 代码
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool);
```

## 步骤 6: 生成并运行迁移

### 6.1 生成迁移文件

```bash
pnpm db:generate
```

这将在 `drizzle/` 目录下生成 PostgreSQL 迁移 SQL 文件。

### 6.2 运行迁移

```bash
pnpm db:migrate
```

这将在 Supabase 数据库中创建所有带 `sitemap_monitor_` 前缀的表。

## 步骤 7: 数据迁移（可选）

如果需要从旧的 SQLite 数据库迁移数据到新的 PostgreSQL 数据库：

1. 导出 SQLite 数据为 JSON 或 CSV
2. 编写迁移脚本将数据导入 PostgreSQL
3. 注意处理时间戳格式的差异（Unix 时间戳 vs PostgreSQL timestamp）

## 步骤 8: 测试

1. 启动开发服务器：`pnpm dev`
2. 测试所有数据库操作功能
3. 验证数据的读写是否正常
4. 检查所有 API 端点是否正常工作

## 注意事项

### 时间戳处理

- **SQLite**: 使用 Unix 时间戳（整数秒）
- **PostgreSQL**: 使用原生 `timestamp` 类型

确保在代码中正确处理时间戳的转换。

### 连接池

Supabase 使用连接池（端口 6543），这比直接连接（端口 5432）更适合 serverless 环境。

### 环境变量

确保在所有部署环境（开发、预发布、生产）中都正确设置了 `DATABASE_URL` 环境变量。

### 备份

在执行迁移前，请务必备份现有的 SQLite 数据库文件。

## 回滚方案

如果迁移出现问题，可以：

1. 切换回原分支：`git checkout main`
2. 恢复 `.env` 文件中的 SQLite 连接字符串
3. 重新安装依赖：`pnpm install`

## 相关文件清单

需要修改的文件：
- ✅ `.env` - 更新数据库连接字符串
- ✅ `.env.example` - 更新示例配置
- ✅ `drizzle.config.ts` - 更新 Drizzle 配置
- ✅ `lib/drizzle/schema.ts` - 更新表定义和表名
- ✅ `lib/drizzle/index.ts` (或类似文件) - 更新数据库连接代码
- ✅ `package.json` - 更新依赖包

## 完成检查清单

- [ ] 已更新 `.env` 文件
- [ ] 已更新 `.env.example` 文件
- [ ] 已移除 SQLite 依赖
- [ ] 已添加 PostgreSQL 依赖
- [ ] 已更新 `drizzle.config.ts`
- [ ] 已更新 `lib/drizzle/schema.ts`
- [ ] 已更新数据库连接代码
- [ ] 已生成迁移文件
- [ ] 已在 Supabase 运行迁移
- [ ] 已测试所有功能
- [ ] 已备份旧数据（如需要）

## 支持

如有问题，请参考：
- [Drizzle ORM PostgreSQL 文档](https://orm.drizzle.team/docs/get-started-postgresql)
- [Supabase 文档](https://supabase.com/docs)
