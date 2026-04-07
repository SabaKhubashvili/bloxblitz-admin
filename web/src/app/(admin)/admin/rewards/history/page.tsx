"use client";

import { RaceAdminShell } from "../../race/components/RaceAdminShell";
import { RewardsHistorySection } from "../sections/RewardsHistorySection";

export default function AdminRewardsHistoryPage() {
  return (
    <RaceAdminShell title="Reward history">
      <RewardsHistorySection />
    </RaceAdminShell>
  );
}
