"use client";

import Link from "next/link";
import Pagination from "@/components/tables/Pagination";
import { CaseFormModal } from "./CaseFormModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { formatMoney } from "../components/formatMoney";
import { useCasesAdmin } from "../context/CasesAdminContext";
import type { CaseRecord } from "../mock/types";
import { mapDbPetRarityToItemRarity } from "../mock/pet-rarity";
import { cn } from "../components/cn";
import { fetchCasesList, type CaseListItemApi } from "@/lib/admin-api/cases-list";
import {
  createCase,
  type CreateCasePayload,
} from "@/lib/admin-api/create-case";
import { updateCase } from "@/lib/admin-api/update-case";
import { useCallback, useEffect, useRef, useState } from "react";

function recordToUpdatePayload(record: CaseRecord) {
  return {
    name: record.name,
    imageUrl: record.imageUrl,
    price: record.price,
    isActive: record.status === "active",
    items: record.items.map((it, sortOrder) => ({
      id: it.id,
      petId: it.petId as number,
      dropChance: it.dropChance,
      sortOrder,
      variant: it.variant,
    })),
  };
}

function caseListItemToCaseRecord(c: CaseListItemApi): CaseRecord {
  const itemsFromApi =
    c.caseItems?.map((it) => ({
      id: it.id,
      petId: it.petId,
      name: it.name,
      imageUrl: it.imageUrl,
      value: it.value,
      dropChance: it.dropChance,
      rarity: mapDbPetRarityToItemRarity(it.rarity),
      variant: [...it.variant],
      petValues: { ...it.petValues },
    })) ?? [];

  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    imageUrl: c.imageUrl,
    price: c.price,
    description: "",
    status: c.status,
    createdAt: c.createdAt,
    totalOpened: c.opened,
    items:
      itemsFromApi.length > 0
        ? itemsFromApi
        : [
            {
              id: `placeholder-${c.id}`,
              petId: null,
              name: "Reward",
              imageUrl: null,
              value: 1,
              dropChance: 100,
              rarity: "common",
              variant: [],
              petValues: null,
            },
          ],
  };
}

interface CasesListSectionProps {
  /** When true (e.g. `/admin/cases/new`), scroll to this section and open the create form once. */
  openCreateOnMount?: boolean;
}

export function CasesListSection({ openCreateOnMount = false }: CasesListSectionProps) {
  const { upsertCase, deleteCase, toggleCase, casesListVersion } = useCasesAdmin();
  const didOpenCreateForRoute = useRef(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "disabled">("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CaseRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<{
    page: number;
    pageSize: number;
    total: number;
    cases: CaseListItemApi[];
  } | null>(null);
  const [listRefresh, setListRefresh] = useState(0);

  const persistCaseToDatabase = useCallback(
    async (record: CaseRecord, coverFile: File | null) => {
      const out = await updateCase(record.id, recordToUpdatePayload(record), {
        coverImage: coverFile ?? undefined,
      });
      setListRefresh((n) => n + 1);
      return { imageUrl: out.imageUrl };
    },
    [],
  );

  const createCaseInDatabase = useCallback(
    async (payload: CreateCasePayload) => {
      const out = await createCase(payload);
      setListRefresh((n) => n + 1);
      return out;
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void fetchCasesList(
      {
        page,
        search: debouncedSearch,
        status: filter,
      },
      { signal: ac.signal },
    )
      .then((res) => {
        setPayload(res);
        const totalPages = Math.max(
          1,
          Math.ceil(res.total / res.pageSize),
        );
        if (page > totalPages) setPage(totalPages);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Could not load cases. Check admin-api and try again.");
        setPayload(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [page, debouncedSearch, filter, listRefresh, casesListVersion]);

  useEffect(() => {
    if (!openCreateOnMount || didOpenCreateForRoute.current) return;
    didOpenCreateForRoute.current = true;
    const el = document.getElementById("cases-list");
    window.requestAnimationFrame(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setEditing(null);
    setFormOpen(true);
  }, [openCreateOnMount]);

  const total = payload?.total ?? 0;
  const pageSize = payload?.pageSize ?? 10;
  const cases = payload?.cases ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: CaseListItemApi) => {
    setEditing(caseListItemToCaseRecord(c));
    setFormOpen(true);
  };

  return (
    <section id="cases-list" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">All cases</h2>
          <p className="text-sm text-zinc-500">
            Live catalog from admin-api (10 per page). Search and status filter
            run server-side.{" "}
            <Link href="/admin/cases/new" className="text-violet-400 hover:underline">
              Add-case route
            </Link>{" "}
            opens the same create form in a dedicated URL.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30"
        >
          Create case
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {!loading && !error && total === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/40 py-16 text-center">
          <p className="text-zinc-400">
            {debouncedSearch || filter !== "all"
              ? "No cases match your filters."
              : "No cases in the database yet."}
          </p>
          {!debouncedSearch && filter === "all" ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 text-sm font-medium text-violet-400 hover:underline"
            >
              Create your first case (mock)
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-950/50 p-4 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as typeof filter);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {loading && cases.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="bg-zinc-900/40">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-zinc-800" />
                        </td>
                      </tr>
                    ))
                  : null}
                {!loading
                  ? cases.map((c) => (
                      <tr
                        key={c.id}
                        className="bg-zinc-900/40 transition-colors hover:bg-zinc-800/40"
                      >
                        <td className="px-4 py-3">
                          {c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.imageUrl}
                              alt=""
                              className="h-11 w-11 rounded-lg border border-zinc-700/80 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-800 text-lg">
                              📦
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-200">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-violet-300">
                          {formatMoney(c.price)}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-400">
                          {c.opened.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleCase(c.id)}
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                              c.status === "active"
                                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600",
                            )}
                          >
                            {c.status === "active" ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="text-xs font-medium text-violet-400 hover:underline"
                            >
                              Edit
                            </button>
                            <Link
                              href={`/admin/cases/${c.id}`}
                              className="text-xs font-medium text-amber-400/90 hover:underline"
                            >
                              Analytics
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteId(c.id)}
                              className="text-xs font-medium text-rose-400 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 p-4">
            <p className="text-xs text-zinc-500">
              {total} case{total !== 1 ? "s" : ""}
              {loading ? " · loading…" : ""}
            </p>
            <Pagination
              currentPage={pageSafe}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      <CaseFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSave={upsertCase}
        persistCase={persistCaseToDatabase}
        createCase={createCaseInDatabase}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete case?"
        description="Removes the case from local mock state only; it does not delete the case in admin-api."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId) deleteCase(deleteId);
        }}
        variant="danger"
      />
    </section>
  );
}
