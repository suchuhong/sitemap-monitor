import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveDb } from "@/lib/db";
import { scans, sites, changes, sitemaps } from "@/lib/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = resolveDb();

  const [scan] = await db
    .select()
    .from(scans)
    .where(eq(scans.id, id))
    .limit(1);

  if (!scan) notFound();

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, scan.siteId))
    .limit(1);

  const sitemapRows = await db
    .select()
    .from(sitemaps)
    .where(eq(sitemaps.siteId, scan.siteId));
  const sitemapList = sitemapRows.map((row) => ({ id: row.id, url: row.url }));

  const changeRows = await db
    .select()
    .from(changes)
    .where(eq(changes.scanId, scan.id))
    .orderBy(desc(changes.occurredAt));
  const changeList = changeRows.map((row) => ({
    id: row.id,
    type: row.type,
    detail: row.detail,
    occurredAt: row.occurredAt,
  }));

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="space-y-2">
        <Link href="/scans" className="text-sm text-muted-foreground hover:underline">
          ← 返回扫描记录
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">扫描详情</h1>
        <p className="text-sm text-muted-foreground">扫描 ID: {scan.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>站点信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">站点</span>
            <Link href={`/sites/${scan.siteId}`} className="text-primary hover:underline">
              {site?.rootUrl ?? scan.siteId}
            </Link>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">状态</span>
            <span className="font-medium">{scan.status ?? "unknown"}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">开始时间</span>
            <span>{scan.startedAt ? formatDateTime(scan.startedAt, { includeSeconds: true }) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">结束时间</span>
            <span>{scan.finishedAt ? formatDateTime(scan.finishedAt, { includeSeconds: true }) : "—"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>统计汇总</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">URL 总数</span>
              <span className="font-medium">{scan.totalUrls ?? 0}</span>
            </div>
            <div className="flex justify-between border-b pb-2 text-emerald-600">
              <span>新增</span>
              <span className="font-medium">+{scan.added ?? 0}</span>
            </div>
            <div className="flex justify-between border-b pb-2 text-rose-600">
              <span>删除</span>
              <span className="font-medium">-{scan.removed ?? 0}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>更新</span>
              <span className="font-medium">~{scan.updated ?? 0}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>参与扫描的 sitemap 数量</span>
              <span>{scan.totalSitemaps ?? sitemapList.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>错误信息</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-rose-600">
            {scan.error ? scan.error : "无"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>相关 sitemap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sitemapList.length === 0 && <p className="text-muted-foreground">无相关 sitemap 记录</p>}
          {sitemapList.map((item) => (
            <div key={item.id} className="flex justify-between border-b pb-2">
              <span>{item.url}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>变更详情</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {changeList.length === 0 && <p className="text-muted-foreground">没有捕获到差异。</p>}
          {changeList.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDateTime(item.occurredAt, { includeSeconds: true })}</span>
                <span className="uppercase font-medium text-slate-600">{item.type}</span>
              </div>
              <p className="mt-2 break-words text-sm text-slate-700">{item.detail ?? "—"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
