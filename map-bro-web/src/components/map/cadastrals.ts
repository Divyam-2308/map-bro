import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  Map as MapLibreMap,
  RasterSourceSpecification,
  StyleSpecification,
  VectorSourceSpecification,
} from "maplibre-gl";

export type CadastralStateId =
  | "gujarat"
  | "bihar"
  | "punjab"
  | "rajasthan"
  | "uttar-pradesh"
  | "tripura"
  | "kerala"
  | "maharashtra"
  | "tamil-nadu"
  | "karnataka"
  | "andhra-pradesh"
  | "lakshadweep";

export interface CadastralSource {
  /** Short identifier, unique within a state. */
  id: string;
  /** Full provider name, shown in the picker and attribution. */
  provider: string;
  /** "vector" for pbf vector tiles, "raster" for cached raster (e.g. ArcGIS),
   *  "dynamic" for per-viewport vector queries (e.g. ArcGIS Dynamic MapServer). */
  kind: "vector" | "raster" | "dynamic";
  /** XYZ tile template ({z}/{x}/{y}); unused for "dynamic". */
  tiles: string;
  minZoom: number;
  maxZoom: number;
  /** Vector layer id inside the tiles (vector sources only). */
  layerId?: string;
  /** Parcel/survey-number fields, tried in order for the label (vector/dynamic). */
  labelFields: string[];
  attribution: string;
  sourceUrl: string;
  /** When false the source renders outlines only (used to merge overlapping
   *  sources for the same state without double-drawing fills/labels). */
  primary: boolean;
  /** Dynamic-source config: how to fetch features for the current viewport. */
  dynamic?: {
    /** ArcGIS Dynamic MapServer base URL (e.g. …/Dynamic_…/MapServer). */
    queryUrl: string;
    /** ArcGIS layer ids to query, in increasing detail order. */
    layerIds: number[];
    /** Zoom at which each corresponding layer becomes active. */
    layerMinZooms: number[];
    /** Maximum features to fetch per refresh (cap on records/pages). */
    maxFeatures: number;
    /** Attribute-search config, when this source supports looking up a
     *  parcel by survey number (as opposed to viewport-only fetching).
     *  Absent when the source has no such fields.
     *
     *  The query server here (and likely similar ArcGIS deployments) times
     *  out and drops the connection — indistinguishable client-side from a
     *  CORS failure — when a `where` clause ORs together more than one
     *  unindexed `LIKE '%…%'` scan. So exactly one clause is ever sent: the
     *  indexed integer field on an exact match, or a single text field on a
     *  partial match. A "45/2"-style hissa (sub-division) suffix is instead
     *  filtered client-side out of the main number's results. */
    search?: {
      /** Layer id to query (usually the most detailed layer, e.g. parcels). */
      layerId: number;
      /** Integer survey-number field, matched exactly when the search
       *  term's main number is numeric. */
      numericField?: string;
      /** Single text field, partial-matched, when the main number isn't
       *  numeric (never combined with another LIKE in the same query). */
      fallbackTextField: string;
      /** Hissa/sub-division number field; a "45/2" search narrows the main
       *  number's results to rows whose value here equals "2". */
      hissaField?: string;
      /** Human-readable place fields already present on the parcel layer
       *  itself (e.g. village/mandal/district name), used directly to label
       *  results — no second query needed. Mutually exclusive with the
       *  `place*` join fields below. */
      placeNameFields?: string[];
      /** Field on the parcel layer that links to the place layer below
       *  (e.g. a village code) — for sources where the human name isn't on
       *  the parcel layer itself and must be resolved via a second query. */
      placeCodeField?: string;
      /** Layer id whose rows map a place code to a human name (e.g. the
       *  village boundary layer). */
      placeLayerId?: number;
      /** Field on the place layer matching `placeCodeField`'s values. */
      placeLayerCodeField?: string;
      /** Field on the place layer holding the human-readable name. */
      placeLayerNameField?: string;
    };
  };
}

