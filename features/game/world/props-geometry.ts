// Small props built in code (no model files), merged into a few meshes that share the street's surface
// materials: `wood` (crates and barrels, which wear the plank pattern) and `plain` (iron hoops, fruit,
// flower pots). Colour is baked into the vertices, so a whole market of props costs two draw calls.
import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Matrix4, TorusGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Vec3 } from "./stage-constants";
import { BARRELS, CRATES, POTS, PRODUCE, type BarrelSpec, type BuntingString, type CrateSpec, type PotSpec, type ProduceSpec } from "./stage-data";
import { placementMatrix } from "./static-batch";

export interface PropSpecs {
  crates: readonly CrateSpec[];
  barrels: readonly BarrelSpec[];
  produce: readonly ProduceSpec[];
  pots: readonly PotSpec[];
}

export const DEFAULT_PROP_SPECS: PropSpecs = { crates: CRATES, barrels: BARRELS, produce: PRODUCE, pots: POTS };

export interface PropGeometries {
  /** Wooden things: they get the plank pattern. */
  wood: BufferGeometry;
  /** Everything else: iron hoops, fruit, clay pots, leaves and flowers. */
  plain: BufferGeometry;
}

const CRATE_WOOD = "#a8703f";
const BARREL_WOOD = "#8a5a33";
const IRON = "#4a4650";
const CLAY = "#b65a35";
const LEAVES = "#3f7a3a";
const FRUIT_COLORS = ["#d23b2a", "#f08a24", "#7a3a8a", "#6aa84f", "#e8c33a", "#c9506a"];
const FLOWER_COLORS = ["#f06a8a", "#f4d03f", "#f4f0e0", "#a56be0", "#ff9a3c"];
const BUNTING_COLORS = ["#d9573b", "#f0b441", "#3a9a8a", "#e9e0c8", "#c9506a"];

