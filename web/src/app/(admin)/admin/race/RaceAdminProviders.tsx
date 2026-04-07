"use client";

import { RaceAdminProvider } from "./context/RaceAdminContext";
import type { ReactNode } from "react";

export function RaceAdminProviders({ children }: { children: ReactNode }) {
  return <RaceAdminProvider>{children}</RaceAdminProvider>;
}
