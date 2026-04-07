"use client";

import { InputField } from "./InputField";

export function RewardInputRow({
  position,
  value,
  onChange,
  error,
}: {
  position: number;
  value: number | string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const medal =
    position === 1
      ? "text-[#FFD700]"
      : position === 2
        ? "text-[#C0C0C0]"
        : position === 3
          ? "text-[#CD7F32]"
          : "text-zinc-500";

  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 font-mono text-sm font-bold ${medal}`}
      >
        {position}
      </div>
      <div className="min-w-0 flex-1">
        <InputField
          id={`reward-${position}`}
          label={`Top ${position} reward`}
          type="number"
          step="1"
          min="0"
          value={value}
          onChange={onChange}
          error={error}
          suffix="USD"
        />
      </div>
    </div>
  );
}