export interface CadastralState {
  id: CadastralStateId;
  /** Display name, e.g. "Gujarat". */
  name: string;
  /** One-line note about the state's coverage. */
  coverage: string;
  /** Camera position to fly to when the state is selected. */
  focus: [number, number];
  zoom: number;
  /** Sources to render for this state; the primary provides fill + labels. */
  sources: CadastralSource[];
}

/** Leaflet pane used to stack the cadastral vector overlay above raster layers. */
export const CADASTRAL_PANE = "cadastralPane";

export const GLYPHS_URL = "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf";

export const DEFAULT_CADASTRAL_OPACITY = 0.9;

const base = "https://indianopenmaps.com/not-so-open/cadastrals";
/** Source ids must be unique across states so multiple states can render at
 *  once; the state slug is therefore part of every source id. */
const NCSCM = (state: string, layer: string, fields: string[]) =>
  ({
    id: `${state}-ncscm`,
    kind: "vector",
    provider: "NCSCM (Coastal)",
    tiles: `${base}/${state}/coastal/ncscm/{z}/{x}/{y}.pbf`,
    minZoom: 0,
    maxZoom: 14,
    layerId: layer,
    labelFields: fields,
    attribution: `Source: <a href="https://czmp.ncscm.res.in/" target="_blank" rel="noopener noreferrer">National Centre for Sustainable Coastal Management</a> &mdash; collected by <a href="https://datameet.org" target="_blank" rel="noopener noreferrer">Datameet Community</a>`,
    sourceUrl: "https://czmp.ncscm.res.in/",
    primary: false,
  }) satisfies CadastralSource;
const NCOG = (state: string, layer: string, fields: string[]) =>
  ({
    id: `${state}-ncog`,
    kind: "vector",
    provider: "NCOG (Govt. of India)",
    tiles: `${base}/${state}/ncog/{z}/{x}/{y}.pbf`,
    minZoom: 0,
    maxZoom: 13,
    layerId: layer,
    labelFields: fields,
    attribution: `Source: <a href="https://ncog.gov.in/" target="_blank" rel="noopener noreferrer">NCOG</a> &mdash; collected by <a href="https://datameet.org" target="_blank" rel="noopener noreferrer">Datameet Community</a>`,
    sourceUrl: "https://ncog.gov.in/",
    primary: false,
  }) satisfies CadastralSource;
const MATRI = (state: string, layer: string, fields: string[]) =>
  ({
    id: `${state}-matribhoomi`,
    kind: "vector",
    provider: "Matribhoomi (Bharatmaps)",
    tiles: `${base}/${state}/matribhoomi/{z}/{x}/{y}.pbf`,
    minZoom: 1,
    maxZoom: 12,
    layerId: layer,
    labelFields: fields,
    attribution: `Source: <a href="https://matribhoomigis.nic.in/" target="_blank" rel="noopener noreferrer">Matribhoomi</a> &mdash; collected by <a href="https://datameet.org" target="_blank" rel="noopener noreferrer">Datameet Community</a>`,
    sourceUrl: "https://matribhoomigis.nic.in/",
    primary: false,
  }) satisfies CadastralSource;

/**
 * Cadastral vector sources served by indianopenmaps, grouped by state.
 * Gujarat merges its four overlapping sources into a single layer; NCOG is the
 * statewide base (fill + labels) while VEDAS / Matribhoomi / NCSCM contribute
 * boundary outlines so nothing is drawn twice.
 */
