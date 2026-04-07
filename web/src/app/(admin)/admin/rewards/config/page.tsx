"use client";

import { RaceAdminShell } from "../../race/components/RaceAdminShell";
import { RewardsConfigSection } from "../sections/RewardsConfigSection";

export default function AdminRewardsConfigPage() {
  return (
    <RaceAdminShell title="Reward configuration">
      <RewardsConfigSection />
    </RaceAdminShell>
  );
}
