"use client";

import { cn } from "./cn";

export function MinesToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-left",
        disabled && "opacity-50"
      )}
    >
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-emerald-600" : "bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
