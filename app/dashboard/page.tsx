import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { sites, changes, scans } from "@/lib/drizzle/schema";
import { sql, gte, desc, eq, and } from "drizzle-orm";

export default async function Page() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [siteRow] = await db
    .select({ value: sql<number>`count(*)` })
    .from(sites);
  const [{ added = 0, removed = 0 } = {}] = await db
    .select({
      added: sql<number>`sum(case when ${changes.type} = 'added' then 1 else 0 end)`,
      removed: sql<number>`sum(case when ${changes.type} = 'removed' then 1 else 0 end)`,
    })
    .from(changes)
    .where(gte(changes.occurredAt, since));

  const [{ total = 0, failed = 0, duration = 0 } = {}] = await db
    .select({
      total: sql<number>`count(*)`,
      failed: sql<number>`sum(case when ${scans.status} != 'success' then 1 else 0 end)`,
      duration: sql<number>`avg(case when ${scans.finishedAt} is not null then (cast(${scans.finishedAt} as integer) - cast(${scans.startedAt} as integer)) else null end)`,
    })
    .from(scans)
    .where(gte(scans.startedAt, since));

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
    .groupBy(sites.id)
    .orderBy(desc(sql`count(${scans.id})`))
    .limit(5);

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
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500">站点数量</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {sitesCount}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500">
            最近变更（24h）
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-baseline gap-4">
          <span className="text-2xl font-semibold text-emerald-600">
            +{added24h}
          </span>
          <span className="text-2xl font-semibold text-rose-600">
            -{removed24h}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500">失败率</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {failRate}%
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500">
            平均扫描耗时（24h）
          </CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {avgDuration} 分钟
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">扫描次数最多的站点（24h）</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-600">
            {topSites.map((s) => (
              <li key={s.siteId} className="flex justify-between">
                <span className="truncate">{s.rootUrl || s.siteId}</span>
                <span>{Number(s.scanCount ?? 0)} 次</span>
              </li>
            ))}
            {topSites.length === 0 && (
              <li className="text-slate-400">最近 24 小时没有扫描记录</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">快速开始</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            前往{" "}
            <Link className="underline" href="/sites/new">
              新增站点
            </Link>
            ，输入根地址进行识别。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
