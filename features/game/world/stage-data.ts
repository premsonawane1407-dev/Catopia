// The invented market-street corner (a labelled placeholder, not the real campus) as plain data.
// Phase 3 replaces this with the data-driven map format; until then it is the render test bed.
import type { PieceName } from "./pieces";
import type { Vec3 } from "./stage-constants";
import type { Placement } from "./static-batch";

const HALF_PI = Math.PI / 2;

export type HouseStyle = "stone" | "wood";
export type WindowKey = "a" | "b" | "s";

export interface WindowSpec {
  x: number;
  level: number;
  /** World z of the wall face the window sits on. */
  z: number;
  key: WindowKey;
  /** One window has a cat silhouette watching the street. */
  cat?: boolean;
}

export interface HouseSpec {
  x0: number;
  cols: number;
  zFront: number;
  depth: number;
  style: HouseStyle;
  /** One string per floor, one letter per column: c corner, w wall, d door, a/b/s windows. */
  floors: string[];
  roof: PieceName;
  roofScaleY?: number;
  chimneyAt?: number;
}

const NAMES: Record<HouseStyle, Record<string, PieceName>> = {
  stone: { w: "wall", c: "wall-corner", d: "wall-door", a: "wall-window-shutters", b: "wall-window-glass", s: "wall-window-small" },
  wood: { w: "wall-wood", c: "wall-wood-corner", d: "wall-wood-door", a: "wall-wood-window-shutters", b: "wall-wood-window-glass", s: "wall-wood-window-small" },
};

const isWindowKey = (k: string): k is WindowKey => k === "a" || k === "b" || k === "s";

/** Expands a house description into wall, roof and chimney placements plus its window positions. */
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
    placements.push({ piece: h.roof, position: [h.x0 + i, top, roofZ], scale: [1, h.roofScaleY ?? 1.35, h.depth] });
  }
  if (h.chimneyAt !== undefined) placements.push({ piece: "chimney", position: [h.x0 + h.chimneyAt, top + 0.35, roofZ - 0.2], scale: 1.2 });
  return { placements, windows };
}

export const HOUSES: HouseSpec[] = [
  { x0: -6, cols: 5, zFront: -2, depth: 2, style: "stone", floors: ["cabdc", "csabc"], roof: "roof-gable", chimneyAt: 1 },
  { x0: 2, cols: 4, zFront: -2, depth: 2, style: "wood", floors: ["cdac", "cabc"], roof: "roof-high-gable", roofScaleY: 0.85, chimneyAt: 2 },
  { x0: -1, cols: 3, zFront: -7, depth: 2, style: "stone", floors: ["cdc", "cac"], roof: "roof-gable" },
  // A far row of houses so the top of the frame is town, not empty cobbles. They sit in the blur.
  { x0: -11, cols: 6, zFront: -10, depth: 2, style: "wood", floors: ["cabdac", "csabsc"], roof: "roof-gable", chimneyAt: 3 },
  { x0: 4, cols: 6, zFront: -10, depth: 2, style: "stone", floors: ["cbdasc", "casbac"], roof: "roof-high-gable", roofScaleY: 0.85, chimneyAt: 2 },
];

/** Heads of the street lamps: real point lights (as many as the quality tier allows) and glow halos. */
export const LAMP_HEADS: Vec3[] = [
  [2.0, 1.15, -0.2],
  [-2.3, 1.15, -0.1],
  [4.6, 1.15, 1.9],
  [-4.6, 1.15, 2.0],
];

const scenery: Placement[] = [
  // Market stalls and the cart.
  { piece: "stall-red", position: [-3.4, 0, 1.5], rotationY: 0.25 },
  { piece: "stall-green", position: [3.3, 0, 1.2], rotationY: -0.3 },
  { piece: "cart-high", position: [-1.5, 0, -0.55], rotationY: 0.5 },
  { piece: "stall-bench", position: [-3.3, 0, 2.3], rotationY: HALF_PI },
  // Lamp posts (scaled down from the stock 1.56 units).
  ...LAMP_HEADS.map<Placement>((p) => ({ piece: "lantern", position: [p[0], 0, p[2]], scale: 0.8 })),
  // Greenery, fence and hedge.
  { piece: "tree", position: [-6.4, 0, 0.2], scale: 0.85 },
  { piece: "tree-high", position: [6.4, 0, -0.2], scale: 0.8 },
  { piece: "tree-crooked", position: [-2, 0, -4.6], scale: 0.8 },
  { piece: "tree", position: [2.6, 0, -5], scale: 0.8 },
  ...[-6, -5, -4].map<Placement>((x) => ({ piece: "fence", position: [x, 0, 2.1], rotationY: -HALF_PI })),
  { piece: "hedge", position: [5.5, 0, 1.7], rotationY: -HALF_PI },
  // Big, near objects at the bottom corners: the blur turns them into soft framing. Their positions
  // were worked out by projecting through the camera: only tall things at z ~ 5.4 and low things at
  // z ~ 3.5 land in the bottom edge of the frame.
  { piece: "lantern", position: [-3.0, 0, 5.4], scale: 2.3 },
  { piece: "lantern", position: [3.1, 0, 5.4], scale: 2.3 },
  { piece: "hedge", position: [2.6, 0, 3.6], rotationY: -HALF_PI, scale: 3.2 },
  { piece: "hedge", position: [1.6, 0, 3.6], rotationY: -HALF_PI, scale: 3.2 },
];

