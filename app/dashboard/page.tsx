import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { sites, changes, scans } from "@/lib/drizzle/schema";
import { sql, gte, desc, eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { ChangeTrendChart, type ChangeTrendPoint } from "./_components/change-trend-chart";

export default async function Page() {
  const user = await requireUser({ redirectTo: "/dashboard" });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [siteRow] = await db
    .select({ value: sql<number>`count(*)` })
    .from(sites)
    .where(eq(sites.ownerId, user.id));
  const [{ added = 0, removed = 0 } = {}] = await db
    .select({
      added: sql<number>`sum(case when ${changes.type} = 'added' then 1 else 0 end)`,
      removed: sql<number>`sum(case when ${changes.type} = 'removed' then 1 else 0 end)`,
    })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(and(eq(sites.ownerId, user.id), gte(changes.occurredAt, since)));

  const [{ total = 0, failed = 0, duration = 0 } = {}] = await db
    .select({
      total: sql<number>`count(*)`,
      failed: sql<number>`sum(case when ${scans.status} != 'success' then 1 else 0 end)`,
      duration: sql<number>`avg(case when ${scans.finishedAt} is not null then (cast(${scans.finishedAt} as integer) - cast(${scans.startedAt} as integer)) else null end)`,
    })
    .from(scans)
    .innerJoin(sites, eq(scans.siteId, sites.id))
    .where(and(eq(sites.ownerId, user.id), gte(scans.startedAt, since)));

  const topSites = await db
    .select({
      siteId: sites.id,
      rootUrl: sites.rootUrl,
      scanCount: sql<number>`count(${scans.id})`,
    })
    .from(sites)
    .leftJoin(
      scans,
      and(eq(scans.siteId, sites.id), gte(scans.startedAt, since)),
    )
    .where(eq(sites.ownerId, user.id))
    .groupBy(sites.id)
    .orderBy(desc(sql`count(${scans.id})`))
    .limit(5);

  const trendWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const changeTrendRows = await db
    .select({
      day: sql<string>`strftime('%Y-%m-%d', ${changes.occurredAt}, 'unixepoch')`,
      added: sql<number>`sum(case when ${changes.type} = 'added' then 1 else 0 end)`,
      removed: sql<number>`sum(case when ${changes.type} = 'removed' then 1 else 0 end)`,
      updated: sql<number>`sum(case when ${changes.type} = 'updated' then 1 else 0 end)`,
    })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(and(eq(sites.ownerId, user.id), gte(changes.occurredAt, trendWindowStart)))
    .groupBy(sql`strftime('%Y-%m-%d', ${changes.occurredAt}, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m-%d', ${changes.occurredAt}, 'unixepoch')`);

  const sitesCount = Number(siteRow?.value ?? 0);
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
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              站点总数
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sitesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              正在监控的站点数量
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              24h 变更
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-3">
              <span className="text-2xl font-bold text-success">+{added24h}</span>
              <span className="text-2xl font-bold text-destructive">-{removed24h}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              新增 / 删除页面数
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              扫描失败率
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${failRate > 10 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${failRate > 10 ? 'text-destructive' : 'text-success'}`}>
              {failRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              过去 24 小时失败率
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              平均耗时
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgDuration}</div>
            <p className="text-xs text-muted-foreground mt-1">
              分钟 / 次扫描
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            最近 30 天变更趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
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
