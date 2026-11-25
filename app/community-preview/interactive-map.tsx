"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Map as MapLibre, Marker, Popup, setWorkerUrl, type StyleSpecification, type GeoJSONSource, type GeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { CATEGORY_META, MAP_CENTER, type Place } from "./map-data";
import { loadCozyMapStyle } from "./map-theme";
import { add3dLayers, remove3dLayers, toneForTheme } from "./map-3d";

export type MapCommand = {
  kind: "zoom-in" | "zoom-out" | "center" | "fly" | "north" | "tilt-up" | "tilt-down" | "earth-out" | "earth-home";
  seq: number;
  center?: [number, number];
};
export type MapView = { bearing: number; pitch: number; zoom: number };

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery: Esri, Maxar, Earthstar Geographics, and the GIS community",
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
const CLUSTER_HALO_LAYER_ID = "cp-clusters-halo";
const CLUSTER_LAYER_ID = "cp-clusters";
const CLUSTER_COUNT_LAYER_ID = "cp-cluster-count";

const LOCAL_MIN_ZOOM = 11;
const EARTH_MIN_ZOOM = 1.4;
const POSE_3D = { pitch: 62, bearing: -24, zoom: 15.6 };
const ORBIT_DEGREES_PER_SECOND = 5;

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ms = (value: number) => (prefersReducedMotion() ? 0 : value);

type MarkerEntry = { marker: Marker; root: Root };
type MapRefs = {
  placesRef: React.RefObject<Place[]>;
  selectedIdRef: React.RefObject<string | null>;
  onSelectRef: React.RefObject<(id: string | null) => void>;
  markersRef: React.RefObject<Map<string, MarkerEntry>>;
  hoverPopupRef: React.RefObject<Popup | null>;
  onMapMovedRef: React.RefObject<((center: [number, number]) => void) | undefined>;
  styleNameRef: React.RefObject<ThemeName>;
  mode3dRef: React.RefObject<boolean>;
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

function createPin(map: MapLibre, refs: MapRefs, place: Place, lngLat: [number, number]): MarkerEntry {
  const meta = CATEGORY_META[place.category];
  const el = document.createElement("div");
  el.className = "cp-pin";
  el.style.setProperty("--pin-color", meta.color);
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `${place.name}, ${meta.label}`);
  el.tabIndex = 0;
  const inner = document.createElement("div");
  inner.className = "cp-pin-inner";
  const ring = document.createElement("span");
  ring.className = "cp-pin-ring";
  ring.setAttribute("aria-hidden", "true");
  const body = document.createElement("span");
  body.className = "cp-pin-body";
  inner.append(ring, body);
  el.appendChild(inner);
  const root = createRoot(body);
  const Icon = meta.icon;
  root.render(<Icon size={16} strokeWidth={2.2} color="#fffdf4" />);

  const select = () => refs.onSelectRef.current(place.id);
  el.addEventListener("click", (event) => { event.stopPropagation(); select(); });
  el.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
  el.addEventListener("mouseenter", () => {
    refs.hoverPopupRef.current?.remove();
    refs.hoverPopupRef.current = new Popup({ closeButton: false, closeOnClick: false, offset: 46, className: "cp-place-popup", maxWidth: "260px" })
      .setLngLat(lngLat)
      .setHTML(`<span class="cp-popup-dot" style="background:${meta.color}"></span><span class="cp-popup-copy"><b>${escapeHtml(place.name)}</b><small>${escapeHtml(meta.label)} · ${place.source === "openstreetmap" ? "OpenStreetMap" : "sample place"}</small></span>`)
      .addTo(map);
  });
  el.addEventListener("mouseleave", () => {
    refs.hoverPopupRef.current?.remove();
    refs.hoverPopupRef.current = null;
  });
  const marker = new Marker({ element: el, anchor: "bottom" }).setLngLat(lngLat).addTo(map);
  return { marker, root };
}

const unmountLater = (root: Root) => { window.setTimeout(() => root.unmount(), 0); };

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
    refs.markersRef.current.set(id, createPin(map, refs, place, feature.geometry.coordinates as [number, number]));
  }
  for (const [id, entry] of refs.markersRef.current) {
    if (!seen.has(id)) {
      entry.marker.remove();
      unmountLater(entry.root);
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
    id: CLUSTER_HALO_LAYER_ID,
    type: "circle",
    source: PLACES_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#365744",
      "circle-radius": ["step", ["get", "point_count"], 27, 5, 32, 15, 38],
      "circle-opacity": 0.16,
      "circle-blur": 0.55,
    },
  });
  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: "circle",
    source: PLACES_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#365744",
      "circle-radius": ["step", ["get", "point_count"], 17, 5, 21, 15, 26],
      "circle-stroke-width": 3,
      "circle-stroke-color": "#fffdf4",
    },
  });
  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: PLACES_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true },
    paint: { "text-color": "#fffdf4" },
  });
  refreshMarkers(map, refs);
}

