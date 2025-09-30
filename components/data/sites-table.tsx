"use client";
import Link from "next/link";
import * as React from "react";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table-primitive";
import { formatDateTime } from "@/lib/datetime";

type Site = {
  id: string;
  rootUrl: string;
  robotsUrl: string | null;
  createdAt: string | number | null;
  enabled?: boolean | null;
  tags?: string[] | null;
};

const columns: ColumnDef<Site>[] = [
  {
    accessorKey: "rootUrl",
    header: "站点",
    cell: ({ row }) => (
      <Link className="underline" href={`/sites/${row.original.id}`}>
        {row.getValue("rootUrl") as string}
      </Link>
    ),
  },
  {
    accessorKey: "robotsUrl",
    header: "robots.txt",
    cell: ({ getValue }) => (
      <span className="truncate">{(getValue() as string) || "—"}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
    cell: ({ getValue }) => {
      return <span>{formatDateTime(getValue(), { includeSeconds: true })}</span>;
    },
  },
  {
    accessorKey: "enabled",
    header: "状态",
    cell: ({ getValue }) => {
      const enabled = Boolean(getValue());
      return (
        <span className={enabled ? "text-emerald-600" : "text-slate-500"}>
          {enabled ? "启用" : "禁用"}
        </span>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "标签",
    cell: ({ getValue }) => {
      const tags = Array.isArray(getValue()) ? (getValue() as string[]) : [];
      return tags.length ? (
        <div className="flex flex-wrap gap-1 text-xs">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
];

export function SitesTable({ data }: { data: Site[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [pageSize, setPageSize] = React.useState(10);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  React.useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : (
                      <button
                        onClick={h.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {{ asc: "↑", desc: "↓" }[
                          h.column.getIsSorted() as string
                        ] ?? ""}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((r) => (
              <TableRow key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <TableCell key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded-md border px-2"
          >
            {[5, 10, 20, 50].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="text-slate-500">共 {data.length} 条</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 px-3 rounded-md border disabled:opacity-50"
          >
            上一页
          </button>
          <span>
            第 {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount()} 页
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 px-3 rounded-md border disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

// Minimal table primitives styled with Tailwind
export function TableWrapper({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
