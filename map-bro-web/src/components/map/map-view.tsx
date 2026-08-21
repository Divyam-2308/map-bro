"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as maplibregl from "maplibre-gl";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";

// MapLibre resolves its worker as `./maplibre-gl-worker.mjs` relative to the
// bundled chunk, which the Next.js server answers with an HTML fallback.
// Point it at the files we serve from /public instead.
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

import {
  BASEMAPS,
  TOPO_OVERLAY,
  type BasemapId,
} from "@/components/map/layers";
import {
  CADASTRAL_PANE,
  CADASTRAL_STATES,
  applyCadastralStates,
  cadastralBaseStyle,
  cadastralQueryLayers,
  queryDynamicSource,
  type CadastralStateId,
} from "@/components/map/cadastrals";
import { MapControls } from "@/components/map/map-controls";
import {
  SearchPanel,
  type CadastralSearchResult,
} from "@/components/map/search-panel";
import { loadMapSettings, saveMapSettings } from "@/lib/map-settings";

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basemapRef = useRef<L.TileLayer | null>(null);
  const overlayRef = useRef<L.TileLayer | null>(null);
  const cadastralRef = useRef<ReturnType<typeof maplibreGL> | null>(null);

  const [initialSettings] = useState(() => loadMapSettings());
  const initialCenterRef = useRef(initialSettings.center);
  const initialZoomRef = useRef(initialSettings.zoom);

  const [basemap, setBasemap] = useState<BasemapId>(initialSettings.basemap);
  const [overlayVisible, setOverlayVisible] = useState(
    initialSettings.overlayVisible,
  );
  const [overlayOpacity, setOverlayOpacity] = useState(
    initialSettings.overlayOpacity,
  );
  const [cadastralStates, setCadastralStates] = useState<CadastralStateId[]>(
    initialSettings.cadastralStates,
  );
  const [cadastralVisible, setCadastralVisible] = useState(
    initialSettings.cadastralVisible,
  );
  const [cadastralOpacity, setCadastralOpacity] = useState(
    initialSettings.cadastralOpacity,
  );
  const cadastralOpacityRef = useRef(cadastralOpacity);
  const cadastralStatesRef = useRef<CadastralStateId[]>(cadastralStates);
  const cadastralPrevStatesRef = useRef<CadastralStateId[]>(cadastralStates);
  const cadastralPrevVisibleRef = useRef(cadastralVisible);

  // Fetch the dynamic (ArcGIS) sources' features for the current viewport so
  // parcels render in the app's own vector style at the right zoom.
  // Deliberately doesn't gate on `isStyleLoaded()` — that also waits for
  // every other selected state's raster/vector tiles to finish loading,
  // which with several states selected is essentially never true during
  // normal panning. `getSource` is safe to call before the style is fully
  // ready (it just returns undefined), so each source is skipped until
  // `applyCadastralStates` has actually added it.
  const refreshDynamicSources = () => {
    const map = mapRef.current;
    const glMap = cadastralRef.current?.getMaplibreMap();
    if (!map || !glMap) return;
    const bounds = map.getBounds();
    const viewport = {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    };
    const zoom = map.getZoom();
    for (const stateId of cadastralStatesRef.current) {
      for (const source of CADASTRAL_STATES[stateId].sources) {
        if (source.kind !== "dynamic") continue;
        const id = `cadastral-${stateId}-${source.id}`;
        const glSource = glMap.getSource(id);
        if (!glSource || glSource.type !== "geojson") continue;
        void queryDynamicSource(source, zoom, viewport).then((data) => {
          // Guard against a stale source (state toggled mid-fetch).
          const current = glMap.getSource(id);
          if (current && current.type === "geojson") {
            (current as maplibregl.GeoJSONSource).setData(data);
          }
        });
      }
    }
  };

  // Create the map once. Layer add/remove/opacity is handled by the
  // effect hooks below so state changes map 1:1 to layer mutations.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: initialCenterRef.current,
      zoom: initialZoomRef.current,
      maxZoom: 19,
      zoomControl: true,
    });

    // Cadastral vector overlays render above the raster layers but below
    // Leaflet's interactive controls.
    map.createPane(CADASTRAL_PANE).style.zIndex = "450";

    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    // Remember the visible map region so returning to the page restores it.
    map.on("moveend", () => {
      const center = map.getCenter();
      saveMapSettings({
        ...loadMapSettings(),
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
      });
      refreshDynamicSources();
    });

    // Show the clicked parcel's attributes (survey no, owner info, etc.).
    map.on("click", (e: L.LeafletMouseEvent) => {
      const layer = cadastralRef.current;
      if (!layer || !map.hasLayer(layer)) return;
      const glMap = layer.getMaplibreMap();
      if (!glMap) return;

      // The GL canvas is padded by `padding` (0.1) on every side of the
      // Leaflet viewport, so shift the click point by that offset.
      const size = map.getSize();
      const px = e.containerPoint.x + size.x * 0.1;
      const py = e.containerPoint.y + size.y * 0.1;

      const features = glMap.queryRenderedFeatures([px, py], {
        layers: cadastralStatesRef.current.flatMap((stateId) =>
          CADASTRAL_STATES[stateId].sources.flatMap((source) =>
            cadastralQueryLayers(stateId, source),
          ),
        ),
      });
      if (!features.length) return;

      const props = features[0].properties as Record<string, unknown> | undefined;
      if (!props) return;

      const rows = Object.entries(props)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(
          ([k, v]) =>
            `<tr><th>${k}</th><td>${String(v)}</td></tr>`,
        )
        .join("");

      L.popup()
        .setLatLng(e.latlng)
        .setContent(`<table class="cadastral-popup">${rows}</table>`)
        .openOn(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      basemapRef.current = null;
      overlayRef.current = null;
      cadastralRef.current = null;
    };
  }, []);

  // Keep the basemap in sync with the selected layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (basemapRef.current) {
      map.removeLayer(basemapRef.current);
    }

    const next = L.tileLayer(BASEMAPS[basemap].url, {
      maxZoom: BASEMAPS[basemap].maxZoom,
      attribution: BASEMAPS[basemap].attribution,
    });

    basemapRef.current = next.addTo(map);

    // Re-adding a basemap puts it above the overlay in the tile pane;
    // keep the topographic overlay on top.
    if (overlayRef.current && map.hasLayer(overlayRef.current)) {
      overlayRef.current.bringToFront();
    }
  }, [basemap]);

  // Show / hide the topographic overlay.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!overlayRef.current) {
      overlayRef.current = L.tileLayer(TOPO_OVERLAY.url, {
        maxZoom: TOPO_OVERLAY.maxZoom,
        bounds: TOPO_OVERLAY.bounds,
        attribution: TOPO_OVERLAY.attribution,
        opacity: overlayOpacity,
      });
    }

    if (overlayVisible && !map.hasLayer(overlayRef.current)) {
      overlayRef.current.addTo(map);
    } else if (!overlayVisible && map.hasLayer(overlayRef.current)) {
      map.removeLayer(overlayRef.current);
    }
  }, [overlayVisible, overlayOpacity]);

  // Apply opacity without recreating the layer.
  useEffect(() => {
    overlayRef.current?.setOpacity(overlayOpacity);
  }, [overlayOpacity]);

