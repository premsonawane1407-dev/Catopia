// Small props built in code (no model files), merged into a few meshes that share the street's surface
// materials: `wood` (crates and barrels, which wear the plank pattern) and `plain` (iron hoops, fruit,
// flower pots). Colour is baked into the vertices, so a whole market of props costs two draw calls.
import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Matrix4, SphereGeometry, TorusGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Vec3 } from "./stage-constants";
import type { PropSpecs } from "./map/load-map";
import type { BuntingString } from "./map/map-schema";
import { placementMatrix } from "./static-batch";
import { archHeight, deckHeight, face } from "./stone-geometry";

export interface PropGeometries {
  /** Masonry: bridges. It wears the stone pattern. */
  stone: BufferGeometry;
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

export function buildPropGeometries(specs: PropSpecs): PropGeometries {
  const wood = new PartList();
  const plain = new PartList();
  const stone = new PartList();

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

  // Awnings: canvas stripes sloping down and out from the wall, each with a valance hanging from its outer edge.
  const STRIPE = 0.1;
  const valanceBox = new BoxGeometry(1, 1, 1);
  for (const a of specs.awnings) {
    const group = placementMatrix({ position: a.position, rotationY: a.rotationY });
    const slope = Math.atan2(a.drop, a.reach);
    const length = Math.hypot(a.reach, a.drop);
    const count = Math.max(2, Math.round(a.width / STRIPE));
    const w = a.width / count;
    for (let i = 0; i < count; i++) {
      const color = a.colors[i % 2];
      const x = -a.width / 2 + w * (i + 0.5);
      // The slab: its middle is half way along the slope.
      const slab = group.clone().multiply(new Matrix4().makeTranslation(x, -a.drop / 2, a.reach / 2)).multiply(new Matrix4().makeRotationX(slope)).multiply(new Matrix4().makeScale(w, 0.012, length));
      plain.add(valanceBox, color, slab);
      // The valance: a short drop of cloth at the outer edge.
      const hang = group.clone().multiply(new Matrix4().makeTranslation(x, -a.drop - 0.03, a.reach)).multiply(new Matrix4().makeScale(w, 0.06, 0.012));
      plain.add(valanceBox, color, hang);
    }
    // Two thin poles at the outer corners hold it up.
    for (const side of [-1, 1]) {
      const pole = group.clone().multiply(new Matrix4().makeTranslation(side * (a.width / 2 - 0.02), -a.drop - 0.03 - 0.34, a.reach - 0.01)).multiply(new Matrix4().makeScale(0.016, 0.68, 0.016));
      wood.add(valanceBox, BARREL_WOOD, pole);
    }
  }

  // Flower boxes: a wooden trough under a window, soil, a row of leaves and a scatter of blooms.
  const trough = new BoxGeometry(1, 0.07, 0.09);
  const soil = new BoxGeometry(1, 0.012, 0.075);
  const tuft = new IcosahedronGeometry(0.035, 0);
  for (const p of specs.planters) {
    const group = placementMatrix({ position: p.position, rotationY: p.rotationY });
    wood.add(trough, BARREL_WOOD, group.clone().multiply(new Matrix4().makeScale(p.width, 1, 1)));
    plain.add(soil, "#4a3626", group.clone().multiply(new Matrix4().makeTranslation(0, 0.037, 0)).multiply(new Matrix4().makeScale(p.width * 0.96, 1, 1)));
    const rand = lcg(p.seed * 6151 + 11);
    const n = Math.max(4, Math.round(p.width / 0.055));
    for (let i = 0; i < n; i++) {
      const x = -p.width / 2 + p.width * ((i + 0.5) / n) + (rand() - 0.5) * 0.015;
      plain.add(tuft, LEAVES, group.clone().multiply(new Matrix4().makeTranslation(x, 0.065, (rand() - 0.5) * 0.03)).multiply(new Matrix4().makeScale(1, 0.8, 1)));
      if (rand() < 0.85) {
        const color = new Color(FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)]).multiplyScalar(1.18);
        plain.add(bloom, color, group.clone().multiply(new Matrix4().makeTranslation(x + (rand() - 0.5) * 0.02, 0.1 + rand() * 0.03, 0.01 + (rand() - 0.5) * 0.03)));
      }
    }
  }

  buildCafeProps(specs, wood, plain);
  buildFlowerClusters(specs, plain);
  buildTrees(specs, plain);
  buildHouseDetails(specs, wood, plain);
  buildBridges(specs, stone);
  buildBoats(specs, wood);
  return { wood: wood.merge(), plain: plain.merge(), stone: stone.merge() };
}

