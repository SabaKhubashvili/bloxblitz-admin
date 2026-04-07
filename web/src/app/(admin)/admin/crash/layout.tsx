import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crash Admin | Operations",
  description:
    "Crash admin — overview and statistics, hash chain management, and operator controls.",
};

export default function CrashAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
