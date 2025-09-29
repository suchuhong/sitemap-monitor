import Link from "next/link";

export type SitesTableRow = {
  id: string;
  rootUrl: string;
  robotsUrl: string | null;
  createdAt: number | null;
  enabled: boolean | null;
  tags?: string | null;
};

export function SitesTableSSR({
  data,
  sort,
  dir,
  page,
  pageSize,
  total,
}: {
  data: SitesTableRow[];
  sort: string;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
  total: number;
}) {
  const nextDir = (col: string) =>
    sort === col && dir === "asc" ? "desc" : "asc";
  const sortIcon = (col: string) =>
    sort === col ? (dir === "asc" ? "↑" : "↓") : "";

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="[&_tr]:border-b">
            <tr>
              <th className="h-10 px-2 text-left">
                <a
                  className="inline-flex items-center gap-1"
                  href={`/sites?page=1&pageSize=${pageSize}&sort=rootUrl&dir=${nextDir("rootUrl")}`}
                >
                  站点 {sortIcon("rootUrl")}
                </a>
              </th>
              <th className="h-10 px-2 text-left">robots.txt</th>
              <th className="h-10 px-2 text-left">
                <a
                  className="inline-flex items-center gap-1"
                  href={`/sites?page=1&pageSize=${pageSize}&sort=createdAt&dir=${nextDir("createdAt")}`}
                >
                  创建时间 {sortIcon("createdAt")}
                </a>
              </th>
              <th className="h-10 px-2 text-left">状态</th>
              <th className="h-10 px-2 text-left">标签</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {data.map((r) => (
              <tr
                key={r.id}
                className="border-b hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <td className="p-2">
                  <Link className="underline" href={`/sites/${r.id}`}>
                    {r.rootUrl}
                  </Link>
                </td>
                <td className="p-2">{r.robotsUrl ?? "—"}</td>
                <td className="p-2">
                  {r.createdAt
                    ? new Date(Number(r.createdAt) * 1000).toLocaleString()
                    : "—"}
                </td>
                <td className="p-2">
                  {r.enabled ? (
                    <span className="text-emerald-600 dark:text-emerald-400">启用</span>
                  ) : (
                    <span className="text-slate-500">禁用</span>
                  )}
                </td>
                <td className="p-2">
                  {parseTags(r.tags).length ? (
                    <div className="flex flex-wrap gap-1 text-xs">
                      {parseTags(r.tags).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td className="p-4 text-slate-500" colSpan={5}>
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600">
          共 {total} 条，{page}/{lastPage} 页
        </div>
        <div className="flex items-center gap-2">
          <a
            aria-disabled={page <= 1}
            className={`h-8 px-3 rounded-md border ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            href={`/sites?page=${page - 1}&pageSize=${pageSize}&sort=${sort}&dir=${dir}`}
          >
            上一页
          </a>
          <a
            aria-disabled={page >= lastPage}
            className={`h-8 px-3 rounded-md border ${page >= lastPage ? "pointer-events-none opacity-50" : ""}`}
            href={`/sites?page=${page + 1}&pageSize=${pageSize}&sort=${sort}&dir=${dir}`}
          >
            下一页
          </a>
        </div>
      </div>
    </div>
  );
}

function parseTags(value: string | null | undefined) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed))
      return parsed.filter((item) => typeof item === "string" && item.trim()).map((s) => s.trim());
  } catch {}
  return [] as string[];
}
