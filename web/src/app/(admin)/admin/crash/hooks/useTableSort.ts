"use client";

import type { SortDir } from "../components/CrashDataTable";
import { useCallback, useMemo, useState } from "react";

export function useTableSort<T>(
  rows: T[],
  getValue: (row: T, columnId: string) => string | number,
  initialKey: string | null = null,
  initialDir: SortDir = "desc"
) {
  const [sortKey, setSortKey] = useState<string | null>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const onSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("desc");
        return;
      }
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    },
    [sortKey]
  );

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir, getValue]);

  return { sorted, sortKey, sortDir, onSort };
}