function applyOverlays(map: MapLibre, refs: MapRefs) {
  if (refs.mode3dRef.current) {
    add3dLayers(map, toneForTheme(refs.styleNameRef.current));
    map.setProjection({ type: "globe" });
  } else {
    remove3dLayers(map);
  }
  setupPlacesLayer(map, refs);
}

function attachListeners(map: MapLibre, refs: MapRefs) {
  map.on("click", CLUSTER_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    const clusterId = feature?.properties?.cluster_id as number | undefined;
    const source = map.getSource(PLACES_SOURCE_ID) as GeoJSONSource | undefined;
    if (clusterId == null || !source || !feature || feature.geometry.type !== "Point") return;
    const center = feature.geometry.coordinates as [number, number];
    source.getClusterExpansionZoom(clusterId).then((zoom) => map.easeTo({ center, zoom, duration: ms(550) })).catch(() => {});
  });
  map.on("mouseenter", CLUSTER_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", CLUSTER_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
  // Clicking empty map deselects the place (pins stop propagation themselves), like Google Maps.
  map.on("click", (event) => {
    const hits = map.getLayer(CLUSTER_LAYER_ID) ? map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] }) : [];
    if (hits.length === 0) refs.onSelectRef.current(null);
  });
  map.on("moveend", () => {
    refreshMarkers(map, refs);
    const center = map.getCenter();
    refs.onMapMovedRef.current?.([center.lng, center.lat]);
  });
  map.on("sourcedata", (event) => { if (event.sourceId === PLACES_SOURCE_ID && event.isSourceLoaded) refreshMarkers(map, refs); });
}

function setFreeCamera(map: MapLibre, enabled: boolean) {
  if (enabled) {
    map.setMaxPitch(80);
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.touchPitch.enable();
  } else {
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.touchPitch.disable();
  }
}

