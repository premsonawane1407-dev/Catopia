// The ground of a map as a grid: which surface is under each square and how high it stands. Maps describe it as a
// base surface plus painted strokes (map-schema.ts): rectangles and discs that set a surface, a height or both, and
// flights of stairs. This turns that into grids the ground shader and mesh read and the loader asks questions of
// (is there water here? how high is the floor? what can the cat walk onto?). Plain data and maths, no rendering.
import type { Collider } from "../../player/colliders";
import { SURFACES, type MapData, type Surface } from "./map-schema";

export interface TerrainGrid {
  cols: number;
  rows: number;
  /** Side of a square in world units. */
  cell: number;
  /** World position of the grid's minimum corner. */
  minX: number;
  minZ: number;
  /** Row-major (z rows of x columns): an index into SURFACES. */
  data: Uint8Array;
  /** The same shape: how high each square's floor is, in world units above the base level. */
  height: Float32Array;
}

export const surfaceIndex = (s: Surface): number => SURFACES.indexOf(s);

/** Paints the terrain description into grids. A square takes a stroke when its centre is inside it. */
export function rasterizeTerrain(terrain: MapData["terrain"]): TerrainGrid {
  const [w, d] = terrain.size;
  const cell = terrain.cell;
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(d / cell);
  const [cx, cz] = terrain.center ?? [0, 0];
  const minX = cx - w / 2;
  const minZ = cz - d / 2;
  const data = new Uint8Array(cols * rows).fill(surfaceIndex(terrain.surface));
  const height = new Float32Array(cols * rows);
  for (const stroke of terrain.paint) {
    const surface = stroke.surface === undefined ? null : surfaceIndex(stroke.surface);
    for (let r = 0; r < rows; r++) {
      const z = minZ + (r + 0.5) * cell;
      for (let c = 0; c < cols; c++) {
        const x = minX + (c + 0.5) * cell;
        const inRect = stroke.rect && x >= stroke.rect.minX && x <= stroke.rect.maxX && z >= stroke.rect.minZ && z <= stroke.rect.maxZ;
        const inCircle = stroke.circle && Math.hypot(x - stroke.circle.x, z - stroke.circle.z) <= stroke.circle.r;
        const inEllipse = stroke.ellipse && ((x - stroke.ellipse.x) / stroke.ellipse.rx) ** 2 + ((z - stroke.ellipse.z) / stroke.ellipse.rz) ** 2 <= 1;
        if (!inRect && !inCircle && !inEllipse) continue;
        const i = r * cols + c;
        if (surface !== null) data[i] = surface;
        if (stroke.height !== undefined) height[i] = stroke.height;
        if (stroke.stairs) {
          const { axis, from, to, tread } = stroke.stairs;
          const lo = stroke.rect ? (axis === "x" ? stroke.rect.minX : stroke.rect.minZ) : stroke.circle ? (axis === "x" ? stroke.circle.x - stroke.circle.r : stroke.circle.z - stroke.circle.r) : axis === "x" ? stroke.ellipse!.x - stroke.ellipse!.rx : stroke.ellipse!.z - stroke.ellipse!.rz;
          const hi = stroke.rect ? (axis === "x" ? stroke.rect.maxX : stroke.rect.maxZ) : stroke.circle ? (axis === "x" ? stroke.circle.x + stroke.circle.r : stroke.circle.z + stroke.circle.r) : axis === "x" ? stroke.ellipse!.x + stroke.ellipse!.rx : stroke.ellipse!.z + stroke.ellipse!.rz;
          const treads = Math.max(1, Math.round((hi - lo) / tread));
          const k = Math.min(treads - 1, Math.max(0, Math.floor(((axis === "x" ? x : z) - lo) / ((hi - lo) / treads))));
          height[i] = from + ((to - from) * (k + 1)) / treads;
        }
      }
    }
  }
  return { cols, rows, cell, minX, minZ, data, height };
}

