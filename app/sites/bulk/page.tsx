import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { resolveDb } from "@/lib/db";
import { siteGroups, sites } from "@/lib/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { performBulkAction } from "./actions";
import { getCfBindingEnvSafely } from "@/lib/cf";

export const dynamic = "force-dynamic";


type SiteItem = {
  id: string;
  rootUrl: string;
  tags: string | null;
  groupId: string | null;
  groupName: string | null;
};

type GroupItem = {
  id: string;
  name: string;
};

export default async function BulkSitesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const params = (searchParams ? await searchParams : {}) ?? {};
  const user = await requireUser({ redirectTo: "/sites/bulk" });
  const [siteRows, groups] = await Promise.all([
    fetchSites(user.id),
    fetchGroups(user.id),
  ]);

  const message = buildMessage(params);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">站点批量操作</h1>
        <p className="text-sm text-muted-foreground">
          选择多个站点执行分组、标签等批量操作。提交后会同步刷新列表页。
        </p>
        <Link href="/sites" className="text-xs text-primary underline">
          返回站点列表
        </Link>
      </header>

      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <BulkActionForm sites={siteRows} groups={groups} />
    </div>
  );
}

async function fetchSites(ownerId: string) {
  const db = resolveDb({ bindingEnv: getCfBindingEnvSafely() }) as any;
  return await db
    .select({
      id: sites.id,
      rootUrl: sites.rootUrl,
      tags: sites.tags,
      groupId: sites.groupId,
      groupName: siteGroups.name,
    })
    .from(sites)
    .leftJoin(siteGroups, eq(siteGroups.id, sites.groupId))
    .where(eq(sites.ownerId, ownerId))
    .orderBy(sql`lower(${sites.rootUrl})`) as SiteItem[];
}

async function fetchGroups(ownerId: string) {
  const db = resolveDb({ bindingEnv: getCfBindingEnvSafely() }) as any;
  return await db
    .select({ id: siteGroups.id, name: siteGroups.name })
    .from(siteGroups)
    .where(eq(siteGroups.ownerId, ownerId))
    .orderBy(sql`lower(${siteGroups.name})`) as GroupItem[];
}

function buildMessage(params: Record<string, string | string[]>) {
  if (params.error === "no_selection") return "请至少选择一个站点";
  if (params.error === "missing_group") return "请选择目标分组";
  if (params.error === "group_not_found") return "未找到指定分组";
  if (params.error === "missing_tag") return "请输入标签";
  if (params.error === "unknown_action") return "未知操作类型";
  if (params.success) {
    const count = Array.isArray(params.count) ? params.count[0] : params.count;
    return `操作已完成，影响站点数量：${count ?? ""}`;
  }
  return "";
}

function BulkActionForm({ sites, groups }: { sites: SiteItem[]; groups: GroupItem[] }) {
  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="text-lg">选择站点并执行操作</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={performBulkAction} className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-600">站点列表</h3>
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-3 py-2">
                      <span className="sr-only">选择</span>
                    </th>
                    <th className="px-3 py-2">站点</th>
                    <th className="px-3 py-2">分组</th>
                    <th className="px-3 py-2">标签</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sites.map((site) => (
                    <tr key={site.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 align-top">
                        <input type="checkbox" name="siteId" value={site.id} className="h-4 w-4" />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium text-primary break-all">{site.rootUrl}</div>
                        <div className="text-xs text-muted-foreground">ID: {site.id}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {site.groupName ?? "未分组"}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {formatTags(site.tags)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-600">选择操作</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input type="radio" name="actionType" value="assignGroup" required />
                分配到指定分组
              </label>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input type="radio" name="actionType" value="clearGroup" />
                清除分组
              </label>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input type="radio" name="actionType" value="appendTag" />
                追加单个标签
              </label>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input type="radio" name="actionType" value="removeTag" />
                移除单个标签
              </label>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input type="radio" name="actionType" value="replaceTags" />
                重设标签列表
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">目标分组（分配时必填）</label>
                <select name="groupId" className="h-9 rounded-md border border-slate-200 bg-background px-2 text-sm">
                  <option value="">请选择分组</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">标签（追加/移除）</label>
                <Input name="tagValue" placeholder="如：重点" maxLength={32} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">替换标签列表（逗号分隔）</label>
                <Input name="tagList" placeholder="如：核心,SEO,重点" maxLength={256} />
              </div>
            </div>
          </section>

          <Button type="submit">执行批量操作</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function formatTags(value: string | null) {
  if (!value) return "—";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const tags = parsed.filter((item) => typeof item === "string" && item.trim()).map((s) => s.trim());
      return tags.length ? tags.join(", ") : "—";
    }
  } catch {}
  return "—";
}
