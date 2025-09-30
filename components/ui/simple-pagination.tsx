import Link from "next/link";
import { cn } from "@/lib/utils";

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  pageSize,
  total,
  baseUrl,
  searchParams = {},
  className
}: SimplePaginationProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    
    // 添加现有的搜索参数
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'page') {
        params.set(key, value);
      }
    });
    
    params.set('page', page.toString());
    
    return `${baseUrl}?${params.toString()}`;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className={cn("flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0", className)}>
      {/* 显示信息 */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>显示第 {startItem} - {endItem} 条</span>
        <span>•</span>
        <span>共 {total} 条记录</span>
        <span>•</span>
        <span>第 {currentPage} 页，共 {totalPages} 页</span>
      </div>

      {/* 分页控件 */}
      <div className="flex items-center space-x-2">
        {/* 上一页 */}
        {currentPage > 1 ? (
          <Link
            href={buildUrl(currentPage - 1)}
            className="inline-flex items-center justify-center h-9 px-4 rounded-md border text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            上一页
          </Link>
        ) : (
          <div className="inline-flex items-center justify-center h-9 px-4 rounded-md border text-sm font-medium opacity-50 pointer-events-none">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            上一页
          </div>
        )}

        {/* 下一页 */}
        {currentPage < totalPages ? (
          <Link
            href={buildUrl(currentPage + 1)}
            className="inline-flex items-center justify-center h-9 px-4 rounded-md border text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            下一页
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <div className="inline-flex items-center justify-center h-9 px-4 rounded-md border text-sm font-medium opacity-50 pointer-events-none">
            下一页
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}