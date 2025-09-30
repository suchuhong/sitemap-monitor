'use client';

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/datetime";

type SitemapItem = {
  id: string;
  url: string;
  isIndex: boolean | null;
  urlCounts: {
    total: number;
    active: number;
    inactive: number;
  };
  lastStatus: string | number | null;
  updatedAt: Date | string | number | null;
};

export function SitemapTable({ sitemaps }: { sitemaps: SitemapItem[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = sitemaps.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = sitemaps.slice(startIndex, endIndex);

  if (sitemaps.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-slate-500">
        暂未发现 sitemap
      </div>
    );
  }

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
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(1);
            }}
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

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-2 py-2">URL</th>
              <th className="px-2 py-2">类型</th>
              <th className="px-2 py-2">URL 数量</th>
              <th className="px-2 py-2">最后状态</th>
              <th className="px-2 py-2">更新时间</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {currentItems.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="px-2 py-2">
                  <a href={item.url} target="_blank" rel="noreferrer" className="underline">
                    {item.url}
                  </a>
                </td>
                <td className="px-2 py-2">
                  {item.isIndex ? <Badge variant="outline">Index</Badge> : "URL 集"}
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>总计 {item.urlCounts.total}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      活跃 {item.urlCounts.active}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      失效 {item.urlCounts.inactive}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2">{item.lastStatus ?? "—"}</td>
                <td className="px-2 py-2">{item.updatedAt ? formatDate(item.updatedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <SitemapPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

function SitemapPagination({
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