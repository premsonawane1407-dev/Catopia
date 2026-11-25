import type { LayerSpecification, LightSpecification, Map as MapLibre, SkySpecification, SourceSpecification } from "maplibre-gl";

// 3D terrain, extruded buildings and sky for the map's "3D Earth" mode.
// Data: OpenFreeMap vector tiles (OpenStreetMap buildings) and AWS Terrain Tiles (Terrarium elevation).

export type MapTone = "light" | "dark" | "imagery";

export const OFM_SOURCE_ID = "cp-ofm";
export const DEM_SOURCE_ID = "cp-dem";
export const BUILDINGS_LAYER_ID = "cp-buildings-3d";
export const HILLSHADE_LAYER_ID = "cp-hillshade";
export const TERRAIN_EXAGGERATION = 1.6;
const FALLBACK_HEIGHT = 6;

const DEM_SOURCE: SourceSpecification = {
  type: "raster-dem",
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
  tileSize: 256,
  maxzoom: 15,
  encoding: "terrarium",
  attribution: "Terrain: AWS Terrain Tiles (Mapzen, NASA SRTM, USGS and others)",
};

const OFM_SOURCE: SourceSpecification = { type: "vector", url: "https://tiles.openfreemap.org/planet" };

const SKY: Record<MapTone, SkySpecification> = {
  light: { "sky-color": "#bcd5e8", "horizon-color": "#f7edd3", "fog-color": "#f7edd3", "sky-horizon-blend": 0.55, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.3, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 1, 11, 0] },
  dark: { "sky-color": "#0d1626", "horizon-color": "#2c3d58", "fog-color": "#1b2739", "sky-horizon-blend": 0.5, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.35, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 1, 11, 0] },
  imagery: { "sky-color": "#7fb3e6", "horizon-color": "#e8f1fb", "fog-color": "#dbe8f5", "sky-horizon-blend": 0.5, "horizon-fog-blend": 0.55, "fog-ground-blend": 0.25, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 1, 11, 0] },
};

const LIGHT: Record<MapTone, LightSpecification> = {
  light: { anchor: "viewport", color: "#fff6dc", intensity: 0.42, position: [1.3, 215, 38] },
  dark: { anchor: "viewport", color: "#9db7d6", intensity: 0.3, position: [1.3, 215, 38] },
  imagery: { anchor: "viewport", color: "#fffaf0", intensity: 0.38, position: [1.3, 215, 38] },
};

const BUILDING_PAINT: Record<MapTone, { low: string; high: string; opacity: number }> = {
  light: { low: "#f2e9d4", high: "#ddcfae", opacity: 0.96 },
  dark: { low: "#3f5048", high: "#62756c", opacity: 0.94 },
  imagery: { low: "#fbf6e8", high: "#e8dec6", opacity: 0.72 },
};

export function toneForTheme(theme: string): MapTone {
  if (theme === "satellite") return "imagery";
  if (theme === "dark" || theme === "fiord") return "dark";
  return "light";
}

function firstLayerOfType(map: MapLibre, type: LayerSpecification["type"]) {
  return map.getStyle().layers.find((layer) => layer.type === type)?.id;
}

function buildingsLayer(source: string, tone: MapTone): LayerSpecification {
  const paint = BUILDING_PAINT[tone];
  return {
    id: BUILDINGS_LAYER_ID,
    type: "fill-extrusion",
    source,
    "source-layer": "building",
    minzoom: 13.5,
    filter: ["!=", ["get", "hide_3d"], true],
    paint: {
      // Some far-away tiles carry buildings without height properties; without a fallback those render black.
      "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], FALLBACK_HEIGHT], 0, paint.low, 60, paint.high],
      "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 15.2, ["coalesce", ["get", "render_height"], FALLBACK_HEIGHT]],
      "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 15.2, ["coalesce", ["get", "render_min_height"], 0]],
      "fill-extrusion-opacity": paint.opacity,
      "fill-extrusion-vertical-gradient": true,
    },
  };
}

function hillshadeLayer(tone: MapTone): LayerSpecification {
  const dark = tone === "dark";
  return {
    id: HILLSHADE_LAYER_ID,
    type: "hillshade",
    source: DEM_SOURCE_ID,
    paint: {
      "hillshade-exaggeration": dark ? 0.55 : 0.42,
      "hillshade-shadow-color": dark ? "#05100c" : "#6b7a62",
      "hillshade-highlight-color": dark ? "#40564a" : "#fffbe8",
      "hillshade-accent-color": dark ? "#1a2a22" : "#b9c4a2",
    },
  };
}

export function add3dLayers(map: MapLibre, tone: MapTone) {
  if (!map.getSource(DEM_SOURCE_ID)) map.addSource(DEM_SOURCE_ID, DEM_SOURCE);
  const buildingSource = map.getSource("openmaptiles") ? "openmaptiles" : OFM_SOURCE_ID;
  if (buildingSource === OFM_SOURCE_ID && !map.getSource(OFM_SOURCE_ID)) map.addSource(OFM_SOURCE_ID, OFM_SOURCE);

  if (map.getLayer(HILLSHADE_LAYER_ID)) map.removeLayer(HILLSHADE_LAYER_ID);
  if (tone !== "imagery") map.addLayer(hillshadeLayer(tone), firstLayerOfType(map, "line") ?? firstLayerOfType(map, "symbol"));

  if (map.getLayer(BUILDINGS_LAYER_ID)) map.removeLayer(BUILDINGS_LAYER_ID);
  map.addLayer(buildingsLayer(buildingSource, tone), firstLayerOfType(map, "symbol"));
  // Liberty ships its own 3D buildings; hide them so the two sets don't fight each other.
  if (map.getLayer("building-3d")) map.setLayoutProperty("building-3d", "visibility", "none");

  map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION });
  map.setSky(SKY[tone]);
  map.setLight(LIGHT[tone]);
}

export function remove3dLayers(map: MapLibre) {
  if (map.getTerrain()) map.setTerrain(null);
  for (const id of [BUILDINGS_LAYER_ID, HILLSHADE_LAYER_ID]) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getLayer("building-3d")) map.setLayoutProperty("building-3d", "visibility", "visible");
  for (const id of [DEM_SOURCE_ID, OFM_SOURCE_ID]) if (map.getSource(id)) map.removeSource(id);
}
