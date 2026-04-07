"use client";

import { RaceAdminShell } from "../race/components/RaceAdminShell";
import { UsersManagementSection } from "./sections/UsersManagementSection";

export default function AdminUsersPage() {
  return (
    <RaceAdminShell title="Users management">
      <UsersManagementSection />
    </RaceAdminShell>
  );
}
