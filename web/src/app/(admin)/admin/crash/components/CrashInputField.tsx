"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

interface CrashInputFieldProps {
  label: string;
  id: string;
  type?: ComponentProps<"input">["type"];
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  step?: string;
  min?: string;
  max?: string;
  suffix?: ReactNode;
}

export function CrashInputField({
  label,
  id,
  type = "text",
  value,
  onChange,
  error,
  hint,
  disabled,
  step,
  min,
  max,
  suffix,
}: CrashInputFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-zinc-400"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-11 w-full rounded-xl border bg-zinc-950/50 px-3.5 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600",
            "transition-colors focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
            error
              ? "border-rose-500/70 ring-1 ring-rose-500/30"
              : "border-zinc-700 hover:border-zinc-600",
            disabled && "cursor-not-allowed opacity-50"
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}
