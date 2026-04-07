"use client";

import type { CrashMultiplierHistoryEntry } from "@/lib/admin-api/crash-control-room";
import { Modal } from "@/components/ui/modal";
import { CrashCard } from "../components/CrashCard";
import { CrashDataTable, type ColumnDef } from "../components/CrashDataTable";
import { useTableSort } from "../hooks/useTableSort";
import { useMemo, useState } from "react";

type RoundTableRow = CrashMultiplierHistoryEntry;

export function RoundHistorySection({
  entries,
  loading,
  error,
}: {
  entries: CrashMultiplierHistoryEntry[] | null;
  loading: boolean;
  error: string | null;
}) {
  const rows = entries ?? [];
  const [selected, setSelected] = useState<RoundTableRow | null>(null);

  const getValue = useMemo(
    () => (row: RoundTableRow, columnId: string) => {
      switch (columnId) {
        case "id":
          return row.roundId;
        case "crash":
          return row.crashMultiplier;
        case "time":
          return row.createdAt;
        default:
          return row.roundId;
      }
    },
    [],
  );

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    rows,
    getValue,
    "time",
    "desc",
  );

  const columns: ColumnDef<RoundTableRow>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Round ID",
        sortable: true,
        accessor: (r) => r.roundId,
        cell: (r) => (
          <span className="font-mono text-xs text-zinc-300">{r.roundId}</span>
        ),
      },
      {
        id: "crash",
        header: "Crash @",
        sortable: true,
        accessor: (r) => r.crashMultiplier,
        cell: (r) => (
          <span className="font-mono font-semibold text-emerald-400">
            {r.crashMultiplier.toFixed(2)}×
          </span>
        ),
      },
      {
        id: "time",
        header: "Timestamp",
        sortable: true,
        accessor: (r) => r.createdAt,
        cell: (r) => (
          <span className="text-xs text-zinc-400">
            {new Date(r.createdAt).toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <section id="rounds" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Round history</h2>
        <p className="text-sm text-zinc-500">
          Last 90 rounds from admin-api · sort columns · row details.
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <CrashCard flush>
        <div className="p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading rounds…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">No rounds yet.</p>
          ) : (
            <CrashDataTable
              columns={columns}
              data={sorted}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              onRowClick={setSelected}
            />
          )}
        </div>
      </CrashCard>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        className="mx-4 max-w-lg border border-zinc-800 bg-zinc-900"
      >
        {selected ? (
          <div className="p-6 pt-12">
            <h3 className="text-lg font-semibold text-zinc-100">Round</h3>
            <p className="mt-1 break-all font-mono text-xs text-zinc-400">
              {selected.roundId}
            </p>
            <p className="mt-4 font-mono text-2xl text-emerald-400">
              Crashed @ {selected.crashMultiplier.toFixed(2)}×
            </p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Created</dt>
                <dd className="font-mono text-zinc-200">
                  {new Date(selected.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
