import { adminApiFetch } from "@/lib/admin-api/server-fetch";
import { CasesAdminDashboard } from "./components/CasesAdminDashboard";
import type { CasesOverviewStats } from "./mock/types";

export default async function CasesAdminPage() {
  let initialCasesOverview: CasesOverviewStats | null = null;
  try {
    const res = await adminApiFetch("/admin/cases/overview?range=24h");
    if (res.ok) {
      initialCasesOverview = (await res.json()) as CasesOverviewStats;
    }
  } catch {
    initialCasesOverview = null;
  }

  return (
    <CasesAdminDashboard initialCasesOverview={initialCasesOverview} />
  );
}