const DORMER_WALL = "#ece2c8";
const DORMER_FRAME = "#5a3a22";
const GLASS = "#f6d38a";
const IVY_GREENS = ["#2c6a2e", "#3a7d34", "#4a9040", "#2a5f2b", "#58a046"];
const ROSES = ["#e24a5e", "#f06a8a", "#f4f0e0", "#f48fb1"];

/**
 * What makes a house its own: roof dormers (a small cream box with a glazed window under a hipped roof in the house's roof colour),
 * wooden balconies with a railing of posts and rails, and ivy with a scatter of roses climbing the front wall.
 */
function buildHouseDetails(specs: PropSpecs, wood: PartList, plain: PartList): void {
  const box = new BoxGeometry(1, 1, 1);
  for (const d of specs.dormers) {
    const g = placementMatrix({ position: d.position });
    const w = d.width;
    // The body, set into the slope, with a sill and a small ledge.
    plain.add(box, DORMER_WALL, at(g, T(0, 0.17, -0.04), S(w, 0.34, 0.3)));
    plain.add(box, "#d8cdb0", at(g, T(0, 0.01, 0.13), S(w + 0.08, 0.03, 0.1)));
    // The window: a dark frame, warm glass and a cross of bars.
    plain.add(box, DORMER_FRAME, at(g, T(0, 0.18, 0.112), S(w * 0.66, 0.24, 0.012)));
    plain.add(box, GLASS, at(g, T(0, 0.18, 0.12), S(w * 0.54, 0.2, 0.01)));
    plain.add(box, DORMER_FRAME, at(g, T(0, 0.18, 0.127), S(0.016, 0.2, 0.008)));
    plain.add(box, DORMER_FRAME, at(g, T(0, 0.18, 0.127), S(w * 0.54, 0.016, 0.008)));
    // A little hipped roof in the roof's colour.
    const pyramid = new ConeGeometry(w * 0.82, 0.2, 4);
    plain.add(pyramid, d.roof, at(g, T(0, 0.34 + 0.1, -0.04), RY(Math.PI / 4)));
    pyramid.dispose();
  }
  for (const b of specs.balconies) {
    const g = placementMatrix({ position: b.position });
    const W = b.width;
    const D = b.depth;
    wood.add(box, TABLE_WOOD, at(g, T(W / 2, 0, D / 2), S(W + 0.08, 0.05, D)));
    // Two brackets under the slab.
    for (const x of [0.12, W - 0.12]) wood.add(box, CHAIR_WOOD, at(g, T(x, -0.1, D * 0.45), RX(0.0), S(0.04, 0.16, D * 0.7)));
    const rail = 0.34;
    wood.add(box, CHAIR_WOOD, at(g, T(W / 2, rail, D - 0.02), S(W + 0.06, 0.035, 0.04)));
    wood.add(box, CHAIR_WOOD, at(g, T(W / 2, 0.12, D - 0.02), S(W + 0.06, 0.025, 0.03)));
    for (const x of [-0.02, W + 0.02]) {
      wood.add(box, CHAIR_WOOD, at(g, T(x, rail / 2 + 0.02, D / 2), S(0.04, rail + 0.03, 0.04)));
      wood.add(box, CHAIR_WOOD, at(g, T(x, rail, D / 2), S(0.04, 0.035, D)));
    }
    const posts = Math.max(3, Math.round(W / 0.12));
    for (let i = 0; i <= posts; i++) wood.add(box, TABLE_WOOD, at(g, T((i / posts) * W, rail / 2 + 0.02, D - 0.02), S(0.022, rail - 0.02, 0.022)));
  }
  const leaf = new IcosahedronGeometry(1, 0);
  for (const v of specs.ivy) {
    const g = placementMatrix({ position: v.position });
    const rand = lcg(v.seed * 4999 + 17);
    const blobs = Math.round(v.width * v.height * 60);
    for (let i = 0; i < blobs; i++) {
      // Thicker near the bottom and one edge, ragged at the top, like a climber that has grown up from the corner.
      const t = Math.pow(rand(), 1.4);
      const y = t * v.height;
      const spread = v.width * (1 - t * 0.55);
      const x = rand() * spread + (v.width - spread) * 0.1;
      const r = 0.04 + rand() * 0.05;
      plain.add(leaf, new Color(pick(rand, IVY_GREENS)).multiplyScalar(0.92 + rand() * 0.16), at(g, T(x, y + 0.04, 0.02 + rand() * 0.035), S(r * 1.3, r, r * 0.55)));
    }
    const roses = 2 + Math.round(v.height * 3);
    for (let i = 0; i < roses; i++) {
      const y = (0.25 + rand() * 0.7) * v.height;
      plain.add(new IcosahedronGeometry(1, 0), new Color(pick(rand, ROSES)).multiplyScalar(1.1), at(g, T(rand() * v.width * 0.8 + 0.05, y, 0.07), S(0.03, 0.03, 0.03)));
    }
  }
}

