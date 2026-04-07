"use client";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { CasesPanelCard } from "../components/CasesPanelCard";
import { useCasesAdmin } from "../context/CasesAdminContext";
import {
  disableAllCases,
  enableAllCases,
} from "@/lib/admin-api/cases-bulk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function QuickActionsSection() {
  const {
    setAllStatus,
    bumpCasesListVersion,
  } = useCasesAdmin();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<
    "enable" | "disable" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const enableMutation = useMutation({
    mutationFn: () => enableAllCases(),
    onSuccess: (data) => {
      setErrorMessage(null);
      setSuccessMessage(`Enabled ${data.updatedCount} case(s).`);
      setAllStatus("active");
      bumpCasesListVersion();
      void queryClient.invalidateQueries({ queryKey: ["recentCaseOpens"] });
      setConfirm(null);
    },
    onError: (e: Error) => {
      setErrorMessage(e.message ?? "Request failed");
      setConfirm(null);
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => disableAllCases(),
    onSuccess: (data) => {
      setErrorMessage(null);
      setSuccessMessage(`Disabled ${data.updatedCount} case(s).`);
      setAllStatus("disabled");
      bumpCasesListVersion();
      void queryClient.invalidateQueries({ queryKey: ["recentCaseOpens"] });
      setConfirm(null);
    },
    onError: (e: Error) => {
      setErrorMessage(e.message ?? "Request failed");
      setConfirm(null);
    },
  });

  const busy = enableMutation.isPending || disableMutation.isPending;

  return (
    <section id="quick" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Quick actions</h2>
        <p className="text-sm text-zinc-500">
          Bulk toggles apply to every case in the database via admin-api.
        </p>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-emerald-400" role="status">
          {successMessage}
        </p>
      ) : null}

      <CasesPanelCard title="Bulk controls">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setErrorMessage(null);
              setConfirm("enable");
            }}
            className="rounded-xl bg-emerald-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-40"
          >
            {enableMutation.isPending ? "Enabling…" : "Enable all cases"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setErrorMessage(null);
              setConfirm("disable");
            }}
            className="rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-600 disabled:opacity-40"
          >
            {disableMutation.isPending ? "Disabling…" : "Disable all cases"}
          </button>
        </div>
      </CasesPanelCard>

      <ConfirmDialog
        isOpen={confirm === "enable"}
        onClose={() => !busy && setConfirm(null)}
        title="Enable every case?"
        description="Sets isActive = true for all cases in the database. Public case caches are invalidated."
        confirmLabel={busy ? "Working…" : "Enable all"}
        variant="primary"
        onConfirm={() => enableMutation.mutate()}
      />
      <ConfirmDialog
        isOpen={confirm === "disable"}
        onClose={() => !busy && setConfirm(null)}
        title="Disable every case?"
        description="Sets isActive = false for all cases. They will not appear in active listings until re-enabled."
        confirmLabel={busy ? "Working…" : "Disable all"}
        variant="warning"
        onConfirm={() => disableMutation.mutate()}
      />
    </section>
  );
}