export const CADASTRAL_STATES: Record<CadastralStateId, CadastralState> = {
  gujarat: {
    id: "gujarat",
    name: "Gujarat",
    coverage: "Statewide · VEDAS, NCOG, Matribhoomi, coastal",
    focus: [23.0, 72.6],
    zoom: 8,
    sources: [
      {
        ...NCOG("gujarat", "NCOG_Gujarat_Cadastrals", ["sno"]),
        primary: true,
      },
      {
        ...MATRI("gujarat", "Matribhoomi_GJ_Cadastrals", ["NewSno", "OldSNO"]),
      },
      {
        ...NCSCM("gujarat", "NCSCM_GJ_Cadastrals", ["Sno"]),
      },
      {
        id: "gujarat-vedas",
        provider: "VEDAS (SAC–ISRO)",
        kind: "vector",
        tiles: `${base}/gujarat/vedas/{z}/{x}/{y}.pbf`,
        minZoom: 0,
        maxZoom: 13,
        layerId: "Vedas_GJ_Cadastrals",
        labelFields: ["newsno", "oldsno"],
        attribution: `Source: <a href="https://vedas.sac.gov.in/" target="_blank" rel="noopener noreferrer">VEDAS</a> &mdash; collected by <a href="https://datameet.org" target="_blank" rel="noopener noreferrer">Datameet Community</a>`,
        sourceUrl: "https://vedas.sac.gov.in/",
        primary: false,
      },
    ],
  },
  bihar: {
    id: "bihar",
    name: "Bihar",
    coverage: "NCOG + Matribhoomi",
    focus: [25.6, 85.1],
    zoom: 8,
    sources: [
      {
        ...NCOG("bihar", "NCOG_Bihar_Cadastrals", ["sno"]),
        primary: true,
      },
      {
        ...MATRI("bihar", "Matribhoomi_BH_Cadastrals", ["KID", "BHUCODE"]),
      },
    ],
  },
  punjab: {
    id: "punjab",
    name: "Punjab",
    coverage: "NCOG",
    focus: [30.7, 76.2],
    zoom: 8,
    sources: [
      {
        ...NCOG("punjab", "NCOG_Punjab_Cadastrals", ["khasra_no", "parcel_no"]),
        primary: true,
      },
    ],
  },
  rajasthan: {
    id: "rajasthan",
    name: "Rajasthan",
    coverage: "NCOG",
    focus: [26.9, 75.8],
    zoom: 7,
    sources: [
      {
        ...NCOG("rajasthan", "NCOG_Rajasthan_Cadastrals", ["sno"]),
        primary: true,
      },
    ],
  },
  "uttar-pradesh": {
    id: "uttar-pradesh",
    name: "Uttar Pradesh",
    coverage: "NCOG",
    focus: [27.0, 80.5],
    zoom: 7,
    sources: [
      {
        ...NCOG(
          "uttar-pradesh",
          "NCOG_UttarPradesh_Cadastrals",
          ["khasra"],
        ),
        primary: true,
      },
    ],
  },
  tripura: {
    id: "tripura",
    name: "Tripura",
    coverage: "Matribhoomi",
    focus: [23.8, 91.3],
    zoom: 8,
    sources: [
      {
        ...MATRI(
          "tripura",
          "Matribhoomi_Tripura_Cadastrals",
          ["Dag_No", "khatian"],
        ),
        primary: true,
      },
    ],
  },
  kerala: {
    id: "kerala",
    name: "Kerala",
    coverage: "Coastal",
    focus: [10.0, 76.3],
    zoom: 8,
    sources: [
      {
        ...NCSCM("kerala", "NCSCM_KL_Cadastrals", ["Plot"]),
        primary: true,
      },
    ],
  },
  maharashtra: {
    id: "maharashtra",
    name: "Maharashtra",
    coverage: "Coastal",
    focus: [19.0, 73.0],
    zoom: 7,
    sources: [
      {
        ...NCSCM("maharashtra", "NCSCM_MH_Cadastrals", ["Survey_Number"]),
        primary: true,
      },
    ],
  },
  "tamil-nadu": {
    id: "tamil-nadu",
    name: "Tamil Nadu",
    coverage: "Coastal",
    focus: [10.8, 78.7],
    zoom: 7,
    sources: [
      {
        ...NCSCM("tamil-nadu", "NCSCM_TN_Cadastrals", ["Survey_Number"]),
        primary: true,
      },
    ],
  },
  karnataka: {
    id: "karnataka",
    name: "Karnataka",
    coverage: "Statewide · KGIS (KSRSAC)",
    focus: [15.0, 75.7],
    zoom: 8,
    sources: [
      {
        id: "kgis",
        kind: "dynamic",
        provider: "KGIS (KSRSAC)",
        tiles: "",
        minZoom: 0,
        maxZoom: 19,
        labelFields: [
          "Label",
          "Surveynumber",
          "Surveynumber_Old",
          "Surnoc",
          "KGISVillageName",
          "KGISHobliName",
          "KGISTalukName",
          "KGISDistrictName",
        ],
        attribution: `Source: <a href="https://kgis.ksrsac.in/" target="_blank" rel="noopener noreferrer">Karnataka State Remote Sensing Applications Centre</a> &mdash; cadastral &amp; admin boundaries`,
        sourceUrl: "https://kgis.ksrsac.in/",
        primary: true,
        dynamic: {
          queryUrl:
            "https://kgis.ksrsac.in/kgismaps1/rest/services/CadastralData_Admin/Dynamic_CadastralData_Admin/MapServer",
          layerIds: [1, 2, 3, 4, 5],
          // District → Taluk → Hobli → Village → Cadastral as you zoom in,
          // mirroring the source's own scale-gated layers.
          layerMinZooms: [0, 4, 6, 8, 11],
          maxFeatures: 8000,
          search: {
            layerId: 5,
            numericField: "surveynumberi",
            fallbackTextField: "Surnoc",
            hissaField: "HissaNo",
            placeCodeField: "UniqueVillageCode",
            placeLayerId: 4,
            placeLayerCodeField: "UniqueVillageCode",
            placeLayerNameField: "KGISVillageName",
          },
        },
      },
      {
        ...NCSCM("karnataka", "NCSCM_KN_Cadastrals", ["Survey_Number"]),
      },
    ],
  },
  "andhra-pradesh": {
    id: "andhra-pradesh",
    name: "Andhra Pradesh",
    coverage: "Statewide · APSAC",
    focus: [15.9, 79.7],
    zoom: 8,
    sources: [
      {
        id: "apsac",
        kind: "dynamic",
        provider: "APSAC (AP State Space Applications Centre)",
        tiles: "",
        minZoom: 0,
        maxZoom: 19,
        labelFields: ["parcelnam", "villagenam", "mandalnam", "dstrctnam"],
        attribution: `Source: <a href="https://apsac.ap.gov.in/" target="_blank" rel="noopener noreferrer">APSAC</a> &mdash; AP State Space Applications Centre`,
        sourceUrl: "https://apsac.ap.gov.in/",
        primary: true,
        dynamic: {
          queryUrl:
            "https://apsac.ap.gov.in/gisserver/rest/services/cadastral/Andhra_Cadastral/MapServer",
          layerIds: [0],
          layerMinZooms: [11],
          maxFeatures: 2000,
          search: {
            layerId: 0,
            fallbackTextField: "parcelnam",
            placeNameFields: ["villagenam", "mandalnam", "dstrctnam"],
          },
        },
      },
      {
        ...NCSCM("andhra-pradesh", "NCSCM_AP_Cadastrals", ["Parcel_num"]),
      },
    ],
  },
  lakshadweep: {
    id: "lakshadweep",
    name: "Lakshadweep",
    coverage: "Coastal",
    focus: [10.0, 72.9],
    zoom: 9,
    sources: [
      {
        ...NCSCM("lakshadweep", "NCSCM_LK_Cadastrals", ["Plot_ID"]),
        primary: true,
      },
    ],
  },
};