const BARK = ["#6b4a2e", "#5c3f27"];
const CANOPY_DARK = ["#24562a", "#2b6330"];
const CANOPY_MID = ["#2f6b2e", "#3a7d34", "#45903a", "#3d8236"];
const CANOPY_LIGHT = ["#55a043", "#62ab48", "#6fb44c"];
const CANOPY_GOLD = ["#8cb84a", "#9ec24f", "#b0cc58"];

/**
 * Leafy trees and bushes: a trunk with a flared foot and a few branches, and a canopy made of many overlapping leaf clusters,
 * dark underneath and lit on top, with yellow-green highlights, so it reads as layered foliage rather than one ball. Each
 * tree is different (its seed shuffles the clusters). Everything has colour in the vertices and goes in the plain mesh.
 */
function buildTrees(specs: PropSpecs, plain: PartList): void {
  const blob = new IcosahedronGeometry(1, 1);
  const trunkShape = lathe([[0, 0], [0.3, 0], [0.26, 0.08], [0.18, 0.4], [0.14, 1.2], [0.12, 1.7], [0, 1.7]], 9);
  const limb = new CylinderGeometry(0.045, 0.07, 1, 6);
  const pick = (rand: () => number, list: string[]) => list[Math.floor(rand() * list.length)];
  const vary = (hex: string, rand: () => number) => new Color(hex).multiplyScalar(0.94 + rand() * 0.12);
  const cluster = (g: Matrix4, rand: () => number, cx: number, cy: number, cz: number, radius: number, shade: number, count: number) => {
    // A lobe of foliage: several overlapping blobs round a centre, darker toward the bottom and the middle, lighter on top.
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * radius * 0.62;
      const lift = (rand() - 0.35) * radius * 0.7;
      const r = radius * (0.34 + rand() * 0.2);
      const top = (lift / radius + 0.5) * 0.5 + shade;
      const tone = top > 0.75 && rand() < 0.35 ? pick(rand, CANOPY_GOLD) : top > 0.5 ? pick(rand, CANOPY_LIGHT) : top > 0.2 ? pick(rand, CANOPY_MID) : pick(rand, CANOPY_DARK);
      plain.add(blob, vary(tone, rand), g.clone().multiply(new Matrix4().makeTranslation(cx + Math.cos(a) * d, cy + lift, cz + Math.sin(a) * d)).multiply(new Matrix4().makeRotationY(rand() * 6)).multiply(new Matrix4().makeScale(r, r * 0.82, r)));
    }
  };
  for (const t of specs.trees) {
    const g = placementMatrix({ position: t.position, scale: t.scale });
    const rand = lcg(t.seed * 5113 + 41);
    if (t.kind === "bush" || t.kind === "flowering") {
      const lobes = 4 + Math.floor(rand() * 3);
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * Math.PI * 2 + rand();
        const d = i === 0 ? 0 : 0.2 + rand() * 0.16;
        cluster(g, rand, Math.cos(a) * d, 0.3 + rand() * 0.08, Math.sin(a) * d, 0.34 + rand() * 0.1, 0.2, 5);
      }
      if (t.kind === "flowering") {
        const bloom = new IcosahedronGeometry(1, 0);
        const palette = [["#f06a8a", "#f48fb1"], ["#f4f0e0", "#f4d03f"], ["#a56be0", "#d9a8ff"], ["#ff9a3c", "#f4d03f"]][Math.floor(rand() * 4)];
        for (let i = 0; i < 26; i++) {
          const a = rand() * Math.PI * 2;
          const d = Math.sqrt(rand()) * 0.42;
          const y = 0.26 + (1 - d / 0.42) * 0.22 + rand() * 0.06;
          plain.add(bloom, new Color(palette[i % 2]).multiplyScalar(1.15), g.clone().multiply(new Matrix4().makeTranslation(Math.cos(a) * d, y, Math.sin(a) * d)).multiply(new Matrix4().makeScale(0.034, 0.034, 0.034)));
        }
      }
      continue;
    }
    const oak = t.kind === "oak";
    const trunkHeight = oak ? 1.0 : 0.8;
    const k = oak ? 1.0 : 0.72;
    plain.add(trunkShape, pick(rand, BARK), g.clone().multiply(new Matrix4().makeScale(oak ? 1 : 0.8, oak ? 1 : 0.8, oak ? 1 : 0.8)));
    // Branches reaching up and out into the canopy.
    const branches = oak ? 5 : 3;
    for (let i = 0; i < branches; i++) {
      const a = (i / branches) * Math.PI * 2 + rand() * 0.8;
      const len = (oak ? 1.25 : 0.9) * (0.8 + rand() * 0.4);
      const tilt = 0.75 + rand() * 0.3;
      plain.add(limb, BARK[1], g.clone().multiply(new Matrix4().makeTranslation(0, 1.3 * k + trunkHeight * 0.2, 0)).multiply(new Matrix4().makeRotationY(-a)).multiply(new Matrix4().makeRotationZ(-tilt)).multiply(new Matrix4().makeTranslation(0, len / 2, 0)).multiply(new Matrix4().makeScale(1, len, 1)));
    }
    // The canopy: a ring of lobes round the middle, a second ring above and a crown on top, with a few low hanging clusters.
    const cy = oak ? 2.5 : 1.95;
    const reach = oak ? 0.78 : 0.56;
    const lobeRadius = oak ? 0.72 : 0.54;
    const ring = oak ? 7 : 5;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + rand() * 0.5;
      const d = reach * (0.8 + rand() * 0.35);
      cluster(g, rand, Math.cos(a) * d, cy - 0.1 + rand() * 0.25, Math.sin(a) * d, lobeRadius * (0.85 + rand() * 0.3), 0.0, oak ? 9 : 7);
    }
    for (let i = 0; i < (oak ? 4 : 3); i++) {
      const a = (i / (oak ? 4 : 3)) * Math.PI * 2 + rand();
      const d = reach * 0.45 * (0.6 + rand() * 0.6);
      cluster(g, rand, Math.cos(a) * d, cy + (oak ? 0.7 : 0.5), Math.sin(a) * d, lobeRadius * 0.9, 0.12, oak ? 9 : 7);
    }
    cluster(g, rand, 0, cy + (oak ? 1.15 : 0.85), 0, lobeRadius * 0.85, 0.25, oak ? 10 : 8);
    // A few clusters hanging lower on the outside, in the shade.
    for (let i = 0; i < (oak ? 3 : 2); i++) {
      const a = rand() * Math.PI * 2;
      cluster(g, rand, Math.cos(a) * reach * 1.25, cy - 0.45, Math.sin(a) * reach * 1.25, lobeRadius * 0.55, -0.15, 5);
    }
  }
}