// Show / hide the cadastral vector overlay and swap its state(s).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layer = cadastralRef.current;

    // Fly to the focused state only when the overlay is turned on or the
    // selection changes AND exactly one state ends up selected. Toggling
    // between multiple states keeps the current viewport so the user can
    // compare them side by side.
    const prev = cadastralPrevStatesRef.current;
    const added = cadastralStates.filter((id) => !prev.includes(id));
    const removed = prev.filter((id) => !cadastralStates.includes(id));
    cadastralPrevStatesRef.current = cadastralStates;

    const selectionChanged = added.length > 0 || removed.length > 0;
    const turnedOn = cadastralVisible && !cadastralPrevVisibleRef.current;
    cadastralPrevVisibleRef.current = cadastralVisible;

    const shouldFly =
      cadastralVisible &&
      cadastralStates.length === 1 &&
      (turnedOn || selectionChanged);

    const selected = cadastralStates
      .map((id) => CADASTRAL_STATES[id])
      .filter(Boolean);

    if (!cadastralVisible || selected.length === 0) {
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
      cadastralRef.current = null;
      return;
    }

    if (layer) {
      const glMap = layer.getMaplibreMap();
      if (glMap) {
        applyCadastralStates(glMap, selected, refreshDynamicSources);
        if (shouldFly) {
          map.flyTo(selected[0].focus, selected[0].zoom);
        }
      }
      return;
    }

    const glLayer = maplibreGL({
      style: cadastralBaseStyle(),
      interactive: false,
      pane: CADASTRAL_PANE,
    } as Parameters<typeof maplibreGL>[0] & { pane: string });

    glLayer.addTo(map);
    glLayer.getContainer().style.opacity = String(cadastralOpacityRef.current);
    cadastralRef.current = glLayer;

    const glMap = glLayer.getMaplibreMap();
    applyCadastralStates(glMap, selected, refreshDynamicSources);
    if (shouldFly) {
      map.flyTo(selected[0].focus, selected[0].zoom);
    }
  }, [cadastralVisible, cadastralStates]);

  // Apply cadastral opacity without recreating the overlay.
  useEffect(() => {
    cadastralOpacityRef.current = cadastralOpacity;
    const layer = cadastralRef.current;
    if (layer) {
      layer.getContainer().style.opacity = String(cadastralOpacity);
    }
  }, [cadastralOpacity]);

  // Keep the click handler's state reference in sync.
  useEffect(() => {
    cadastralStatesRef.current = cadastralStates;
  }, [cadastralStates]);

  // Persist layer/overlay settings to localStorage.
  useEffect(() => {
    const current = loadMapSettings();
    saveMapSettings({
      ...current,
      basemap,
      overlayVisible,
      overlayOpacity,
      cadastralStates,
      cadastralVisible,
      cadastralOpacity,
    });
  }, [
    basemap,
    overlayVisible,
    overlayOpacity,
    cadastralStates,
    cadastralVisible,
    cadastralOpacity,
  ]);

  // Keep Leaflet's size in sync when the sidebar collapses / viewport resizes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Fly to and highlight the parcel(s) returned by the search panel.
  const handleSearchResult = ({ stateId, features }: CadastralSearchResult) => {
    const map = mapRef.current;
    if (!map || features.length === 0) return;

    setCadastralVisible(true);
    setCadastralStates((prev) =>
      prev.includes(stateId) ? prev : [...prev, stateId],
    );

    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };
    const bounds = L.geoJSON(collection).getBounds();
    if (!bounds.isValid()) return;

    map.flyToBounds(bounds, { maxZoom: 17, padding: [80, 80] });

    const props = features[0].properties as Record<string, unknown> | undefined;
    if (!props) return;
    const rows = Object.entries(props)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `<tr><th>${k}</th><td>${String(v)}</td></tr>`)
      .join("");
    L.popup()
      .setLatLng(bounds.getCenter())
      .setContent(`<table class="cadastral-popup">${rows}</table>`)
      .openOn(map);
  };

  return (
    <div className="absolute inset-0 isolate">
      <div
        ref={containerRef}
        aria-label="Interactive map with satellite imagery, topographic and cadastral overlays"
        className="absolute inset-0"
      />
      <SearchPanel onResult={handleSearchResult} />
      <MapControls
        basemap={basemap}
        onBasemapChange={setBasemap}
        overlayVisible={overlayVisible}
        onOverlayVisibleChange={setOverlayVisible}
        overlayOpacity={overlayOpacity}
        onOverlayOpacityChange={setOverlayOpacity}
        cadastralStates={cadastralStates}
        onCadastralStatesChange={setCadastralStates}
        cadastralVisible={cadastralVisible}
        onCadastralVisibleChange={setCadastralVisible}
        cadastralOpacity={cadastralOpacity}
        onCadastralOpacityChange={setCadastralOpacity}
      />
    </div>
  );
}