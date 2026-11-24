"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Map as MapLibre, Marker, Popup, setWorkerUrl, type StyleSpecification, type GeoJSONSource, type GeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { CATEGORY_META, type Place } from "./map-data";
import { loadCozyMapStyle } from "./map-theme";

type MapCommand = { kind: "zoom-in" | "zoom-out" | "center" | "fly"; seq: number; center?: [number, number] };

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics, and the GIS community",
    },
  },
  layers: [{ id: "esri-satellite", type: "raster", source: "esri" }],
};

const MAP_STYLES = {
  positron: "https://tiles.openfreemap.org/styles/positron",
  bright: "https://tiles.openfreemap.org/styles/bright",
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
  fiord: "https://tiles.openfreemap.org/styles/fiord",
  satellite: SATELLITE_STYLE,
} satisfies Record<string, string | StyleSpecification>;

export type ThemeName = keyof typeof MAP_STYLES | "cozy";

const PLACES_SOURCE_ID = "cp-places";
const CLUSTER_LAYER_ID = "cp-clusters";
const CLUSTER_COUNT_LAYER_ID = "cp-cluster-count";

type MarkerEntry = { marker: Marker; root: Root };
type MapRefs = {
  placesRef: React.RefObject<Place[]>;
  selectedIdRef: React.RefObject<string | null>;
  onSelectRef: React.RefObject<(id: string | null) => void>;
  markersRef: React.RefObject<Map<string, MarkerEntry>>;
  hoverPopupRef: React.RefObject<Popup | null>;
  onMapMovedRef: React.RefObject<((center: [number, number]) => void) | undefined>;
};

function placesToFeatureCollection(places: Place[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      id: place.id,
      properties: { id: place.id, category: place.category },
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
    })),
  };
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

function refreshMarkers(map: MapLibre, refs: MapRefs) {
  if (!map.getSource(PLACES_SOURCE_ID)) return;
  let features: GeoJSONFeature[] = [];
  try {
    features = map.querySourceFeatures(PLACES_SOURCE_ID, { filter: ["!", ["has", "point_count"]] });
  } catch {
    return;
  }
  const seen = new Set<string>();
  for (const feature of features) {
    const id = typeof feature.properties?.id === "string" ? feature.properties.id : null;
    if (!id || seen.has(id) || feature.geometry.type !== "Point") continue;
    seen.add(id);
    if (refs.markersRef.current.has(id)) continue;
    const place = refs.placesRef.current.find((item) => item.id === id);
    if (!place) continue;
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    const meta = CATEGORY_META[place.category];
    const el = document.createElement("div");
    el.className = `cp-place-marker cp-place-marker--${place.category}`;
    el.style.setProperty("--cp-marker-color", meta.color);
    const root = createRoot(el);
    const Icon = meta.icon;
    root.render(<Icon size={14} strokeWidth={2.4} color="#fffdf4" />);
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      refs.onSelectRef.current(place.id);
    });
    el.addEventListener("mouseenter", () => {
      refs.hoverPopupRef.current?.remove();
      refs.hoverPopupRef.current = new Popup({ closeButton: false, closeOnClick: false, offset: 20, className: "cp-place-popup" })
        .setLngLat([lng, lat])
        .setHTML(`<b>${escapeHtml(place.name)}</b><small>${escapeHtml(meta.label)}</small>`)
        .addTo(map);
    });
    el.addEventListener("mouseleave", () => {
      refs.hoverPopupRef.current?.remove();
      refs.hoverPopupRef.current = null;
    });
    const marker = new Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
    refs.markersRef.current.set(id, { marker, root });
  }
  for (const [id, entry] of refs.markersRef.current) {
    if (!seen.has(id)) {
      entry.marker.remove();
      entry.root.unmount();
      refs.markersRef.current.delete(id);
    } else {
      entry.marker.getElement().classList.toggle("is-selected", id === refs.selectedIdRef.current);
    }
  }
}

