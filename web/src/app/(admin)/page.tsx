import type { Metadata } from "next";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import HouseHoldOverview from "@/components/gambling/HouseHoldOverview";
import MonthlyGgrChart from "@/components/gambling/MonthlyGgrChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";

export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | Bloxblitz - Next.js Dashboard Template",
  description: "This is Next.js Home for Bloxblitz Dashboard Template",
};

export default function Ecommerce() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics />

        <MonthlyGgrChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <HouseHoldOverview />
      </div>

      <div className="col-span-12">
        <StatisticsChart />
      </div>
    </div>
  );
}
