import Link from "next/link";
import { SchedulerControl } from "@/components/scheduler/scheduler-control";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SchedulerPage() {
  await requireUser({ redirectTo: "/login" });

  const requestedType = process.env.SCHEDULER_TYPE || "advanced";
  const disabled =
    requestedType === "disabled" || process.env.DISABLE_INTERNAL_SCHEDULER === "true";
  const cronExpr = process.env.SCAN_CRON_SCHEDULE ?? "*/5 * * * *";
  const timezone = process.env.SCHEDULER_TIMEZONE ?? "UTC";
  const autoStart =
    process.env.ENABLE_INTERNAL_SCHEDULER === "true" ||
    (process.env.NODE_ENV === "production" && !disabled);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">调度器管理中心</h1>
        <p className="text-muted-foreground">
          查看调度状态、调整运行配置，并在需要时手动触发 sitemap 扫描。
        </p>
      </header>

      <SchedulerControl />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>环境配置概览</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                仅保留高级调度器，以下变量影响运行时行为。
              </p>
            </div>
            <Badge variant={disabled ? "outline" : "default"}>
              {disabled ? "已禁用" : "高级模式"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span>自动启动</span>
              <Badge variant={autoStart && !disabled ? "default" : "secondary"}>
                {autoStart && !disabled ? "开启" : "关闭"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span>Cron 表达式</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{cronExpr}</code>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span>时区</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{timezone}</code>
            </div>
            <div className="text-xs text-muted-foreground">
              如需禁用调度器，可设置 <code>SCHEDULER_TYPE=disabled</code> 或
              <code> DISABLE_INTERNAL_SCHEDULER=true</code>。
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>常用 API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">查询状态</p>
              <pre className="mt-2 rounded bg-muted p-3 text-xs"><code>GET /api/scheduler/status</code></pre>
            </div>
            <div>
              <p className="font-medium">启动 / 停止调度器</p>
              <pre className="mt-2 rounded bg-muted p-3 text-xs"><code>POST /api/scheduler/start
POST /api/scheduler/stop</code></pre>
            </div>
            <div>
              <p className="font-medium">手动触发一次扫描</p>
              <pre className="mt-2 rounded bg-muted p-3 text-xs"><code>POST /api/scheduler/scan</code></pre>
            </div>
            <div>
              <p className="font-medium">自定义计划任务</p>
              <pre className="mt-2 rounded bg-muted p-3 text-xs">
                <code>
                  {`POST /api/scheduler/tasks
{ "name": "evening-scan", "schedule": "0 18 * * *" }

DELETE /api/scheduler/tasks/evening-scan`}
                </code>
              </pre>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>最佳实践与排错提示</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>在生产环境启用内部调度器的同时，建议保留外部 Cron 作为兜底。</li>
            <li>若队列长时间无任务执行，请检查数据库锁、网络请求以及 Cron 表达式是否配置正确。</li>
            <li>通过日志关键字 <code>Running scheduled scans...</code> 与 <code>Queued X sites</code> 快速确认调度器是否按期运行。</li>
            <li>结合 <code>/api/scheduler/status</code> 与调度页面的实时状态，可以定位自定义任务是否仍在计划内。</li>
          </ul>
          <p>
            更多细节可参考项目文档《定时任务调度器使用指南》（位于 <code>docs/scheduler-guide.md</code>）。
            若需要调整通知渠道，请同时更新相关环境变量确保邮件与 Slack 投递正常。
          </p>
        </CardContent>
      </Card>

      <footer className="text-xs text-muted-foreground">
        <p>
          小贴士：调度器使用的是高级模式（node-cron），支持秒级到月级的任意 Cron 表达式。
          在推送到生产环境之前，建议先在预发布环境验证手动扫描与通知链路。
        </p>
        <p className="mt-1">
          返回 <Link href="/dashboard" className="text-primary hover:underline">数据面板</Link> 继续查看扫描统计。
        </p>
      </footer>
    </div>
  );
}
