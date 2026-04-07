"use client";

import { RaceAdminShell } from "../race/components/RaceAdminShell";
import { RewardsOverviewSection } from "./sections/RewardsOverviewSection";

export default function AdminRewardsOverviewPage() {
  return (
    <RaceAdminShell title="Rewards overview">
      <RewardsOverviewSection />
    </RaceAdminShell>
  );
}