export default function InteractiveMap({ styleName, command, places, selectedId, onSelectPlace, onMapMoved, mode3d, orbit, onViewChange, onOrbitStop }: {
  styleName: ThemeName;
  command: MapCommand;
  places: Place[];
  selectedId: string | null;
  onSelectPlace: (id: string | null) => void;
  onMapMoved?: (center: [number, number]) => void;
  mode3d: boolean;
  orbit: boolean;
  onViewChange?: (view: MapView) => void;
  onOrbitStop?: () => void;
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
  const styleNameRef = useRef(styleName);
  const mode3dRef = useRef(mode3d);
  const onViewChangeRef = useRef(onViewChange);
  const onOrbitStopRef = useRef(onOrbitStop);
  const exitTokenRef = useRef(0);
  const firstModeRun = useRef(true);
  const refs: MapRefs = { placesRef, selectedIdRef, onSelectRef, markersRef, hoverPopupRef, onMapMovedRef, styleNameRef, mode3dRef };

  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { onSelectRef.current = onSelectPlace; }, [onSelectPlace]);
  useEffect(() => { onMapMovedRef.current = onMapMoved; }, [onMapMoved]);
  useEffect(() => { styleNameRef.current = styleName; }, [styleName]);
  useEffect(() => { onViewChangeRef.current = onViewChange; }, [onViewChange]);
  useEffect(() => { onOrbitStopRef.current = onOrbitStop; }, [onOrbitStop]);

  useEffect(() => {
    if (!containerRef.current) return;
    setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
    const map = new MapLibre({
      container: containerRef.current,
      // "cozy" is loaded asynchronously (see the style-change effect below); the map always
      // starts on a static style and is immediately re-styled if "cozy" was already selected.
      style: MAP_STYLES[styleName === "cozy" ? "positron" : styleName],
      center: MAP_CENTER,
      zoom: 15,
      minZoom: LOCAL_MIN_ZOOM,
      maxZoom: 19,
      maxPitch: 0,
      attributionControl: { compact: true },
      pitchWithRotate: true,
      dragRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    attachListeners(map, refs);
    map.on("load", () => {
      setStatus("ready");
      applyOverlays(map, refs);
      const attribution = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
      attribution?.removeAttribute("open");
      attribution?.classList.remove("maplibregl-compact-show");
    });
    map.on("error", () => setStatus((current) => current === "loading" ? "error" : current));

    let frame = 0;
    const reportView = () => {
      frame = 0;
      onViewChangeRef.current?.({ bearing: map.getBearing(), pitch: map.getPitch(), zoom: map.getZoom() });
    };
    map.on("move", () => { if (!frame) frame = requestAnimationFrame(reportView); });

    const markers = markersRef.current;
    const hover = hoverPopupRef;
    return () => {
      cancelAnimationFrame(frame);
      for (const entry of markers.values()) { entry.marker.remove(); unmountLater(entry.root); }
      markers.clear();
      hover.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  // The map is constructed once; style, mode and place changes are applied in the effects below.
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
      // setStyle discards custom sources and layers, so the overlays are rebuilt once the new style has loaded.
      map.once("style.load", () => { if (!cancelled) { setStatus("ready"); applyOverlays(map, refs); } });
      map.setStyle(nextStyle, { diff: false });
    };
    void applyStyle();
    return () => { cancelled = true; controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleName]);

  useEffect(() => {
    mode3dRef.current = mode3d;
    const map = mapRef.current;
    if (!map) return;
    if (firstModeRun.current) {
      firstModeRun.current = false;
      if (!mode3d) return;
    }
    exitTokenRef.current += 1;
    const token = exitTokenRef.current;
    if (mode3d) {
      if (map.isStyleLoaded()) {
        add3dLayers(map, toneForTheme(styleNameRef.current));
        map.setProjection({ type: "globe" });
      }
      setFreeCamera(map, true);
      map.setMinZoom(EARTH_MIN_ZOOM);
      map.easeTo({ pitch: POSE_3D.pitch, bearing: POSE_3D.bearing, zoom: Math.max(map.getZoom(), POSE_3D.zoom - 0.2), duration: ms(2000) });
    } else {
      setFreeCamera(map, false);
      map.easeTo({ pitch: 0, bearing: 0, zoom: Math.max(map.getZoom(), 14), duration: ms(1000) });
      map.once("moveend", () => {
        if (token !== exitTokenRef.current) return;
        map.setMaxPitch(0);
        remove3dLayers(map);
        map.setProjection({ type: "mercator" });
        map.setMinZoom(LOCAL_MIN_ZOOM);
      });
    }
  }, [mode3d]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mode3d || !orbit) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      map.setBearing(map.getBearing() + ((now - last) / 1000) * ORBIT_DEGREES_PER_SECOND);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stop = (event: { originalEvent?: unknown }) => { if (event.originalEvent) onOrbitStopRef.current?.(); };
    map.on("dragstart", stop);
    map.on("zoomstart", stop);
    map.on("pitchstart", stop);
    map.on("rotatestart", stop);
    return () => {
      cancelAnimationFrame(raf);
      map.off("dragstart", stop);
      map.off("zoomstart", stop);
      map.off("pitchstart", stop);
      map.off("rotatestart", stop);
    };
  }, [orbit, mode3d]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || command.seq === 0) return;
    switch (command.kind) {
      case "zoom-in": map.zoomIn({ duration: ms(350) }); break;
      case "zoom-out": map.zoomOut({ duration: ms(350) }); break;
      case "north": map.easeTo({ bearing: 0, duration: ms(700) }); break;
      case "tilt-up": map.easeTo({ pitch: Math.min(80, map.getPitch() + 12), duration: ms(500) }); break;
      case "tilt-down": map.easeTo({ pitch: Math.max(0, map.getPitch() - 12), duration: ms(500) }); break;
      case "earth-out": map.flyTo({ center: map.getCenter(), zoom: 2.3, pitch: 0, bearing: 0, duration: ms(3800), essential: true }); break;
      case "earth-home": map.flyTo({ center: command.center ?? MAP_CENTER, zoom: POSE_3D.zoom, pitch: POSE_3D.pitch, bearing: POSE_3D.bearing, duration: ms(5200), essential: true }); break;
      default:
        if (command.center) map.flyTo({ center: command.center, zoom: command.kind === "center" ? 15 : 16, duration: ms(900) });
    }
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

  return <div className="cp-maplibre-wrap">
    <div className="cp-maplibre-canvas" ref={containerRef} aria-label="Interactive OpenStreetMap of Akurdi, Pune" role="application" />
    {status === "loading" && <div className="cp-map-status">Loading the neighborhood map…</div>}
    {status === "error" && <div className="cp-map-status is-error">The map tiles couldn’t load. Check your connection and try again.</div>}
  </div>;
}