const clampCell = (grid: TerrainGrid, x: number, z: number): number => {
  const c = Math.min(grid.cols - 1, Math.max(0, Math.floor((x - grid.minX) / grid.cell)));
  const r = Math.min(grid.rows - 1, Math.max(0, Math.floor((z - grid.minZ) / grid.cell)));
  return r * grid.cols + c;
};

/** The surface under a point (anything off the grid counts as the nearest edge square). */
export function surfaceAt(grid: TerrainGrid, x: number, z: number): Surface {
  return SURFACES[grid.data[clampCell(grid, x, z)]];
}

/** How high the floor is at a point, in world units. */
export function heightAt(grid: TerrainGrid, x: number, z: number): number {
  return grid.height[clampCell(grid, x, z)];
}

/** Boxes covering every square for which `pick` is true, merged into few: runs along x, joined down the rows where they line up. */
function mergedBoxes(grid: TerrainGrid, pick: (index: number) => number | null, id: (n: number) => string, heightOf?: (index: number) => number | undefined): Collider[] {
  type Run = { c0: number; c1: number; r0: number; r1: number; key: number; h?: number };
  const open: Run[] = [];
  const done: Run[] = [];
  for (let r = 0; r < grid.rows; r++) {
    const runs: { c0: number; c1: number; key: number; h?: number }[] = [];
    let start = -1;
    let startKey = 0;
    for (let c = 0; c <= grid.cols; c++) {
      const key = c < grid.cols ? pick(r * grid.cols + c) : null;
      if (start >= 0 && (key === null || key !== startKey)) {
        runs.push({ c0: start, c1: c - 1, key: startKey, h: heightOf?.(r * grid.cols + start) });
        start = -1;
      }
      if (key !== null && start < 0) {
        start = c;
        startKey = key;
      }
    }
    const next: Run[] = [];
    for (const run of runs) {
      const same = open.find((o) => o.c0 === run.c0 && o.c1 === run.c1 && o.key === run.key && o.r1 === r - 1);
      if (same) {
        same.r1 = r;
        next.push(same);
      } else next.push({ ...run, r0: r, r1: r });
    }
    for (const o of open) if (!next.includes(o)) done.push(o);
    open.length = 0;
    open.push(...next);
  }
  done.push(...open);
  return done.map((run, i) => {
    const x0 = grid.minX + run.c0 * grid.cell;
    const x1 = grid.minX + (run.c1 + 1) * grid.cell;
    const z0 = grid.minZ + run.r0 * grid.cell;
    const z1 = grid.minZ + (run.r1 + 1) * grid.cell;
    const box: Collider = { kind: "box", id: id(i), x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2 };
    if (run.h !== undefined) box.height = run.h;
    return box;
  });
}

/** Water is not walkable: one wall per merged block of water squares. */
/** `holes` are rectangles the cat may cross (under a bridge's roadway): the water there is not a wall. */
export function waterColliders(grid: TerrainGrid, holes: readonly { minX: number; maxX: number; minZ: number; maxZ: number }[] = []): Collider[] {
  const water = surfaceIndex("water");
  const open = (i: number) => {
    if (holes.length === 0) return false;
    const x = grid.minX + ((i % grid.cols) + 0.5) * grid.cell;
    const z = grid.minZ + (Math.floor(i / grid.cols) + 0.5) * grid.cell;
    return holes.some((h) => x >= h.minX && x <= h.maxX && z >= h.minZ && z <= h.maxZ);
  };
  return mergedBoxes(grid, (i) => (grid.data[i] === water && !open(i) ? 1 : null), (n) => `water-${n}`);
}

/**
 * Raised ground as solid blocks the cat can climb: one box per merged block of squares of the same height, as tall as
 * that height. A block no higher than a step is walked onto; a taller one is a wall seen from below, a floor from above,
 * and a flight of stairs is a run of blocks each a little higher than the last.
 */
export function heightColliders(grid: TerrainGrid): Collider[] {
  return mergedBoxes(
    grid,
    (i) => (grid.height[i] > 0.004 ? Math.round(grid.height[i] * 1000) : null),
    (n) => `ground-${n}`,
    (i) => grid.height[i],
  );
}
