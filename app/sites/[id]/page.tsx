import { db } from "@/lib/db";
import { sites, sitemaps, scans, changes } from "@/lib/drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmScan } from "./_components/ConfirmScan";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ChangeType = "added" | "removed" | "updated";

function firstParam(
  params: Record<string, string | string[]> | undefined,
  key: string,
): string | undefined {
  const value = params?.[key];
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDateToUnixSeconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ts = Number.isNaN(Date.parse(value))
    ? NaN
    : Math.floor(new Date(value).getTime() / 1000);
  return Number.isFinite(ts) ? ts : undefined;
}

function formatTimestamp(value: unknown): string {
  if (!value) return "—";
  const date =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value > 1e12 ? value : value * 1000)
        : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default async function SiteDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[]>;
}) {
  const siteId = params.id;
  const site = await db.query.sites.findFirst({ where: eq(sites.id, siteId) });
  if (!site) return <div className="text-sm text-rose-600">站点不存在</div>;

  const sitemapList = await db
    .select()
    .from(sitemaps)
    .where(eq(sitemaps.siteId, siteId));
  const lastScan = await db.query.scans.findFirst({
    where: eq(scans.siteId, siteId),
    orderBy: [desc(scans.startedAt)],
  });

  const type = firstParam(searchParams, "type") as ChangeType | undefined;
  const fromTs = parseDateToUnixSeconds(firstParam(searchParams, "from"));
  const toTs = parseDateToUnixSeconds(firstParam(searchParams, "to"));
  const currentPage = parsePositiveInt(firstParam(searchParams, "cpage"), 1);
  const pageSize = Math.min(
    parsePositiveInt(firstParam(searchParams, "csize"), 20),
    200,
  );
  const offset = (currentPage - 1) * pageSize;

  const changeFilters = [eq(changes.siteId, siteId)] as any[];
  if (type) changeFilters.push(eq(changes.type, type));
  if (fromTs) changeFilters.push(gte(changes.occurredAt, fromTs));
  if (toTs) changeFilters.push(lte(changes.occurredAt, toTs));

  let changeWhere = changeFilters[0];
  for (const condition of changeFilters.slice(1))
    changeWhere = and(changeWhere, condition);

  const [{ totalChanges = 0 } = {}] = await db
    .select({ totalChanges: sql<number>`count(*)` })
    .from(changes)
    .where(changeWhere);

  const changeRows = await db
    .select({
      id: changes.id,
      type: changes.type,
      detail: changes.detail,
      occurredAt: changes.occurredAt,
    })
    .from(changes)
    .where(changeWhere)
    .orderBy(desc(changes.occurredAt))
    .limit(pageSize)
    .offset(offset);

  const totalPages = Math.max(1, Math.ceil(totalChanges / pageSize));
  const activeTab = firstParam(searchParams, "tab") ?? "sitemaps";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{site.rootUrl}</h1>
          <p className="text-sm text-slate-600">
            robots: {site.robotsUrl ?? "未发现"}
          </p>
        </div>
        <ConfirmScan siteId={siteId} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Sitemap 数量
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {sitemapList.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              最近扫描
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {formatTimestamp(lastScan?.startedAt)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              最近变化
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {changeRows.length}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="sitemaps">Sitemaps</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="sitemaps">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sitemaps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {sitemapList.map((sitemap) => (
                  <div
                    key={sitemap.id}
                    className="flex items-center gap-3 border-b py-2 last:border-none"
                  >
                    <a
                      className="truncate underline"
                      href={sitemap.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {sitemap.url}
                    </a>
                    {sitemap.isIndex ? (
                      <Badge>index</Badge>
                    ) : (
                      <Badge variant="outline">file</Badge>
                    )}
                    <span className="text-slate-500">
                      status: {sitemap.lastStatus ?? "-"}
                    </span>
                    <span className="text-slate-500">
                      etag: {sitemap.lastEtag ?? "-"}
                    </span>
                    <span className="text-slate-500">
                      last-modified: {sitemap.lastModified ?? "-"}
                    </span>
                  </div>
                ))}
                {sitemapList.length === 0 && (
                  <div className="text-slate-500">
                    暂无 sitemap，等待识别或检查 robots.txt。
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-base">最近变更</CardTitle>
              <form
                className="flex flex-wrap items-end gap-2 text-sm"
                method="get"
              >
                <div>
                  <label className="block text-xs text-slate-500">类型</label>
                  <select
                    name="type"
                    defaultValue={type ?? ""}
                    className="h-8 rounded-md border px-2"
                  >
                    <option value="">全部</option>
                    <option value="added">added</option>
                    <option value="removed">removed</option>
                    <option value="updated">updated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500">起始</label>
                  <input
                    type="date"
                    name="from"
                    defaultValue={firstParam(searchParams, "from") ?? ""}
                    className="h-8 rounded-md border px-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">结束</label>
                  <input
                    type="date"
                    name="to"
                    defaultValue={firstParam(searchParams, "to") ?? ""}
                    className="h-8 rounded-md border px-2"
                  />
                </div>
                <input type="hidden" name="tab" value="changes" />
                <input type="hidden" name="csize" value={String(pageSize)} />
                <button className="h-8 rounded-md border px-3" type="submit">
                  筛选
                </button>
                <a
                  className="h-8 rounded-md border px-3"
                  href={`/api/sites/${siteId}/changes.csv?type=${type ?? ""}&from=${firstParam(searchParams, "from") ?? ""}&to=${firstParam(searchParams, "to") ?? ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  导出 CSV
                </a>
              </form>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {changeRows.map((change) => (
                  <li key={change.id} className="flex items-start gap-2">
                    {change.type === "added" && (
                      <Badge variant="added">added</Badge>
                    )}
                    {change.type === "removed" && (
                      <Badge variant="removed">removed</Badge>
                    )}
                    {change.type === "updated" && (
                      <Badge variant="updated">updated</Badge>
                    )}
                    <span className="truncate">{change.detail}</span>
                    <span className="ml-auto text-xs text-slate-500">
                      {formatTimestamp(change.occurredAt)}
                    </span>
                  </li>
                ))}
                {changeRows.length === 0 && (
                  <div className="text-slate-500">暂无变更记录。</div>
                )}
              </ol>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="text-slate-600">
                  共 {totalChanges} 条，{currentPage}/{totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <a
                    className={`h-8 rounded-md border px-3 ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                    href={`?tab=changes&type=${type ?? ""}&from=${firstParam(searchParams, "from") ?? ""}&to=${firstParam(searchParams, "to") ?? ""}&cpage=${currentPage - 1}&csize=${pageSize}`}
                  >
                    上一页
                  </a>
                  <a
                    className={`h-8 rounded-md border px-3 ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                    href={`?tab=changes&type=${type ?? ""}&from=${firstParam(searchParams, "from") ?? ""}&to=${firstParam(searchParams, "to") ?? ""}&cpage=${currentPage + 1}&csize=${pageSize}`}
                  >
                    下一页
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Settings siteId={siteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Settings({ siteId }: { siteId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">设置</CardTitle>
      </CardHeader>
      <CardContent>
        <WebhookForm siteId={siteId} />
      </CardContent>
    </Card>
  );
}

function WebhookForm({ siteId }: { siteId: string }) {
  return (
    <form
      action={`/api/sites/${siteId}/webhooks`}
      method="post"
      className="max-w-xl space-y-3"
    >
      <div>
        <label className="block text-sm font-medium">Webhook 目标 URL</label>
        <input
          name="targetUrl"
          type="url"
          required
          placeholder="https://your-endpoint.example.com"
          className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          Secret（用于 HMAC 签名）
        </label>
        <input
          name="secret"
          type="text"
          placeholder="可留空"
          className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <button
        className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-white"
        type="submit"
      >
        保存
      </button>
      <div className="pt-2">
        <button
          formAction={`/api/sites/${siteId}/test-webhook`}
          formMethod="post"
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
          type="submit"
        >
          发送测试 Webhook
        </button>
      </div>
    </form>
  );
}
