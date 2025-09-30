import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationServerProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
  className?: string;
}

interface PageSizeSelectorServerProps {
  currentPageSize: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
  options?: number[];
}

export function PaginationServer({
  currentPage,
  totalPages,
  pageSize,
  total,
  baseUrl,
  searchParams = {},
  className
}: PaginationServerProps) {
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

export function PageSizeSelectorServer({
  currentPageSize,
  baseUrl,
  searchParams = {},
  options = [10, 20, 50, 100]
}: PageSizeSelectorServerProps) {
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
      <div className="flex items-center space-x-1">
        {options.map((size) => (
          <Link
            key={size}
            href={buildUrl(size)}
            className={`px-2 py-1 rounded text-xs border transition-colors ${
              currentPageSize === size
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-input"
            }`}
          >
            {size}
          </Link>
        ))}
      </div>
      <span className="text-muted-foreground">条</span>
    </div>
  );
}