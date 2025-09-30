# 可观测性与日志说明

项目内置基础的日志与指标采集能力，便于后续扩展告警和运营大屏。

## 1. 日志存储结构

- 表：`observability_logs`
  - `id`：日志 ID（UUID）
  - `type`：日志类型，例如 `api`、`task`
  - `scope`：作用域，如请求路径或任务名称
  - `level`：`info` / `warning` / `error`
  - `message`：文本描述
  - `request_id`：可关联链路追踪 ID
  - `payload`：JSON 字符串，存储结构化数据
  - `created_at`：记录时间（秒级）

## 2. API 调用日志

- `app/api/[...hono]/route.ts` 中的中间件会为每次 API 请求生成 `requestId`，并在响应头中返回 `x-request-id`。
- 每次请求结束后会调用 `logEvent` 写入一条 `type=api` 日志，包含请求方法、路径与响应状态。
- 可通过 `db.select().from(observability_logs)` 查询，或在单独的数据可视化工具中消费。

## 3. 自定义日志

- 在服务端代码中引入 `logEvent`（`lib/observability/logger.ts`），可按需记录任意事件，例如任务执行、告警阈值触发等。
- 为保持链路一致性，可使用 `buildTraceContext()` 或复用现有 `requestId`。

```ts
import { logEvent } from "@/lib/observability/logger";

await logEvent({
  type: "task",
  scope: "scanSite",
  level: "warning",
  message: "scan retry exceeded",
  payload: { siteId },
  requestId,
});
```

## 4. 指标与大屏扩展建议

- 可在定时任务中聚合 `observability_logs` 到指标表，或导出到第三方如 Prometheus/ClickHouse。
- 仪表盘建议至少展示：API 成功率、错误趋势、任务队列耗时/失败率。
- 告警阈值可通过定期扫描日志并触发 `notification_channels` 完成（Stage 4 待实现）。

---

如需进一步扩展链路追踪，可在日志中记录 parent/child span 信息，并在前端或可视化大屏中按 `request_id` 聚合展示。
