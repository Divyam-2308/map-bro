import {
  CircleHelpIcon,
  InfoIcon,
  MapIcon,
  type LucideIcon,
} from "lucide-react";

export interface AppPage {
  /** Page title shown in sidebar, header and page metadata. */
  title: string;
  /** App-router path. */
  href: string;
  /** Short description used in navigation tooltips and page headers. */
  description: string;
  /** Nav icon. */
  icon: LucideIcon;
}

/**
 * Single source of truth for every page in the app.
 * Both the sidebar and the header derive their navigation from this list,
 * so adding a page here (plus a route under src/app/(app)/) wires it up
 * everywhere.
 */
export const appPages: readonly AppPage[] = [
  {
    title: "Map",
    href: "/map",
    description: "Satellite basemap with topographic and multi-state cadastral overlays",
    icon: MapIcon,
  },
  {
    title: "About",
    href: "/about",
    description: "What map-bro-web does and where the data comes from",
    icon: InfoIcon,
  },
  {
    title: "Help",
    href: "/help",
    description: "How to use the map and its overlays",
    icon: CircleHelpIcon,
  },
] as const;

export const defaultPage = appPages[0];

/** Returns the page config matching a pathname, or the default page. */
export function getPageForPath(pathname: string): AppPage {
  return (
    appPages.find((page) => page.href === pathname) ??
    appPages.find((page) => pathname.startsWith(`${page.href}/`)) ??
    defaultPage
  );
}