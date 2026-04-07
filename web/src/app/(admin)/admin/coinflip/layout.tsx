import type { Metadata } from "next";
import { CoinflipAdminProviders } from "./CoinflipAdminProviders";

export const metadata: Metadata = {
  title: "Coinflip Admin | 1v1",
  description:
    "Coinflip PvP administration — games, limits, disputes (frontend mock).",
};

export default function CoinflipAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CoinflipAdminProviders>{children}</CoinflipAdminProviders>;
}
