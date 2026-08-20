"use client";

import { usePathname } from "next/navigation";

import { getPageForPath } from "@/lib/nav";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  const pathname = usePathname();
  const page = getPageForPath(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold tracking-tight">
          {page.title}
        </span>
        <span className="hidden truncate text-xs text-muted-foreground sm:inline">
          /{page.href.replace(/^\//, "")}
        </span>
      </div>
    </header>
  );
}