const STONE_TONES = ["#d3c9b2", "#cbc0a8", "#dad0ba", "#c5baa2"];

/**
 * Stone arch bridges. Two walls with a round arch cut through them, a vault between, a roadway with a gentle hump, parapets with
 * caps and corner posts; the arch's outer edge is picked out with a lighter ring of stones. The cat's collision is made from the same
 * shape (bridgeColliders in map/load-map.ts).
 */
function buildBridges(specs: PropSpecs, stone: PartList): void {
  const box = new BoxGeometry(1, 1, 1);
  for (const b of specs.bridges) {
    const group = placementMatrix({ position: b.position, rotationY: b.axis === "z" ? -Math.PI / 2 : 0 });
    const L = b.length;
    const W = b.width;
    const t = 0.38;
    const span = b.archSpan ?? L * 0.68;
    const slices = Math.max(8, Math.round(L / 0.1));
    const top = (x: number) => deckHeight(x, L, b.endHeight, b.midHeight);
    const rand = lcg(Math.round(b.position[0] * 31 + b.position[2] * 17 + 7));
    const tone = () => STONE_TONES[Math.floor(rand() * STONE_TONES.length)];
    const place = (geometry: BufferGeometry, color: string) => {
      const g = geometry.clone();
      g.applyMatrix4(group);
      stone.add(g, color);
      g.dispose();
      geometry.dispose();
    };
    for (let i = 0; i < slices; i++) {
      const x0 = -L / 2 + (i * L) / slices;
      const x1 = -L / 2 + ((i + 1) * L) / slices;
      const t0 = top(x0);
      const t1 = top(x1);
      const a0 = archHeight(x0, span, b.archRise);
      const a1 = archHeight(x1, span, b.archRise);
      const inner = W / 2 - t;
      for (const s of [-1, 1]) {
        const zo = s * (W / 2);
        const zi = s * inner;
        // The wall's outer and inner faces, with the arch cut out of the bottom.
        place(face([x0, a0, zo], [x1, a1, zo], [x1, t1, zo], [x0, t0, zo], [0, 0, s]), tone());
        place(face([x0, a0, zi], [x1, a1, zi], [x1, t1, zi], [x0, t0, zi], [0, 0, -s]), "#bdb29a");
        // Inside the arch: the wall's thickness.
        if (a0 > 0 || a1 > 0) place(face([x0, a0, zo], [x1, a1, zo], [x1, a1, zi], [x0, a0, zi], [0, -1, 0]), "#a69c86");
        // The ring of lighter stones round the arch's outer edge.
        if (a0 > 0.02 && a1 > 0.02) place(face([x0, a0, zo + s * 0.006], [x1, a1, zo + s * 0.006], [x1, a1 + 0.14, zo + s * 0.006], [x0, a0 + 0.14, zo + s * 0.006], [0, 0, s]), "#e6dcc6");
        // The parapet on top and its cap.
        const mid = (x0 + x1) / 2;
        const lift = (t0 + t1) / 2;
        stone.add(box, tone(), group.clone().multiply(new Matrix4().makeTranslation(mid, lift + 0.26, s * (W / 2 - t / 2)).multiply(new Matrix4().makeScale(x1 - x0 + 0.002, 0.52, 0.28))));
        stone.add(box, "#e2d9c4", group.clone().multiply(new Matrix4().makeTranslation(mid, lift + 0.55, s * (W / 2 - t / 2)).multiply(new Matrix4().makeScale(x1 - x0 + 0.002, 0.06, 0.36))));
      }
      // The vault between the walls, and the roadway above.
      if (a0 > 0 || a1 > 0) place(face([x0, a0, -inner], [x1, a1, -inner], [x1, a1, inner], [x0, a0, inner], [0, -1, 0]), "#a99f8c");
      place(face([x0, t0, -inner], [x1, t1, -inner], [x1, t1, inner], [x0, t0, inner], [0, 1, 0]), i % 2 ? "#c9bda4" : "#c2b69c");
    }
    // Corner posts with caps at the four ends of the parapets.
    for (const ex of [-1, 1]) for (const s of [-1, 1]) {
      const x = ex * (L / 2 - 0.2);
      const y = top(x);
      stone.add(box, "#d9cfb8", group.clone().multiply(new Matrix4().makeTranslation(x, y + 0.42, s * (W / 2 - t / 2)).multiply(new Matrix4().makeScale(0.42, 0.84, 0.42))));
      stone.add(box, "#e8dfca", group.clone().multiply(new Matrix4().makeTranslation(x, y + 0.88, s * (W / 2 - t / 2)).multiply(new Matrix4().makeScale(0.52, 0.09, 0.52))));
    }
  }
}

