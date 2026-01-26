"use client";

import { DashboardSidebar } from "./dashboard-sidebar";

export function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-shrink-0 sticky top-0 self-start h-screen">
        <DashboardSidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-7xl p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

