import { CasesAdminDashboard } from "../components/CasesAdminDashboard";

export default async function CasesCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return <CasesAdminDashboard initialCaseId={caseId} />;
}
