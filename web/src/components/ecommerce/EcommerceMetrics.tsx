"use client";
import {
  adminUsersCountQueryKey,
  fetchAdminUsersCount,
} from "@/lib/queries/admin-users";
import {
  fetchWagering24h,
  formatTotalStakeUsd,
  wagering24hQueryKey,
} from "@/lib/queries/wagering-analytics";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { DollarLineIcon, GroupIcon } from "@/icons";

export const EcommerceMetrics = () => {
  const {
    data: totalUsers,
    isPending,
    isError,
  } = useQuery({
    queryKey: adminUsersCountQueryKey,
    queryFn: fetchAdminUsersCount,
  });

  const {
    data: wagering24h,
    isPending: stakePending,
    isError: stakeError,
  } = useQuery({
    queryKey: wagering24hQueryKey,
    queryFn: fetchWagering24h,
  });

  const usersLabel =
    isError
      ? "—"
      : isPending
        ? "…"
        : typeof totalUsers === "number"
          ? totalUsers.toLocaleString()
          : "…";

  const stakeLabel =
    stakeError
      ? "—"
      : stakePending
        ? "…"
        : wagering24h
          ? formatTotalStakeUsd(wagering24h.stats.totalWagered)
          : "…";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
        <div className="flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90 [&_svg]:size-6">
          <GroupIcon />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total users
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {usersLabel}
            </h4>
            {isError && (
              <p className="mt-1 text-xs text-error-500 dark:text-error-400">
                Could not load count
              </p>
            )}
          </div>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
        <div className="flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90 [&_svg]:size-6">
          <DollarLineIcon />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total stake (24h)
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {stakeLabel}
            </h4>
            {stakeError && (
              <p className="mt-1 text-xs text-error-500 dark:text-error-400">
                Could not load stake
              </p>
            )}
          </div>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
};
