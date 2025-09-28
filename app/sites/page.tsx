import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { SitesTableSSR } from "@/components/data/sites-table-ssr";

export const dynamic = "force-dynamic";

function getParam(
  sp: Record<string, any> | undefined,
  key: string,
  def: string,
) {
  const v = sp?.[key];
  if (!v) return def;
  return Array.isArray(v) ? v[0] : v;
}
function getInt(sp: Record<string, any> | undefined, key: string, def: number) {
  const n = parseInt(getParam(sp, key, String(def)), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

const COLMAP: Record<string, string> = {
  rootUrl: "root_url",
  createdAt: "created_at",
};

export default async function SitesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const page = getInt(searchParams, "page", 1);
  const pageSize = Math.min(getInt(searchParams, "pageSize", 10), 50);
  const sort = ["rootUrl", "createdAt"].includes(
    getParam(searchParams, "sort", "createdAt"),
  )
    ? getParam(searchParams, "sort", "createdAt")
    : "createdAt";
  const dir = getParam(searchParams, "dir", "desc") === "asc" ? "asc" : "desc";

  const orderCol = COLMAP[sort];
  const offset = (page - 1) * pageSize;

  const totalRow = (await db.get(
    sql`SELECT COUNT(*) as count FROM sites`,
  )) as unknown as { count: number };
  const total = Number(totalRow?.count ?? 0);

  // raw SQL with whitelist column
  const rows = (await db.all(
    sql.raw(`
    SELECT id, root_url as rootUrl, robots_url as robotsUrl, created_at as createdAt
    FROM sites
    ORDER BY ${orderCol} ${dir.toUpperCase()}
    LIMIT ${pageSize} OFFSET ${offset};
  `),
  )) as any[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">站点列表</h1>
        <div className="text-sm space-x-4">
          <a href="/sites/new" className="underline">
            新增站点
          </a>
          <a href="/sites/import" className="underline">
            批量导入
          </a>
          <a href="/api/sites/export.csv" className="underline">
            导出 CSV
          </a>
        </div>
      </div>
      <SitesTableSSR
        data={rows as any}
        sort={sort}
        dir={dir as any}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
