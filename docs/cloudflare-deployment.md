# 使用 Cloudflare 免费套餐部署与定时扫描指南

本文档介绍如何在 Cloudflare Free 套餐上托管 Sitemap Monitor，并将数据库切换到 Cloudflare D1。内容覆盖数据库初始化、迁移流程、Pages & Workers 绑定、自动化部署、权限控制、可观测性，以及通过 Cron Worker 持续触发 `/api/cron/scan` 的实践建议。

## 部署流程概览

1. 创建 D1 数据库并同步 Drizzle 迁移。
2. 配置 `wrangler.toml` 与 Pages 的 D1 绑定，使运行时代码能够访问 `env.DB`。
3. 调整项目代码以在 Cloudflare 环境优先使用 D1，保留对本地 LibSQL/Turso 的兼容。
4. 在 Cloudflare Pages 上连接仓库、设置构建命令和环境变量，区分生产/预览环境。
5. 新建 Cron Worker，定期调用 `/api/cron/scan` 完成自动扫描。
6. 持续迭代自动化迁移、访问控制、监控告警与数据导出。

## 前置条件

- 已 Fork 或托管本项目代码（GitHub/GitLab/Bitbucket 均可）。
- 拥有 Cloudflare 账号（Free 套餐即可）并完成域或 Workers 开通流程。
- 本地安装 `pnpm` 和 `wrangler` CLI。
- 按 `.env.example` 准备本地开发环境变量。

> 提示：Cloudflare 控制台 UI 会不定期更新，下述路径基于 2025 年初版本。如有差异，可在控制台搜索 “D1 Database” 或 “Cron Triggers”。

## 第一步：创建 Cloudflare D1 数据库

1. 登录 Cloudflare 控制台，进入 **Workers & Pages > D1**，点击 **Create database**。
2. 填写数据库名称（例如 `sitemap-monitor`），确认账户 ID 与区域后保存。
3. 在数据库详情页记录：
   - **Database ID**（UUID）
   - **Database name**
   - **Primary region**（后续排查延迟或选择备份位置时可用）

### 同步 Drizzle 迁移到 D1

```bash
# 1. 安装依赖（首次执行）
pnpm install

# 2. 根据 schema 生成 SQL 迁移文件（输出至 drizzle/*.sql）
pnpm db:generate

# 3. 登录 Cloudflare 账户（如尚未登录）
wrangler login

# 4. 按文件名顺序将迁移推送到远端 D1
for file in $(ls drizzle/*.sql | sort); do
  wrangler d1 execute <database-name> --remote --file "$file"
done
```

- `--remote` 代表直接作用于 Cloudflare 生产实例。若想在本地验证，可使用 `--local` 先连接 D1 Dev。
- 成功后在 D1 控制台的 **Tables** 标签页应能看到 `users`、`sites`、`scans`、`changes` 等表。

#### 自动化迁移与备份建议

- 在 CI/CD 中使用 `wrangler d1 migrations apply` 或上述 shell 循环脚本，在合并 `main` 后自动执行迁移。
- 迁移前可运行 `wrangler d1 backups create <database-name>` 生成快照，出现异常时可在控制台的 **Backups** 页面恢复。
- 若需要多环境并行，建议为 Preview 创建独立数据库：`wrangler d1 create sitemap-monitor-preview`，避免预览部署污染生产数据。

## 第二步：配置 D1 绑定与运行时代码

D1 通过 **绑定（binding）** 暴露给 Workers/Pages，无法像 Turso 那样直接使用 `DB_URL` 访问。以下步骤完成绑定与代码侧适配。

### 配置 `wrangler.toml`

在仓库根目录新增或更新 `wrangler.toml`：

```toml
name = "sitemap-monitor"
compatibility_date = "2024-12-15"

[[d1_databases]]
binding = "DB"
database_name = "sitemap-monitor"
database_id = "<your-database-uuid>"
```

如需同时声明 Cron Worker，可在同一文件中追加 `main`、`[vars]`、`[triggers]` 等配置，详见后文示例。

### Pages Functions 绑定 D1

