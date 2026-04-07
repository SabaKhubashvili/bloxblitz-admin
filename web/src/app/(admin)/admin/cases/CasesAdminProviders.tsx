"use client";

import { CasesAdminProvider } from "./context/CasesAdminContext";
import type { ReactNode } from "react";

export function CasesAdminProviders({ children }: { children: ReactNode }) {
  return <CasesAdminProvider>{children}</CasesAdminProvider>;
}
