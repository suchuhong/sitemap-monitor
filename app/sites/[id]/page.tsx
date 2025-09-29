import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { getSiteDetail } from "@/lib/logic/site-detail";
import { SiteActionsPanel } from "./_components/site-actions";
import { ConfirmScan } from "./_components/ConfirmScan";
import { ScanTrendChart, type ScanPoint } from "./_components/scan-trend-chart";

export const dynamic = "force-dynamic";

const DEMO_OWNER_ID = "demo-user";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSiteDetail({ siteId: id, ownerId: DEMO_OWNER_ID, scansLimit: 20 });
  if (!detail) notFound();

  const { site, sitemaps, summary, recentScans, recentChanges } = detail;
  const scanTrendPoints: ScanPoint[] = recentScans
    .filter((scan) => scan?.startedAt)
    .map((scan) => ({
      startedAt: normalizeToMillis(scan.startedAt),
      totalUrls: Number(scan.totalUrls ?? 0),
      added: Number(scan.added ?? 0),
      removed: Number(scan.removed ?? 0),
    }))
    .filter((p) => Number.isFinite(p.startedAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/sites" className="text-sm text-slate-600 hover:underline">
          ← 返回列表
        </Link>
        <div className="text-xs text-slate-500">
          最近更新：{formatDate(site.updatedAt)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基础信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Root URL：</span>
              <a href={site.rootUrl} target="_blank" rel="noreferrer" className="underline">
                {site.rootUrl}
              </a>
            </div>
            <div>
              <span className="text-slate-500">robots.txt：</span>
              {site.robotsUrl ? (
                <a href={site.robotsUrl} target="_blank" rel="noreferrer" className="underline">
                  {site.robotsUrl}
                </a>
              ) : (
                "—"
              )}
            </div>
            <div>
              <span className="text-slate-500">创建时间：</span>
              {formatDate(site.createdAt)}
            </div>
            <div>
              <span className="text-slate-500">状态：</span>
              <Badge variant={site.enabled ? "added" : "removed"}>
                {site.enabled ? "已启用" : "已禁用"}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500">标签：</span>
              {Array.isArray(site.tags) && site.tags.length ? (
                <span className="inline-flex flex-wrap gap-2">
                  {site.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/40 dark:text-blue-200"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-slate-400">未设置</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>URL 概览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-semibold">{summary.totalUrls}</div>
                <div className="text-xs text-slate-500">总数</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {summary.activeUrls}
                </div>
                <div className="text-xs text-slate-500">活跃</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {summary.inactiveUrls}
                </div>
                <div className="text-xs text-slate-500">已失效</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SiteActionsPanel
        siteId={site.id}
        initialRootUrl={site.rootUrl}
        initialEnabled={Boolean(site.enabled)}
        initialTags={Array.isArray(site.tags) ? site.tags : []}
      />

      <ScanTrendChart points={scanTrendPoints} />

      <Card className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle>手动扫描</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>
            立即触发一次 sitemap 扫描，用于验证配置或在重要变更发生时立刻同步数据。
          </p>
          <ConfirmScan siteId={site.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sitemap 列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2">URL</th>
                  <th className="px-2 py-2">类型</th>
                  <th className="px-2 py-2">URL 数量</th>
                  <th className="px-2 py-2">最后状态</th>
                  <th className="px-2 py-2">更新时间</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {sitemaps.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-2 py-2">
                      <a href={item.url} target="_blank" rel="noreferrer" className="underline">
                        {item.url}
                      </a>
                    </td>
                    <td className="px-2 py-2">
                      {item.isIndex ? <Badge variant="outline">Index</Badge> : "URL 集"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>总计 {item.urlCounts.total}</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          活跃 {item.urlCounts.active}
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          失效 {item.urlCounts.inactive}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2">{item.lastStatus ?? "—"}</td>
                    <td className="px-2 py-2">{formatDate(item.updatedAt)}</td>
                  </tr>
                ))}
                {sitemaps.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      暂未发现 sitemap
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近扫描</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {recentScans.length === 0 && <div className="text-slate-500">暂无扫描记录</div>}
            {recentScans.map((scan) => (
              <div key={scan.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{formatDate(scan.startedAt)}</div>
                  <Badge variant={statusBadgeVariant(scan.status ?? "unknown")}>{scan.status ?? "unknown"}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>URL：{scan.totalUrls}</span>
                  <span>新增：{scan.added}</span>
                  <span>移除：{scan.removed}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {scan.finishedAt ? `完成于 ${formatDate(scan.finishedAt)}` : "进行中"}
                </div>
                {scan.error && (
                  <div className="mt-2 text-xs text-rose-500">{scan.error}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近变更</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {recentChanges.length === 0 && <div className="text-slate-500">暂无变更</div>}
            {recentChanges.map((change) => (
              <div key={change.id} className="rounded-xl border p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{formatDate(change.occurredAt)}</span>
                  <Badge variant={changeBadgeVariant(change.type)}>{change.type}</Badge>
                </div>
                <div className="mt-2 break-words text-sm">{change.detail ?? "—"}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDate(value: unknown) {
  const date = coerceDate(value);
  return date ? date.toLocaleString() : "—";
}

function coerceDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const millis = num > 1e12 ? num : num * 1000;
  return new Date(millis);
}

function normalizeToMillis(value: unknown) {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  const num = Number(value);
  if (!Number.isFinite(num)) return NaN;
  return num > 1e12 ? num : num * 1000;
}

function statusBadgeVariant(status: string): BadgeProps["variant"] {
  if (status === "success") return "added";
  if (status === "failed") return "removed";
  return "default";
}

function changeBadgeVariant(type: string): BadgeProps["variant"] {
  if (type === "added") return "added";
  if (type === "removed") return "removed";
  return "updated";
}
