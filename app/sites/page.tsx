import Link from "next/link";
import { db } from "@/lib/db";
import { sites } from "@/lib/drizzle/schema";
import { sql, asc, desc, and } from "drizzle-orm";
import {
  SitesTableSSR,
  type SitesTableRow,
} from "@/components/data/sites-table-ssr";
import { SitesApiPanel } from "./_components/api-panel";
import { TagFilter } from "./_components/tag-filter";

export const dynamic = "force-dynamic";

function getParam(
  sp: Record<string, string | string[]> | undefined,
  key: string,
  def: string,
) {
  const v = sp?.[key];
  if (!v) return def;
  return Array.isArray(v) ? v[0] : v;
}
function getInt(
  sp: Record<string, string | string[]> | undefined,
  key: string,
  def: number,
) {
  const n = parseInt(getParam(sp, key, String(def)), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

const SORTABLE_COLUMNS = ["rootUrl", "createdAt"] as const;
type SortKey = (typeof SORTABLE_COLUMNS)[number];

const ORDER_COLUMNS = {
  rootUrl: sites.rootUrl,
  createdAt: sites.createdAt,
} as const;

export default async function SitesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const params = (searchParams ? await searchParams : {}) as
    | Record<string, string | string[]>
    | undefined;

  const tagParam = getParam(params, "tags", "");
  const selectedTags = tagParam
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const page = getInt(params, "page", 1);
  const pageSize = Math.min(getInt(params, "pageSize", 10), 50);
  const sortParam = getParam(params, "sort", "createdAt");
  const sort: SortKey = SORTABLE_COLUMNS.includes(sortParam as SortKey)
    ? ((sortParam ?? "createdAt") as SortKey)
    : "createdAt";
  const dir = getParam(params, "dir", "desc") === "asc" ? "asc" : "desc";

  const orderCol = ORDER_COLUMNS[sort] ?? sites.createdAt;
  const offset = (page - 1) * pageSize;

  const tagWhere = selectedTags.length ? buildTagsWhereClause(selectedTags) : undefined;

  const countQuery = db.select({ count: sql<number>`count(*)` }).from(sites);
  const [{ count = 0 } = {}] = tagWhere ? await countQuery.where(tagWhere) : await countQuery;
  const total = Number(count ?? 0);

  const orderByClause = dir === "asc" ? asc(orderCol) : desc(orderCol);
  const rowsQuery = db
    .select({
      id: sites.id,
      rootUrl: sites.rootUrl,
      robotsUrl: sites.robotsUrl,
      enabled: sites.enabled,
      tags: sites.tags,
      createdAt: sites.createdAt,
    })
    .from(sites)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);
  const rows = (tagWhere ? await rowsQuery.where(tagWhere) : await rowsQuery) as SitesTableRow[];

  const availableTags = await fetchDistinctTags();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">站点列表</h1>
        <div className="text-sm space-x-4">
          <Link href="/sites/new" className="underline">
            新增站点
          </Link>
          <Link href="/sites/import" className="underline">
            批量导入
          </Link>
          <a href="/api/sites/export.csv" className="underline">
            导出 CSV
          </a>
        </div>
      </div>
      <TagFilter availableTags={availableTags} />

      <SitesTableSSR
        data={rows}
        sort={sort}
        dir={dir}
        page={page}
        pageSize={pageSize}
        total={total}
      />

      <SitesApiPanel />
    </div>
  );
}

async function fetchDistinctTags() {
  const rows = await db
    .select({ tags: sites.tags })
    .from(sites)
    .where(sql`tags is not null and tags != ''`);
  const tagSet = new Set<string>();
  for (const row of rows) {
    if (!row.tags) continue;
    try {
      const parsed = JSON.parse(row.tags);
      if (Array.isArray(parsed))
        parsed
          .filter((item) => typeof item === "string" && item.trim())
          .forEach((tag) => tagSet.add(tag.trim()));
    } catch {}
  }
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

function buildTagsWhereClause(tags: string[]) {
  if (tags.length === 1) return sql`${sites.tags} LIKE ${`%"${tags[0]}"%`}`;
  return and(
    ...tags.map((tag) => sql`${sites.tags} LIKE ${`%"${tag}"%`}`),
  );
}