const HULL_OUTER = "#8a5a33";
const HULL_INNER = "#b88450";
const HULL_RIM = "#6f4524";
const THWART = "#a8703f";

/** Rowing boats: a pointed bow and a blunt stern, a hull of planks with an inside, a rim, and three seats. The bow points along +x. */
function buildBoats(specs: PropSpecs, wood: PartList): void {
  const box = new BoxGeometry(1, 1, 1);
  const L = 1.75;
  const B = 0.66;
  const stations = 18;
  const rings = 7;
  type Pt = [number, number, number];
  // The outline of the hull at station i, ring j (0 = keel, rings = gunwale), on one side; `inset` shrinks it for the inner shell.
  const point = (i: number, j: number, side: number, inset: number): Pt => {
    const u = -1 + (2 * i) / stations;
    const bow = u > 0;
    const w = Math.max(0.0, (B / 2) * Math.pow(Math.max(0, 1 - u * u), bow ? 0.85 : 0.4) - inset);
    const top = 0.27 + 0.07 * u * u + (bow ? 0.05 * u * u : 0) - (inset > 0 ? 0.0 : 0);
    const bottom = 0.03 + 0.06 * u * u + (inset > 0 ? 0.035 : 0);
    const phi = (j / rings) * (Math.PI / 2);
    return [(u * L) / 2, bottom + (top - bottom) * (1 - Math.cos(phi)), side * w * Math.sin(phi)];
  };
  const toward = (a: Pt, b: Pt, c: Pt, inside: Pt, outward: boolean): Pt => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n: Pt = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const len = Math.hypot(...n) || 1;
    n = [n[0] / len, n[1] / len, n[2] / len];
    const away = (a[0] - inside[0]) * n[0] + (a[1] - inside[1]) * n[1] + (a[2] - inside[2]) * n[2] > 0;
    return away === outward ? n : [-n[0], -n[1], -n[2]];
  };
  for (const boat of specs.boats) {
    const group = placementMatrix({ position: boat.position, rotationY: boat.rotationY, scale: boat.scale });
    const centre: Pt = [0, 0.18, 0];
    const place = (g: BufferGeometry, color: string) => {
      const c = g.clone();
      c.applyMatrix4(group);
      wood.add(c, color);
      c.dispose();
      g.dispose();
    };
    for (const side of [-1, 1]) {
      for (let i = 0; i < stations; i++) {
        for (let j = 0; j < rings; j++) {
          // The outside of the hull, the inside, and the rim between them at the top.
          const o = [point(i, j, side, 0), point(i + 1, j, side, 0), point(i + 1, j + 1, side, 0), point(i, j + 1, side, 0)] as [Pt, Pt, Pt, Pt];
          place(face(...o, toward(o[0], o[1], o[2], centre, true)), j % 2 ? HULL_OUTER : "#7d5030");
          const n = [point(i, j, side, 0.035), point(i + 1, j, side, 0.035), point(i + 1, j + 1, side, 0.035), point(i, j + 1, side, 0.035)] as [Pt, Pt, Pt, Pt];
          place(face(...n, toward(n[0], n[1], n[2], centre, false)), HULL_INNER);
        }
        const r = [point(i, rings, side, 0), point(i + 1, rings, side, 0), point(i + 1, rings, side, 0.035), point(i, rings, side, 0.035)] as [Pt, Pt, Pt, Pt];
        place(face(...r, [0, 1, 0]), HULL_RIM);
      }
    }
    // Three seats across the boat, and a small ring at the bow.
    for (const x of [-0.48, 0.02, 0.5]) {
      const u = (2 * x) / L;
      const half = (B / 2) * Math.pow(Math.max(0, 1 - u * u), u > 0 ? 0.85 : 0.4) - 0.03;
      wood.add(box, THWART, group.clone().multiply(new Matrix4().makeTranslation(x, 0.2, 0)).multiply(new Matrix4().makeScale(0.13, 0.03, Math.max(0.1, half * 2))));
    }
    wood.add(new TorusGeometry(0.035, 0.008, 5, 10), "#4a4650", group.clone().multiply(new Matrix4().makeTranslation(L / 2 - 0.05, 0.22, 0)).multiply(new Matrix4().makeRotationY(Math.PI / 2)));
  }
}

