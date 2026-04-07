"use client";

import { ChartContainer } from "../components/ChartContainer";
import { PanelCard } from "../components/PanelCard";
import { TimeRangeToggle } from "../components/TimeRangeToggle";
import { useDiceAnalyticsDetail } from "../hooks/useDiceAnalyticsDetail";
import type { TimeRange } from "../mock/types";
import type { ApexOptions } from "apexcharts";
import {
  useDeferredValue,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { cn } from "../components/cn";
import { isAxiosError } from "axios";

function heatColor(v: number, max: number) {
  const t = max > 0 ? v / max : 0;
  const alpha = 0.15 + t * 0.85;
  return `rgba(56, 189, 248, ${alpha})`;
}

function parseOptionalPositiveFloat(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function errorText(err: unknown): string {
  if (isAxiosError(err) && err.response?.data && typeof err.response.data === "object") {
    const o = err.response.data as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.map(String).join(", ");
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

const EMPTY_GRID = (): number[][] =>
  Array.from({ length: 10 }, () => Array(10).fill(0));

export function AnalyticsSection({
  range,
  onRangeChange,
}: {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}) {
  const [playerInput, setPlayerInput] = useState("");
  const [minBetInput, setMinBetInput] = useState("");
  const [maxBetInput, setMaxBetInput] = useState("");
  const deferredPlayer = useDeferredValue(playerInput.trim());
  const deferredMin = useDeferredValue(minBetInput);
  const deferredMax = useDeferredValue(maxBetInput);

  const queryFilters = useMemo(() => {
    const minBet = parseOptionalPositiveFloat(deferredMin);
    const maxBet = parseOptionalPositiveFloat(deferredMax);
    return {
      player: deferredPlayer || undefined,
      minBet,
      maxBet,
    };
  }, [deferredPlayer, deferredMin, deferredMax]);

  const { heatmap, targetRanges, scatter, risk } = useDiceAnalyticsDetail(
    range,
    queryFilters,
  );

  const grid = heatmap.data?.heatmap ?? EMPTY_GRID();
  const maxHeat = useMemo(() => Math.max(...grid.flat(), 1), [grid]);

  const ranges = targetRanges.data?.ranges ?? [];

  const scatterLow = scatter.data?.low ?? [];
  const scatterHigh = scatter.data?.high ?? [];

  const scatterYBounds = useMemo(() => {
    const ys = [...scatterLow, ...scatterHigh].map((p) => p[1]);
    if (!ys.length) return { min: 25, max: 75 };
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const pad = Math.max(3, (hi - lo) * 0.12);
    return {
      min: Math.max(0, Math.floor(lo - pad)),
      max: Math.min(100, Math.ceil(hi + pad)),
    };
  }, [scatterLow, scatterHigh]);

  const scatterOpts: ApexOptions = useMemo(
    () => ({
      colors: ["#34d399", "#f87171"],
      chart: { animations: { enabled: true } },
      xaxis: {
        title: { text: "Bet size ($)", style: { color: "#71717a" } },
        labels: { style: { colors: "#71717a" } },
      },
      yaxis: {
        title: { text: "Win rate %", style: { color: "#71717a" } },
        min: scatterYBounds.min,
        max: scatterYBounds.max,
        labels: { style: { colors: "#71717a" } },
      },
      legend: { show: true, labels: { colors: "#a1a1aa" } },
    }),
    [scatterYBounds.min, scatterYBounds.max],
  );

  const lineRiskOpts: ApexOptions = {
    colors: ["#38bdf8", "#a78bfa"],
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: ["$0-50", "$50-150", "$150-400", "$400+"],
    },
    legend: { show: true, labels: { colors: "#a1a1aa" } },
  };

  const winLow = risk.data?.winRateByStake.low ?? [0, 0, 0, 0];
  const winHigh = risk.data?.winRateByStake.high ?? [0, 0, 0, 0];
  const riskCounts = risk.data?.riskCounts ?? {
    low: 0,
    medium: 0,
    high: 0,
  };
  const avgWinMultiplier = risk.data?.avgWinMultiplier ?? 0;

  const anyError =
    heatmap.isError ||
    targetRanges.isError ||
    scatter.isError ||
    risk.isError;
  const firstError = heatmap.error ?? targetRanges.error ?? scatter.error ?? risk.error;

  const onPlayer = (e: ChangeEvent<HTMLInputElement>) =>
    setPlayerInput(e.target.value);

  return (
    <section id="analytics" className="scroll-mt-28 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Advanced analytics
          </h2>
          <p className="text-sm text-zinc-500">
            Heatmap, target mix, scatter, and risk curves from{" "}
            <code className="text-zinc-400">DiceBet</code> + Redis-backed
            aggregates.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <TimeRangeToggle value={range} onChange={onRangeChange} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <label className="flex items-center gap-1.5">
              <span className="text-zinc-400">Player</span>
              <input
                value={playerInput}
                onChange={onPlayer}
                placeholder="username"
                className="w-36 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-zinc-400">Min bet</span>
              <input
                value={minBetInput}
                onChange={(e) => setMinBetInput(e.target.value)}
                inputMode="decimal"
                placeholder="any"
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-zinc-400">Max bet</span>
              <input
                value={maxBetInput}
                onChange={(e) => setMaxBetInput(e.target.value)}
                inputMode="decimal"
                placeholder="any"
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
          </div>
        </div>
      </div>

      {anyError ? (
        <p className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {errorText(firstError)}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <PanelCard title="Avg multiplier" subtitle="Winning rolls in range">
          {risk.isPending ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <>
              <p className="font-mono text-3xl font-semibold text-sky-300">
                {avgWinMultiplier > 0 ? `${avgWinMultiplier.toFixed(2)}×` : "—"}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Mean <code className="text-zinc-400">multiplier</code> where
                profit &gt; 0.
              </p>
            </>
          )}
        </PanelCard>
        <PanelCard
          title="Target ranges"
          subtitle="% of bets by chance / target (10% buckets)"
          className="lg:col-span-2"
        >
          {targetRanges.isPending ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-5">
              {ranges.map((t) => (
                <div
                  key={t.range}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                >
                  <p className="text-xs text-zinc-500">{t.range}</p>
                  <p className="font-mono text-lg text-zinc-100">{t.pct}%</p>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard
        title="Roll density heatmap"
        subtitle="10×10 grid — outcome indices 0–99 (row×10+col)"
      >
        {heatmap.isPending ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {grid.map((row, ri) =>
                row.map((cell, ci) => (
                  <div
                    key={`${ri}-${ci}`}
                    title={`~${ri * 10 + ci}`}
                    className="aspect-square rounded-md border border-zinc-800/80 text-[0.55rem] font-mono text-zinc-300/80 sm:text-[0.65rem]"
                    style={{ backgroundColor: heatColor(cell, maxHeat) }}
                  />
                )),
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>0</span>
              <span>Outcome index →</span>
              <span>99</span>
            </div>
          </>
        )}
      </PanelCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer
          title="Win rate vs bet size"
          subtitle="Bucketed win rate — low (&lt;150) vs high stakes"
          kind="scatter"
          height={300}
          loading={scatter.isPending}
          series={[
            { name: "Low / mid stakes", data: scatterLow },
            { name: "High stakes", data: scatterHigh },
          ]}
          options={scatterOpts}
        />
        <ChartContainer
          title="Risk posture"
          subtitle="Win rate by stake bucket — safer vs riskier players (avg chance)"
          kind="line"
          height={300}
          loading={risk.isPending}
          series={[
            {
              name: "Low-risk style (avg chance ≥50%)",
              data: winLow,
            },
            {
              name: "High-risk style (avg chance &lt;35%)",
              data: winHigh,
            },
          ]}
          options={lineRiskOpts}
        />
      </div>

      <PanelCard
        title="Player risk profiles"
        subtitle="Distinct players by average target chance in range"
      >
        {risk.isPending ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["low", riskCounts.low, "text-emerald-400"],
                ["medium", riskCounts.medium, "text-amber-400"],
                ["high", riskCounts.high, "text-rose-400"],
              ] as const
            ).map(([k, n, cls]) => (
              <div
                key={k}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3"
              >
                <p className="text-xs uppercase text-zinc-500">{k}</p>
                <p className={cn("mt-1 font-mono text-2xl font-semibold", cls)}>
                  {n}
                </p>
                <p className="mt-1 text-[0.65rem] text-zinc-600">
                  {k === "low"
                    ? "avg chance ≥ 50%"
                    : k === "medium"
                      ? "30% ≤ avg &lt; 50%"
                      : "avg chance &lt; 30%"}
                </p>
              </div>
            ))}
          </div>
        )}
      </PanelCard>
    </section>
  );
}
