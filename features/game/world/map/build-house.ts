// Expands a house description (a footprint and a letter per wall panel) into wall, roof and chimney placements
// plus the positions of its lit windows.
import type { PieceName } from "../pieces";
import type { Placement } from "../static-batch";
import type { HouseSpec } from "./map-schema";

const HALF_PI = Math.PI / 2;

export type WindowKey = "a" | "b" | "s";

export interface WindowSpec {
  x: number;
  level: number;
  /** World z of the wall face the window sits on. */
  z: number;
  key: WindowKey;
  /** One window has a cat silhouette watching the street. */
  cat?: boolean;
  /** How high the house stands above the base level (the ground it is built on). */
  base?: number;
}

const NAMES: Record<HouseSpec["style"], Record<string, PieceName>> = {
  stone: { w: "wall", c: "wall-corner", d: "wall-door", a: "wall-window-shutters", b: "wall-window-glass", s: "wall-window-small" },
  wood: { w: "wall-wood", c: "wall-wood-corner", d: "wall-wood-door", a: "wall-wood-window-shutters", b: "wall-wood-window-glass", s: "wall-wood-window-small" },
};

const isWindowKey = (k: string): k is WindowKey => k === "a" || k === "b" || k === "s";

export function buildHouse(h: HouseSpec): { placements: Placement[]; windows: WindowSpec[] } {
  const names = NAMES[h.style];
  const placements: Placement[] = [];
  const windows: WindowSpec[] = [];
  h.floors.forEach((row, level) => {
    for (let i = 0; i < h.cols; i++) {
      const x = h.x0 + i;
      const key = row[i];
      // Front row: panels face +Z, so the panel sits on the cell's +Z edge (rotate -90deg).
      if (key === "c") {
        placements.push({ piece: names.c, position: [x, level, h.zFront], rotationY: i === 0 ? -HALF_PI : 0 });
      } else {
        placements.push({ piece: names[key] ?? names.w, position: [x, level, h.zFront], rotationY: -HALF_PI });
        if (isWindowKey(key)) windows.push({ x, level, z: h.zFront + 0.5, key });
      }
      // Rows behind the front: side walls, back corners and the back wall.
      for (let j = 1; j < h.depth; j++) {
        const z = h.zFront - j;
        const last = j === h.depth - 1;
        if (i === 0) placements.push({ piece: last ? names.c : names.w, position: [x, level, z], rotationY: Math.PI });
        else if (i === h.cols - 1) placements.push({ piece: last ? names.c : names.w, position: [x, level, z], rotationY: last ? HALF_PI : 0 });
        else if (last) placements.push({ piece: names.w, position: [x, level, z], rotationY: HALF_PI });
      }
    }
  });
  const top = h.floors.length;
  const roofZ = h.zFront - (h.depth - 1) / 2;
  for (let i = 0; i < h.cols; i++) {
    placements.push({ piece: h.roof, position: [h.x0 + i, top, roofZ], scale: [1, h.roofScaleY ?? 1.35, h.depth], ...(h.roofColor ? { variant: h.roofColor } : {}) });
  }
  if (h.chimneyAt !== undefined) placements.push({ piece: "chimney", position: [h.x0 + h.chimneyAt, top + 0.35, roofZ - 0.2], scale: 1.2 });
  return { placements, windows };
}