export const CADASTRAL_STATE_IDS = Object.keys(
  CADASTRAL_STATES,
) as CadastralStateId[];

const CADASTRAL_SOURCE = "cadastral";
/** Source id for a state's source, namespaced by state so multiple states can
 *  coexist without id collisions. */
const sourceId = (stateId: CadastralStateId, source: CadastralSource) =>
  `${CADASTRAL_SOURCE}-${stateId}-${source.id}`;
/** Layer-id helpers; each state/source gets its own set of layer ids. */
const fillLayer = (stateId: CadastralStateId, source: CadastralSource) =>
  `${sourceId(stateId, source)}-fill`;
const lineLayer = (stateId: CadastralStateId, source: CadastralSource) =>
  `${sourceId(stateId, source)}-line`;
const labelLayer = (stateId: CadastralStateId, source: CadastralSource) =>
  `${sourceId(stateId, source)}-label`;
const rasterLayer = (stateId: CadastralStateId, source: CadastralSource) =>
  `${sourceId(stateId, source)}-raster`;

/** Empty base style; the cadastral sources + layers are applied on load. */
export function cadastralBaseStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {},
    layers: [],
  };
}

export function buildCadastralSource(
  source: CadastralSource,
): VectorSourceSpecification | RasterSourceSpecification | GeoJSONSourceSpecification {
  if (source.kind === "dynamic") {
    return {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      attribution: source.attribution,
    };
  }
  const common = {
    minzoom: source.minZoom,
    maxzoom: source.maxZoom,
    scheme: "xyz",
    attribution: source.attribution,
  } as const;
  if (source.kind === "raster") {
    return { ...common, type: "raster", tiles: [source.tiles] };
  }
  return { ...common, type: "vector", tiles: [source.tiles] };
}

