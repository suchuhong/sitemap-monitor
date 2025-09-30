"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
  className?: string;
}

interface PageSizeSelectorProps {
  currentPageSize: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
  options?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  total,
  baseUrl,
  searchParams = {},
  className
}: PaginationProps) {
  const buildUrl = (page: number, newPageSize?: number) => {
    const params = new URLSearchParams();

    // 添加现有的搜索参数
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'page' && key !== 'pageSize') {
        params.set(key, value);
      }
    });

    params.set('page', page.toString());
    params.set('pageSize', (newPageSize || pageSize).toString());

    return `${baseUrl}?${params.toString()}`;
  };

  // 生成页码数组
  const getPageNumbers = () => {
    const delta = 2; // 当前页前后显示的页数
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
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className={cn("flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0", className)}>
      {/* 显示信息 */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>显示第 {startItem} - {endItem} 条</span>
        <span>•</span>
        <span>共 {total} 条记录</span>
      </div>

      {/* 分页控件 */}
      <div className="flex items-center space-x-2">
        {/* 首页 */}
        <Button
          variant="outline"
          size="sm"
          asChild={currentPage > 1}
          disabled={currentPage <= 1}
          className="hidden sm:inline-flex"
        >
          {currentPage > 1 ? (
            <Link href={buildUrl(1)}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </Link>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </Button>

        {/* 上一页 */}
        <Button
          variant="outline"
          size="sm"
          asChild={currentPage > 1}
          disabled={currentPage <= 1}
        >
          {currentPage > 1 ? (
            <Link href={buildUrl(currentPage - 1)}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一页
            </Link>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一页
            </>
          )}
        </Button>

        {/* 页码 */}
        <div className="hidden sm:flex items-center space-x-1">
          {pageNumbers.map((pageNum, index) => (
            <React.Fragment key={index}>
              {pageNum === '...' ? (
                <span className="px-3 py-2 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  asChild={currentPage !== pageNum}
                  disabled={currentPage === pageNum}
                  className="min-w-[40px]"
                >
                  {currentPage !== pageNum ? (
                    <Link href={buildUrl(pageNum as number)}>{pageNum}</Link>
                  ) : (
                    <span>{pageNum}</span>
                  )}
                </Button>
              )}
            </React.Fragment>
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
          asChild={currentPage < totalPages}
          disabled={currentPage >= totalPages}
        >
          {currentPage < totalPages ? (
            <Link href={buildUrl(currentPage + 1)}>
              下一页
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <>
              下一页
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </Button>

        {/* 末页 */}
        <Button
          variant="outline"
          size="sm"
          asChild={currentPage < totalPages}
          disabled={currentPage >= totalPages}
          className="hidden sm:inline-flex"
        >
          {currentPage < totalPages ? (
            <Link href={buildUrl(totalPages)}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}

export function PageSizeSelector({
  currentPageSize,
  baseUrl,
  searchParams = {},
  options = [10, 20, 50, 100]
}: PageSizeSelectorProps) {
  const buildUrl = (newPageSize: number) => {
    const params = new URLSearchParams();

    // 添加现有的搜索参数，但重置页码为1
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'page' && key !== 'pageSize') {
        params.set(key, value);
      }
    });

    params.set('page', '1');
    params.set('pageSize', newPageSize.toString());

    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-muted-foreground">每页显示</span>
      <select
        value={currentPageSize}
        onChange={(e) => {
          window.location.href = buildUrl(parseInt(e.target.value));
        }}
        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">条</span>
    </div>
  );
}

// 快速跳转组件
export function PageJumper({
  currentPage,
  totalPages,
  baseUrl,
  searchParams = {}
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}) {
  const [jumpPage, setJumpPage] = React.useState('');

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      params.set(key, value);
    });

    params.set('page', page.toString());

    return `${baseUrl}?${params.toString()}`;
  };

  const handleJump = () => {
    const page = parseInt(jumpPage);
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      window.location.href = buildUrl(page);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-muted-foreground">跳转到</span>
      <input
        type="number"
        min="1"
        max={totalPages}
        value={jumpPage}
        onChange={(e) => setJumpPage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={currentPage.toString()}
        className="w-16 h-8 rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      />
      <span className="text-muted-foreground">页</span>
      <Button size="sm" variant="outline" onClick={handleJump}>
        跳转
      </Button>
    </div>
  );
}