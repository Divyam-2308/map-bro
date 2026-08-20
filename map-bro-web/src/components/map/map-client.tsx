"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(
  () => import("@/components/map/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  }
);

/** Client-side entry for the map; keeps Leaflet out of the server bundle. */
export function MapClient() {
  return <MapView />;
}