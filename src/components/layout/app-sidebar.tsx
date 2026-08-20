"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, LayersIcon } from "lucide-react";

import { appPages } from "@/lib/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/map" className="gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-primary-foreground shadow-sm">
                  <LayersIcon className="size-4" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold tracking-tight">map-bro</span>
                  <span className="text-xs text-muted-foreground">web</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider">
            Pages
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {appPages.map((page) => {
                const Icon = page.icon;
                const active =
                  pathname === page.href ||
                  pathname.startsWith(`${page.href}/`);
                return (
                  <SidebarMenuItem key={page.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={page.title}
                    >
                      <Link href={page.href}>
                        <Icon />
                        <span>{page.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="group/theme"
              tooltip="Map data via indianopenmaps"
            >
              <Link
                href="https://indianopenmaps.com/"
                target="_blank"
                rel="noreferrer noopener"
              >
                <LayersIcon className="size-4" />
                <span>Data source</span>
                <ChevronRightIcon className="ml-auto size-4 transition-transform group-hover/theme:translate-x-0.5" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-3 pb-2 text-[10px] text-muted-foreground">
          live tile overlays · no downloads
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}