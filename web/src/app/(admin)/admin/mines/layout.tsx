import type { Metadata } from "next";
import { MinesAdminProviders } from "./MinesAdminProviders";

export const metadata: Metadata = {
  title: "Mines Admin | Grid game",
  description:
    "Mines game administration — config, live boards, analytics (mock).",
};

export default function MinesAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MinesAdminProviders>{children}</MinesAdminProviders>;
}
