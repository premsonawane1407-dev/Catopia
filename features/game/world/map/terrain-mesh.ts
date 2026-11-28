// The raised ground of a map as geometry: flat tops at each height (the ground shader paints them, since it works from
// world position) and vertical walls, "risers", wherever a square is higher than its neighbour: the retaining walls of
// a terrace, the face of a quay, every step of a stair. Plain geometry maths: the caller gives it a material.
import { BufferGeometry, Float32BufferAttribute } from "three";
import { heightColliders, type TerrainGrid } from "./terrain";

/** Smallest height difference that gets a wall (anything smaller is the same floor). */
const MIN_RISE = 0.004;

class Quads {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  count = 0;

  /** A quad from four corners given in order around it; `n` is the way it faces. */
  add(a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number], n: [number, number, number]): void {
    // Wind the triangles so they face along n.
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const facing = cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] > 0;
    const tris = facing ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
    for (const v of tris) {
      this.positions.push(...v);
      this.normals.push(...n);
    }
    this.count++;
  }

  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    g.setAttribute("normal", new Float32BufferAttribute(this.normals, 3));
    if (this.count) {
      g.computeBoundingBox();
      g.computeBoundingSphere();
    }
    return g;
  }
}

export interface TerrainGeometry {
  /** The flat tops of every raised block, each at its height. */
  tops: BufferGeometry;
  /** The vertical walls between a square and a lower neighbour. */
  risers: BufferGeometry;
  /** Quads in each, for checks. */
  topCount: number;
  riserCount: number;
}

export function buildTerrainGeometry(grid: TerrainGrid): TerrainGeometry {
  const tops = new Quads();
  for (const box of heightColliders(grid)) {
    if (box.kind !== "box" || box.height === undefined) continue;
    const y = box.height;
    const x0 = box.x - box.hx;
    const x1 = box.x + box.hx;
    const z0 = box.z - box.hz;
    const z1 = box.z + box.hz;
    tops.add([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0]);
  }

  const risers = new Quads();
  const h = (c: number, r: number): number => (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows ? 0 : grid.height[r * grid.cols + c]);
  const x = (c: number) => grid.minX + c * grid.cell;
  const z = (r: number) => grid.minZ + r * grid.cell;

  // Walls facing +x and -x: scan each column edge down the rows, merging squares with the same two heights.
  for (const dir of [1, -1] as const) {
    for (let c = 0; c < grid.cols; c++) {
      let r = 0;
      while (r < grid.rows) {
        const top = h(c, r);
        const low = h(c + dir, r);
        if (top - low <= MIN_RISE) {
          r++;
          continue;
        }
        let r1 = r;
        while (r1 + 1 < grid.rows && Math.abs(h(c, r1 + 1) - top) < 1e-6 && Math.abs(h(c + dir, r1 + 1) - low) < 1e-6) r1++;
        const wx = dir === 1 ? x(c + 1) : x(c);
        risers.add([wx, low, z(r)], [wx, low, z(r1 + 1)], [wx, top, z(r1 + 1)], [wx, top, z(r)], [dir, 0, 0]);
        r = r1 + 1;
      }
    }
  }
  // Walls facing +z and -z.
  for (const dir of [1, -1] as const) {
    for (let r = 0; r < grid.rows; r++) {
      let c = 0;
      while (c < grid.cols) {
        const top = h(c, r);
        const low = h(c, r + dir);
        if (top - low <= MIN_RISE) {
          c++;
          continue;
        }
        let c1 = c;
        while (c1 + 1 < grid.cols && Math.abs(h(c1 + 1, r) - top) < 1e-6 && Math.abs(h(c1 + 1, r + dir) - low) < 1e-6) c1++;
        const wz = dir === 1 ? z(r + 1) : z(r);
        risers.add([x(c), low, wz], [x(c1 + 1), low, wz], [x(c1 + 1), top, wz], [x(c), top, wz], [0, 0, dir]);
        c = c1 + 1;
      }
    }
  }
  return { tops: tops.geometry(), risers: risers.geometry(), topCount: tops.count, riserCount: risers.count };
}
