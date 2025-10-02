# Sitemap Monitor

Sitemap Monitor 是一个基于 Next.js 15 的示例项目，用于接入站点并持续监控 sitemap 变更。项目整合了 Drizzle ORM、SQLite、本地队列与 Webhook 通知等能力，展示了从前端到 API 的完整链路。

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [主要页面](#主要页面)
- [主要脚本](#主要脚本)
- [Dashboard 数据](#dashboard-数据)
- [批量导入指南](#批量导入指南)
- [API 说明](#api-说明)
- [数据库结构](#数据库结构)

- [开发提示](#开发提示)

## 功能概览

- **站点接入/管理**：在 `/sites/new` 提交根地址，列表中可直接启用/禁用、删除站点。
- **Sitemap 递归解析**：使用 `fast-xml-parser` 解析 sitemap / sitemap index，自动补全子 sitemap。
- **变更监控**：通过 `scanSite` / `cronScan` 任务对比 URL 列表生成新增与删除记录。
- **站点详情视图**：`/sites/:id` 页面展示 sitemap 列表、最新扫描与变更汇总。
- **Webhook 通知**：`notifyChange` 会生成签名，实际项目可扩展为发布到外部回调。
- **Dashboard**：`/dashboard` 直接读取数据库统计站点数量、24h 变更与扫描失败率。
- **批量导入工具**：`/sites/import` 支持粘贴 CSV 或上传文件批量创建站点。
- **样式指南**：`/styleguide` 展示项目内使用的按钮、表单、空状态等组件，便于复用。
- **任务监控**：`/dashboard/tasks` 汇总所有解析任务状态及最新变更，便于排查异常。
- **趋势分析仪表盘**：`/dashboard` 新增变更趋势图与状态汇总，聚合 30 天数据。
- **分组与批量管理**：通过 `/sites/groups`、`/sites/bulk` 管理站点分组及标签批量操作。
- **变更归因与指派**：站点详情的变更面板支持记录来源、负责人与状态。
- **可观测性面板**：全局记录 API/任务日志，可用作运营大屏的数据源。

## 技术栈

- [Next.js 15.5](https://nextjs.org/)（App Router）
- [Hono](https://hono.dev/) 作为 API 路由适配器（参见 `app/api/[...hono]/route.ts`）
- [Drizzle ORM](https://orm.drizzle.team/) + SQLite 数据库
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) 解析 sitemap
- UI 基于 Tailwind CSS、Radix UI 组件（见 `components/ui`）

## 环境要求

- Node.js 18.17+ 或 20.x（Next.js 官方推荐）
- [pnpm](https://pnpm.io/) 8+（项目使用 `pnpm-lock.yaml`）

## 快速开始

1. **安装依赖**

   ```bash
   pnpm install
   ```

2. **配置环境变量**

   - 复制 `.env.example` 为 `.env`。
   - 默认 `.env` 已改为使用本地 SQLite：`DB_URL=file:./drizzle/local.sqlite`。

   - 设置 `CRON_TOKEN`、`WEBHOOK_SECRET` 等其他变量：
     ```env
     CRON_TOKEN=your-cron-secret
     WEBHOOK_SECRET=your-webhook-secret
     APP_BASE_URL=http://localhost:3000
     ```

3. **生成并应用数据库迁移**

   ```bash
   pnpm db:generate   # 根据 schema 生成 SQL 迁移
   pnpm db:migrate    # 对本地数据库执行迁移
   ```

   如需可视化数据库，可使用：

   ```bash
   pnpm db:studio
   ```

4. **启动开发服务器**
   ```bash
   pnpm dev
   ```
 打开 <http://localhost:3000> 体验页面。

- 默认演示账号为 `demo-user`，无需额外登录流程，接口层会在首次请求时自动创建。

## 主要页面

- `/dashboard`：概览最近 24 小时关键指标，提供快捷入口。
- `/dashboard/tasks`：解析任务状态与变更中心，查看队列中/运行中/失败的任务及最新变更。
- `/sites`：站点列表、排序筛选、标签过滤以及批量导入/导出按钮。
- `/sites/groups`：站点分组管理页，可新增、编辑、删除分组。
- `/sites/bulk`：批量分配分组、追加/移除标签的操作控制台。
- `/sites/new`：单个站点接入向导。
- `/sites/import`：批量导入工具（详见下文指南）。
- `/sites/:id`：站点详情（sitemap 列表、扫描记录、变更时间线）。
- `/styleguide`：UI 组件示例页，方便在实际页面中保持视觉一致性。
- `/dashboard/logs`（即将推出）：可基于 `observability_logs` 数据源搭建自定义告警与运营看板。

## 主要脚本

| 命令               | 说明                                                          |
| ------------------ | ------------------------------------------------------------- |
| `pnpm dev`         | 启动 Next.js 开发服务器                                       |
| `pnpm build`       | 生产构建                                                      |
| `pnpm start`       | 运行生产构建产物                                              |
| `pnpm lint`        | 运行 ESLint（Next.js 15 会提示迁移向导，按 CLI 指引选择配置） |
| `pnpm db:generate` | 基于 `lib/drizzle/schema.ts` 生成迁移                         |
| `pnpm db:migrate`  | 应用迁移到 `DB_URL` 指定的数据库                              |
| `pnpm db:studio`   | 打开 Drizzle Studio（数据库可视化）                           |

## 批量导入指南

1. 打开 `/sites/import`，可选择以下任一方式准备数据：
   - **粘贴 CSV 文本**：每行一个站点根地址，例如：
     ```
     https://example.com
     https://foo.bar
     ```
   - **上传 CSV 文件**：首列视为 `rootUrl`，其余列会被忽略。
2. 点击 “开始导入”，页面会通过 Fetch 调用 `/api/sites/import`，并实时展示成功数量或错误信息。
3. 导入成功后，表单会清空输入内容，可直接返回 `/sites` 查看新站点是否已入库。

> API 会自动忽略空行、无效 URL，并在失败时返回 JSON 错误信息。日志可在终端中查看（`import fail`）。

## Dashboard 数据

- **站点数量**：`sites` 表总记录数。
- **最近变更（24h）**：`changes` 表中过去 24 小时新增/删除记录的数量。
- **失败率（24h）**：`scans` 表中过去 24 小时非 `success` 状态的扫描数 / 总扫描数。
- **平均扫描耗时（24h）**：统计最近 24 小时内已完成扫描的平均耗时（分钟）。
- **扫描次数最多的站点（24h）**：列出最近 24 小时触发扫描次数排行 Top5 的站点。

## API 说明

所有 API 通过 `Hono` 在 `app/api/[...hono]/route.ts` 中定义，并统一挂载在 `/api` 前缀下。除非特别说明，响应头均为 `application/json`。

### 1. 站点接入 `POST /api/sites`

- **请求体**
  ```json
  { "rootUrl": "https://example.com" }
  ```
- **处理流程**
  1. 验证 `rootUrl` 为合法 URL。
  2. 若演示用户不存在则插入 `users` 记录。
  3. 创建站点（`sites`），并解析 `robots.txt`/sitemap，将结果写入 `sitemaps`。
- **成功响应**：`201 Created`
  ```json
  { "id": "uuid", "rootUrl": "https://example.com" }
  ```
- **失败响应**：
  - `400 Bad Request`：请求体无法通过 Zod 验证。
  - `500 Internal Server Error`：网络请求或数据库错误。

### 2. 查看站点详情 `GET /api/sites/:id`

- **作用**：返回指定站点的基础信息、sitemap 列表、最近扫描与变更。
- **成功响应**：`200 OK`
  ```json
  {
    "site": { "id": "uuid", "rootUrl": "https://example.com", "robotsUrl": "..." },
    "summary": { "totalUrls": 120, "activeUrls": 118, "inactiveUrls": 2 },
    "sitemaps": [
      {
        "id": "...",
        "url": "https://example.com/sitemap.xml",
        "urlCounts": { "total": 120, "active": 118, "inactive": 2 },
        "lastStatus": 200
      }
    ],
    "recentScans": [
      { "id": "...", "status": "success", "totalUrls": 120, "added": 1, "removed": 0 }
    ],
    "recentChanges": [
      { "id": "...", "type": "added", "detail": "https://example.com/new" }
    ]
  }
  ```
- **失败响应**：`404 Not Found` 当站点不存在或不属于当前用户时。

### 3. 更新站点 `PATCH /api/sites/:id`

- **作用**：修改站点根地址（会重新发现 sitemap）或启用/禁用监控。
- **请求体示例**：`{ "rootUrl": "https://example.com", "enabled": true }`（至少包含一个字段）。
- **成功响应**：`200 OK`，返回与详情接口一致的结构。
- **失败响应**：`400 Bad Request` 当未提供任何字段；`404 Not Found` 当站点不存在或无权限。

### 4. 删除站点 `DELETE /api/sites/:id`

- **作用**：移除站点及其 sitemap、URL、扫描与变更数据。
- **成功响应**：`200 OK` `{ "ok": true }`
- **失败响应**：`404 Not Found` 当站点不存在或无权限。

### 5. 手动扫描 `POST /api/sites/:id/scan`

- **作用**：触发一次 sitemap 扫描并写入 `scans`、`urls`、`changes`。
- **成功响应**：`200 OK`
  ```json
  { "scanId": "uuid", "totalUrls": 120, "added": 5, "removed": 1 }
  ```

### 6. Cron 扫描 `POST /api/cron/scan`

- **Headers**：`Authorization: Bearer <CRON_TOKEN>`。
- **作用**：遍历 `sites` 表，对每个站点执行 `scanSite`。
- **成功响应**：`200 OK`
  ```json
  {
    "sites": 3,
    "results": [{ "scanId": "...", "added": 0, "removed": 0, "totalUrls": 42 }]
  }
  ```
- **失败响应**：`401 Unauthorized` 当缺少或提供错误的 token 时。

### 7. 批量导入 `POST /api/sites/import`

- **Body**：支持 `multipart/form-data`（`file` 字段）或纯文本字段 `csv`，每行一个 URL。
- **成功响应**：`200 OK`，例如：
  ```json
  { "ok": true, "imported": 4 }
  ```
- **失败响应**：`400 Bad Request` 当未提供有效 CSV。

### 8. 导出变更 `GET /api/sites/:id/changes.csv`

- **Query 参数**：`type`（可选），`from`、`to`（ISO 日期，可选）。
- **响应**：`text/csv`，包含 `type,detail,occurredAt` 列。

### 9. 导出站点 `GET /api/sites/export.csv`

- **响应**：`text/csv`，含 `id,rootUrl,robotsUrl,createdAt`。

### 10. Webhook 管理

- `POST /api/sites/:id/webhooks`
  - Body：JSON 或表单；必填字段 `targetUrl`，可选 `secret`。
  - 成功：`200 OK` `{ "ok": true }`
  - 失败：`400 Bad Request` 当缺少 `targetUrl`。
- `POST /api/sites/:id/test-webhook`
  - 立即调用 `notifyChange`，用于验证配置。
  - 成功：`200 OK` `{ "ok": true }`

## 数据库结构

核心表位于 `lib/drizzle/schema.ts`：

- `users`、`sites`、`sitemaps`、`urls`、`scans`、`changes`、`webhooks`。
- 外键保证站点/URL/变更之间的关联；示例中会为 `demo-user` 自动创建一个用户以满足约束。

迁移文件存放于 `drizzle/`，初始迁移为 `0000_sleepy_stone_men.sql`。



## 开发提示

- `lib/logic/discover.ts` 与 `lib/logic/scan.ts` 使用全局 `XMLParser` 实例解析 XML，避免 ESM 默认导入 API 变更导致报错。
- 所有网络请求通过 `fetchWithCompression`，包含 gzip/deflate/br 与超时控制，可按需扩展重试逻辑。
- UI 引入了 Radix Slot、shadcn 风格组件，如需二次开发可查看 `components/ui`。
- `lib/datetime.ts` 提供 `formatDate` / `formatDateTime` 等工具，所有时间展示统一为 `YYYY-MM-DD HH:mm[:ss]`。
- 如果需要运行 ESLint，Next.js 15 会提示迁移脚本，可按向导执行或手动改为直接使用 `eslint` CLI。
- 未来功能拓展建议可参考 `docs/roadmap.md`，按阶段规划后续迭代。
- 阶段 1 新增能力（登录、队列、批量导入反馈等）的使用说明见 `docs/stage-one-guide.md`。
- 阶段 2 “监控能力增强”（差异报告、多渠道告警、外部调度建议）使用指南见 `docs/stage-two-guide.md`。
- 阶段 3 “分析与运营工具”（趋势分析、分组管理、变更归因）使用指南见 `docs/stage-three-guide.md`。
- 可观测性与日志采集说明见 `docs/observability.md`。
