"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { ReactNode } from "react";

export function RaceAdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <PageBreadcrumb pageTitle={title} />
      <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {children}
      </div>
    </div>
  );
}