function setupPlacesLayer(map: MapLibre, refs: MapRefs) {
  if (map.getSource(PLACES_SOURCE_ID)) return;
  map.addSource(PLACES_SOURCE_ID, {
    type: "geojson",
    data: placesToFeatureCollection(refs.placesRef.current),
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 14,
  });
  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: "circle",
    source: PLACES_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#3f5945",
      "circle-radius": ["step", ["get", "point_count"], 16, 5, 20, 15, 25],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fffdf4",
      "circle-opacity": 0.92,
    },
  });
  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: PLACES_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 11 },
    paint: { "text-color": "#fffdf4" },
  });
  map.on("click", CLUSTER_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    const clusterId = feature?.properties?.cluster_id as number | undefined;
    const source = map.getSource(PLACES_SOURCE_ID) as GeoJSONSource | undefined;
    if (clusterId == null || !source || !feature || feature.geometry.type !== "Point") return;
    source
      .getClusterExpansionZoom(clusterId)
      .then((zoom) => map.easeTo({ center: feature.geometry.type === "Point" ? (feature.geometry.coordinates as [number, number]) : undefined, zoom, duration: 500 }))
      .catch(() => {});
  });
  map.on("mouseenter", CLUSTER_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", CLUSTER_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
  // Clicking empty map area (not a cluster — individual place markers stop propagation
  // themselves) deselects the current place, matching Google Maps' own behavior.
  map.on("click", (event) => {
    const hits = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] });
    if (hits.length === 0) refs.onSelectRef.current(null);
  });
  map.on("moveend", () => {
    refreshMarkers(map, refs);
    const center = map.getCenter();
    refs.onMapMovedRef.current?.([center.lng, center.lat]);
  });
  map.on("sourcedata", (event) => { if (event.sourceId === PLACES_SOURCE_ID && event.isSourceLoaded) refreshMarkers(map, refs); });
  refreshMarkers(map, refs);
}

export default function InteractiveMap({ styleName, command, places, selectedId, onSelectPlace, onMapMoved }: {
  styleName: ThemeName;
  command: MapCommand;
  places: Place[];
  selectedId: string | null;
  onSelectPlace: (id: string | null) => void;
  onMapMoved?: (center: [number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const placesRef = useRef(places);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelectPlace);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const hoverPopupRef = useRef<Popup | null>(null);
  const onMapMovedRef = useRef(onMapMoved);
  const refs: MapRefs = { placesRef, selectedIdRef, onSelectRef, markersRef, hoverPopupRef, onMapMovedRef };

  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { onSelectRef.current = onSelectPlace; }, [onSelectPlace]);
  useEffect(() => { onMapMovedRef.current = onMapMoved; }, [onMapMoved]);

  useEffect(() => {
    if (!containerRef.current) return;
    setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
    const map = new MapLibre({
      container: containerRef.current,
      // "cozy" is loaded asynchronously (see the style-change effect below); the map always
      // starts on a static style and is immediately re-styled if "cozy" was already selected.
      style: MAP_STYLES[styleName === "cozy" ? "positron" : styleName],
      center: [73.7602, 18.6460],
      zoom: 15,
      minZoom: 11,
      maxZoom: 19,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.on("load", () => { setStatus("ready"); setupPlacesLayer(map, refs); });
    map.on("error", () => setStatus((current) => current === "loading" ? "error" : current));
    return () => {
      for (const entry of markersRef.current.values()) { entry.marker.remove(); entry.root.unmount(); }
      markersRef.current.clear();
      hoverPopupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  // The map is constructed once; style and place changes are applied in the effects below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    const controller = new AbortController();
    const applyStyle = async () => {
      let nextStyle: string | StyleSpecification;
      if (styleName === "cozy") {
        setStatus("loading");
        try {
          nextStyle = await loadCozyMapStyle(controller.signal);
        } catch {
          if (cancelled) return;
          setStatus("error");
          return;
        }
      } else {
        nextStyle = MAP_STYLES[styleName];
      }
      if (cancelled) return;
      map.setStyle(nextStyle);
      // setStyle discards any custom sources/layers, so the places layer is rebuilt once the new style loads.
      map.once("styledata", () => { if (!cancelled) { setStatus("ready"); setupPlacesLayer(map, refs); } });
    };
    void applyStyle();
    return () => { cancelled = true; controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleName]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || command.seq === 0) return;
    if (command.kind === "zoom-in") map.zoomIn({ duration: 350 });
    else if (command.kind === "zoom-out") map.zoomOut({ duration: 350 });
    else if (command.center) map.flyTo({ center: command.center, zoom: command.kind === "center" ? 15 : 16, duration: 900 });
  }, [command]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(PLACES_SOURCE_ID) as GeoJSONSource | undefined;
    if (!map || !source) return;
    source.setData(placesToFeatureCollection(places));
  }, [places]);

  useEffect(() => {
    for (const [id, entry] of markersRef.current) {
      entry.marker.getElement().classList.toggle("is-selected", id === selectedId);
    }
  }, [selectedId]);

  return <div className="cp-maplibre-wrap"><div className="cp-maplibre-canvas" ref={containerRef} aria-label="Interactive OpenStreetMap of Akurdi, Pune" role="application" />{status === "loading" && <div className="cp-map-status">Loading the neighborhood map…</div>}{status === "error" && <div className="cp-map-status is-error">The map tiles couldn’t load. Check your connection and try again.</div>}</div>;
}
