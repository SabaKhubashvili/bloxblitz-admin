import type { Metadata } from "next";
import { DiceAdminProviders } from "./DiceAdminProviders";

export const metadata: Metadata = {
  title: "Dice Admin | Provably fair dice",
  description:
    "Dice game administration — live overview analytics, config, risk, and audits.",
};

export default function DiceAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DiceAdminProviders>{children}</DiceAdminProviders>;
}
