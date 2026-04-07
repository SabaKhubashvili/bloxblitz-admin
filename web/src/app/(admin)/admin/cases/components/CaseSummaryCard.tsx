"use client";

import type { CaseRecord } from "../mock/types";
import { formatMoney } from "./formatMoney";
import { cn } from "./cn";

export type CaseCardModel = Pick<
  CaseRecord,
  "id" | "name" | "price" | "totalOpened"
>;

interface CaseSummaryCardProps {
  caseRecord: CaseCardModel;
  rank?: number;
  onClick?: () => void;
}

export function CaseSummaryCard({
  caseRecord: c,
  rank,
  onClick,
}: CaseSummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-4 text-left transition-all duration-300",
        "hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-3">
        {rank != null ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 font-mono text-sm font-bold text-amber-300">
            {rank}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-100">{c.name}</p>
          <p className="mt-1 font-mono text-xs text-violet-300">
            {formatMoney(c.price)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        <span className="font-mono text-zinc-300">
          {c.totalOpened.toLocaleString()}
        </span>{" "}
        opens
      </p>
    </button>
  );
}
