import type { Metadata } from "next";

import { getPageForPath } from "@/lib/nav";
import { MapClient } from "@/components/map/map-client";

export const metadata: Metadata = {
  title: getPageForPath("/map").title,
  description: getPageForPath("/map").description,
};

export default function MapPage() {
  return <MapClient />;
}