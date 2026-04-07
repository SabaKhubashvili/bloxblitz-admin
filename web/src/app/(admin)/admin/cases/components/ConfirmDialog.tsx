"use client";

import { Modal } from "@/components/ui/modal";
import type { ReactNode } from "react";
import { cn } from "./cn";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "warning" | "primary";
}

const btn = {
  danger:
    "bg-gradient-to-r from-rose-700 to-red-700 text-white shadow-lg hover:from-rose-600 hover:to-red-600",
  warning:
    "bg-gradient-to-r from-amber-600 to-yellow-600 text-zinc-950 shadow-lg hover:from-amber-500 hover:to-yellow-500",
  primary:
    "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg hover:from-violet-500 hover:to-fuchsia-500",
};

export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "danger",
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-w-md border border-zinc-800 bg-zinc-900 p-0 shadow-2xl shadow-black/50"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-zinc-400">
          {description}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
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
