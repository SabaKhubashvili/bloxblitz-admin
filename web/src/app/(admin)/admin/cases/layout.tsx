import type { Metadata } from "next";
import { CasesAdminProviders } from "./CasesAdminProviders";

export const metadata: Metadata = {
  title: "Cases Admin | Loot boxes",
  description:
    "Administer cases, rewards, limits, and analytics (frontend mock).",
};

export default function CasesAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CasesAdminProviders>{children}</CasesAdminProviders>;
}
