"use client";

import {
  CRASH_SETUP_DEFAULT_BLOCK_HASH,
  fetchCrashChainActive,
  fetchCrashChainById,
  fetchCrashChains,
  fetchCrashChainStatistics,
  patchCrashChainClientSeed,
  postCreateCrashChain,
  postPrecalculateCrashRounds,
  type CrashChainDetail,
  type CrashChainRow,
  type CrashChainStatistics,
} from "@/lib/admin-api/crash-chain";
import { useCallback, useEffect, useState } from "react";
import { CrashButton } from "../components/CrashButton";
import { CrashCard } from "../components/CrashCard";
import { CrashInputField } from "../components/CrashInputField";
import { cn } from "../components/cn";
import { ConfirmDialog } from "../components/ConfirmDialog";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="text-sm text-zinc-200">{children}</div>
    </div>
  );
}

function Mono({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "block break-all rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1.5 font-mono text-xs text-zinc-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

const HEX64 = /^[a-f0-9]{64}$/i;

export function CrashChainSection() {
  const [rows, setRows] = useState<CrashChainRow[]>([]);
  const [active, setActive] = useState<CrashChainRow | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrashChainDetail | null>(null);
  const [stats, setStats] = useState<CrashChainStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createMode, setCreateMode] = useState<"test" | "production" | "custom">(
    "test",
  );
  const [customRounds, setCustomRounds] = useState("10000");
  const [busy, setBusy] = useState(false);
  const [clientSeedInput, setClientSeedInput] = useState("");
  const [precalcCount, setPrecalcCount] = useState("1000");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [statsTick, setStatsTick] = useState(0);

  const selectChain = useCallback(async (chainId: string) => {
    setSelectedChainId(chainId);
    setError(null);
    try {
      const d = await fetchCrashChainById(chainId);
      setDetail(d);
      setClientSeedInput(d.clientSeed ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chain");
      setDetail(null);
    }
  }, []);

  const load = useCallback(async (preserveChainId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const [list, act] = await Promise.all([
        fetchCrashChains(40),
        fetchCrashChainActive(),
      ]);
      setRows(list);
      setActive(act);

      const nextSel =
        preserveChainId != null &&
        list.some((r) => r.chainId === preserveChainId)
          ? preserveChainId
          : act?.chainId ??
            list.find((r) => r.needsClientSeed)?.chainId ??
            list[0]?.chainId ??
            null;
      setSelectedChainId(nextSel);
      if (nextSel) {
        const d = await fetchCrashChainById(nextSel);
        setDetail(d);
        setClientSeedInput(d.clientSeed ?? "");
      } else {
        setDetail(null);
        setClientSeedInput("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chains");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!active?.chainId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    void fetchCrashChainStatistics()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [active?.chainId, statsTick]);

  async function applyClientSeed() {
    if (!detail) return;
    const seed = clientSeedInput.trim();
    if (!HEX64.test(seed)) {
      setError("Client seed must be exactly 64 hexadecimal characters (Bitcoin block hash).");
      return;
    }
    setBusy(true);
    setActionMsg(null);
    setError(null);
    try {
      const d = await patchCrashChainClientSeed(detail.chainId, seed);
      setDetail(d);
      setActionMsg(
        "Client seed set and chain activated (same as setup-crash-chain option 3). Restart the Crash WebSocket service so it loads the active chain.",
      );
      await load(detail.chainId);
      setStatsTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function runPrecalculate() {
    const n = parseInt(precalcCount.replace(/\s/g, ""), 10);
    if (!Number.isFinite(n) || n < 1) {
      setError("Enter a positive number of rounds to pre-calculate.");
      return;
    }
    setBusy(true);
    setActionMsg(null);
    setError(null);
    try {
      const res = await postPrecalculateCrashRounds(n);
      setActionMsg(
        `Pre-calculated rounds ${res.startRound}–${res.endRound} (${res.inserted} rows inserted, duplicates skipped).`,
      );
      await load(selectedChainId);
      setStatsTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pre-calculate failed");
    } finally {
      setBusy(false);
    }
  }

  async function createChain() {
    setBusy(true);
    setActionMsg(null);
    setError(null);
    try {
      const body =
        createMode === "production"
          ? { preset: "production" as const }
          : createMode === "test"
            ? { preset: "test" as const }
            : (() => {
                const rounds = parseInt(customRounds.replace(/\s/g, ""), 10);
                return Number.isFinite(rounds)
                  ? { totalRounds: rounds }
                  : { preset: "test" as const };
              })();

      const res = await postCreateCrashChain(body);
      setDetail(res.chain);
      setSelectedChainId(res.chain.chainId);
      setClientSeedInput("");
      setActionMsg(res.notice);
      await load(res.chain.chainId);
      setConfirmCreate(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed";
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  const createDescription =
    createMode === "production"
      ? "Runs calculateFinalHash for 10,000,000 iterations (may take several minutes). Row is created inactive until you set a 64 hex block hash."
      : createMode === "test"
        ? "10,000 rounds (fast). Chain is inactive until client seed is set — same as the CLI test option."
        : "Custom totalRounds (1–10,000,000). Inactive until client seed is set.";

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Provably fair hash chain
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          Behavior matches{" "}
          <span className="font-mono text-zinc-400">
            BloxBlitz_Amp/api/scripts/setup-crash-chain.ts
          </span>
          :{" "}
          <span className="font-mono text-zinc-400">
            randomBytes(32)
          </span>{" "}
          server seed,{" "}
          <span className="font-mono text-zinc-400">
            randomBytes(16)
          </span>{" "}
          chain id,{" "}
          <span className="font-mono text-zinc-400">calculateFinalHash</span>
          , new rows start{" "}
          <span className="font-mono text-zinc-400">isActive: false</span>.
          Setting a 64-char hex Bitcoin block hash deactivates other chains,
          sets{" "}
          <span className="font-mono text-zinc-400">clientSeed</span>, and
          activates this chain. Pre-calculate uses the same batch loop as the
          script.
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {actionMsg ? (
        <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {actionMsg}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading chain data…</p>
      ) : (
        <>
          <CrashCard
            title="Selected chain"
            subtitle={
              detail
                ? `${detail.chainId} — round ${detail.currentRound} / ${detail.totalRounds}${detail.isActive ? " · active" : " · inactive"}`
                : "Select a row below"
            }
          >
            {detail ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Chain ID">
                  <Mono>{detail.chainId}</Mono>
                </Field>
                <Field label="Status">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                      detail.isActive
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                        : "border-zinc-600 bg-zinc-900 text-zinc-400",
                    )}
                  >
                    {detail.isActive ? "Active" : "Inactive"}
                  </span>
                </Field>
                <Field label="Needs client seed (CLI menu 3)">
                  <span
                    className={
                      detail.needsClientSeed ? "text-amber-300" : "text-zinc-500"
                    }
                  >
                    {detail.needsClientSeed ? "Yes — set 64 hex block hash" : "No"}
                  </span>
                </Field>
                <Field label="Final hash (commitment)">
                  <Mono>{detail.finalHash}</Mono>
                </Field>
                <Field label="Server seed (32 bytes hex, sensitive)">
                  <Mono>{detail.serverSeed}</Mono>
                </Field>
                <Field label="Client seed (Bitcoin block hash)">
                  <Mono>{detail.clientSeed ?? "— not set —"}</Mono>
                </Field>
                <Field label="Pre-calculated CrashRound rows">
                  <span className="text-zinc-200">
                    {detail.precalculatedRounds}
                  </span>
                </Field>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No chain selected.</p>
            )}
          </CrashCard>

          {detail?.needsClientSeed ? (
            <CrashCard
              title="Set client seed & activate"
              subtitle="Only allowed while clientSeed is null. Deactivates every other CRASH chain, then activates this row."
            >
              <div className="flex flex-col gap-4 sm:max-w-xl">
                <CrashInputField
                  id="crash-client-seed"
                  label="Block hash (64 hex)"
                  value={clientSeedInput}
                  onChange={setClientSeedInput}
                  hint={`Example (block 584,500 test hash): ${CRASH_SETUP_DEFAULT_BLOCK_HASH.slice(0, 18)}…`}
                />
                <CrashButton
                  variant="primary"
                  disabled={
                    busy ||
                    !HEX64.test(clientSeedInput.trim())
                  }
                  onClick={() => void applyClientSeed()}
                >
                  Set client seed and activate
                </CrashButton>
              </div>
            </CrashCard>
          ) : null}

          {detail?.isActive && detail.clientSeed ? (
            <CrashCard
              title="Pre-calculate crash points"
              subtitle="Same as script option 6: batches of 1000, skipDuplicates, from currentRound+1."
            >
              <div className="flex max-w-md flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <CrashInputField
                    id="crash-precalc-count"
                    label="Rounds to pre-calculate"
                    value={precalcCount}
                    onChange={setPrecalcCount}
                    hint="Uses the games’ HMAC + house-edge formula from the script."
                  />
                </div>
                <CrashButton
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void runPrecalculate()}
                >
                  Run
                </CrashButton>
              </div>
            </CrashCard>
          ) : null}

          {active && stats ? (
            <CrashCard
              title="Chain statistics"
              subtitle="From finished CrashRound rows on the active chain (script option 7 style)."
            >
              <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2 lg:grid-cols-3">
                <p>Total games: {stats.total.toLocaleString()}</p>
                <p>Average: {stats.average.toFixed(4)}x</p>
                <p>Median: {stats.median.toFixed(2)}x</p>
                <p>Std dev: {stats.stdDev.toFixed(4)}</p>
                <p>Min: {stats.min.toFixed(2)}x</p>
                <p>Max: {stats.max.toFixed(2)}x</p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                      <th className="pb-2 font-medium">Range</th>
                      <th className="pb-2 font-medium">Count</th>
                      <th className="pb-2 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.distribution.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-zinc-800/80 text-zinc-400"
                      >
                        <td className="py-1.5">{row.label}</td>
                        <td className="py-1.5 tabular-nums">{row.count}</td>
                        <td className="py-1.5 tabular-nums">
                          {stats.total > 0
                            ? ((row.count / stats.total) * 100).toFixed(2)
                            : "0.00"}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CrashCard>
          ) : null}

          <CrashCard title="Create a new chain" subtitle={createDescription}>
            <div className="flex flex-col gap-4 sm:max-w-lg">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["test", "Test (10K)"],
                    ["production", "Production (10M)"],
                    ["custom", "Custom rounds"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setCreateMode(key as "test" | "production" | "custom")
                    }
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      createMode === key
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {createMode === "custom" ? (
                <CrashInputField
                  id="crash-custom-rounds"
                  label="Total rounds"
                  value={customRounds}
                  onChange={setCustomRounds}
                />
              ) : null}
              <CrashButton
                variant="warning"
                disabled={busy}
                onClick={() => setConfirmCreate(true)}
              >
                {createMode === "production"
                  ? "Generate production chain…"
                  : "Generate chain"}
              </CrashButton>
            </div>
          </CrashCard>

          <CrashCard title="Recent chains" subtitle="Click a row to inspect">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                    <th className="pb-2 pr-3 font-medium">Active</th>
                    <th className="pb-2 pr-3 font-medium">Pending seed</th>
                    <th className="pb-2 pr-3 font-medium">Chain ID</th>
                    <th className="pb-2 pr-3 font-medium">Round</th>
                    <th className="pb-2 pr-3 font-medium">Pre-calc</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => void selectChain(r.chainId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          void selectChain(r.chainId);
                      }}
                      className={cn(
                        "cursor-pointer border-b border-zinc-800/80 text-zinc-300 hover:bg-zinc-900/50",
                        selectedChainId === r.chainId && "bg-zinc-900/70",
                      )}
                    >
                      <td className="py-2 pr-3">
                        {r.isActive ? (
                          <span className="text-emerald-400">Yes</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {r.needsClientSeed ? (
                          <span className="text-amber-400/90">Yes</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {r.chainId}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {r.currentRound} / {r.totalRounds}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {r.precalculatedRounds}
                      </td>
                      <td className="py-2 text-xs text-zinc-500">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <CrashButton
                variant="secondary"
                onClick={() => void load(selectedChainId)}
              >
                Refresh
              </CrashButton>
            </div>
          </CrashCard>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmCreate}
        onClose={() => setConfirmCreate(false)}
        title={
          createMode === "production"
            ? "Generate production chain (10M)?"
            : "Generate new crash chain?"
        }
        description={
          createMode === "production"
            ? "This hashes the server seed 10 million times and can take several minutes. The row is created inactive (isActive: false) until you assign a 64 hex client seed."
            : "Creates an inactive HashChain row. You must set a Bitcoin block hash to activate it, then restart the Crash WS worker if needed."
        }
        confirmLabel="Create"
        variant="warning"
        onConfirm={() => void createChain()}
      />
    </div>
  );
}
