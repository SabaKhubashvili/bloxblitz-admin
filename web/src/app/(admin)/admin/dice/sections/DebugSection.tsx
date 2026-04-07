"use client";

import { InputField } from "../components/InputField";
import { PanelCard } from "../components/PanelCard";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { useDiceAdmin } from "../context/DiceAdminContext";
import {
  randomHistoryRow,
  randomLiveRoll,
  settleRoll,
} from "../mock/data";
import { useEffect, useState } from "react";

export function DebugSection() {
  const { dispatch, liveRolls } = useDiceAdmin();
  const [forceResult, setForceResult] = useState("50.00");
  const [autoRoll, setAutoRoll] = useState(false);

  useEffect(() => {
    if (!autoRoll) return;
    const id = window.setInterval(() => {
      dispatch({ type: "ADD_LIVE", roll: randomLiveRoll(Date.now()) });
    }, 1400);
    return () => window.clearInterval(id);
  }, [autoRoll, dispatch]);

  if (process.env.NODE_ENV !== "development") return null;

  const applyForce = () => {
    const v = Number(forceResult);
    if (Number.isNaN(v) || v < 0 || v > 100) return;
    const rolling = liveRolls.find((r) => r.won === null);
    if (!rolling) return;
    dispatch({
      type: "SET_LIVE",
      rolls: liveRolls.map((r) =>
        r.id === rolling.id ? settleRoll(r, v) : r
      ),
    });
  };

  return (
    <section id="debug" className="scroll-mt-28 space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-amber-500">
          Development only
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">Debug panel</h2>
        <p className="text-sm text-zinc-500">
          Spawn rolls, force outcomes, stress the feed — no server calls.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Simulate" subtitle="Push mock entities">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "ADD_LIVE", roll: randomLiveRoll(Date.now()) })
              }
              className="rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
            >
              Simulate dice roll
            </button>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "ADD_HISTORY", row: randomHistoryRow() })
              }
              className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Append history row
            </button>
          </div>
        </PanelCard>

        <PanelCard title="Force result" subtitle="First rolling item only">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <InputField
                id="dbg-force"
                label="Roll value (0–100)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={forceResult}
                onChange={setForceResult}
              />
            </div>
            <button
              type="button"
              onClick={applyForce}
              className="h-11 shrink-0 rounded-xl bg-amber-600/90 px-4 text-sm font-semibold text-zinc-950 hover:bg-amber-500"
            >
              Apply
            </button>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Auto-roll" subtitle="Interval spam (dev)">
        <ToggleSwitch
          id="dbg-auto"
          label="Auto-roll simulation"
          description="Adds a new live roll every ~1.4s."
          checked={autoRoll}
          onChange={setAutoRoll}
        />
      </PanelCard>
    </section>
  );
}
