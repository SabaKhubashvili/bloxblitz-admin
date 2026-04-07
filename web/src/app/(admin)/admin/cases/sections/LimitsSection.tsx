"use client";

import { CaseInputField } from "../components/CaseInputField";
import { CaseToggleSwitch } from "../components/CaseToggleSwitch";
import { CasesPanelCard } from "../components/CasesPanelCard";
import { useCasesAdmin } from "../context/CasesAdminContext";

export function LimitsSection() {
  const { limits, setLimits } = useCasesAdmin();

  return (
    <section id="limits" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Limits & restrictions
        </h2>
        <p className="text-sm text-zinc-500">
          Global rules for how often cases may be opened (mock state).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CasesPanelCard title="Toggles">
          <div className="space-y-3">
            <CaseToggleSwitch
              label="Enable limits"
              checked={limits.limitsEnabled}
              onChange={(v) => setLimits({ limitsEnabled: v })}
            />
            <CaseToggleSwitch
              label="Enable cooldown between opens"
              checked={limits.cooldownEnabled}
              onChange={(v) => setLimits({ cooldownEnabled: v })}
            />
          </div>
        </CasesPanelCard>

        <CasesPanelCard
          title="Values"
          subtitle="Must be non-negative when you connect a backend"
        >
          <div className="grid gap-4">
            <CaseInputField
              id="max-user-day"
              label="Max opens per user / day"
              type="number"
              value={limits.maxOpensPerUserDay}
              onChange={(v) =>
                setLimits({ maxOpensPerUserDay: Math.max(0, Number(v) || 0) })
              }
              min="0"
            />
            <CaseInputField
              id="max-global"
              label="Max total opens (global)"
              type="number"
              value={limits.maxTotalOpensGlobal}
              onChange={(v) =>
                setLimits({
                  maxTotalOpensGlobal: Math.max(0, Number(v) || 0),
                })
              }
              min="0"
            />
            <CaseInputField
              id="cooldown"
              label="Cooldown (seconds)"
              type="number"
              value={limits.cooldownSeconds}
              onChange={(v) =>
                setLimits({
                  cooldownSeconds: Math.max(0, Number(v) || 0),
                })
              }
              min="0"
            />
          </div>
        </CasesPanelCard>
      </div>
    </section>
  );
}
