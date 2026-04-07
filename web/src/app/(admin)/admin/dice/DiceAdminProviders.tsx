"use client";

import { DiceAdminProvider } from "./context/DiceAdminContext";
import type { ReactNode } from "react";

export function DiceAdminProviders({ children }: { children: ReactNode }) {
  return <DiceAdminProvider>{children}</DiceAdminProvider>;
}
