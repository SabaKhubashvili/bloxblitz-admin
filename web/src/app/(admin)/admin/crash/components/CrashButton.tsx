"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "danger" | "warning" | "ghost";

interface CrashButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500",
  secondary:
    "border border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800",
  danger:
    "bg-gradient-to-r from-rose-700 to-red-700 text-white shadow-lg shadow-rose-900/30 hover:from-rose-600 hover:to-red-600",
  warning:
    "bg-gradient-to-r from-amber-600 to-yellow-600 text-zinc-950 shadow-lg shadow-amber-900/20 hover:from-amber-500 hover:to-yellow-500",
  ghost: "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
};

export function CrashButton({
  variant = "primary",
  className,
  children,
  disabled,
  ...rest
}: CrashButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
