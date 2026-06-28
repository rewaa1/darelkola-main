"use client";

import { DarelkolaSidebar } from "@/components/darelkola-sidebar";
import { DarelkolaHeader } from "@/components/darelkola-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <DarelkolaSidebar user={user} />
      <SidebarInset>
        <DarelkolaHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
