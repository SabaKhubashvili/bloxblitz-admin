"use client";

import { PanelCard } from "../../dice/components/PanelCard";
import { useRouletteOperatorState } from "../hooks/useRouletteOperatorState";

export function OperatorSection() {
  const { data, loading, isError, errorMessage, reload } =
    useRouletteOperatorState();

  const json =
    data?.state != null
      ? JSON.stringify(data.state, null, 2)
      : null;

  return (
    <section id="operator" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Operator controls</h2>
        <p className="text-sm text-zinc-500">
          Live snapshot from Redis key <code className="text-zinc-400">roulette:state</code>{" "}
          (same process as the WebSocket game server). Start/stop and forced outcomes are
          not exposed by the current backend; this panel is for monitoring only.
        </p>
      </div>

      {isError ? (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {errorMessage ?? "Could not read operator state."}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard
          title="Round monitor"
          subtitle={data?.available ? "Live state available" : "No state in Redis"}
        >
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                Last fetch: {data?.fetchedAt ?? "—"}
              </p>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs text-zinc-300">
                {json ?? "No JSON state (key empty or Redis unavailable)."}
              </pre>
              <button
                type="button"
                onClick={() => void reload()}
                className="mt-3 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
              >
                Refresh now
              </button>
            </>
          )}
        </PanelCard>

        <PanelCard
          title="Actions"
          subtitle="Reserved for future server support"
        >
          <p className="text-sm text-zinc-400">
            Pausing rounds, forcing outcomes, or draining pools would require new
            RPC or Redis commands in the WebSocket service. Until then, these controls
            stay disabled to avoid misleading operators.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-500"
            >
              Pause rounds
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-500"
            >
              Force outcome
            </button>
          </div>
        </PanelCard>
      </div>
    </section>
  );
}
