'use client';

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatDateTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

type ScanInfo = {
  id: string;
  startedAt: Date | number | null;
  finishedAt: Date | number | null;
  status: string | null;
};

type DiffResponse = {
  scanId: string;
  summary: { added: number; removed: number; updated: number };
  items: Array<{ type: string; detail: string | null; occurredAt: Date | number | null }>;
  startedAt: Date | string | number | null;
  finishedAt: Date | string | number | null;
};

export function ScanDiffPanel({ siteId, scans }: { siteId: string; scans: ScanInfo[] }) {
  const orderedScans = useMemo(
    () =>
      [...scans].sort((a, b) => {
        const aTime = a.startedAt ? new Date(a.startedAt as Date).getTime() : 0;
        const bTime = b.startedAt ? new Date(b.startedAt as Date).getTime() : 0;
        return bTime - aTime;
      }),
    [scans],
  );

  const [selected, setSelected] = useState(orderedScans[0]?.id ?? "");
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [isLoading, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!selected) {
      setDiff(null);
      return;
    }
    setCurrentPage(1); // 重置分页
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}/scan-diff?scanId=${selected}`);
        if (!res.ok) {
          const message = await parseError(res);
          toast.error(message ?? "获取差异失败");
          return;
        }
        const payload = (await res.json()) as DiffResponse;
        setDiff(payload);
      } catch (error) {
        console.error("fetch diff failed", error);
        toast.error("请求异常，请稍后重试");
      }
    });
  }, [selected, siteId]);

  if (!orderedScans.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900">
        暂无扫描记录，触发一次扫描后即可查看差异报告。
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold">差异报告</h3>
          <p className="text-xs text-muted-foreground">
            选择一次扫描查看新增、删除与更新的 URL 列表。
          </p>
        </div>
        <select
          className="h-9 w-full rounded-md border border-slate-200 bg-background px-2 text-sm md:w-64"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {orderedScans.map((scan) => (
            <option key={scan.id} value={scan.id}>
              {formatDisplay(scan)}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">加载中...</p>}

      {diff && !isLoading ? (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-3">
            <SummaryBadge label="新增" value={diff.summary.added} tone="emerald" />
            <SummaryBadge label="删除" value={diff.summary.removed} tone="rose" />
            <SummaryBadge label="更新" value={diff.summary.updated} tone="amber" />
          </div>
          <DiffList
            items={diff.items}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      ) : null}

      {!diff && !isLoading && (
        <p className="text-xs text-muted-foreground">
          该扫描暂无记录差异，或为早期扫描（缺少详细变更数据）。
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => selected && setSelected(selected)}
        disabled={isLoading}
      >
        刷新
      </Button>
    </div>
  );
}

function SummaryBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "amber";
}) {
  const toneMap: Record<typeof tone, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
  } as const;
  return (
    <div className={`rounded-md px-3 py-2 text-center ${toneMap[tone]}`}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </div>
  );
}

function DiffList({
  items,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  items: Array<{ type: string; detail: string | null; occurredAt: Date | number | null }>;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground">该扫描未检测到差异。</p>;
  }

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = items.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* 分页信息和页面大小选择器 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          显示第 {startIndex + 1} - {Math.min(endIndex, totalItems)} 条，共 {totalItems} 条记录
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">每页显示</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-muted-foreground">条</span>
        </div>
      </div>

      {/* 差异列表 */}
      <div className="space-y-2">
        {currentItems.map((item, index) => (
          <div
            key={`${item.type}-${startIndex + index}-${item.detail ?? ""}`}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase text-muted-foreground">{item.type}</span>
              <span className="text-muted-foreground">
                {item.occurredAt ? formatDateTime(item.occurredAt) : "--"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {item.detail ?? "—"}
            </p>
          </div>
        ))}
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <ClientPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

function formatDisplay(scan: ScanInfo) {
  const started = scan.startedAt ? formatDateTime(scan.startedAt) : "--";
  return `${started} · ${scan.status ?? "未知"}`;
}

function ClientPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center space-x-2">
      {/* 上一页 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        上一页
      </Button>

      {/* 页码 */}
      <div className="hidden sm:flex items-center space-x-1">
        {pageNumbers.map((pageNum, index) => (
          <div key={index}>
            {pageNum === '...' ? (
              <span className="px-3 py-2 text-sm text-muted-foreground">...</span>
            ) : (
              <Button
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum as number)}
                disabled={currentPage === pageNum}
                className="min-w-[40px]"
              >
                {pageNum}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* 移动端页码显示 */}
      <div className="sm:hidden flex items-center space-x-2 text-sm">
        <span>{currentPage}</span>
        <span>/</span>
        <span>{totalPages}</span>
      </div>

      {/* 下一页 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        下一页
        <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </div>
  );
}

async function parseError(res: Response) {
  try {
    const payload = (await res.json()) as unknown;
    if (payload && typeof payload === "object" && "error" in payload) {
      const { error } = payload as { error?: unknown };
      if (typeof error === "string") return error;
    }
  } catch { }
  return null;
}
