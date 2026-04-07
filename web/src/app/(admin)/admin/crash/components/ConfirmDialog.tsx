"use client";

import { Modal } from "@/components/ui/modal";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { CrashButton } from "./CrashButton";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "warning" | "primary";
}

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
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isOpen) setPending(false);
  }, [isOpen]);

  const handleClose = () => {
    if (pending) return;
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="mx-4 max-w-md border border-zinc-800 bg-zinc-900 p-0 shadow-2xl shadow-black/50"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-zinc-400">
          {description}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <CrashButton
            variant="ghost"
            onClick={handleClose}
            disabled={pending}
          >
            {cancelLabel}
          </CrashButton>
          <CrashButton
            variant={variant === "primary" ? "primary" : variant}
            disabled={pending}
            onClick={() => {
              void (async () => {
                setPending(true);
                try {
                  await Promise.resolve(onConfirm());
                  onClose();
                } catch {
                  /* parent may show error; keep dialog open */
                } finally {
                  setPending(false);
                }
              })();
            }}
          >
            {pending ? "…" : confirmLabel}
          </CrashButton>
        </div>
      </div>
    </Modal>
  );
}