/** Layer ids to query when clicking; primary sources also expose labels.
 *  Raster sources carry no attributes, so they are never queried. */
export function cadastralQueryLayers(
  stateId: CadastralStateId,
  source: CadastralSource,
): string[] {
  if (source.kind === "raster") return [];
  if (source.kind === "dynamic") {
    return [
      fillLayer(stateId, source),
      lineLayer(stateId, source),
      labelLayer(stateId, source),
    ];
  }
  return source.primary
    ? [
        fillLayer(stateId, source),
        lineLayer(stateId, source),
        labelLayer(stateId, source),
      ]
    : [lineLayer(stateId, source)];
}

export function buildCadastralLayers(
  stateId: CadastralStateId,
  source: CadastralSource,
): LayerSpecification[] {
  if (source.kind === "raster") {
    return [
      {
        id: rasterLayer(stateId, source),
        type: "raster",
        source: sourceId(stateId, source),
        paint: {
          "raster-opacity": 1,
          "raster-resampling": "linear",
          "raster-fade-duration": 0,
        },
      },
    ];
  }

  // Dynamic sources render like a primary vector source (fill + line + label).
  const isDynamic = source.kind === "dynamic";

  const textField: ExpressionSpecification = [
    "coalesce",
    ...source.labelFields.map((field) => ["get", field] as ExpressionSpecification),
    "",
  ];

  const layers: LayerSpecification[] = [
    {
      id: lineLayer(stateId, source),
      type: "line",
      source: sourceId(stateId, source),
      ...(isDynamic ? {} : { "source-layer": source.layerId }),
      paint: {
        "line-color": "#1d4ed8",
        "line-width": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          12, 0.5,
          14, 1,
          16, 1.5,
          18, 2.5,
        ],
        "line-opacity": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          12, source.primary ? 0.5 : 0.35,
          14, source.primary ? 0.85 : 0.55,
          16, 1,
        ],
      },
    },
  ];

  if (source.primary || isDynamic) {
    layers.unshift(
      {
        id: fillLayer(stateId, source),
        type: "fill",
        source: sourceId(stateId, source),
        ...(isDynamic ? {} : { "source-layer": source.layerId }),
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": [
            "interpolate",
            ["exponential", 1.5],
            ["zoom"],
            11, 0.06,
            13, 0.12,
            15, 0.22,
            17, 0.34,
          ],
        },
      },
      {
        id: labelLayer(stateId, source),
        type: "symbol",
        source: sourceId(stateId, source),
        ...(isDynamic ? {} : { "source-layer": source.layerId }),
        layout: {
          "text-field": textField,
          "text-font": ["Open Sans Regular"],
          "text-size": ["step", ["zoom"], 0, 13, 9, 15, 11, 17, 13],
          "text-max-width": 8,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1e40af",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
          "text-opacity": ["step", ["zoom"], 0, 13, 1],
        },
      },
    );
  }

  return layers;
}

