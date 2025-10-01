import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { resolveDb } from "@/lib/db";
import { siteGroups, sites } from "@/lib/drizzle/schema";
import { sql, desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createGroupAction, updateGroupAction } from "./actions";
import { DeleteGroupButton } from "./delete-group-button";

export const dynamic = "force-dynamic";

export default async function SiteGroupsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const user = await requireUser({ redirectTo: "/sites/groups" });
  const params = (searchParams ? await searchParams : {}) ?? {};
  const [groups, totalSites] = await Promise.all([
    fetchGroupsWithCounts(user.id),
    countSites(user.id),
  ]);

  const message = buildMessage(params);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">站点分组管理</h1>
        <p className="text-sm text-muted-foreground">
          创建、编辑和删除站点分组，可用于批量操作、统计与权限管理。
        </p>
        <div className="text-xs text-muted-foreground">
          当前分组：{groups.length} 个 · 总站点：{totalSites}
        </div>
        <Link href="/sites" className="text-xs text-primary underline">
          返回站点列表
        </Link>
      </header>

      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <section className="space-y-4">
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="text-lg">新建分组</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createGroupAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">分组名称 *</label>
                <Input name="name" placeholder="如：核心站点" required maxLength={64} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">预览颜色</label>
                <Input name="color" placeholder="#2563eb" maxLength={16} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-600">描述</label>
                <Input name="description" placeholder="用于说明该分组的用途，可选" maxLength={128} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">创建分组</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">已有分组</h2>
        {groups.length === 0 && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              还没有任何分组，先从上方创建一个吧。
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="hover-lift">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>{group.name}</span>
                  <span className="text-xs text-muted-foreground">{group.siteCount} 个站点</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <form action={updateGroupAction} className="space-y-3">
                  <input type="hidden" name="id" value={group.id} />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">名称</label>
                    <Input name="name" defaultValue={group.name} maxLength={64} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">颜色</label>
                    <Input name="color" defaultValue={group.color ?? ""} maxLength={16} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">描述</label>
                    <Input name="description" defaultValue={group.description ?? ""} maxLength={128} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      保存
                    </Button>
                    <DeleteGroupButton groupId={group.id} />
                  </div>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

async function fetchGroupsWithCounts(ownerId: string) {
  const db = resolveDb();
  return await db
    .select({
      id: siteGroups.id,
      name: siteGroups.name,
      description: siteGroups.description,
      color: siteGroups.color,
      createdAt: siteGroups.createdAt,
      updatedAt: siteGroups.updatedAt,
      siteCount: sql<number>`count(${sites.id})`,
    })
    .from(siteGroups)
    .leftJoin(sites, eq(sites.groupId, siteGroups.id))
    .where(eq(siteGroups.ownerId, ownerId))
    .groupBy(siteGroups.id)
    .orderBy(desc(siteGroups.updatedAt));
}

async function countSites(ownerId: string) {
  const db = resolveDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sites)
    .where(eq(sites.ownerId, ownerId));
  return Number(row?.count ?? 0);
}

function buildMessage(params: Record<string, string | string[]>) {
  if (params.error === "missing_name") return "请填写分组名称";
  if (params.error === "not_found") return "未找到指定的分组";
  if (params.created) return "分组已创建";
  if (params.updated) return "分组已更新";
  if (params.deleted) return "分组已删除";
  return "";
}
