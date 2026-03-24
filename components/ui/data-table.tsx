"use client";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import type { LucideIcon } from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T & string;
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyState,
  pagination,
  pageSize,
  onPageSizeChange,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("bg-card rounded-xl ring-1 ring-border overflow-hidden", className)}>
      {isLoading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={cn(
                      "text-left px-4 py-3 text-muted-foreground font-medium",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))}
            </tbody>
          </table>
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={emptyState?.icon}
          title={emptyState?.title ?? "Không có dữ liệu"}
          description={emptyState?.description}
          action={emptyState?.action}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={cn(
                      "text-left px-4 py-3 text-muted-foreground font-medium",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-accent transition-colors">
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn("px-4 py-3", col.className)}
                    >
                      {col.cell
                        ? col.cell(row, rowIndex)
                        : col.accessorKey
                          ? String((row as Record<string, unknown>)[col.accessorKey] ?? "")
                          : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div className="border-t border-border px-4 py-3">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
