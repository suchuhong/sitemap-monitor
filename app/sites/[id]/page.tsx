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

export const runtime = 'edge';
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sites" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors hover-lift">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回列表
          </Link>
          <div className="h-4 w-px bg-border"></div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">站点详情</h1>
            <p className="text-sm text-muted-foreground mt-1">监控配置与数据分析</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>最近更新：{formatDateTime(site.updatedAt, { includeSeconds: true })}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>最近扫描：{site.lastScanAt ? formatDateTime(site.lastScanAt, { includeSeconds: true }) : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              基础信息
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-5 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
                <span className="text-sm font-medium text-muted-foreground">Root URL</span>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border hover:bg-background/80 transition-colors">
                <a
                  href={site.rootUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-medium break-all text-base flex items-center gap-2 group"
                >
                  <span>{site.rootUrl}</span>
                  <svg className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-muted-foreground">robots.txt</span>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border hover:bg-background/80 transition-colors">
                {site.robotsUrl ? (
                  <a
                    href={site.robotsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium break-all text-base flex items-center gap-2 group"
                  >
                    <span>{site.robotsUrl}</span>
                    <svg className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                    <span>未配置</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">创建时间</span>
                <div className="text-sm font-medium">{formatDateTime(site.createdAt, { includeSeconds: true })}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">状态</span>
                <div>
                  <Badge variant={site.enabled ? "added" : "removed"} className="font-medium">
                    {site.enabled ? "已启用" : "已禁用"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">扫描优先级</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">P{site.scanPriority ?? 1}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${i < (site.scanPriority ?? 1) ? 'bg-primary' : 'bg-muted'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">扫描间隔</span>
                <div className="text-sm font-medium">
                  {site.scanIntervalMinutes ? `${site.scanIntervalMinutes} 分钟` : "默认"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">所属分组</span>
              {site.groupId ? (
                <Badge variant="outline" className="font-medium">
                  {groups.find((group) => group.id === site.groupId)?.name ?? "—"}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">未分组</span>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">标签</span>
              {Array.isArray(site.tags) && site.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {site.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">未设置标签</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              URL 概览
            </CardTitle>
            <p className="text-sm text-muted-foreground">站点地图URL统计与活动分析</p>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="text-center p-4 rounded-lg bg-background/50 border">
                <div className="text-2xl font-bold text-primary mb-1">{summary.totalUrls}</div>
                <div className="text-xs text-muted-foreground">总数</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50 border">
                <div className="text-2xl font-bold text-emerald-600 mb-1">{summary.activeUrls}</div>
                <div className="text-xs text-muted-foreground">活跃</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50 border">
                <div className="text-2xl font-bold text-amber-600 mb-1">{summary.inactiveUrls}</div>
                <div className="text-xs text-muted-foreground">已失效</div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">最近活动</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-600">+{summary.activity.added}</div>
                    <div className="text-xs text-emerald-600/70">新增</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-rose-600">-{summary.activity.removed}</div>
                    <div className="text-xs text-rose-600/70">删除</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">~{summary.activity.updated}</div>
                    <div className="text-xs text-blue-600/70">更新</div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              统计基于最近一次扫描（共 {summary.activity.total} 个 URL），可在下方“最近扫描”中查看详情。
            </p>

            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">
                <svg className="inline h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                统计基于最近一次扫描（共 {summary.activity.total} 个 URL），可在下方 &quot;最近扫描&quot; 中查看详情。
              </p>
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

      <Card className="hover-lift relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            手动扫描
          </CardTitle>
          <p className="text-sm text-muted-foreground">立即触发站点地图扫描</p>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="p-4 rounded-lg bg-background/50 border">
            <p className="text-sm text-muted-foreground">
              <svg className="inline h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              立即触发一次 sitemap 扫描，用于验证配置或在重要变更发生时立刻同步数据。
            </p>
          </div>
          <ConfirmScan siteId={site.id} />
        </CardContent>
      </Card>

      <Card className="hover-lift relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Sitemap 列表
          </CardTitle>
          <p className="text-sm text-muted-foreground">站点地图文件详情与状态</p>
        </CardHeader>
        <CardContent className="relative">
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
        <Card className="hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              最近扫描
            </CardTitle>
            <p className="text-sm text-muted-foreground">扫描历史记录与状态</p>
          </CardHeader>
          <CardContent className="relative space-y-3 text-sm">
            {recentScans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>暂无扫描记录</p>
              </div>
            )}
            {recentScans.map((scan) => (
              <div key={scan.id} className="rounded-lg border p-4 bg-background/50 hover:bg-background/80 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium">{formatDate(scan.startedAt)}</div>
                  <Badge variant={statusBadgeVariant(scan.status ?? "unknown")} className="font-medium">
                    {scan.status ?? "unknown"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">URL总数</span>
                    <span className="font-semibold">{scan.totalUrls}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">新增</span>
                    <span className="font-semibold text-emerald-600">{scan.added}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-500">移除</span>
                    <span className="font-semibold text-rose-500">{scan.removed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">更新</span>
                    <span className="font-semibold text-amber-500">{scan.updated ?? 0}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {scan.finishedAt ? `完成于 ${formatDate(scan.finishedAt)}` : "进行中"}
                </div>
                {scan.error && (
                  <div className="mt-2 p-2 rounded bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-600 dark:text-rose-400">
                    {scan.error}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              最近变更
            </CardTitle>
            <p className="text-sm text-muted-foreground">URL变更历史与详情</p>
          </CardHeader>
          <CardContent className="relative">
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

