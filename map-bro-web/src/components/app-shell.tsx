"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Three-panel application frame:
 *   1. AppSidebar  — primary navigation (left, collapsible)
 *   2. Header      — context actions + secondary navigation (top)
 *   3. PagePanel   — renders the routed page (fills the remaining space)
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <Header />
        <main className="relative flex-1 min-h-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}