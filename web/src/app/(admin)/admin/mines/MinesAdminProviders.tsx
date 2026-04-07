"use client";

import { MinesAdminProvider } from "./context/MinesAdminContext";
import type { ReactNode } from "react";

export function MinesAdminProviders({ children }: { children: ReactNode }) {
  return <MinesAdminProvider>{children}</MinesAdminProvider>;
}