1. 在 Cloudflare Pages 项目的 **Settings > Functions > D1 database bindings** 中点击 **Add binding**。
2. 设置 **Binding name** 为 `DB`，选择刚创建的 D1 实例。
3. 保存后重新触发一次部署，使函数运行时具备 `env.DB`。

> 若启用了 Preview 部署，请在 Preview 环境重复绑定操作，并可指向前述独立的 Preview 数据库。

### 运行时代码适配示例

项目默认使用 `@libsql/client` 连接 Turso/LibSQL。为兼容 D1，可在 `lib/db.ts` 增加边界逻辑：

```ts
// lib/db.ts（示例片段）
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { createClient } from "@libsql/client";
import type { D1Database } from "@cloudflare/workers-types";

const globalForDb = globalThis as typeof globalThis & {
  __d1Db?: ReturnType<typeof drizzleD1>;
  __libsqlDb?: ReturnType<typeof drizzleLibSQL>;
};

export function resolveDb(env?: { DB: D1Database }) {
  if (env?.DB) {
    if (!globalForDb.__d1Db) globalForDb.__d1Db = drizzleD1(env.DB);
    return globalForDb.__d1Db;
  }

  if (!globalForDb.__libsqlDb) {
    const client = createClient({
      url: process.env.DB_URL!,
      authToken: process.env.DB_AUTH_TOKEN,
    });
    globalForDb.__libsqlDb = drizzleLibSQL(client);
  }

  return globalForDb.__libsqlDb;
}
```

在 Hono 入口 `app/api/[...hono]/route.ts` 中注入 `env.DB`：

```ts
import { resolveDb } from "@/lib/db";
import type { D1Database } from "@cloudflare/workers-types";

const app = new Hono<
  { Bindings: { DB: D1Database };
    Variables: { userId: string; userEmail?: string; requestId: string } }
>().basePath("/api");

app.use("*", async (c, next) => {
  c.set("db", resolveDb(c.env));
  await next();
});
```

之后，将代码中直接引用 `db` 的位置改为 `c.get("db")` 或通过依赖注入传递，确保 Cloudflare 环境使用 D1，而本地 `pnpm dev` 仍可读取 `DB_URL=file:./drizzle/local.sqlite`。

## 第三步：配置 Cloudflare Pages 构建与环境变量

1. 在 **Workers & Pages > Pages** 中点击 **Create application**，选择 **Connect to Git** 连接仓库。
2. 构建设置建议：
   - **Framework preset**：`Next.js`
   - **Build command**：`pnpm install && pnpm build`
   - **Build output directory**：`.vercel/output`
   - **Node version**：`20`
3. 在 **Environment Variables** 中配置：
   - `CRON_TOKEN`：自定义长随机字符串，用于保护 `/api/cron/scan`
   - `WEBHOOK_SECRET`：Webhook 签名密钥（可先留空）
   - `APP_BASE_URL`：Pages 域名（例如 `https://<project>.pages.dev`）
   - `DB_URL` / `DB_AUTH_TOKEN`：若保留 Turso/LibSQL 备用连接按需填写；纯 D1 时可以留空，但必须确保代码已处理无此变量场景。

### 预览环境与数据隔离

- Pages Preview 会默认复用生产环境变量。若需要数据隔离，可为 Preview 新建 D1 实例并在 **Preview** 标签下设置不同的 `D1` 绑定与环境变量（例如 `APP_BASE_URL=https://<project>-preview.pages.dev`）。
- 尽量避免在 Preview 环境执行会修改生产数据库的操作。必要时可以在代码中基于 `process.env.VERCEL_ENV` 或 Cloudflare 提供的 `c.env` 判定环境，限制高风险 API。

## 第四步：配置定时扫描（Cron Triggers）

Cloudflare Pages 不自带计划任务，需要借助 Workers Cron 定期调用 `/api/cron/scan`。

### Worker 脚本示例

