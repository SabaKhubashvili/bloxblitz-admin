import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";
import GamesAdminPanel from "./GamesAdminPanel";

export const metadata: Metadata = {
  title: "Games | Bloxblitz - Next.js Dashboard Template",
  description:
    "Select and manage games in the Bloxblitz - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function GamesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Games" />
      <GamesAdminPanel />
    </div>
  );
}
