import { StatusIndicator } from "@/components/ui/status-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/lib/auth/session";
import { resolveDb } from "@/lib/db";
import { scans, sites, changes } from "@/lib/drizzle/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = 'edge';
export const dynamic = "force-dynamic";

type ScanWithSite = {
  id: string;
  siteId: string;
  rootUrl: string;
  status: string | null;
  totalUrls: number | null;
  added: number | null;
  removed: number | null;
  updated: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
};

type ChangeRecord = {
  id: string;
  siteId: string;
  rootUrl: string;
  type: string;
  detail: string | null;
  occurredAt: Date | null;
  source: string | null;
};

export default async function TasksPage() {
  const user = await requireUser({ redirectTo: "/dashboard/tasks" });
  const db = resolveDb();

  const [rawScanRows, rawChangeRows] = await Promise.all([
    db
      .select()
      .from(scans)
      .innerJoin(sites, eq(scans.siteId, sites.id))
      .where(eq(sites.ownerId, user.id))
      .orderBy(desc(scans.startedAt))
      .limit(50),
    db
      .select()
      .from(changes)
      .innerJoin(sites, eq(changes.siteId, sites.id))
      .where(eq(sites.ownerId, user.id))
      .orderBy(desc(changes.occurredAt))
      .limit(100),
  ]);

  const scanRows: ScanWithSite[] = rawScanRows.map(row => ({
    id: row.scans.id,
    siteId: row.scans.siteId,
    rootUrl: row.sites.rootUrl,
    status: row.scans.status,
    totalUrls: row.scans.totalUrls,
    added: row.scans.added,
    removed: row.scans.removed,
    updated: row.scans.updated,
    startedAt: row.scans.startedAt,
    finishedAt: row.scans.finishedAt,
    error: row.scans.error,
  }));

  const changeRows: ChangeRecord[] = rawChangeRows.map(row => ({
    id: row.changes.id,
    siteId: row.changes.siteId,
    rootUrl: row.sites.rootUrl,
    type: row.changes.type,
    detail: row.changes.detail,
    occurredAt: row.changes.occurredAt,
    source: row.changes.source,
  }));

  const statusCounts = scanRows.reduce(
    (acc, scan) => {
      const key = scan.status ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">解析任务监控</h1>
        <p className="text-sm text-muted-foreground">
          查看所有解析任务状态与最近的站点变更，便于快速排查异常。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status} className="hover-lift">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{statusLabel(status)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{count}</div>
              <p className="text-xs text-muted-foreground mt-1">当前任务状态数量</p>
            </CardContent>
          </Card>
        ))}
        {scanRows.length === 0 && (
          <Card className="hover-lift">
            <CardContent className="py-6 text-sm text-muted-foreground">
              暂无解析任务记录，先从站点详情页触发一次扫描试试。
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">最近解析任务</h2>
          <p className="text-xs text-muted-foreground">最新 50 条</p>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-2">站点</th>
                  <th className="px-4 py-2">状态</th>
                  <th className="px-4 py-2">统计</th>
                  <th className="px-4 py-2">开始时间</th>
                  <th className="px-4 py-2">结束时间</th>
                  <th className="px-4 py-2">错误信息</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scanRows.map((scan) => (
                  <tr key={scan.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2 align-top">
                      <div className="font-medium text-primary break-all">{scan.rootUrl}</div>
                      <p className="text-xs text-muted-foreground">ID: {scan.id}</p>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <StatusIndicator status={statusTone(scan.status)}>
                        {statusLabel(scan.status)}
                      </StatusIndicator>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span>总计：{scan.totalUrls ?? 0}</span>
                        <span className="text-emerald-600">+{scan.added ?? 0}</span>
                        <span className="text-rose-500">-{scan.removed ?? 0}</span>
                        <span className="text-amber-500">Δ{scan.updated ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-muted-foreground">
                      {scan.startedAt ? formatDateTime(scan.startedAt, { includeSeconds: true }) : "—"}
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-muted-foreground">
                      {scan.finishedAt ? formatDateTime(scan.finishedAt, { includeSeconds: true }) : "—"}
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-rose-500">
                      {scan.error ? scan.error : "—"}
                    </td>
                  </tr>
                ))}
                {scanRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      暂无任务记录。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">最近变更记录</h2>
          <p className="text-xs text-muted-foreground">最新 100 条</p>
        </div>
        <div className="space-y-2">
          {changeRows.length === 0 && (
            <Card className="hover-lift">
              <CardContent className="py-6 text-sm text-muted-foreground">
                暂无变更记录。
              </CardContent>
            </Card>
          )}
          {changeRows.map((change) => (
            <div
              key={change.id}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-primary break-all">{change.rootUrl}</div>
                <span className="text-xs text-muted-foreground">
                  {change.occurredAt ? formatDateTime(change.occurredAt, { includeSeconds: true }) : "—"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <StatusIndicator status={statusTone(change.type)}>{statusLabel(change.type)}</StatusIndicator>
                <span className="text-muted-foreground break-all">{change.detail ?? "—"}</span>
              </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>来源：{change.source ?? "—"}</span>
            </div>
          </div>
        ))}
        </div>
      </section>
    </div>
  );
}

function statusLabel(status?: string | null) {
  const value = (status ?? "unknown").toLowerCase();
  if (value === "success") return "成功";
  if (value === "failed") return "失败";
  if (value === "running") return "运行中";
  if (value === "queued") return "排队中";
  if (value === "added") return "新增";
  if (value === "removed") return "删除";
  if (value === "updated") return "更新";
  if (value === "open") return "未处理";
  if (value === "in_progress") return "处理中";
  if (value === "resolved") return "已解决";
  return "未知";
}

function statusTone(status?: string | null): "success" | "error" | "warning" | "info" | "pending" {
  const value = (status ?? "").toLowerCase();
  if (value === "success" || value === "added") return "success";
  if (value === "failed" || value === "removed") return "error";
  if (value === "running" || value === "updated" || value === "in_progress") return "warning";
  if (value === "resolved") return "success";
  if (value === "queued") return "info";
  return "pending";
}
