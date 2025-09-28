import { db } from "@/lib/db"
import { sites, sitemaps, urls, scans, changes } from "@/lib/drizzle/schema"
import { eq, desc, and, gte, lte, sql } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ConfirmScan } from "./_components/ConfirmScan"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

function getParam(sp: Record<string, any> | undefined, key: string, def?: string) {
  const v = sp?.[key]; if (!v) return def
  return Array.isArray(v) ? v[0] : v
}
function getInt(sp: Record<string, any> | undefined, key: string, def: number) {
  const n = parseInt(getParam(sp, key, String(def)) ?? String(def), 10)
  return Number.isFinite(n) && n > 0 ? n : def
}

export default async function SiteDetail({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | string[]> }) {
  const siteId = params.id
  const site = (await db.select().from(sites).where(eq(sites.id, siteId))).at(0)
  if (!site) return <div className="text-sm text-rose-600">站点不存在</div>

  const smaps = await db.select().from(sitemaps).where(eq(sitemaps.siteId, siteId))
  const lastScan = (await db.select().from(scans).where(eq(scans.siteId, siteId)).orderBy(desc(scans.startedAt)).limit(1)).at(0)

  const type = getParam(searchParams, "type") as ("added"|"removed"|"updated"|undefined)
  const from = getParam(searchParams, "from")
  const to = getParam(searchParams, "to")
  const cpage = getInt(searchParams, "cpage", 1)
  const csize = Math.min(getInt(searchParams, "csize", 20), 200)
  const coffset = (cpage - 1) * csize

  // Build WHERE
  const wheres: any[] = [eq(changes.siteId, siteId)]
  if (type) wheres.push(eq(changes.type, type))
  if (from) wheres.push(gte(changes.occurredAt, Math.floor(new Date(from).getTime()/1000)))
  if (to) wheres.push(lte(changes.occurredAt, Math.floor(new Date(to).getTime()/1000)))

  const whereAll = and(...wheres)

  // total count
  const totalRow = await db.get(sql`SELECT COUNT(*) as count FROM changes WHERE site_id = ${siteId}`) as unknown as { count: number }
  // If filters, adjust count by filtering via raw SQL for simplicity
  let count = Number(totalRow?.count ?? 0)
  if (type || from || to) {
    const conds = [
      `site_id = '${siteId}'`,
      type ? `type = '${type}'` : "1=1",
      from ? `occurred_at >= ${Math.floor(new Date(from).getTime()/1000)}` : "1=1",
      to ? `occurred_at <= ${Math.floor(new Date(to).getTime()/1000)}` : "1=1"
    ].join(" AND ")
    const row = await db.get(sql.raw(`SELECT COUNT(*) as count FROM changes WHERE ${conds}`)) as any
    count = Number(row?.count ?? 0)
  }

  const baseSql = `SELECT id, site_id as siteId, url_id as urlId, type, detail, occurred_at as occurredAt
                   FROM changes WHERE site_id = '${siteId}'`
  const condSql = [
    type ? `AND type = '${type}'` : "",
    from ? `AND occurred_at >= ${Math.floor(new Date(from).getTime()/1000)}` : "",
    to ? `AND occurred_at <= ${Math.floor(new Date(to).getTime()/1000)}` : ""
  ].join(" ")
  const rows = await db.all(sql.raw(`${baseSql} ${condSql} ORDER BY occurred_at DESC LIMIT ${csize} OFFSET ${coffset}`)) as any[]
  const recentChanges = rows
  const cLast = Math.max(1, Math.ceil(count / csize))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{site.rootUrl}</h1>
          <p className="text-sm text-slate-600">robots: {site.robotsUrl ?? "未发现"}</p>
        </div>
        <ConfirmScan siteId={siteId} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sitemap 数量</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{smaps.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">最近扫描</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{lastScan ? new Date(lastScan.startedAt as any).toLocaleString() : "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">最近变化</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{recentChanges.length}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue={typeof searchParams?.tab === "string" ? (searchParams?.tab as string) : "sitemaps"}>
        <TabsList>
          <TabsTrigger value="sitemaps">Sitemaps</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="sitemaps">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Sitemaps</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {smaps.map((sm) => (
              <div key={sm.id} className="flex items-center gap-3 border-b py-2 text-sm last:border-none">
                <a className="underline truncate" href={sm.url} target="_blank" rel="noopener noreferrer">{sm.url}</a>
                {sm.isIndex ? <Badge>index</Badge> : <Badge variant="outline">file</Badge>}
                <span className="text-slate-500">status: {sm.lastStatus ?? "-"}</span>
                <span className="text-slate-500">etag: {sm.lastEtag ?? "-"}</span>
                <span className="text-slate-500">last-modified: {sm.lastModified ?? "-"}</span>
              </div>
            ))}
            {smaps.length === 0 && <div className="text-sm text-slate-500">暂无 sitemap，等待识别或检查 robots.txt。</div>}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-slate-600">共 {count} 条，{cpage}/{cLast} 页</div>
            <div className="flex items-center gap-2">
              <a className={`h-8 px-3 rounded-md border ${cpage<=1 ? "pointer-events-none opacity-50":""}`}
                 href={`?tab=changes&type=${type ?? ""}&from=${from ?? ""}&to=${to ?? ""}&cpage=${cpage-1}&csize=${csize}`}>上一页</a>
              <a className={`h-8 px-3 rounded-md border ${cpage>=cLast ? "pointer-events-none opacity-50":""}`}
                 href={`?tab=changes&type=${type ?? ""}&from=${from ?? ""}&to=${to ?? ""}&cpage=${cpage+1}&csize=${csize}`}>下一页</a>
            </div>
          </div>
        </CardContent>
      </Card>

      </Card>
        </TabsContent>

        <TabsContent value="changes">
      <Card>
        <CardHeader className="pb-2 flex items-center justify-between">
          <CardTitle className="text-base">最近变更</CardTitle>
          <form className="flex items-end gap-2 text-sm" method="get">
            <div>
              <label className="block text-xs text-slate-500">类型</label>
              <select name="type" defaultValue={(searchParams?.type as any) ?? ""} className="h-8 rounded-md border px-2">
                <option value="">全部</option>
                <option value="added">added</option>
                <option value="removed">removed</option>
                <option value="updated">updated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500">起始</label>
              <input type="date" name="from" defaultValue={(searchParams?.from as any) ?? ""} className="h-8 rounded-md border px-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500">结束</label>
              <input type="date" name="to" defaultValue={(searchParams?.to as any) ?? ""} className="h-8 rounded-md border px-2" />
            </div>
            <input type="hidden" name="tab" value="changes" />
            <button className="h-8 px-3 rounded-md border">筛选</button>
            <a className="h-8 px-3 rounded-md border"
               href={`/api/sites/${siteId}/changes.csv?type=${(searchParams?.type as any) ?? ""}&from=${(searchParams?.from as any) ?? ""}&to=${(searchParams?.to as any) ?? ""}`}
               target="_blank" rel="noopener noreferrer">导出 CSV</a>
            <div className="ml-4 flex items-center gap-2">
              <input type="hidden" name="tab" value="changes" />
              <input type="hidden" name="page" value="1" />
            </div>
          </form>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {recentChanges.map((ch) => (
              <li key={ch.id} className="flex items-start gap-2">
                {ch.type === "added" && <Badge variant="added">added</Badge>}
                {ch.type === "removed" && <Badge variant="removed">removed</Badge>}
                {ch.type === "updated" && <Badge variant="updated">updated</Badge>}
                <span className="truncate">{ch.detail}</span>
                <span className="ml-auto text-xs text-slate-500">{new Date(ch.occurredAt as any).toLocaleString()}</span>
              </li>
            ))}
            {recentChanges.length === 0 && <div className="text-sm text-slate-500">暂无变更记录。</div>}
          </ol>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-slate-600">共 {count} 条，{cpage}/{cLast} 页</div>
            <div className="flex items-center gap-2">
              <a className={`h-8 px-3 rounded-md border ${cpage<=1 ? "pointer-events-none opacity-50":""}`}
                 href={`?tab=changes&type=${type ?? ""}&from=${from ?? ""}&to=${to ?? ""}&cpage=${cpage-1}&csize=${csize}`}>上一页</a>
              <a className={`h-8 px-3 rounded-md border ${cpage>=cLast ? "pointer-events-none opacity-50":""}`}
                 href={`?tab=changes&type=${type ?? ""}&from=${from ?? ""}&to=${to ?? ""}&cpage=${cpage+1}&csize=${csize}`}>下一页</a>
            </div>
          </div>
        </CardContent>
      </Card>

      </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Settings siteId={siteId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Settings({ siteId }: { siteId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">设置</CardTitle></CardHeader>
      <CardContent>
        <WebhookForm siteId={siteId} />
      </CardContent>
    </Card>
  )
}

function WebhookForm({ siteId }: { siteId: string }) {
  return (
    <form action={`/api/sites/${siteId}/webhooks`} method="post" className="max-w-xl space-y-3">
      <div>
        <label className="block text-sm font-medium">Webhook 目标 URL</label>
        <input name="targetUrl" type="url" required placeholder="https://your-endpoint.example.com"
               className="mt-1 block w-full h-9 rounded-md border px-3 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium">Secret（用于 HMAC 签名）</label>
        <input name="secret" type="text" placeholder="可留空"
               className="mt-1 block w-full h-9 rounded-md border px-3 text-sm" />
      </div>
      <button className="inline-flex items-center rounded-md bg-brand px-4 h-9 text-sm font-medium text-white">保存</button>
      <div className="pt-2">
        <button formAction={`/api/sites/${siteId}/test-webhook`} formMethod="post" className="inline-flex items-center rounded-md border px-4 h-9 text-sm">
          发送测试 Webhook
        </button>
      </div>
    </form>
  )
}
