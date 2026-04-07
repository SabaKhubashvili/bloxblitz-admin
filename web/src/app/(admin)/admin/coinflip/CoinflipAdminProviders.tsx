"use client";

import { CoinflipAdminProvider } from "./context/CoinflipAdminContext";
import type { ReactNode } from "react";

export function CoinflipAdminProviders({ children }: { children: ReactNode }) {
  return <CoinflipAdminProvider>{children}</CoinflipAdminProvider>;
}
