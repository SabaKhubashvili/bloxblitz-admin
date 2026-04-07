"use client";

import { CoinflipInputField } from "../components/CoinflipInputField";
import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { CoinflipToggle } from "../components/CoinflipToggle";
import { useCoinflipAdmin } from "../context/CoinflipAdminContext";

export function RiskSection() {
  const { risk, setRisk } = useCoinflipAdmin();

  return (
    <section id="risk" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Risk & limits
        </h2>
        <p className="text-sm text-zinc-500">
          Per-user and pot ceilings (mock enforcement).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CoinflipPanelCard title="Numeric caps">
          <div className="grid gap-4">
            <CoinflipInputField
              id="risk-max-wager"
              label="Max wager per user"
              type="number"
              value={risk.maxWagerPerUser}
              onChange={(v) =>
                setRisk({ maxWagerPerUser: Math.max(0, Number(v) || 0) })
              }
              min="0"
            />
            <CoinflipInputField
              id="risk-daily"
              label="Max daily wager per user"
              type="number"
              value={risk.maxDailyWagerPerUser}
              onChange={(v) =>
                setRisk({
                  maxDailyWagerPerUser: Math.max(0, Number(v) || 0),
                })
              }
              min="0"
            />
            <CoinflipInputField
              id="risk-pot"
              label="Max pot size"
              type="number"
              value={risk.maxPotSize}
              onChange={(v) =>
                setRisk({ maxPotSize: Math.max(0, Number(v) || 0) })
              }
              min="0"
            />
            <CoinflipInputField
              id="risk-concurrent"
              label="Max concurrent games per user"
              type="number"
              value={risk.maxConcurrentGamesPerUser}
              onChange={(v) =>
                setRisk({
                  maxConcurrentGamesPerUser: Math.max(
                    1,
                    Number(v) || 0
                  ),
                })
              }
              min="1"
            />
          </div>
        </CoinflipPanelCard>
        <CoinflipPanelCard title="Automation">
          <div className="space-y-3">
            <CoinflipToggle
              label="Auto-cancel suspicious games"
              checked={risk.autoCancelSuspicious}
              onChange={(v) => setRisk({ autoCancelSuspicious: v })}
            />
            <CoinflipToggle
              label="Anti-abuse checks"
              checked={risk.antiAbuseEnabled}
              onChange={(v) => setRisk({ antiAbuseEnabled: v })}
            />
          </div>
        </CoinflipPanelCard>
      </div>
    </section>
  );
}
