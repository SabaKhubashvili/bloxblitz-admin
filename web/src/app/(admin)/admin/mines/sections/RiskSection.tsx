"use client";

import { MinesInputField } from "../components/MinesInputField";
import { MinesPanelCard } from "../components/MinesPanelCard";
import { MinesToggle } from "../components/MinesToggle";
import { useMinesAdmin } from "../context/MinesAdminContext";

export function RiskSection() {
  const { risk, setRisk } = useMinesAdmin();

  return (
    <section id="risk" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Risk & limits</h2>
        <p className="text-sm text-zinc-500">
          Per-user exposure caps (UI validation only).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MinesPanelCard title="Caps">
          <div className="grid gap-4">
            <MinesInputField
              id="mx-wager"
              label="Max wager / user"
              type="number"
              value={risk.maxWagerPerUser}
              onChange={(v) =>
                setRisk({ maxWagerPerUser: Math.max(0, Number(v) || 0) })
              }
              min="0"
            />
            <MinesInputField
              id="mx-loss"
              label="Max loss / user"
              type="number"
              value={risk.maxLossPerUser}
              onChange={(v) =>
                setRisk({ maxLossPerUser: Math.max(0, Number(v) || 0) })
              }
              min="0"
            />
            <MinesInputField
              id="mx-profit"
              label="Max profit / user"
              type="number"
              value={risk.maxProfitPerUser}
              onChange={(v) =>
                setRisk({ maxProfitPerUser: Math.max(0, Number(v) || 0) })
              }
              min="0"
            />
            <MinesInputField
              id="mx-conc"
              label="Max concurrent games / user"
              type="number"
              value={risk.maxConcurrentGames}
              onChange={(v) =>
                setRisk({
                  maxConcurrentGames: Math.max(1, Number(v) || 1),
                })
              }
              min="1"
            />
          </div>
        </MinesPanelCard>
        <MinesPanelCard title="Automation">
          <div className="space-y-3">
            <MinesToggle
              label="Enable auto-stop system"
              checked={risk.autoStopEnabled}
              onChange={(v) => setRisk({ autoStopEnabled: v })}
            />
            <MinesToggle
              label="Cooldown after big wins"
              checked={risk.cooldownAfterBigWins}
              onChange={(v) => setRisk({ cooldownAfterBigWins: v })}
            />
          </div>
        </MinesPanelCard>
      </div>
    </section>
  );
}
