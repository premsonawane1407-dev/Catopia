// Geometry for the lit windows. Every pane of one kind is a quad in one shared mesh whose texture is an
// atlas of pane designs. The warm light coming out of the windows is two more merged meshes: a soft halo
// around every pane and a pool of light on the cobbles in front of the ground-floor ones. About twenty
// windows therefore cost five draw calls instead of the Phase 0 sixty-odd. The halo and the pool carry the
// same per-window phase as their pane, so a window and its light breathe together.
import { BufferGeometry, Float32BufferAttribute } from "three";
import { PANE_CELL, paneUsesNarrowCell } from "../render/pixel-textures";
import type { Vec3 } from "./stage-constants";
import type { WindowKey, WindowSpec } from "./stage-data";

/** Pane size by window kind: width, height and the height of its centre above the floor of its storey. */
export const PANE_SIZE: Record<WindowKey, readonly [number, number, number]> = {
  a: [0.42, 0.4, 0.58],
  b: [0.3, 0.32, 0.58],
  s: [0.2, 0.3, 0.6],
};

/** How many different pane designs rotate between windows of one kind. */
export const PANE_VARIANTS = 5;
/** One extra atlas cell holds the design with the cat silhouette. */
export const PANE_CELLS = PANE_VARIANTS + 1;
export const CAT_CELL = PANE_VARIANTS;

/** Where the window light sits relative to a pane (world units). The panes themselves stand just off the wall. */
const PANE_Z = 0.02;
/**
 * The halo is a bit under twice as wide and twice as tall as the pane and sits a little lower, so the light
 * seems to bleed down the wall from the sill. It stays behind the pane and inside the wall panel, and its
 * brightness reaches zero before its edge, so the posts and frames at the panel's sides never cut it off.
 */
const HALO = { widthScale: 1.9, heightScale: 2.0, lower: 0.1, z: PANE_Z - 0.008 } as const;
/** The pool starts about as wide as the pane (see `poolAlpha`) and runs 1.25 units out from the wall. */
const GROUND_SPILL = { widthScale: 1.8, depth: 1.25, y: 0.012, z: PANE_Z + 0.64 } as const;

type Quad = readonly [Vec3, Vec3, Vec3, Vec3];

/** Accumulates quads (two triangles each) with texture coordinates and, optionally, a per-quad phase. */
class QuadSet {
  readonly positions: number[] = [];
  readonly uvs: number[] = [];
  readonly phases: number[] = [];
  readonly indices: number[] = [];
  count = 0;

  add(corners: Quad, uv: readonly [number, number, number, number], phase: number): void {
    const base = this.count * 4;
    // Corners run bottom-left, bottom-right, top-right, top-left; uv is [u0, v0, u1, v1].
    const [u0, v0, u1, v1] = uv;
    const uvCorners = [u0, v0, u1, v0, u1, v1, u0, v1];
    for (let i = 0; i < 4; i++) {
      this.positions.push(...corners[i]);
      this.uvs.push(uvCorners[i * 2], uvCorners[i * 2 + 1]);
      this.phases.push(phase);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.count++;
  }

  build(withPhase: boolean): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    g.setAttribute("uv", new Float32BufferAttribute(this.uvs, 2));
    if (withPhase) g.setAttribute("aPhase", new Float32BufferAttribute(this.phases, 1));
    g.setIndex(this.indices);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

/** A quad standing upright on a wall that faces +Z. */
function wallQuad(cx: number, cy: number, z: number, w: number, h: number): Quad {
  return [
    [cx - w / 2, cy - h / 2, z],
    [cx + w / 2, cy - h / 2, z],
    [cx + w / 2, cy + h / 2, z],
    [cx - w / 2, cy + h / 2, z],
  ];
}

/** A quad lying flat on the ground, its top edge (v = 1) toward the wall at smaller z. */
function groundQuad(cx: number, y: number, cz: number, w: number, d: number): Quad {
  return [
    [cx - w / 2, y, cz + d / 2],
    [cx + w / 2, y, cz + d / 2],
    [cx + w / 2, y, cz - d / 2],
    [cx - w / 2, y, cz - d / 2],
  ];
}

/** Which atlas cell a window uses: designs take turns, and the cat window always gets the cat cell. */
export function paneCell(ordinal: number, hasCat: boolean): number {
  return hasCat ? CAT_CELL : ordinal % PANE_VARIANTS;
}

/** The horizontal slice of the atlas for one cell: narrow panes only use the left part of their cell. */
export function paneUvRange(kind: WindowKey, cell: number): [number, number] {
  const narrow = paneUsesNarrowCell(kind);
  const width = narrow ? 16 / PANE_CELL.w : 1;
  return [cell / PANE_CELLS, (cell + width) / PANE_CELLS];
}

export interface WindowGeometries {
  /** One merged mesh per window kind that exists, each textured from its own atlas. */
  panes: Partial<Record<WindowKey, BufferGeometry>>;
  /** A soft glow around every pane. */
  halo: BufferGeometry;
  /** A pool of light on the cobbles in front of every ground-floor pane. */
  groundSpill: BufferGeometry;
}

export function buildWindowGeometries(windows: readonly WindowSpec[]): WindowGeometries {
  const panes: Record<WindowKey, QuadSet> = { a: new QuadSet(), b: new QuadSet(), s: new QuadSet() };
  const ordinals: Record<WindowKey, number> = { a: 0, b: 0, s: 0 };
  const halo = new QuadSet();
  const ground = new QuadSet();

  windows.forEach((w, index) => {
    const [pw, ph, cy] = PANE_SIZE[w.key];
    const phase = index * 1.9 + 0.7;
    const cell = paneCell(ordinals[w.key], w.cat === true);
    if (!w.cat) ordinals[w.key]++;
    const [u0, u1] = paneUvRange(w.key, cell);
    panes[w.key].add(wallQuad(w.x, w.level + cy, w.z + PANE_Z, pw, ph), [u0, 0, u1, 1], phase);
    halo.add(wallQuad(w.x, w.level + cy - HALO.lower, w.z + HALO.z, pw * HALO.widthScale, ph * HALO.heightScale), [0, 0, 1, 1], phase);
    if (w.level === 0) ground.add(groundQuad(w.x, GROUND_SPILL.y, w.z + GROUND_SPILL.z, pw * GROUND_SPILL.widthScale, GROUND_SPILL.depth), [0, 0, 1, 1], phase);
  });

  const result: Partial<Record<WindowKey, BufferGeometry>> = {};
  for (const kind of ["a", "b", "s"] as const) if (panes[kind].count > 0) result[kind] = panes[kind].build(true);
  return { panes: result, halo: halo.build(true), groundSpill: ground.build(true) };
}
