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
import { formatDate, formatDateTime } from "@/lib/datetime";
import { requireUser } from "@/lib/auth/session";
import { SiteActionsPanel } from "./_components/site-actions";
import { ConfirmScan } from "./_components/ConfirmScan";
import { ScanTrendChart, type ScanPoint } from "./_components/scan-trend-chart";
import { SiteNotificationsPanel } from "./_components/site-notifications";
import { ScanDiffPanel } from "./_components/scan-diff-panel";
import { ChangeList } from "./_components/change-list";
import { SitemapTable } from "./_components/sitemap-table";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser({ redirectTo: `/sites/${id}` });
  const detail = await getSiteDetail({ siteId: id, ownerId: user.id, scansLimit: 20 });
  if (!detail) notFound();

  const { site, sitemaps, summary, recentScans, recentChanges, notifications, groups } = detail;
  const scanTrendPoints: ScanPoint[] = recentScans
    .filter((scan) => scan?.startedAt)
    .map((scan) => ({
      startedAt: normalizeToMillis(scan.startedAt),
      totalUrls: Number(scan.totalUrls ?? 0),
      added: Number(scan.added ?? 0),
      removed: Number(scan.removed ?? 0),
      updated: Number(scan.updated ?? 0),
    }))
    .filter((p) => Number.isFinite(p.startedAt));

  const notificationChannels = notifications.map((channel) => ({
    ...channel,
    type: channel.type as "email" | "webhook" | "slack",
    createdAt:
      channel.createdAt instanceof Date
        ? channel.createdAt.getTime()
        : channel.createdAt ?? null,
  }));

  const initialGroupId = site.groupId ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/sites" className="text-sm text-slate-600 hover:underline">
          ← 返回列表
        </Link>
        <div className="text-xs text-slate-500 space-x-2">
          <span>最近更新：{formatDateTime(site.updatedAt, { includeSeconds: true })}</span>
          <span>•</span>
          <span>最近扫描：{site.lastScanAt ? formatDateTime(site.lastScanAt, { includeSeconds: true }) : "—"}</span>
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
              {formatDateTime(site.createdAt, { includeSeconds: true })}
            </div>
            <div>
              <span className="text-slate-500">状态：</span>
              <Badge variant={site.enabled ? "added" : "removed"}>
                {site.enabled ? "已启用" : "已禁用"}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500">所属分组：</span>
              {site.groupId ? (
                <Badge variant="outline">
                  {groups.find((group) => group.id === site.groupId)?.name ?? "—"}
                </Badge>
              ) : (
                <span className="text-slate-400">未分组</span>
              )}
            </div>
            <div>
              <span className="text-slate-500">扫描优先级：</span>
              P{site.scanPriority ?? 1}
            </div>
            <div>
              <span className="text-slate-500">扫描间隔：</span>
              {site.scanIntervalMinutes ? `${site.scanIntervalMinutes} 分钟` : "默认"}
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
        initialPriority={site.scanPriority ?? 1}
        initialInterval={site.scanIntervalMinutes ?? 1440}
        initialGroupId={initialGroupId}
        groups={groups}
      />

      <SiteNotificationsPanel siteId={site.id} initialChannels={notificationChannels} />

      <ScanDiffPanel siteId={site.id} scans={recentScans.map((scan) => ({
        id: scan.id,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        status: scan.status,
      }))} />

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
          <SitemapTable sitemaps={sitemaps.map((item) => ({
            id: item.id,
            url: item.url,
            isIndex: item.isIndex,
            urlCounts: item.urlCounts,
            lastStatus: item.lastStatus,
            updatedAt: item.updatedAt,
          }))} />
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
                  <span>更新：{scan.updated ?? 0}</span>
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
          <CardContent>
            <ChangeList
              items={recentChanges.map((change) => ({
                id: change.id,
                type: change.type,
                detail: change.detail,
                occurredAt: change.occurredAt,
                source: change.source,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
