"use client";

import { RaceAdminShell } from "../../race/components/RaceAdminShell";
import { UserKeysSection } from "./sections/UserKeysSection";

export default function AdminUserKeysPage() {
  return (
    <RaceAdminShell title="User reward keys">
      <UserKeysSection />
    </RaceAdminShell>
  );
}
