"use client";

import { RaceAdminShell } from "../../race/components/RaceAdminShell";
import { RewardCaseOpensSection } from "../sections/RewardCaseOpensSection";

export default function AdminRewardCaseOpensPage() {
  return (
    <RaceAdminShell title="Reward case opens">
      <RewardCaseOpensSection />
    </RaceAdminShell>
  );
}
