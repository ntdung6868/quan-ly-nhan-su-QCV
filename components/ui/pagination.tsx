"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className={cn("flex items-center justify-between text-sm flex-wrap gap-3", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {onPageSizeChange && (
          <>
            <span className="whitespace-nowrap">Hàng trên mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-border bg-card text-foreground rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </>
        )}
        <span className="whitespace-nowrap">
          {total === 0
            ? "Không có dữ liệu"
            : `${start}-${end} của ${total}`}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={isFirst}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            "inline-flex items-center justify-center rounded-lg p-1.5 transition-colors",
            "border border-border bg-card hover:bg-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card"
          )}
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          disabled={isLast}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            "inline-flex items-center justify-center rounded-lg p-1.5 transition-colors",
            "border border-border bg-card hover:bg-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card"
          )}
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
