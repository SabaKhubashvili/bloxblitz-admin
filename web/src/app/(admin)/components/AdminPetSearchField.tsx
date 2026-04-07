"use client";

import {
  searchPetsByName,
  type PetSnapshotApi,
} from "@/lib/admin-api/pets";
import { cn } from "@/app/(admin)/admin/cases/components/cn";
import { useEffect, useRef, useState } from "react";

export type AdminPetSelection = { id: number; name: string };

type Props = {
  selection: AdminPetSelection | null;
  onSelect: (snap: PetSnapshotApi) => void;
  onClear: () => void;
  disabled?: boolean;
  inputId?: string;
  className?: string;
};

/**
 * Case-insensitive partial name search against `/admin/pets/search` (debounced).
 */
export function AdminPetSearchField({
  selection,
  onSelect,
  onClear,
  disabled = false,
  inputId = "admin-pet-search",
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PetSnapshotApi[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* Debounced search updates result list from API; empty query clears local results. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selection != null || disabled) return;

    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchPetsByName(q)
        .then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setErr(null);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setErr("Search failed");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setSearching(false);
    };
  }, [query, selection, disabled]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setResults([]);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (selection) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <p className="text-sm text-zinc-200">
          <span className="font-mono text-zinc-400">#{selection.id}</span>{" "}
          {selection.name}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setQuery("");
            setResults([]);
            setErr(null);
            onClear();
          }}
          className="text-xs text-violet-400 hover:underline disabled:opacity-40"
        >
          Change pet
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <input
        id={inputId}
        type="text"
        disabled={disabled}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50"
      />
      {searching ? (
        <p className="mt-1 text-[11px] text-zinc-500">Searching…</p>
      ) : null}
      {err ? <p className="mt-1 text-[11px] text-rose-400">{err}</p> : null}
      {results.length > 0 ? (
        <ul
          className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
          role="listbox"
        >
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(p);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded border border-zinc-700 object-cover"
                />
                <span className="min-w-0 truncate">
                  <span className="font-mono text-zinc-500">#{p.id}</span>{" "}
                  {p.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length > 0 && !searching ? (
        <p className="mt-1 text-[11px] text-zinc-500">No matches</p>
      ) : null}
    </div>
  );
}
