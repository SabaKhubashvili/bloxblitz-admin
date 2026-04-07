"use client";

import { cn } from "./cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface CaseSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  error?: string;
  disabled?: boolean;
}

export function CaseSelect({
  label,
  id,
  value,
  onChange,
  options,
  error,
  disabled,
}: CaseSelectProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-zinc-400"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl border bg-zinc-950/50 px-3 text-sm text-zinc-100",
          "focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
          error ? "border-rose-500/70" : "border-zinc-700",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1.5 text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
