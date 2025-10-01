import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resolveDb } from "@/lib/db";
import { sites, changes, scans } from "@/lib/drizzle/schema";
import { sql, gte, desc, eq, and, count } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { ChangeTrendChart, type ChangeTrendPoint } from "./_components/change-trend-chart";

export default async function Page() {
  const user = await requireUser({ redirectTo: "/dashboard" });
  const db = resolveDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const siteRows = await db
    .select()
    .from(sites)
    .where(eq(sites.ownerId, user.id));
  const siteRow = siteRows[0];
  const changeRows = await db
    .select()
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(and(eq(sites.ownerId, user.id), gte(changes.occurredAt, since)));
  
  const added = changeRows.filter(row => row.changes.type === 'added').length;
  const removed = changeRows.filter(row => row.changes.type === 'removed').length;

  const scanRows = await db
    .select()
    .from(scans)
    .innerJoin(sites, eq(scans.siteId, sites.id))
    .where(and(eq(sites.ownerId, user.id), gte(scans.startedAt, since)));
  
  const total = scanRows.length;
  const failed = scanRows.filter(row => row.scans.status !== 'success').length;
  const completedScans = scanRows.filter(row => row.scans.finishedAt && row.scans.startedAt);
  const duration = completedScans.length > 0 
    ? completedScans.reduce((sum, row) => {
        const start = new Date(row.scans.startedAt!).getTime();
        const end = new Date(row.scans.finishedAt!).getTime();
        return sum + (end - start) / 1000; // convert to seconds
      }, 0) / completedScans.length
    : 0;

  const topSiteRows = await db
    .select()
    .from(sites)
    .leftJoin(
      scans,
      and(eq(scans.siteId, sites.id), gte(scans.startedAt, since)),
    )
    .where(eq(sites.ownerId, user.id));

  // Group scans by siteId and count them
  const siteScansMap = new Map<string, number>();
  const siteDataMap = new Map<string, { siteId: string; rootUrl: string }>();
  
  for (const row of topSiteRows) {
    const siteId = row.sites.id;
    const rootUrl = row.sites.rootUrl;
    
    // Store site data
    if (!siteDataMap.has(siteId)) {
      siteDataMap.set(siteId, { siteId, rootUrl });
    }
    
    // Count scans
    if (row.scans?.id) {
      siteScansMap.set(siteId, (siteScansMap.get(siteId) || 0) + 1);
    } else if (!siteScansMap.has(siteId)) {
      siteScansMap.set(siteId, 0);
    }
  }

  const topSites = Array.from(siteDataMap.values())
    .map(site => ({
      ...site,
      scanCount: siteScansMap.get(site.siteId) || 0,
    }))
    .sort((a, b) => b.scanCount - a.scanCount)
    .slice(0, 5);

  const trendWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trendChangeRows = await db
    .select()
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(and(eq(sites.ownerId, user.id), gte(changes.occurredAt, trendWindowStart)));

  // Group changes by day and count by type
  const trendMap = new Map<string, { added: number; removed: number; updated: number }>();
  
  for (const row of trendChangeRows) {
    const day = getDayKey(row.changes.occurredAt);
    if (!day) continue;
    
    if (!trendMap.has(day)) {
      trendMap.set(day, { added: 0, removed: 0, updated: 0 });
    }
    
    const dayData = trendMap.get(day)!;
    if (row.changes.type === 'added') dayData.added++;
    else if (row.changes.type === 'removed') dayData.removed++;
    else if (row.changes.type === 'updated') dayData.updated++;
  }

  const changeTrendRows = Array.from(trendMap.entries())
    .map(([day, counts]) => ({ day, ...counts }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const sitesCount = siteRows.length;
  const added24h = Number(added ?? 0);
  const removed24h = Number(removed ?? 0);
  const totalScans = Number(total ?? 0);
  const failedScans = Number(failed ?? 0);
  const avgDuration = duration
    ? Math.round((Number(duration) / 60) * 10) / 10
    : 0;
  const failRate = totalScans
    ? Math.round((failedScans / totalScans) * 100)
    : 0;

  const changeTrend: ChangeTrendPoint[] = changeTrendRows.map((row) => ({
    date: row.day,
    added: Number(row.added ?? 0),
    removed: Number(row.removed ?? 0),
    updated: Number(row.updated ?? 0),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">数据面板</h1>
          <p className="text-muted-foreground">监控您的站点地图变化和扫描状态</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/chart-preview">
            <Button variant="outline" className="hover-lift">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              图表预览
            </Button>
          </Link>
          <Link href="/sites/new">
            <Button className="hover-lift">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              添加站点
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              站点总数
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-primary">{sitesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              正在监控的站点数量
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              24h 变更
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline space-x-4">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-emerald-600">+{added24h}</span>
                <span className="text-xs text-emerald-600/70">新增</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-rose-500">-{removed24h}</span>
                <span className="text-xs text-rose-500/70">删除</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              过去 24 小时页面变化
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift relative overflow-hidden">
          <div className={`absolute inset-0 ${failRate > 10 
            ? 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-rose-900/20' 
            : 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20'
          }`}></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              扫描失败率
            </CardTitle>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${
              failRate > 10 
                ? 'bg-rose-500/10 text-rose-600' 
                : 'bg-emerald-500/10 text-emerald-600'
            }`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {failRate > 10 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${failRate > 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {failRate}%
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                failRate > 10 
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' 
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              }`}>
                {failRate > 10 ? '需关注' : '正常'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              过去 24 小时失败率
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              平均耗时
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">{avgDuration}</span>
              <span className="text-sm text-blue-600/70">分钟</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              每次扫描平均用时
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="hover-lift overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                最近 30 天变更趋势
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                站点地图页面变化的时间趋势分析
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">数据点</div>
              <div className="text-lg font-semibold">{changeTrend.length}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <ChangeTrendChart data={changeTrend} />
        </CardContent>
      </Card>

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>活跃站点排行</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">过去 24 小时扫描次数最多的站点</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSites.map((s, index) => (
                <div key={s.siteId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium truncate max-w-[200px]">{s.rootUrl || s.siteId}</p>
                      <p className="text-xs text-muted-foreground">站点 ID: {s.siteId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{Number(s.scanCount ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">次扫描</div>
                  </div>
                </div>
              ))}
              {topSites.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>最近 24 小时没有扫描记录</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>快速操作</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">常用功能快速入口</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/sites/new" className="block">
              <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">添加新站点</h3>
                  <p className="text-sm text-muted-foreground">开始监控新的网站地图</p>
                </div>
              </div>
            </Link>
            
            <Link href="/sites" className="block">
              <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">管理站点</h3>
                  <p className="text-sm text-muted-foreground">查看和管理所有监控站点</p>
                </div>
              </div>
            </Link>

            <Link href="/sites/import" className="block">
              <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">批量导入</h3>
                  <p className="text-sm text-muted-foreground">一次性导入多个站点</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getDayKey(value: unknown) {
  const date = normalizeToDate(value);
  return date ? date.toISOString().split('T')[0] : null;
}

function normalizeToDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (typeof numeric !== 'number' || Number.isNaN(numeric)) return null;

  // Values persisted via sqlite `unixepoch()` are seconds; record-level assignments use JS Date (ms)
  const ms = numeric > 1e12 ? numeric : numeric * 1000;
  return new Date(ms);
}
