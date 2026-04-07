"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";

interface CasesPanelCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  flush?: boolean;
  headerRight?: ReactNode;
}

export function CasesPanelCard({
  title,
  subtitle,
  children,
  className,
  flush,
  headerRight,
}: CasesPanelCardProps) {
  const hasHeader = title || subtitle || headerRight;
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-950/90 shadow-lg shadow-black/30 backdrop-blur-md transition-all duration-300",
        "hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-500/[0.06]",
        className
      )}
    >
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 px-5 py-4">
          <div>
            {title ? (
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
            ) : null}
          </div>
          {headerRight}
        </div>
      ) : null}
      <div className={flush ? undefined : "p-5"}>{children}</div>
    </div>
  );
}