/**
 * Point the given MapLibre map at one or more cadastral states, replacing any
 * previous cadastral sources/layers. Selecting multiple states at once renders
 * each state's primary source with fill + labels and every other source as
 * outlines only, so overlapping sources within a state never double-draw.
 *
 * Changes are applied incrementally: sources/layers for states that are no
 * longer selected are removed, and only newly selected states are added, so
 * toggling states never re-fetches tiles for the ones already on the map.
 * Safe to call before the map style has loaded.
 */
export function applyCadastralStates(
  map: MapLibreMap,
  states: CadastralState[],
  /** Called once the sources/layers above have actually been applied —
   *  useful for triggering a first viewport-data fetch (e.g. dynamic
   *  sources) at the moment it can actually succeed, rather than guessing
   *  via the `load` event. */
  onApplied?: () => void,
) {
  const apply = () => {
    const wanted = new Set(
      states.flatMap((state) =>
        state.sources.map((source) => sourceId(state.id, source)),
      ),
    );

    // Drop every layer/source that is no longer part of the selection.
    for (const layerId of map.getStyle().layers
      .map((layer) => layer.id)
      .filter((id) => id.startsWith("cadastral-"))) {
      if (!wanted.has(layerId.replace(/-fill$|-line$|-label$|-raster$/, "")) && map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
    for (const sourceId of Object.keys(map.getStyle().sources).filter((id) =>
      id.startsWith("cadastral-"),
    )) {
      if (!wanted.has(sourceId) && map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }

    // Add the missing state sources.
    for (const state of states) {
      for (const source of state.sources) {
        const id = sourceId(state.id, source);
        if (!map.getSource(id)) {
          map.addSource(id, buildCadastralSource(source));
          for (const layer of buildCadastralLayers(state.id, source)) {
            map.addLayer(layer);
          }
        }
      }
    }
  };

  // `apply` throws "Style is not done loading" if called too early.
  // `isStyleLoaded()` (and the `load` event) only flip true once *every*
  // selected source has finished fetching tiles for the current viewport —
  // with several statewide sources selected that can take a long time, or
  // effectively never resolve while the user keeps panning/zooming. Polling
  // on a short timer (rather than waiting on `load`) adds the sources as
  // soon as they can actually be added, instead of waiting on a signal that
  // may not fire promptly — or at all — while other sources are busy.
  const retry = () => {
    try {
      apply();
    } catch {
      window.setTimeout(retry, 300);
      return;
    }
    onApplied?.();
  };
  retry();
}

export interface ViewportBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Returns the layer index of a dynamic source whose layerMinZooms best matches
 *  the current zoom (the last layer whose min zoom is reached). */
function activeDynamicLayer(
  source: CadastralSource,
  zoom: number,
): number | null {
  const cfg = source.dynamic;
  if (!cfg) return null;
  let active: number | null = null;
  for (let i = 0; i < cfg.layerIds.length; i++) {
    if (zoom >= cfg.layerMinZooms[i]) active = cfg.layerIds[i];
  }
  return active;
}

const DYNAMIC_PAGE_SIZE = 1000;

/**
 * Queries an ArcGIS Dynamic MapServer feature layer for the features that
 * intersect the given viewport and returns them as a GeoJSON FeatureCollection.
 * Paging continues until maxFeatures is reached or the server stops returning
 * results, so a busy viewport degrades gracefully instead of truncating hard.
 */
export async function queryDynamicSource(
  source: CadastralSource,
  zoom: number,
  bounds: ViewportBounds,
): Promise<GeoJSON.FeatureCollection> {
  const cfg = source.dynamic;
  const layerId = cfg ? activeDynamicLayer(source, zoom) : null;
  if (!cfg || layerId === null) {
    return { type: "FeatureCollection", features: [] };
  }

  const geometry = {
    xmin: bounds.west,
    ymin: bounds.south,
    xmax: bounds.east,
    ymax: bounds.north,
    spatialReference: { wkid: 4326 },
  };
  const base = `${cfg.queryUrl}/${layerId}/query`;

  const features: GeoJSON.Feature[] = [];
  let offset = 0;
  while (features.length < cfg.maxFeatures) {
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      geometryType: "esriGeometryEnvelope",
      geometry: JSON.stringify(geometry),
      spatialRel: "esriSpatialRelIntersects",
      resultOffset: String(offset),
      resultRecordCount: String(DYNAMIC_PAGE_SIZE),
    });

    const res = await fetch(`${base}?${params.toString()}`);
    if (!res.ok) break;
    const json = (await res.json()) as GeoJSON.FeatureCollection & {
      exceededTransferLimit?: boolean;
    };
    const page = json.features ?? [];
    features.push(...page);
    if (!json.exceededTransferLimit || page.length < DYNAMIC_PAGE_SIZE) break;
    offset += page.length;
  }

  return { type: "FeatureCollection", features };
}

/** States that expose a searchable attribute layer (dynamic sources only —
 *  the static vector-tile sources have no attribute-query endpoint). */
export function searchableCadastralStateIds(): CadastralStateId[] {
  return CADASTRAL_STATE_IDS.filter((id) =>
    CADASTRAL_STATES[id].sources.some(
      (source) => source.kind === "dynamic" && source.dynamic?.search,
    ),
  );
}

/** Escapes a value for use inside a single-quoted ArcGIS SQL literal. */
const sqlEscape = (value: string) => value.replace(/'/g, "''");

/** One matching parcel from `searchCadastralsBySurveyNumber`, labeled by its
 *  place (e.g. village name) so a user can tell several same-numbered
 *  parcels in different cities apart. */
export interface CadastralSearchHit {
  stateId: CadastralStateId;
  feature: GeoJSON.Feature;
  label: string;
}

/**
 * Looks up parcels by survey number across every state with a dynamic,
 * attribute-searchable source (see `searchableCadastralStateIds`) — the
 * same number can exist in many villages/cities, so every match is
 * returned rather than just the first.
 *
 * A "<main>/<hissa>" term (e.g. "45/2") is split: the main number drives
 * the server query (exact match if numeric, else a single partial-match
 * field — see the `search` config's note on why only one clause is ever
 * sent) and the hissa narrows those results client-side. Results are
 * labeled with a human place name resolved via a second query against the
 * linked place layer (parcels only carry a place *code*).
 */
export async function searchCadastralsBySurveyNumber(
  surveyNumber: string,
): Promise<CadastralSearchHit[]> {
  const term = surveyNumber.trim();
  if (!term) return [];
  const [mainRaw, ...hissaParts] = term.split("/");
  const main = mainRaw.trim();
  const hissa = hissaParts.join("/").trim();
  if (!main) return [];
  const mainNumeric = /^\d+$/.test(main) ? Number(main) : null;

  const perState = await Promise.all(
    searchableCadastralStateIds().map(async (stateId) => {
      const state = CADASTRAL_STATES[stateId];
      const source = state.sources.find(
        (s) => s.kind === "dynamic" && s.dynamic?.search,
      );
      const cfg = source?.dynamic;
      const search = cfg?.search;
      if (!cfg || !search) return [];

      const where =
        mainNumeric !== null && search.numericField
          ? `${search.numericField} = ${mainNumeric}`
          : `UPPER(${search.fallbackTextField}) LIKE UPPER('%${sqlEscape(main)}%')`;

      const params = new URLSearchParams({
        where,
        outFields: "*",
        returnGeometry: "true",
        outSR: "4326",
        f: "geojson",
        resultRecordCount: "50",
      });

      const res = await fetch(
        `${cfg.queryUrl}/${search.layerId}/query?${params.toString()}`,
      );
      if (!res.ok) return [];
      const json = (await res.json()) as GeoJSON.FeatureCollection;
      let features = json.features ?? [];
      if (features.length === 0) return [];

      if (hissa && search.hissaField) {
        const field = search.hissaField;
        const narrowed = features.filter((feature) => {
          const value = (feature.properties as Record<string, unknown> | null)?.[
            field
          ];
          return (
            typeof value === "string" &&
            value.trim().toUpperCase() === hissa.toUpperCase()
          );
        });
        if (narrowed.length > 0) features = narrowed;
      }

      const placeNames = await resolvePlaceNames(cfg.queryUrl, search, features);

      return features.map(
        (feature): CadastralSearchHit => ({
          stateId,
          feature,
          label: placeLabel(feature, search, placeNames, state.name),
        }),
      );
    }),
  );

  return perState.flat();
}

/** Queries the place layer once for every distinct place code among the
 *  given features, returning a code → name lookup. Not needed (and not
 *  called) for sources whose `search.placeNameFields` already carries the
 *  human name directly on the parcel layer. */
async function resolvePlaceNames(
  queryUrl: string,
  search: NonNullable<
    NonNullable<CadastralSource["dynamic"]>["search"]
  >,
  features: GeoJSON.Feature[],
): Promise<Map<string, string>> {
  const { placeCodeField, placeLayerId, placeLayerCodeField, placeLayerNameField } =
    search;
  if (!placeCodeField || !placeLayerId || !placeLayerCodeField || !placeLayerNameField) {
    return new Map();
  }

  const codes = new Set<string>();
  for (const feature of features) {
    const code = (feature.properties as Record<string, unknown> | null)?.[
      placeCodeField
    ];
    if (typeof code === "string" && code) codes.add(code);
  }
  if (codes.size === 0) return new Map();

  const inList = [...codes].map((code) => `'${sqlEscape(code)}'`).join(",");
  const params = new URLSearchParams({
    where: `${placeLayerCodeField} IN (${inList})`,
    outFields: `${placeLayerCodeField},${placeLayerNameField}`,
    returnGeometry: "false",
    f: "json",
  });

  const res = await fetch(`${queryUrl}/${placeLayerId}/query?${params.toString()}`);
  if (!res.ok) return new Map();
  const json = (await res.json()) as {
    features?: { attributes: Record<string, unknown> }[];
  };

  const lookup = new Map<string, string>();
  for (const feature of json.features ?? []) {
    const code = feature.attributes[placeLayerCodeField];
    const name = feature.attributes[placeLayerNameField];
    if (typeof code === "string" && typeof name === "string") {
      lookup.set(code, name);
    }
  }
  return lookup;
}

function placeLabel(
  feature: GeoJSON.Feature,
  search: NonNullable<
    NonNullable<CadastralSource["dynamic"]>["search"]
  >,
  placeNames: Map<string, string>,
  stateName: string,
): string {
  const props = (feature.properties as Record<string, unknown> | null) ?? {};

  if (search.placeNameFields) {
    const parts = search.placeNameFields
      .map((field) => props[field])
      .filter((v) => v !== null && v !== undefined && v !== "")
      .map(String);
    return parts.length > 0 ? `${parts.join(", ")} — ${stateName}` : stateName;
  }

  const code = search.placeCodeField ? props[search.placeCodeField] : undefined;
  const name = typeof code === "string" ? placeNames.get(code) : undefined;
  return name ? `${name} — ${stateName}` : stateName;
}