```javascript
export default {
  async scheduled(event, env, ctx) {
    const target = new URL("/api/cron/scan", env.APP_BASE_URL);
    const res = await fetch(target.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CRON_TOKEN}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`cron scan failed: ${res.status} ${body}`);
    }
  },

  async fetch(request, env, ctx) {
    await this.scheduled(null, env, ctx);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

- 在 Worker 的 **Settings > Variables** 中添加 `APP_BASE_URL` 和 `CRON_TOKEN`（与 Pages 一致）。
- 在 **Triggers > Cron Triggers** 里新增计划任务，例如 `*/30 * * * *` 每 30 分钟执行一次。
- 免费套餐最多允许 3 条 Cron 计划。

### 统一管理 Pages 与 Worker（可选）

如果希望使用单个 `wrangler.toml` 管理 Cron Worker，可将以下内容与之前的 D1 绑定合并：

```toml
name = "sitemap-monitor-cron"
main = "workers/cron-scan.js"
compatibility_date = "2024-12-15"

[vars]
APP_BASE_URL = "https://<project>.pages.dev"
CRON_TOKEN = "<cron-token>"

[[d1_databases]]
binding = "DB"
database_name = "sitemap-monitor"
database_id = "<uuid>"

[triggers]
crons = ["0 * * * *"]
```

随后可以通过 `wrangler deploy` 将 Worker 与 Pages 一同部署到 Cloudflare。

### 大规模站点的调度优化

当站点数量较多时，可考虑：

- 将 Cron Worker 改为向 Cloudflare Queues 推送任务，再由消费者 Worker 分片调用 `/api/cron/scan?siteId=`。
- 在数据库中为站点记录 `scanIntervalMinutes`，Cron Worker 每次仅调度符合时间窗的站点，以降低单次扫描压力。

## 第五步：可观测性与安全

- **访问控制**：利用 Cloudflare Access、Service Auth 或 Turnstile 保护 `/api/cron/scan`、`/api/sites` 等敏感接口，可在 Worker 中校验 Access Token 或 JWT（如 `env.ACCESS_AUD`）。
- **日志与告警**：开启 Cloudflare Logpush/Analytics，监控 Cron Worker 的执行情况；把 `cron scan failed` 等异常发送至 Slack、PagerDuty 或邮件渠道。也可以在应用层使用 `lib/observability/logger.ts` 同步写入 D1。
- **D1 Insights**：通过 Cloudflare 控制台的 D1 Insights 查看查询成功率、延迟和资源使用情况，及时调整索引或优化扫描任务。

## 第六步：数据导出与报表

- 使用 `wrangler d1 execute <database-name> --remote --command "SELECT ..."` 快速导出变更数据，可配合 `jq`/`csvkit` 生成报表。
- 调用 D1 HTTP API 构建只读接口，将 `changes`、`scans` 聚合结果同步到第三方 BI（如 Superset、Metabase）。
- 若需要长期存档，可把查询结果写入 Cloudflare R2、KV 或通过 Queues 推送到外部仓库。

## 常见排查

- **401 unauthorized**：确认 Worker 与 Pages 使用同一份 `CRON_TOKEN`，并在请求头携带 `Bearer <token>`。
- **D1 binding not found**：检查 Pages 的函数设置是否添加 `DB` 绑定，或部署使用的 `wrangler.toml` 是否和项目一致。
- **no such table**：确保所有 `drizzle/*.sql` 已通过 `wrangler d1 execute` 或 `wrangler d1 migrations apply` 执行；必要时运行 `PRAGMA table_list;` 查看现有表。
- **429 Too Many Requests**：D1 Free 提供每日 5 万次请求，若命中限额需降低 Cron 频率或升级套餐。
- **TypeError: fetch failed**：通常由 `env.APP_BASE_URL` 配置错误或 Pages 新部署尚未生效导致，等待几分钟或检查域名解析。

## 总结

完成以上步骤后，Sitemap Monitor 即可在 Cloudflare 免费套餐上稳定运行：
- D1 负责持久化数据库，结合 Drizzle 迁移与 CI 流程确保 schema 一致。
- Pages 承载前后端应用，Preview/Production 实例各自绑定数据库，避免数据串扰。
- Worker Cron 定期触发 `/api/cron/scan`，并可扩展至 Queues 实现横向扩容。
- 结合 Access、Logpush、Insights 与数据导出策略，可持续优化安全性、可观测性与运营报表。

根据业务规模和 SLA 要求，可逐步引入更高频 Cron、分布式调度或多区域数据库复制，以满足企业级生产环境需求。