const LEAF_TONES = ["#3f7a3a", "#4f8c42", "#356c33", "#5f9a48"];
const BLOOM_TONES = ["#f06a8a", "#f4f0e0", "#f4d03f", "#e24a4a", "#a56be0", "#ff9a3c", "#f48fb1"];

/** Flower clusters: a low mound of leaves with a dense scatter of small blooms, like the beds round the fountain. */
function buildFlowerClusters(specs: PropSpecs, plain: PartList): void {
  const leaf = new IcosahedronGeometry(1, 1);
  const bloom = new IcosahedronGeometry(1, 0);
  for (const f of specs.flowers) {
    const g = placementMatrix({ position: f.position });
    const rand = lcg(f.seed * 7243 + 29);
    const r = f.radius;
    const leaves = Math.max(4, Math.round(r * 16));
    for (let i = 0; i < leaves; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r * 0.8;
      const s = r * (0.22 + rand() * 0.14);
      plain.add(leaf, LEAF_TONES[Math.floor(rand() * LEAF_TONES.length)], g.clone().multiply(new Matrix4().makeTranslation(Math.cos(a) * d, s * 0.8, Math.sin(a) * d)).multiply(new Matrix4().makeScale(s, s * 0.8, s)));
    }
    const blooms = Math.max(8, Math.round(r * r * 90));
    const palette = [BLOOM_TONES[Math.floor(rand() * BLOOM_TONES.length)], BLOOM_TONES[Math.floor(rand() * BLOOM_TONES.length)], BLOOM_TONES[Math.floor(rand() * BLOOM_TONES.length)]];
    for (let i = 0; i < blooms; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r;
      const size = 0.028 + rand() * 0.02;
      const height = r * 0.32 + (1 - d / r) * r * 0.28 + rand() * 0.05;
      const color = new Color(rand() < 0.75 ? palette[Math.floor(rand() * palette.length)] : BLOOM_TONES[Math.floor(rand() * BLOOM_TONES.length)]).multiplyScalar(1.15);
      plain.add(bloom, color, g.clone().multiply(new Matrix4().makeTranslation(Math.cos(a) * d, height, Math.sin(a) * d)).multiply(new Matrix4().makeScale(size, size, size)));
    }
  }
}

const pick = <A,>(rand: () => number, list: readonly A[]): A => list[Math.floor(rand() * list.length)];
const T = (x: number, y: number, z: number) => new Matrix4().makeTranslation(x, y, z);
const S = (x: number, y: number, z: number) => new Matrix4().makeScale(x, y, z);
const RX = (a: number) => new Matrix4().makeRotationX(a);
const RZ = (a: number) => new Matrix4().makeRotationZ(a);
const RY = (a: number) => new Matrix4().makeRotationY(a);
const at = (group: Matrix4, ...steps: Matrix4[]) => steps.reduce((m, s) => m.multiply(s), group.clone());