/** The small repeatable random sequence the Phase 0 look test used, so the props look the way they were approved. */
export function lcg(start: number): () => number {
  let s = start;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Collects pieces, bakes a colour into each one's vertices and merges them. */
class PartList {
  private readonly parts: BufferGeometry[] = [];

  add(source: BufferGeometry, color: string | Color, matrix?: Matrix4): void {
    // The primitives mix indexed and plain triangle lists; merging needs them all the same.
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    if (matrix) geometry.applyMatrix4(matrix);
    const c = typeof color === "string" ? new Color(color) : color;
    const count = geometry.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    this.parts.push(geometry);
  }

  merge(): BufferGeometry {
    if (this.parts.length === 0) return new BufferGeometry();
    const merged = mergeGeometries(this.parts, false);
    for (const part of this.parts) part.dispose();
    if (!merged) throw new Error("Could not merge the prop geometry: attributes differ");
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  }
}

const lathe = (points: [number, number][], segments: number) => new LatheGeometry(points.map(([r, y]) => new Vector2(r, y)), segments);

export function buildPropGeometries(specs: PropSpecs = DEFAULT_PROP_SPECS): PropGeometries {
  const wood = new PartList();
  const plain = new PartList();

  // Crates: a unit cube, scaled to size and stood on the ground.
  const cube = new BoxGeometry(1, 1, 1);
  for (const c of specs.crates) {
    wood.add(cube, CRATE_WOOD, placementMatrix({ position: [c.position[0], c.position[1] + c.size / 2, c.position[2]], rotationY: c.rotationY, scale: c.size }));
  }

  // Barrels: a lathe-turned body with two iron hoops.
  const barrel = lathe([[0, 0], [0.105, 0], [0.125, 0.05], [0.15, 0.17], [0.125, 0.3], [0.105, 0.34], [0, 0.34]], 14);
  const hoop = new TorusGeometry(0.132, 0.011, 6, 18);
  const hoopTurn = new Matrix4().makeRotationX(Math.PI / 2);
  for (const b of specs.barrels) {
    const base = placementMatrix({ position: b.position, scale: b.scale });
    wood.add(barrel, BARREL_WOOD, base);
    for (const y of [0.07, 0.27]) plain.add(hoop, IRON, base.clone().multiply(new Matrix4().makeTranslation(0, y, 0)).multiply(hoopTurn));
  }

  // Produce crates: a low box heaped with nine pieces of fruit.
  const lowBox = new BoxGeometry(0.28, 0.18, 0.28);
  const fruit = new IcosahedronGeometry(0.04, 1);
  for (const p of specs.produce) {
    const group = placementMatrix({ position: p.position, rotationY: p.rotationY });
    wood.add(lowBox, CRATE_WOOD, group.clone().multiply(new Matrix4().makeTranslation(0, 0.09, 0)));
    const rand = lcg(p.seed * 9301 + 49297);
    const base = FRUIT_COLORS[Math.floor(rand() * FRUIT_COLORS.length)];
    for (let i = 0; i < 9; i++) {
      const x = ((i % 3) - 1) * 0.075 + (rand() - 0.5) * 0.02;
      const z = (Math.floor(i / 3) - 1) * 0.075 + (rand() - 0.5) * 0.02;
      const y = 0.2 + rand() * 0.03;
      const color = rand() < 0.75 ? base : FRUIT_COLORS[Math.floor(rand() * FRUIT_COLORS.length)];
      plain.add(fruit, color, group.clone().multiply(new Matrix4().makeTranslation(x, y, z)));
    }
  }

  // Flower pots: a clay pot, a ball of leaves and a handful of blooms.
  const pot = lathe([[0, 0], [0.07, 0], [0.095, 0.16], [0.11, 0.17], [0.11, 0.2], [0.09, 0.2], [0, 0.18]], 10);
  const foliage = new IcosahedronGeometry(0.1, 1);
  const bloom = new IcosahedronGeometry(0.03, 0);
  for (const p of specs.pots) {
    const group = placementMatrix({ position: p.position, scale: p.scale });
    plain.add(pot, CLAY, group);
    plain.add(foliage, LEAVES, group.clone().multiply(new Matrix4().makeTranslation(0, 0.24, 0)).multiply(new Matrix4().makeScale(1, 0.7, 1)));
    const rand = lcg(p.seed * 7919 + 17);
    for (let i = 0; i < 11; i++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.075;
      const y = 0.24 + rand() * 0.09;
      // The look test lit blooms slightly from within; here that is a little extra brightness in the colour.
      const color = new Color(FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)]).multiplyScalar(1.18);
      plain.add(bloom, color, group.clone().multiply(new Matrix4().makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r)));
    }
  }

  return { wood: wood.merge(), plain: plain.merge() };
}

/** Triangular flags hanging in a curve between two points: position and colour, no normals (drawn unlit). */
export function buildBuntingGeometry(strings: readonly BuntingString[]): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  for (const { from, to, sag, flags, size } of strings) {
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const length = Math.hypot(dx, dz);
    const ux = dx / length;
    const uz = dz / length;
    for (let i = 0; i < flags; i++) {
      const t = (i + 0.5) / flags;
      const cx = from[0] + dx * t;
      const cz = from[2] + dz * t;
      const cy = from[1] + (to[1] - from[1]) * t - sag * 4 * t * (1 - t);
      const half = size * 0.5;
      positions.push(cx - ux * half, cy, cz - uz * half, cx + ux * half, cy, cz + uz * half, cx, cy - size * 1.1, cz);
      // The look test fed these hex values straight in as vertex colours, without the sRGB-to-linear
      // conversion, which renders the flags lighter and pastel. That is the look that was approved, so it stays.
      const hex = BUNTING_COLORS[i % BUNTING_COLORS.length];
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      for (let k = 0; k < 3; k++) colors.push(r, g, b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** The two thin chains the shop sign hangs from, as one geometry in the swinging group's own space. */
export function buildSignChains(): BufferGeometry {
  const chains = new PartList();
  const link = new BoxGeometry(0.006, 0.1, 0.006);
  for (const x of [-0.11, 0.11]) chains.add(link, "#2a2a2a", new Matrix4().makeTranslation(x, -0.05, 0));
  return chains.merge();
}

export const SIGN_BOARD_SIZE: Vec3 = [0.34, 0.22, 0.03];
