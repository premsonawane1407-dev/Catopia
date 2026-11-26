// Merges the street's model pieces into a handful of meshes. Every piece with the same surface (same
// pixel-art pattern and tint) shares one material, so all of them can be baked into one geometry.
// The Phase 0 street drew about 500 objects a frame; this draws one mesh per surface.
import { BufferGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { surfaceFor, surfaceKey, type PieceName, type Surface } from "./pieces";
import type { Vec3 } from "./stage-constants";

export interface Placement {
  piece: PieceName;
  position: Vec3;
  /** Turn about the vertical axis, in radians. */
  rotationY?: number;
  scale?: number | Vec3;
}

export interface StaticBatch {
  /** Identifies the surface (pattern + tint) every piece in this batch shares. */
  key: string;
  surface: Surface;
  /** All the pieces, already moved into world space, as one indexed geometry. */
  geometry: BufferGeometry;
  pieceCount: number;
  triangleCount: number;
}

const UP = new Vector3(0, 1, 0);

/** Where something stands: used for model pieces and for the props built in code. */
export type Transform = Pick<Placement, "position" | "rotationY" | "scale">;

/** Scale first, then turn, then move: the same order three.js uses for an object's own transform. */
export function placementMatrix(placement: Transform, target = new Matrix4()): Matrix4 {
  const s = placement.scale ?? 1;
  const scale = typeof s === "number" ? new Vector3(s, s, s) : new Vector3(s[0], s[1], s[2]);
  const [x, y, z] = placement.position;
  return target.compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(UP, placement.rotationY ?? 0), scale);
}

export function triangleCountOf(geometry: BufferGeometry): number {
  return (geometry.index ? geometry.index.count : geometry.getAttribute("position").count) / 3;
}

/**
 * Groups placements by surface and merges each group into one geometry. The source geometries are
 * not modified, so the same loaded pieces can be placed again later.
 */
export function batchPlacements(placements: readonly Placement[], geometries: ReadonlyMap<string, BufferGeometry>): StaticBatch[] {
  const groups = new Map<string, Placement[]>();
  for (const placement of placements) {
    const key = surfaceKey(placement.piece);
    const group = groups.get(key);
    if (group) group.push(placement);
    else groups.set(key, [placement]);
  }

  const matrix = new Matrix4();
  const batches: StaticBatch[] = [];
  for (const [key, group] of groups) {
    const parts = group.map((placement) => {
      const source = geometries.get(placement.piece);
      if (!source) throw new Error(`No geometry loaded for piece "${placement.piece}"`);
      return source.clone().applyMatrix4(placementMatrix(placement, matrix));
    });
    const geometry = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (!geometry) throw new Error(`Could not merge the pieces for surface "${key}": their attributes differ`);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    batches.push({ key, surface: surfaceFor(group[0].piece), geometry, pieceCount: group.length, triangleCount: triangleCountOf(geometry) });
  }
  return batches;
}
