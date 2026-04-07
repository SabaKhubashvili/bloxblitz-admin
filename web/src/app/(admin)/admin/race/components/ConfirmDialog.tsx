"use client";

import { Modal } from "@/components/ui/modal";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "danger",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "warning" | "primary";
}) {
  const btn = {
    danger:
      "bg-gradient-to-r from-rose-700 to-red-700 text-white hover:from-rose-600 hover:to-red-600",
    warning:
      "bg-gradient-to-r from-amber-600 to-yellow-600 text-zinc-950 hover:from-amber-500",
    primary:
      "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500",
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-w-md border border-zinc-800 bg-zinc-900 p-0"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <div className="mt-2 text-sm text-zinc-400">{description}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await Promise.resolve(onConfirm());
                onClose();
              } catch {
                /* caller handles errors / stays open */
              }
            }}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg",
              btn[variant]
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
