"use client";

import { Modal } from "@/components/ui/modal";
import type { CoinflipFraudRiskProfileResponse } from "@/lib/admin-api/coinflip-fraud";
import { FraudAdminActions } from "./FraudAdminActions";
import { FraudTierBadge } from "./FraudTierBadge";
import { useUserRiskProfile } from "../hooks/useUserRiskProfile";
import { cn } from "./cn";

export type UserRiskProfileModalProps = {
  username: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function UserRiskProfileModal({
  username,
  isOpen,
  onClose,
}: UserRiskProfileModalProps) {
  const profile = useUserRiskProfile(username, isOpen);

  const closeIfAllowed = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeIfAllowed}
      className="mx-4 max-h-[90vh] max-w-2xl overflow-hidden border border-zinc-800 bg-zinc-900"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6 pt-12">
        {!username ? (
          <p className="text-sm text-zinc-500">No user selected.</p>
        ) : profile.isPending ? (
          <p className="text-sm text-zinc-500">Loading profile…</p>
        ) : profile.isError ? (
          <div role="alert">
            <p className="text-sm font-medium text-rose-400">
              Could not load risk profile
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {profile.error instanceof Error
                ? profile.error.message
                : "Request failed — user may have been cleared or network error."}
            </p>
          </div>
        ) : profile.data ? (
          <ProfileBody data={profile.data} username={username} />
        ) : null}
      </div>
    </Modal>
  );
}

function ProfileBody({
  data,
  username,
}: {
  data: CoinflipFraudRiskProfileResponse;
  username: string;
}) {
  const high =
    data.riskScore >= 50 ||
    data.tier.toLowerCase() === "critical" ||
    data.tier.toLowerCase() === "limited";

  return (
    <div className="space-y-6">
      <header
        className={cn(
          "rounded-xl border p-4",
          high
            ? "border-rose-500/40 bg-rose-950/20"
            : "border-zinc-800 bg-zinc-950/40"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-lg text-zinc-100">{data.username}</h3>
          <FraudTierBadge tier={data.tier} />
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Risk score (0–100)</dt>
            <dd className="font-mono text-zinc-100">{data.riskScore}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Confidence</dt>
            <dd className="font-mono text-zinc-100">{data.confidence}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Temporary score</dt>
            <dd className="font-mono text-zinc-100">{data.temporaryScore}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Persistent score</dt>
            <dd className="font-mono text-zinc-100">{data.persistentScore}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">EV ratio (payout / exp win share)</dt>
            <dd className="font-mono text-zinc-100">{data.evRatio}</dd>
          </div>
        </dl>
      </header>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Triggered rules
        </h4>
        {data.reasons.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">None recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {data.reasons.map((r) => (
              <li
                key={r}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 font-mono text-xs text-zinc-300"
              >
                {r}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Rolling stats
        </h4>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <Row k="Games" v={String(data.stats.games)} />
          <Row k="W / L" v={`${data.stats.wins} / ${data.stats.losses}`} />
          <Row k="Win rate" v={String(data.stats.winRate)} />
          <Row k="Wagered" v={String(data.stats.wagered)} />
          <Row k="Payout total" v={String(data.stats.payoutTotal)} />
          <Row k="Exp. win share" v={String(data.stats.expWinShare)} />
          <Row k="Expected net (cents)" v={String(data.stats.expectedNetCents)} />
          <Row k="Actual net (cents)" v={String(data.stats.actualNetCents)} />
        </dl>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Top opponents
        </h4>
        {data.topOpponents.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">No opponent frequency data.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {data.topOpponents.map((o) => (
              <li key={o.opponent} className="flex justify-between gap-4">
                <span className="font-mono text-zinc-200">{o.opponent}</span>
                <span className="text-zinc-500">{o.count} games</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Mitigation (Redis hash)
        </h4>
        {!data.mitigation || Object.keys(data.mitigation).length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">No mitigation record.</p>
        ) : (
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
            {JSON.stringify(data.mitigation, null, 2)}
          </pre>
        )}
      </section>

      <section className="border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Actions
        </h4>
        <FraudAdminActions username={username} className="mt-2" />
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-zinc-800/80 py-1">
      <dt className="text-zinc-500">{k}</dt>
      <dd className="font-mono text-right text-zinc-200">{v}</dd>
    </div>
  );
}
