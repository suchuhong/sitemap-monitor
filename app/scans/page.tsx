import { ScansTable, type ScanRecord } from "./_components/scans-table";
import { ScansFilters } from "./_components/scans-filters";
import type { Metadata } from "next";
import { resolveDb } from "@/lib/db";
import { scans, sites } from "@/lib/drizzle/schema";
import { desc, asc, like, eq, and, count } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
    title: "扫描记录 - Sitemap Monitor",
    description: "查看所有网站地图扫描记录和结果",
};

async function getScansData(params: {
    page: number;
    pageSize: number;
    sort: string;
    sortDirection: "asc" | "desc";
    status?: string;
    site?: string;
    userId: string;
}) {
    const { page, pageSize, sort, sortDirection, status, site, userId } = params;
    const db = resolveDb();
    
    // 构建查询条件
    const conditions = [eq(sites.ownerId, userId)];
    if (status) {
        conditions.push(eq(scans.status, status));
    }
    if (site) {
        conditions.push(like(sites.rootUrl, `%${site}%`));
    }

    // 获取总数
    const totalResult = await db
        .select({ count: count(scans.id) })
        .from(scans)
        .innerJoin(sites, eq(scans.siteId, sites.id))
        .where(and(...conditions));
    
    const total = totalResult[0]?.count ?? 0;
    
    // 构建排序
    const orderBy = sortDirection === "desc" ? desc : asc;
    let orderColumn;
    switch (sort) {
        case "startedAt":
            orderColumn = scans.startedAt;
            break;
        case "status":
            orderColumn = scans.status;
            break;
        case "siteName":
            orderColumn = sites.rootUrl;
            break;
        default:
            orderColumn = scans.startedAt;
    }

    // 获取分页数据
    const results = await db
        .select({
            id: scans.id,
            siteId: scans.siteId,
            siteName: sites.rootUrl,
            status: scans.status,
            startedAt: scans.startedAt,
            finishedAt: scans.finishedAt,
            totalUrls: scans.totalUrls,
            added: scans.added,
            removed: scans.removed,
            updated: scans.updated,
            error: scans.error,
            priority: sites.scanPriority,
        })
        .from(scans)
        .innerJoin(sites, eq(scans.siteId, sites.id))
        .where(and(...conditions))
        .orderBy(orderBy(orderColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

    // 转换为 ScanRecord 格式
    const scanRecords: ScanRecord[] = results.map(row => {
        const startedAt = row.startedAt ? new Date(row.startedAt) : new Date();
        const finishedAt = row.finishedAt ? new Date(row.finishedAt) : null;
        
        // 计算持续时间（秒）
        let duration = 0;
        if (finishedAt) {
            duration = Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000);
        }

        // 映射状态
        let mappedStatus: ScanRecord["status"] = "pending";
        switch (row.status) {
            case "success":
                mappedStatus = "success";
                break;
            case "failed":
                mappedStatus = "error";
                break;
            case "running":
                mappedStatus = "pending";
                break;
            default:
                mappedStatus = row.error ? "error" : "warning";
        }

        return {
            id: row.id,
            siteId: row.siteId,
            siteName: row.siteName || "未知站点",
            status: mappedStatus,
            startedAt,
            finishedAt,
            duration,
            urlsFound: row.totalUrls || 0,
            urlsAdded: row.added || 0,
            urlsRemoved: row.removed || 0,
            urlsModified: row.updated || 0,
            errorMessage: row.error,
            priority: row.priority || 1,
        };
    });

    return {
        data: scanRecords,
        total,
    };
}

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

export default async function ScansPage({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | string[]>>;
}) {
    const user = await requireUser();
    
    const params = (searchParams ? await searchParams : {}) as
        | Record<string, string | string[]>
        | undefined;

    const page = getInt(params, "page", 1);
    const pageSize = Math.min(getInt(params, "pageSize", 15), 100);
    const sort = getParam(params, "sort", "startedAt");
    const dir = getParam(params, "dir", "desc") as "asc" | "desc";
    const status = getParam(params, "status", "");
    const site = getParam(params, "site", "");

    // 获取真实数据
    const { data: paginatedScans, total } = await getScansData({
        page,
        pageSize,
        sort,
        sortDirection: dir,
        status: status || undefined,
        site: site || undefined,
        userId: user.id,
    });

    // 获取统计数据（用于卡片显示）
    const db = resolveDb();
    const statsResult = await db
        .select({
            status: scans.status,
            count: count(),
        })
        .from(scans)
        .innerJoin(sites, eq(scans.siteId, sites.id))
        .where(eq(sites.ownerId, user.id))
        .groupBy(scans.status);

    const stats = {
        success: 0,
        error: 0,
        warning: 0,
        pending: 0,
    };

    statsResult.forEach(row => {
        switch (row.status) {
            case "success":
                stats.success = row.count;
                break;
            case "failed":
                stats.error = row.count;
                break;
            case "running":
                stats.pending = row.count;
                break;
            default:
                if (row.status?.includes("error")) {
                    stats.error += row.count;
                } else {
                    stats.warning += row.count;
                }
        }
    });



    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">扫描记录</h1>
                    <p className="text-muted-foreground">查看所有网站地图扫描记录和结果</p>
                </div>
                <div className="flex space-x-2">
                    <button className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        刷新数据
                    </button>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-2xl font-bold text-success">
                        {stats.success}
                    </div>
                    <div className="text-sm text-muted-foreground">成功扫描</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-2xl font-bold text-destructive">
                        {stats.error}
                    </div>
                    <div className="text-sm text-muted-foreground">失败扫描</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-2xl font-bold text-warning">
                        {stats.warning}
                    </div>
                    <div className="text-sm text-muted-foreground">警告扫描</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-2xl font-bold text-info">
                        {stats.pending}
                    </div>
                    <div className="text-sm text-muted-foreground">进行中</div>
                </div>
            </div>

            {/* 过滤器 */}
            <ScansFilters status={status} site={site} />

            {/* 数据表格 */}
            <ScansTable
                data={paginatedScans}
                currentPage={page}
                pageSize={pageSize}
                totalItems={total}
                sort={sort}
                sortDirection={dir}
                searchParams={{
                    sort,
                    dir,
                    status,
                    site,
                }}
            />
        </div>
    );
}
