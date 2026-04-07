"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";

export type SortDir = "asc" | "desc" | null;

export interface ColumnDef<T> {
  id: string;
  header: string;
  sortable?: boolean;
  /** Access value for sorting when sortValue not set */
  accessor?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface CrashDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function CrashDataTable<T>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  emptyMessage = "No rows to display",
  onRowClick,
}: CrashDataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 py-16 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-950/50">
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500",
                  col.sortable && "cursor-pointer select-none hover:text-zinc-300",
                  col.className
                )}
                onClick={() => col.sortable && onSort(col.id)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.id ? (
                    <span className="text-emerald-400" aria-hidden>
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">
          {data.map((row, ri) => (
            <tr
              key={ri}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "bg-zinc-900/40 transition-colors",
                onRowClick && "cursor-pointer hover:bg-zinc-800/50"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn("px-4 py-3 text-zinc-300", col.className)}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