const TABLE_WOOD = "#a8703f";
const CHAIR_WOOD = "#8a5a33";
const STONE = "#cfc7b8";
const STATUE = "#e2ddd3";
const STATUE_SHADE = "#c9c3b8";
const CHALK = "#e8e4d4";
const BOARD = "#26322e";
const PLATE = "#f2eee4";
const CUP = "#f6f2ea";
const COFFEE = "#6b4128";
const PASTRY = "#d49a4a";
const VASE = "#6aa6b8";

/**
 * The café's furniture and the fountain's cat statue, built from simple solids in the street's own colours: round tables
 * with cups, plates and a vase, chairs with slatted backs, a striped parasol, A-frame chalkboards, and a stone cat on a
 * pedestal. Wooden things go in the plank-patterned mesh, the rest in the plain one.
 */
function buildCafeProps(specs: PropSpecs, wood: PartList, plain: PartList): void {
  const box = new BoxGeometry(1, 1, 1);
  const disc = new CylinderGeometry(1, 1, 1, 16);
  const ball = new SphereGeometry(1, 12, 9);

  // Tables: a round top on a post and a foot, with something on it.
  for (const t of specs.tables) {
    const g = placementMatrix({ position: t.position });
    wood.add(disc, TABLE_WOOD, at(g, T(0, 0.425, 0), S(t.radius, 0.03, t.radius)));
    wood.add(disc, CHAIR_WOOD, at(g, T(0, 0.21, 0), S(0.026, 0.4, 0.026)));
    wood.add(disc, CHAIR_WOOD, at(g, T(0, 0.01, 0), S(0.13, 0.02, 0.13)));
    const rand = lcg(t.seed * 4421 + 13);
    // A cup on its saucer, a plate with a pastry, and a small vase with a bloom.
    const a = rand() * Math.PI * 2;
    const spots = [0, 1, 2].map((i) => ({ x: Math.cos(a + (i * Math.PI * 2) / 3) * t.radius * 0.5, z: Math.sin(a + (i * Math.PI * 2) / 3) * t.radius * 0.5 }));
    plain.add(disc, PLATE, at(g, T(spots[0].x, 0.443, spots[0].z), S(0.055, 0.006, 0.055)));
    plain.add(disc, CUP, at(g, T(spots[0].x, 0.465, spots[0].z), S(0.026, 0.04, 0.026)));
    plain.add(disc, COFFEE, at(g, T(spots[0].x, 0.483, spots[0].z), S(0.021, 0.004, 0.021)));
    plain.add(disc, PLATE, at(g, T(spots[1].x, 0.443, spots[1].z), S(0.07, 0.006, 0.07)));
    plain.add(ball, PASTRY, at(g, T(spots[1].x, 0.456, spots[1].z), S(0.04, 0.022, 0.03)));
    plain.add(disc, VASE, at(g, T(spots[2].x, 0.463, spots[2].z), S(0.014, 0.04, 0.014)));
    const bloomColor = new Color(FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)]).multiplyScalar(1.15);
    plain.add(ball, bloomColor, at(g, T(spots[2].x, 0.498, spots[2].z), S(0.024, 0.024, 0.024)));
    plain.add(ball, LEAVES, at(g, T(spots[2].x + 0.012, 0.49, spots[2].z), S(0.014, 0.012, 0.014)));
  }

  // Chairs: a seat, four legs and a slatted back; at rotation 0 the seat faces +z and the back is behind it.
  for (const c of specs.chairs) {
    const g = placementMatrix({ position: c.position, rotationY: c.rotationY });
    wood.add(box, CHAIR_WOOD, at(g, T(0, 0.27, 0), S(0.28, 0.03, 0.28)));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wood.add(box, CHAIR_WOOD, at(g, T(sx * 0.115, 0.13, sz * 0.115), S(0.026, 0.26, 0.026)));
    for (const sx of [-1, 1]) wood.add(box, CHAIR_WOOD, at(g, T(sx * 0.115, 0.43, -0.125), S(0.026, 0.32, 0.026)));
    wood.add(box, CHAIR_WOOD, at(g, T(0, 0.57, -0.125), S(0.28, 0.05, 0.024)));
    wood.add(box, CHAIR_WOOD, at(g, T(0, 0.45, -0.125), S(0.24, 0.035, 0.018)));
    wood.add(box, CHAIR_WOOD, at(g, T(0, 0.35, -0.125), S(0.24, 0.035, 0.018)));
  }

  // Parasols: a pole, and a canopy of striped wedges with a small finial.
  const WEDGES = 12;
  for (const u of specs.umbrellas) {
    const g = placementMatrix({ position: u.position });
    wood.add(disc, CHAIR_WOOD, at(g, T(0, u.height / 2, 0), S(0.02, u.height, 0.02)));
    wood.add(disc, CHAIR_WOOD, at(g, T(0, 0.02, 0), S(0.16, 0.04, 0.16)));
    const rise = Math.min(0.45, u.radius * 0.36);
    for (let i = 0; i < WEDGES; i++) {
      const wedge = new ConeGeometry(u.radius, rise, 2, 1, true, (i * Math.PI * 2) / WEDGES, (Math.PI * 2) / WEDGES);
      plain.add(wedge, u.colors[i % 2], at(g, T(0, u.height - rise / 2, 0)));
      wedge.dispose();
    }
    // A thin rim of cloth hanging from the edge.
    for (let i = 0; i < WEDGES; i++) {
      const a0 = (i * Math.PI * 2) / WEDGES;
      const a1 = ((i + 1) * Math.PI * 2) / WEDGES;
      const mid = (a0 + a1) / 2;
      const w = 2 * u.radius * Math.sin(Math.PI / WEDGES);
      plain.add(box, u.colors[i % 2], at(g, T(Math.cos(mid) * u.radius * 0.995, u.height - rise - 0.02, Math.sin(mid) * u.radius * 0.995), RY(-mid + Math.PI / 2), S(w, 0.04, 0.01)));
    }
    wood.add(ball, CHAIR_WOOD, at(g, T(0, u.height + 0.02, 0), S(0.035, 0.035, 0.035)));
  }

  // Chalkboards: a dark board in a wooden frame on two splayed legs, with a few lines of chalk.
  for (const c of specs.chalkboards) {
    const g = placementMatrix({ position: c.position, rotationY: c.rotationY });
    wood.add(box, CHAIR_WOOD, at(g, T(0, 0.34, 0), RX(-0.1), S(0.42, 0.56, 0.03)));
    plain.add(box, BOARD, at(g, T(0, 0.34, 0.012), RX(-0.1), S(0.36, 0.5, 0.012)));
    for (const sx of [-1, 1]) wood.add(box, CHAIR_WOOD, at(g, T(sx * 0.17, 0.285, -0.1), RX(0.42), S(0.03, 0.6, 0.03)));
    const rand = lcg(c.seed * 977 + 5);
    for (let i = 0; i < 5; i++) {
      const w = 0.1 + rand() * 0.16;
      plain.add(box, CHALK, at(g, T((rand() - 0.5) * (0.3 - w), 0.5 - i * 0.065 + (rand() - 0.5) * 0.01, 0.024), RX(-0.1), S(w, 0.008, 0.004)));
    }
    plain.add(box, CHALK, at(g, T(0, 0.585, 0.024), RX(-0.1), S(0.22, 0.014, 0.004)));
  }

  // The statue: a round stone pedestal and a sitting cat, pale and simple, with upright ears.
  const pedestal = lathe([[0, 0], [0.22, 0], [0.22, 0.06], [0.17, 0.09], [0.17, 0.1], [0.11, 0.14], [0.11, 0.34], [0.16, 0.37], [0.16, 0.42], [0, 0.42]], 20);
  for (const s of specs.statues) {
    const g = placementMatrix({ position: s.position, rotationY: s.rotationY, scale: s.scale });
    plain.add(pedestal, STONE, g);
    const y0 = 0.42;
    plain.add(ball, STATUE, at(g, T(0, y0 + 0.16, 0), S(0.1, 0.17, 0.09)));
    for (const sx of [-1, 1]) plain.add(ball, STATUE_SHADE, at(g, T(sx * 0.075, y0 + 0.08, 0.015), S(0.065, 0.08, 0.085)));
    for (const sx of [-1, 1]) plain.add(disc, STATUE, at(g, T(sx * 0.04, y0 + 0.07, 0.09), S(0.022, 0.14, 0.022)));
    plain.add(ball, STATUE, at(g, T(0, y0 + 0.37, 0.01), S(0.085, 0.075, 0.08)));
    for (const sx of [-1, 1]) plain.add(new ConeGeometry(0.034, 0.075, 4), STATUE, at(g, T(sx * 0.05, y0 + 0.455, 0.0), RZ(-sx * 0.22)));
    plain.add(ball, STATUE_SHADE, at(g, T(0, y0 + 0.35, 0.078), S(0.04, 0.03, 0.03)));
    for (const sx of [-1, 1]) plain.add(ball, "#4a4a52", at(g, T(sx * 0.03, y0 + 0.385, 0.082), S(0.009, 0.011, 0.006)));
    // The tail curls round the right side, from the haunch up behind the back.
    const tail: [number, number, number, number][] = [[0.1, 0.05, -0.04, 0.03], [0.14, 0.1, -0.06, 0.028], [0.15, 0.17, -0.08, 0.026], [0.13, 0.23, -0.08, 0.024]];
    for (const [tx, ty, tz, r] of tail) plain.add(ball, STATUE, at(g, T(tx, y0 + ty, tz), S(r, r, r)));
  }
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
