# Sitemap Monitor

Sitemap Monitor 是一个基于 Next.js 15 的站点地图监控系统，用于接入站点并持续监控 sitemap 变更。项目整合了 Drizzle ORM、PostgreSQL (Supabase)、本地队列与 Webhook 通知等能力，展示了从前端到 API 的完整链路。

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [主要页面](#主要页面)
- [主要脚本](#主要脚本)
- [API 说明](#api-说明)
- [数据库结构](#数据库结构)
- [文档导航](#文档导航)
- [开发提示](#开发提示)

## 功能概览

- **站点接入/管理**：在 `/sites/new` 提交根地址，列表中可直接启用/禁用、删除站点
- **Sitemap 递归解析**：使用 `fast-xml-parser` 解析 sitemap / sitemap index，自动补全子 sitemap
- **变更监控**：通过 `scanSite` / `cronScan` 任务对比 URL 列表生成新增与删除记录
- **站点详情视图**：`/sites/:id` 页面展示 sitemap 列表、最新扫描与变更汇总
- **Webhook 通知**：`notifyChange` 会生成签名，实际项目可扩展为发布到外部回调
- **Dashboard**：`/dashboard` 直接读取数据库统计站点数量、24h 变更与扫描失败率
- **批量导入工具**：`/sites/import` 支持粘贴 CSV 或上传文件批量创建站点
- **样式指南**：`/styleguide` 展示项目内使用的按钮、表单、空状态等组件，便于复用
- **任务监控**：`/dashboard/tasks` 汇总所有解析任务状态及最新变更，便于排查异常
- **趋势分析仪表盘**：`/dashboard` 新增变更趋势图与状态汇总，聚合 30 天数据
- **分组与批量管理**：通过 `/sites/groups`、`/sites/bulk` 管理站点分组及标签批量操作
- **变更归因与指派**：站点详情的变更面板支持记录来源、负责人与状态
- **高性能查询**：使用 SQL 聚合查询和数据库索引，Dashboard 加载速度提升 27 倍

## 技术栈

- [Next.js 15.5](https://nextjs.org/)（App Router）
- [Hono](https://hono.dev/) 作为 API 路由适配器
- [Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL (Supabase)
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) 解析 sitemap
- UI 基于 Tailwind CSS、Radix UI 组件

## 环境要求

- Node.js 18.17+ 或 20.x（Next.js 官方推荐）
- [pnpm](https://pnpm.io/) 8+（项目使用 `pnpm-lock.yaml`）
- PostgreSQL 数据库（推荐使用 Supabase）

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并配置以下变量：

```env
# 数据库连接（必需）
DATABASE_URL="postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"

# 安全令牌（必需）
CRON_TOKEN=your-cron-secret
WEBHOOK_SECRET=your-webhook-secret

# 应用配置
APP_BASE_URL=http://localhost:3000

# 邮件配置（可选）
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASS=secret
EMAIL_SMTP_SECURE=false
EMAIL_FROM="Sitemap Monitor <noreply@example.com>"
```

### 3. 初始化数据库

```bash
# 运行数据库迁移（创建表结构和索引）
pnpm db:migrate

# 可选：打开 Drizzle Studio 可视化数据库
pnpm db:studio
```

### 4. 启动开发服务器

```bash
pnpm dev
```

打开 <http://localhost:3000> 体验页面。

- 默认演示账号为 `demo-user`，无需额外登录流程
- 接口层会在首次请求时自动创建用户

## 主要页面

- `/dashboard` - 概览最近 24 小时关键指标，提供快捷入口
- `/dashboard/tasks` - 解析任务状态与变更中心
- `/sites` - 站点列表、排序筛选、标签过滤
- `/sites/groups` - 站点分组管理
- `/sites/bulk` - 批量操作控制台
- `/sites/new` - 单个站点接入向导
- `/sites/import` - 批量导入工具
- `/sites/:id` - 站点详情（sitemap 列表、扫描记录、变更时间线）
- `/styleguide` - UI 组件示例页

## 主要脚本

| 命令               | 说明                                    |
| ------------------ | --------------------------------------- |
| `pnpm dev`         | 启动 Next.js 开发服务器                 |
| `pnpm build`       | 生产构建                                |
| `pnpm start`       | 运行生产构建产物                        |
| `pnpm lint`        | 运行 ESLint                             |
| `pnpm db:generate` | 基于 schema 生成迁移文件                |
| `pnpm db:migrate`  | 应用迁移到数据库                        |
| `pnpm db:studio`   | 打开 Drizzle Studio（数据库可视化）    |

## API 说明

所有 API 通过 `Hono` 在 `app/api/[...hono]/route.ts` 中定义，并统一挂载在 `/api` 前缀下。

### 核心接口

- `POST /api/sites` - 创建站点
- `GET /api/sites/:id` - 查看站点详情
- `PATCH /api/sites/:id` - 更新站点
- `DELETE /api/sites/:id` - 删除站点
- `POST /api/sites/:id/scan` - 手动扫描
- `POST /api/cron/scan` - 定时扫描（需要 CRON_TOKEN）
- `POST /api/sites/import` - 批量导入
- `GET /api/sites/export.csv` - 导出站点
- `GET /api/sites/:id/changes.csv` - 导出变更

详细 API 文档请参考 [API 文档](docs/DETAILED_FUNCTIONALITY.md)。

## 数据库结构

项目使用 PostgreSQL 数据库，所有表名带有 `sitemap_monitor_` 前缀。

### 核心表

- `sitemap_monitor_users` - 用户表
- `sitemap_monitor_site_groups` - 站点分组
- `sitemap_monitor_sites` - 站点信息
- `sitemap_monitor_sitemaps` - Sitemap 列表
- `sitemap_monitor_urls` - URL 记录
- `sitemap_monitor_scans` - 扫描历史
- `sitemap_monitor_changes` - 变更记录
- `sitemap_monitor_webhooks` - Webhook 配置
- `sitemap_monitor_notification_channels` - 通知渠道

### 性能优化

数据库包含 14 个性能索引，优化了以下查询：
- 按站点和时间查询变更
- 按类型查询变更
- Dashboard 统计查询
- 按站点查询扫描
- 按状态查询扫描

详细信息请参考 [索引创建报告](docs/INDEX_CREATION_REPORT.md)。

## 文档导航

### 📚 完整文档索引

**[📖 查看完整文档索引](docs/INDEX.md)** - 所有文档的分类导航

### 🚀 快速链接

#### 使用指南
- [详细功能说明](docs/guides/DETAILED_FUNCTIONALITY.md) - 完整的功能介绍和使用指南
- [Vercel 部署指南](docs/guides/VERCEL_DEPLOYMENT_GUIDE.md) - Vercel 平台部署配置
- [Webhook 和通知渠道指南](docs/guides/webhook-channel-guide.md) - 通知配置说明

#### 故障排查
- [扫描卡住完整修复](docs/troubleshooting/SCAN_STUCK_FIX_COMPLETE.md) - 完整的修复方案
- [快速修复运行中扫描](docs/troubleshooting/QUICK_FIX_RUNNING_SCANS.md) - 3 步快速修复
- [扫描不工作诊断](docs/troubleshooting/SCAN_NOT_WORKING_DIAGNOSIS.md) - 完整的诊断流程

#### 性能优化
- [性能优化指南](docs/optimization/PERFORMANCE_OPTIMIZATION.md) - 系统性能优化
- [扫描超时优化](docs/optimization/SCAN_TIMEOUT_OPTIMIZATION.md) - 扫描超时问题优化

#### 数据库迁移
- [PostgreSQL 迁移指南](docs/migration/POSTGRESQL_MIGRATION_GUIDE.md) - 从 SQLite 迁移到 PostgreSQL
- [迁移完成报告](docs/migration/MIGRATION_COMPLETE.md) - 完整迁移总结

## 开发提示

### 代码结构

- `lib/logic/discover.ts` - Sitemap 发现和解析逻辑
- `lib/logic/scan.ts` - 扫描和变更检测逻辑
- `lib/logic/notify.ts` - 通知发送逻辑
- `lib/db.ts` - 数据库连接配置
- `lib/drizzle/schema.ts` - 数据库表结构定义

### 性能优化

- 使用 SQL 聚合查询替代应用层数据处理
- Dashboard 查询使用 `GROUP BY` 和 `COUNT` 优化
- 所有关键查询路径都有索引支持
- 使用连接池管理数据库连接

### 网络请求

- 所有网络请求通过 `fetchWithCompression` 处理
- 支持 gzip/deflate/br 压缩
- 包含超时控制和重试逻辑

### UI 组件

- 基于 Radix UI 和 shadcn 风格
- 组件位于 `components/ui` 目录
- 统一的时间格式化工具 `lib/datetime.ts`

### 数据库操作

- 使用 Drizzle ORM 进行类型安全的查询
- 迁移文件位于 `drizzle/` 目录
- 支持通过 `pnpm db:studio` 可视化管理

### 脚本工具

项目提供了多个实用脚本：

- `scripts/migrate-data.ts` - 数据迁移工具
- `scripts/verify-migration.ts` - 数据验证工具
- `scripts/create-indexes.ts` - 索引创建工具
- `scripts/test-dashboard-performance.ts` - 性能测试工具
- `scripts/test-dashboard-data.ts` - 数据验证工具

## 部署

### 环境变量配置

确保在生产环境配置以下环境变量：

1. `DATABASE_URL` - PostgreSQL 连接字符串
2. `CRON_TOKEN` - Cron 任务认证令牌
3. `WEBHOOK_SECRET` - Webhook 签名密钥
4. `APP_BASE_URL` - 应用基础 URL

### 数据库初始化

在生产环境首次部署时：

```bash
# 运行迁移
pnpm db:migrate

# 可选：创建性能索引（如果迁移未自动创建）
DATABASE_URL="..." npx tsx scripts/create-indexes.ts
```

### 性能监控

建议监控以下指标：

- 数据库查询性能
- API 响应时间
- 扫描任务成功率
- 通知发送成功率

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 本项目使用 PostgreSQL (Supabase) 作为数据库，所有数据已从 SQLite 迁移。如需了解迁移详情，请查看 [迁移文档](docs/MIGRATION_COMPLETE.md)。
