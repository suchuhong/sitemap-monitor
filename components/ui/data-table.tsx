"use client";

import * as React from "react";
import NextLink from "next/link";
import { cn } from "@/lib/utils";
import { Pagination, PageSizeSelector, PageJumper } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";

interface Column<T> {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  sort?: string;
  sortDirection?: "asc" | "desc";
  baseUrl: string;
  searchParams?: Record<string, string>;
  emptyState?: {
    title: string;
    description?: string;
    action?: {
      label: string;
      href?: string;
      onClick?: () => void;
    };
  };
  className?: string;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageJumper?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  currentPage,
  pageSize,
  totalItems,
  sort,
  sortDirection = "desc",
  baseUrl,
  searchParams = {},
  emptyState,
  className,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showPageJumper = true,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const buildSortUrl = (column: string) => {
    const params = new URLSearchParams();
    
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'page' && key !== 'sort' && key !== 'dir') {
        params.set(key, value);
      }
    });
    
    const newDirection = sort === column && sortDirection === "asc" ? "desc" : "asc";
    params.set('page', '1');
    params.set('sort', column);
    params.set('dir', newDirection);
    
    return `${baseUrl}?${params.toString()}`;
  };

  const getSortIcon = (column: string) => {
    if (sort !== column) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={cn("space-y-6", className)}>
      {/* 表格 */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "h-12 px-4 text-left font-medium text-muted-foreground",
                      column.headerClassName
                    )}
                  >
                    {column.sortable ? (
                      <a
                        className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                        href={buildSortUrl(column.key)}
                      >
                        {column.title} {getSortIcon(column.key)}
                      </a>
                    ) : (
                      <div className="flex items-center gap-2">
                        {column.title}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const record = item as Record<string, unknown>;
                const rowKey = record.id ?? index;

                return (
                  <tr
                    key={String(rowKey)}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    {columns.map((column) => {
                      const value = record[column.key];
                      const fallback = value == null ? "—" : String(value);

                      return (
                        <td
                          key={column.key}
                          className={cn("p-4", column.className)}
                        >
                          {column.render ? column.render(item, index) : fallback}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {data.length === 0 && emptyState && (
                <tr>
                  <td className="p-0" colSpan={columns.length}>
                    <EmptyState
                      title={emptyState.title}
                      description={emptyState.description}
                      action={emptyState.action}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页控件 */}
      {totalItems > 0 && (
        <div className="space-y-4">
          {/* 页面大小选择器和快速跳转 */}
          {(showPageSizeSelector || showPageJumper) && (
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                {showPageSizeSelector && (
                  <PageSizeSelector
                    currentPageSize={pageSize}
                    baseUrl={baseUrl}
                    searchParams={searchParams}
                    options={pageSizeOptions}
                  />
                )}
                {showPageJumper && totalPages > 1 && (
                  <PageJumper
                    currentPage={currentPage}
                    totalPages={totalPages}
                    baseUrl={baseUrl}
                    searchParams={searchParams}
                  />
                )}
              </div>
              
              {/* 显示当前范围信息 */}
              <div className="text-sm text-muted-foreground">
                显示第 {startItem} - {endItem} 条，共 {totalItems} 条记录
              </div>
            </div>
          )}

          {/* 主分页组件 */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              total={totalItems}
              baseUrl={baseUrl}
              searchParams={searchParams}
            />
          )}
        </div>
      )}
    </div>
  );
}

// 预定义的列类型
export const createColumn = <T,>(config: Column<T>): Column<T> => config;

// 常用的列渲染器
export const columnRenderers = {
  // 链接列 - 需要提供获取文本和链接的函数
  link: <T,>(
    getHref: (item: T) => string, 
    getText: (item: T) => string, 
    className?: string
  ) => 
    (item: T) => (
      <a 
        href={getHref(item)} 
        className={cn("text-primary hover:underline underline-offset-4", className)}
      >
        {getText(item)}
      </a>
    ),

  // 简单链接列 - 使用对象属性
  linkByKey: <T extends Record<string, unknown>>(
    hrefKey: keyof T, 
    textKey: keyof T, 
    className?: string
  ) =>
    (item: T) => {
      const hrefValue = item[hrefKey];
      const textValue = item[textKey];
      const href = hrefValue == null ? "#" : String(hrefValue);
      const text = textValue == null ? "—" : String(textValue);
      return (
        <a
          href={href}
          className={cn("text-primary hover:underline underline-offset-4", className)}
        >
          {text}
        </a>
      );
    },

  // 内部链接（使用 Next.js Link）
  internalLink: <T,>(
    getHref: (item: T) => string, 
    getText: (item: T) => string, 
    className?: string
  ) =>
    (item: T) => (
      <NextLink
        href={getHref(item)}
        className={cn("text-primary hover:underline underline-offset-4", className)}
      >
        {getText(item)}
      </NextLink>
    ),

  // 状态列
  status: <T,>(getStatus: (item: T) => "success" | "error" | "warning" | "info" | "pending") =>
    (item: T) => {
      const status = getStatus(item);
      const statusConfig = {
        success: { label: "成功", className: "bg-success/10 text-success border-success/20" },
        error: { label: "错误", className: "bg-destructive/10 text-destructive border-destructive/20" },
        warning: { label: "警告", className: "bg-warning/10 text-warning border-warning/20" },
        info: { label: "信息", className: "bg-info/10 text-info border-info/20" },
        pending: { label: "等待", className: "bg-muted text-muted-foreground border-muted" },
      };
      
      const config = statusConfig[status];
      return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium", config.className)}>
          <div className={cn("h-1.5 w-1.5 rounded-full", config.className.split(' ')[1])} />
          {config.label}
        </span>
      );
    },

  // 日期列
  date: <T,>(getDate: (item: T) => Date | string | number | null) =>
    (item: T) => {
      const date = getDate(item);
      if (!date) return "—";
      
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "—";
      
      return (
        <div>
          <div className="font-medium">{dateObj.toLocaleDateString('zh-CN')}</div>
          <div className="text-xs text-muted-foreground">
            {dateObj.toLocaleTimeString('zh-CN', { hour12: false })}
          </div>
        </div>
      );
    },

  // 标签列
  tags: <T,>(getTags: (item: T) => string[]) =>
    (item: T) => {
      const tags = getTags(item);
      if (!tags.length) return <span className="text-muted-foreground">无标签</span>;
      
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              +{tags.length - 3}
            </span>
          )}
        </div>
      );
    },
};
