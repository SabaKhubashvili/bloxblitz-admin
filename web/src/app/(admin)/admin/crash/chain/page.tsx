"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Link from "next/link";
import { CrashChainSection } from "../sections/CrashChainSection";

export default function CrashChainAdminPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Crash · Chain" />

      <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <header className="mb-8 flex flex-col gap-2 border-b border-gray-200 pb-6 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-500/90">
              Operations
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90 md:text-3xl">
              Crash hash chain
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Manage the{" "}
              <span className="font-mono text-gray-600 dark:text-zinc-400">
                HashChain
              </span>{" "}
              row used for provably fair rounds: commitment, server seed, and
              client seed. For analytics and charts, use{" "}
              <Link
                href="/admin/crash"
                className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
              >
                Crash overview
              </Link>
              .
            </p>
          </div>
        </header>

        <CrashChainSection />
      </div>
    </div>
  );
}
