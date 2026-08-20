import type { LatLngBoundsExpression } from "leaflet";

export type BasemapId = "satellite" | "street";

export interface TileLayerConfig {
  id: BasemapId;
  label: string;
  /** XYZ template. {z}/{x}/{y} placeholders are substituted by Leaflet. */
  url: string;
  attribution: string;
  maxZoom: number;
}

/** Switchable base maps under the topographic overlay. */
export const BASEMAPS: Record<BasemapId, TileLayerConfig> = {
  satellite: {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
  street: {
    id: "street",
    label: "Street",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
    maxZoom: 19,
  },
};

/**
 * Georeferenced topographic (SOI Open Series 1:50k) overlay served by
 * indianopenmaps. The tiles are already referenced to WGS84 web-mercator, so
 * they align exactly with the satellite basemap beneath them.
 */
export const TOPO_OVERLAY = {
  label: "SOI 1:50k topo",
  url: "https://indianopenmaps.com/soi/osm/{z}/{x}/{y}.webp",
  attribution:
    'SOI Open Series Maps &copy; <a href="https://www.surveyofindia.gov.in/pages/copyright-policy">Survey of India</a> &mdash; via <a href="https://indianopenmaps.com/" target="_blank" rel="noreferrer noopener">indianopenmaps</a>',
  /** Restricts tile requests to the source bounds (most of India). */
  bounds: [
    [6.7300757, 68.2470703],
    [35.5143431, 97.0092773],
  ] satisfies LatLngBoundsExpression,
  maxZoom: 14,
} as const;

/** Initial camera position — Ahmedabad, Gujarat. */
export const INITIAL_CENTER: [number, number] = [23.0225, 72.5714];
export const INITIAL_ZOOM = 10;
export const DEFAULT_OVERLAY_OPACITY = 0.75;