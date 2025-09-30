"use client";

import { DataTable, createColumn, columnRenderers } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import Link from "next/link";

// 定义扫描记录类型
export type ScanRecord = {
    id: string;
    siteId: string;
    siteName: string;
    status: "success" | "error" | "warning" | "pending";
    startedAt: Date;
    finishedAt: Date | null;
    duration: number;
    urlsFound: number;
    urlsAdded: number;
    urlsRemoved: number;
    urlsModified: number;
    errorMessage: string | null;
    priority: number;
};

interface ScansTableProps {
    data: ScanRecord[];
    currentPage: number;
    pageSize: number;
    totalItems: number;
    sort: string;
    sortDirection: "asc" | "desc";
    searchParams: {
        sort: string;
        dir: string;
        status: string;
        site: string;
    };
}

export function ScansTable({
    data,
    currentPage,
    pageSize,
    totalItems,
    sort,
    sortDirection,
    searchParams,
}: ScansTableProps) {
    // 定义表格列
    const columns = [
        createColumn<ScanRecord>({
            key: "siteName",
            title: "站点",
            sortable: true,
            render: (scan) => (
                <div className="space-y-1">
                    <Link
                        href={`/sites/${scan.siteId}`}
                        className="font-medium text-primary hover:underline"
                    >
                        {scan.siteName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                        ID: {scan.siteId}
                    </div>
                </div>
            ),
        }),
        createColumn<ScanRecord>({
            key: "status",
            title: "状态",
            sortable: true,
            render: (scan) => {
                const statusMap = {
                    success: "success" as const,
                    error: "error" as const,
                    warning: "warning" as const,
                    pending: "pending" as const,
                };
                return (
                    <StatusIndicator status={statusMap[scan.status]}>
                        {scan.status === "success" && "成功"}
                        {scan.status === "error" && "失败"}
                        {scan.status === "warning" && "警告"}
                        {scan.status === "pending" && "进行中"}
                    </StatusIndicator>
                );
            },
        }),
        createColumn<ScanRecord>({
            key: "startedAt",
            title: "开始时间",
            sortable: true,
            render: columnRenderers.date<ScanRecord>((scan) => scan.startedAt),
        }),
        createColumn<ScanRecord>({
            key: "duration",
            title: "耗时",
            sortable: true,
            render: (scan) => {
                if (!scan.finishedAt) {
                    return <span className="text-muted-foreground">进行中...</span>;
                }
                const minutes = Math.floor(scan.duration / 60);
                const seconds = scan.duration % 60;
                return (
                    <span className="text-sm">
                        {minutes > 0 ? `${minutes}m ` : ""}{seconds}s
                    </span>
                );
            },
        }),
        createColumn<ScanRecord>({
            key: "urlsFound",
            title: "URL统计",
            sortable: true,
            render: (scan) => (
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">总数:</span>
                        <span className="font-medium">{scan.urlsFound}</span>
                    </div>
                    {scan.urlsAdded > 0 && (
                        <div className="flex justify-between">
                            <span className="text-success">新增:</span>
                            <span className="text-success font-medium">+{scan.urlsAdded}</span>
                        </div>
                    )}
                    {scan.urlsRemoved > 0 && (
                        <div className="flex justify-between">
                            <span className="text-destructive">删除:</span>
                            <span className="text-destructive font-medium">-{scan.urlsRemoved}</span>
                        </div>
                    )}
                    {scan.urlsModified > 0 && (
                        <div className="flex justify-between">
                            <span className="text-warning">修改:</span>
                            <span className="text-warning font-medium">~{scan.urlsModified}</span>
                        </div>
                    )}
                </div>
            ),
        }),
        createColumn<ScanRecord>({
            key: "priority",
            title: "优先级",
            sortable: true,
            render: (scan) => (
                <Badge variant={scan.priority <= 2 ? "destructive" : scan.priority <= 3 ? "warning" : "secondary"}>
                    P{scan.priority}
                </Badge>
            ),
        }),
        createColumn<ScanRecord>({
            key: "actions",
            title: "操作",
            render: (scan) => (
                <div className="flex items-center space-x-2">
                    <Link
                        href={`/scans/${scan.id}`}
                        className="text-xs text-primary hover:underline"
                    >
                        查看详情
                    </Link>
                    {scan.status === "error" && (
                        <button className="text-xs text-muted-foreground hover:text-foreground">
                            重试
                        </button>
                    )}
                </div>
            ),
        }),
    ];

    return (
        <DataTable
            data={data}
            columns={columns}
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            sort={sort}
            sortDirection={sortDirection}
            baseUrl="/scans"
            searchParams={searchParams}
            emptyState={{
                title: "暂无扫描记录",
                description: "还没有执行任何扫描任务",
                action: {
                    label: "开始扫描",
                    href: "/sites",
                },
            }}
            pageSizeOptions={[10, 15, 25, 50, 100]}
        />
    );
}