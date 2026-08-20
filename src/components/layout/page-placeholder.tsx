import Link from "next/link";

import { getPageForPath } from "@/lib/nav";
import { Button } from "@/components/ui/button";

interface PagePlaceholderProps {
  href: "/about" | "/help";
}

/**
 * Minimal stand-in page proving the page-panel switching flow.
 * Each placeholder is registered in src/lib/nav.ts alongside its route.
 */
export function PagePlaceholder({ href }: PagePlaceholderProps) {
  const page = getPageForPath(href);

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col items-start justify-center gap-6 px-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {page.description}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        This page is a placeholder. Switch pages from the sidebar or the header
        dropdown — the current page name and its URL are always shown in the
        header bar.
      </p>
      <Button asChild variant="outline">
        <Link href="/map">Go to Map</Link>
      </Button>
    </div>
  );
}