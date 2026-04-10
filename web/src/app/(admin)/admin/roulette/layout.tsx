import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roulette Admin | BloxBlitz",
  description:
    "Roulette administration — analytics, recent bets, configuration, and operator monitor.",
};

export default function RouletteAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
