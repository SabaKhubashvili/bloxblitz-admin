"use client";

import { cn } from "./cn";
import { useCallback, useState } from "react";

interface ImageUploaderProps {
  label?: string;
  inputId: string;
  /** Shown under the dropzone (e.g. selected file name or existing URL). */
  displayLabel: string | null;
  onFileChange: (file: File | null) => void;
  hint?: string;
}

export function ImageUploader({
  label = "Image",
  inputId,
  displayLabel,
  onFileChange,
  hint = "JPEG, PNG, or WebP",
}: ImageUploaderProps) {
  const [drag, setDrag] = useState(false);

  const onFile = useCallback(
    (f: File | null) => {
      onFileChange(f);
    },
    [onFileChange]
  );

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-zinc-400">{label}</p>
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition-all",
          drag
            ? "border-violet-500/60 bg-violet-500/10"
            : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-900/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
      >
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-sm font-medium text-zinc-300">
          Drop image or click to browse
        </span>
        {displayLabel ? (
          <span className="mt-2 truncate text-xs text-violet-300">
            {displayLabel}
          </span>
        ) : (
          <span className="mt-2 text-xs text-zinc-500">No file selected</span>
        )}
        {hint ? <span className="mt-2 text-center text-xs text-zinc-600">{hint}</span> : null}
      </label>
    </div>
  );
}
