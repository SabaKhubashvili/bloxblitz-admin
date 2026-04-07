import type { Metadata } from "next";
import { RaceAdminProviders } from "./RaceAdminProviders";

export const metadata: Metadata = {
  title: "Race Admin | Leaderboard races",
  description: "Create and manage wagering races — mock admin UI.",
};

export default function RaceAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RaceAdminProviders>{children}</RaceAdminProviders>;
}
