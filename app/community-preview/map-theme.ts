import type { StyleSpecification } from "maplibre-gl";

// A quick "can this look good?" mockup: re-skins OpenFreeMap's real Positron vector
// style with Catopia's own warm palette, rather than hand-building a full custom style
// from scratch. Same real street/building/water geometry, different colors.
const PALETTE = {
  background: "#f5f0df",
  water: "#cfe1df",
  landcover: "#e3ead1",
  building: "#efe6d2",
  buildingOutline: "#e0d3b2",
  roadCasing: "#e6ddc6",
  roadMinor: "#fffdf4",
  roadMajorCasing: "#d8bd85",
  roadMajor: "#f3e3bd",
  boundary: "#c9b98f",
  label: "#3c4f3d",
  labelHalo: "#f7f3e4",
};

type LooseLayer = { id: string; type: string; "source-layer"?: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> };

function restyleLayer(rawLayer: LooseLayer): LooseLayer {
  const haystack = `${rawLayer.id} ${rawLayer["source-layer"] ?? ""}`.toLowerCase();
  const paint: Record<string, unknown> = { ...rawLayer.paint };

  if (rawLayer.type === "background") {
    paint["background-color"] = PALETTE.background;
  } else if (rawLayer.type === "fill" || rawLayer.type === "fill-extrusion") {
    const colorKey = rawLayer.type === "fill" ? "fill-color" : "fill-extrusion-color";
    if (haystack.includes("water")) paint[colorKey] = PALETTE.water;
    else if (/park|wood|grass|landcover|landuse|cemetery|forest|garden/.test(haystack)) paint[colorKey] = PALETTE.landcover;
    else if (haystack.includes("building")) {
      paint[colorKey] = PALETTE.building;
      if ("fill-outline-color" in paint) paint["fill-outline-color"] = PALETTE.buildingOutline;
    }
  } else if (rawLayer.type === "line") {
    const isCasing = haystack.includes("casing");
    if (haystack.includes("boundary") || haystack.includes("admin")) paint["line-color"] = PALETTE.boundary;
    else if (/motorway|trunk|primary/.test(haystack)) paint["line-color"] = isCasing ? PALETTE.roadMajorCasing : PALETTE.roadMajor;
    else if (/road|street|transportation|highway|path|service|secondary|tertiary|track/.test(haystack)) paint["line-color"] = isCasing ? PALETTE.roadCasing : PALETTE.roadMinor;
    else if (haystack.includes("water")) paint["line-color"] = PALETTE.water;
  } else if (rawLayer.type === "symbol" && (rawLayer.layout?.["text-field"] || "text-color" in paint)) {
    paint["text-color"] = PALETTE.label;
    paint["text-halo-color"] = PALETTE.labelHalo;
    paint["text-halo-width"] = 1.2;
  }

  return { ...rawLayer, paint };
}

export async function loadCozyMapStyle(signal?: AbortSignal): Promise<StyleSpecification> {
  const response = await fetch("https://tiles.openfreemap.org/styles/positron", { signal });
  if (!response.ok) throw new Error("Could not load the base style to theme");
  const style = (await response.json()) as StyleSpecification & { layers: LooseLayer[] };
  return { ...style, layers: style.layers.map(restyleLayer) } as unknown as StyleSpecification;
}
