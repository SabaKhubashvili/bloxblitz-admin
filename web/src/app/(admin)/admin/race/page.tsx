"use client";

import { RaceAdminShell } from "./components/RaceAdminShell";
import { RaceOverviewSection } from "./sections/RaceOverviewSection";

export default function RaceOverviewPage() {
  return (
    <RaceAdminShell title="Race overview">
      <RaceOverviewSection />
    </RaceAdminShell>
  );
}