const built = HOUSES.map(buildHouse);

/** Every Kenney piece in the street. */
export const STAGE_PLACEMENTS: Placement[] = [...built.flatMap((b) => b.placements), ...scenery];
/** Every lit window. The cat watches from the first-floor window with shutters at x = 3. */
export const WINDOWS: WindowSpec[] = built.flatMap((b) => b.windows).map((w) => (w.x === 3 && w.level === 1 && w.key === "a" ? { ...w, cat: true } : w));

/** Soft light halos. `kind` decides how bright they are for the time of day. */
export interface GlowSpec {
  position: Vec3;
  size: number;
  kind: "lamp" | "far" | "foreground";
}
export const GLOWS: GlowSpec[] = [
  ...LAMP_HEADS.map<GlowSpec>((position) => ({ position, size: 1.4, kind: "lamp" })),
  { position: [0, 0.9, -5.3], size: 0.6, kind: "far" },
  { position: [-3.0, 3.3, 5.4], size: 2.7, kind: "foreground" },
  { position: [3.1, 3.3, 5.4], size: 2.7, kind: "foreground" },
];

// Hand-placed props built in code (no model files), merged into two meshes.
export interface CrateSpec { position: Vec3; rotationY: number; size: number }
export interface BarrelSpec { position: Vec3; scale: number }
export interface ProduceSpec { position: Vec3; rotationY: number; seed: number }
export interface PotSpec { position: Vec3; seed: number; scale: number }

export const CRATES: CrateSpec[] = [
  { position: [-4.3, 0, 1.2], rotationY: 0.4, size: 0.26 },
  { position: [-4.3, 0.26, 1.2], rotationY: -0.3, size: 0.2 },
  { position: [2.2, 0, 1.6], rotationY: 0.2, size: 0.22 },
  { position: [-2.9, 0, 3.7], rotationY: 0.5, size: 0.7 },
  { position: [3.9, 0, 3.6], rotationY: -0.4, size: 0.75 },
];
export const BARRELS: BarrelSpec[] = [
  { position: [-2.5, 0, 1.0], scale: 1 },
  { position: [4.4, 0, 0.3], scale: 1.1 },
  { position: [1.6, 0, -1.25], scale: 0.9 },
  { position: [-3.9, 0, 3.55], scale: 2.4 },
];
export const PRODUCE: ProduceSpec[] = [
  { position: [2.75, 0, 1.75], rotationY: 0.2, seed: 3 },
  { position: [3.35, 0, 1.85], rotationY: -0.25, seed: 6 },
  { position: [-2.9, 0, 1.95], rotationY: 0.4, seed: 9 },
];
export const POTS: PotSpec[] = [
  { position: [-3.55, 0, -1.3], seed: 1, scale: 1 },
  { position: [-2.45, 0, -1.3], seed: 2, scale: 1 },
  { position: [2.55, 0, -1.3], seed: 3, scale: 1 },
  { position: [3.45, 0, -1.3], seed: 4, scale: 1 },
  { position: [-1.6, 0, 3.6], seed: 5, scale: 2.6 },
];

/** Strings of triangular flags hanging between two points across the market. */
export interface BuntingString { from: Vec3; to: Vec3; sag: number; flags: number; size: number }
export const BUNTING: BuntingString[] = [
  { from: [-1.5, 1.85, -1.4], to: [1.5, 1.85, -1.4], sag: 0.22, flags: 12, size: 0.11 },
  { from: [-1.5, 1.45, -1.45], to: [1.5, 1.6, -1.45], sag: 0.3, flags: 11, size: 0.1 },
];

export interface PosterSpec { position: Vec3; seed: number; rotationZ: number }
export const POSTERS: PosterSpec[] = [
  { position: [-2.0, 0.62, -1.47], seed: 1, rotationZ: 0.05 },
  { position: [-2.0, 1.55, -1.47], seed: 2, rotationZ: -0.04 },
];
export const SIGN_POSITION: Vec3 = [1.56, 1.38, -1.36];
