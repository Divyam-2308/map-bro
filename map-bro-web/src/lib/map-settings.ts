import { CADASTRAL_STATE_IDS, type CadastralStateId } from "@/components/map/cadastrals";
import {
  BASEMAPS,
  DEFAULT_OVERLAY_OPACITY,
  INITIAL_CENTER,
  INITIAL_ZOOM,
  type BasemapId,
} from "@/components/map/layers";
import { DEFAULT_CADASTRAL_OPACITY } from "@/components/map/cadastrals";

const STORAGE_KEY = "map-bro:settings";

export interface MapSettings {
  basemap: BasemapId;
  overlayVisible: boolean;
  overlayOpacity: number;
  cadastralStates: CadastralStateId[];
  cadastralVisible: boolean;
  cadastralOpacity: number;
  center: [number, number];
  zoom: number;
}

export function defaultMapSettings(): MapSettings {
  return {
    basemap: "satellite",
    overlayVisible: true,
    overlayOpacity: DEFAULT_OVERLAY_OPACITY,
    cadastralStates: ["gujarat"],
    cadastralVisible: false,
    cadastralOpacity: DEFAULT_CADASTRAL_OPACITY,
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  };
}

const isBasemap = (value: unknown): value is BasemapId =>
  typeof value === "string" && value in BASEMAPS;
const isCadastralState = (value: unknown): value is CadastralStateId =>
  typeof value === "string" &&
  (CADASTRAL_STATE_IDS as readonly string[]).includes(value);
const isCadastralStates = (value: unknown): value is CadastralStateId[] =>
  Array.isArray(value) && value.every(isCadastralState);
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isLatLng = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  isFiniteNumber(value[0]) &&
  isFiniteNumber(value[1]);

/** Reads the persisted map settings; falls back to defaults for bad values. */
export function loadMapSettings(): MapSettings {
  const defaults = defaultMapSettings();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const data = JSON.parse(raw) as Partial<MapSettings> & {
      /** Legacy single-state field (pre multi-select); migrated below. */
      cadastralState?: unknown;
    };

    return {
      basemap: isBasemap(data.basemap) ? data.basemap : defaults.basemap,
      overlayVisible: isBoolean(data.overlayVisible)
        ? data.overlayVisible
        : defaults.overlayVisible,
      overlayOpacity: isFiniteNumber(data.overlayOpacity)
        ? Math.min(1, Math.max(0, data.overlayOpacity))
        : defaults.overlayOpacity,
      cadastralStates: isCadastralStates(data.cadastralStates)
        ? data.cadastralStates
        : isCadastralState(data.cadastralState)
          ? [data.cadastralState]
          : defaults.cadastralStates,
      cadastralVisible: isBoolean(data.cadastralVisible)
        ? data.cadastralVisible
        : defaults.cadastralVisible,
      cadastralOpacity: isFiniteNumber(data.cadastralOpacity)
        ? Math.min(1, Math.max(0, data.cadastralOpacity))
        : defaults.cadastralOpacity,
      center: isLatLng(data.center) ? data.center : defaults.center,
      zoom: isFiniteNumber(data.zoom) ? data.zoom : defaults.zoom,
    };
  } catch {
    return defaults;
  }
}

/** Persists the given map settings to localStorage. */
export function saveMapSettings(settings: MapSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode / quota); fail silently.
  }
}