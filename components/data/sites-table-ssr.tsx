import { cn } from "@/lib/utils"

type Site = { id: string; rootUrl: string; robotsUrl: string | null; createdAt: number | null }

export function SitesTableSSR({ data, sort, dir, page, pageSize, total }:
  { data: Site[]; sort: string; dir: "asc"|"desc"; page: number; pageSize: number; total: number }) {

  const nextDir = (col: string) => (sort === col && dir === "asc" ? "desc" : "asc")
  const sortIcon = (col: string) => sort === col ? (dir === "asc" ? "↑" : "↓") : ""

  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="[&_tr]:border-b">
            <tr>
              <th className="h-10 px-2 text-left">
                <a className="inline-flex items-center gap-1" href={`/sites?page=1&pageSize=${pageSize}&sort=rootUrl&dir=${nextDir("rootUrl")}`}>
                  站点 {sortIcon("rootUrl")}
                </a>
              </th>
              <th className="h-10 px-2 text-left">robots.txt</th>
              <th className="h-10 px-2 text-left">
                <a className="inline-flex items-center gap-1" href={`/sites?page=1&pageSize=${pageSize}&sort=createdAt&dir=${nextDir("createdAt")}`}>
                  创建时间 {sortIcon("createdAt")}
                </a>
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {data.map(r => (
              <tr key={r.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900">
                <td className="p-2"><a className="underline" href={`/sites/${r.id}`}>{r.rootUrl}</a></td>
                <td className="p-2">{r.robotsUrl ?? "—"}</td>
                <td className="p-2">{r.createdAt ? new Date(Number(r.createdAt)*1000).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={3}>暂无数据</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600">共 {total} 条，{page}/{lastPage} 页</div>
        <div className="flex items-center gap-2">
          <a aria-disabled={page<=1} className={`h-8 px-3 rounded-md border ${page<=1 ? "pointer-events-none opacity-50":""}`}
             href={`/sites?page=${page-1}&pageSize=${pageSize}&sort=${sort}&dir=${dir}`}>上一页</a>
          <a aria-disabled={page>=lastPage} className={`h-8 px-3 rounded-md border ${page>=lastPage ? "pointer-events-none opacity-50":""}`}
             href={`/sites?page=${page+1}&pageSize=${pageSize}&sort=${sort}&dir=${dir}`}>下一页</a>
        </div>
      </div>
    </div>
  )
}
