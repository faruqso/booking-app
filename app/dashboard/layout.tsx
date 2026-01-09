"use client";

import { DashboardLayoutWrapper } from "@/components/layouts/dashboard-layout-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}

