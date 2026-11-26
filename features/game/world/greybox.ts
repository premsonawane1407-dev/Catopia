// The street as the cat feels it: a greybox of boxes and circles to walk around, the edge of the walkable
// strip, and a few things to interact with. It is built from the same data that places the scenery, so a moved
// stall moves its collider. Phase 3 replaces this with colliders and triggers in the map data format.
import type { Bounds, Collider } from "../player/colliders";
import type { Interactable } from "../player/interactions";
import { BARRELS, CRATES, HOUSES, LAMP_HEADS, POTS, STAGE_PLACEMENTS } from "./stage-data";

/** The strip of cobbles the cat may walk on: from the house fronts out toward the big blurred foreground props. */
export const WALK_BOUNDS: Bounds = { minX: -7.4, maxX: 7.4, minZ: -1.5, maxZ: 3.1 };

/** How far the camera may drift: far enough to follow the cat along the street, never so far that the edge of the scenery shows. */
export const CAMERA_BOUNDS: Bounds = { minX: -3.4, maxX: 3.4, minZ: -0.1, maxZ: 1.5 };

/** Sizes of the stock model pieces' footprints, as half-extents (x, z) before rotation. */
const PIECE_HALF: Record<string, [number, number]> = {
  "stall-red": [0.55, 0.55],
  "stall-green": [0.55, 0.55],
  "cart-high": [0.55, 0.45],
  "stall-bench": [0.22, 0.55],
  fence: [0.5, 0.06],
  hedge: [0.5, 0.2],
};

export function buildColliders(bounds: Bounds = WALK_BOUNDS): Collider[] {
  const out: Collider[] = [];
  const near = (x: number, z: number, margin = 1) => z <= bounds.maxZ + margin && z >= bounds.minZ - margin - 3 && x >= bounds.minX - 1 && x <= bounds.maxX + 1;

  HOUSES.forEach((h, i) => {
    const z1 = h.zFront + 0.5;
    const z0 = h.zFront - h.depth + 0.5;
    if (z1 < bounds.minZ - 0.5) return; // far rows are out of reach anyway
    out.push({ kind: "box", id: `house-${i}`, x: h.x0 + (h.cols - 1) / 2, z: (z0 + z1) / 2, hx: h.cols / 2, hz: (z1 - z0) / 2 });
  });

  for (const p of STAGE_PLACEMENTS) {
    const half = PIECE_HALF[p.piece];
    if (!half) continue;
    const [x, , z] = p.position;
    if (!near(x, z)) continue;
    const scale = typeof p.scale === "number" ? p.scale : 1;
    if (scale > 1.5) continue; // the huge foreground framing props sit past the walkable strip
    const quarter = Math.abs(Math.round(((p.rotationY ?? 0) / (Math.PI / 2)) % 2)) === 1;
    let hx = quarter ? half[1] : half[0];
    let hz = quarter ? half[0] : half[1];
    // A tilted piece covers a little more than its straight footprint.
    const tilt = Math.abs((p.rotationY ?? 0) % (Math.PI / 2));
    const grow = 1 + 0.35 * Math.min(tilt, Math.PI / 2 - tilt);
    hx *= grow * scale;
    hz *= grow * scale;
    out.push({ kind: "box", id: `${p.piece}@${x},${z}`, x, z, hx, hz });
  }

  LAMP_HEADS.forEach(([x, , z], i) => {
    if (near(x, z)) out.push({ kind: "circle", id: `lamp-${i}`, x, z, r: 0.11 });
  });
  CRATES.forEach((c, i) => {
    if (c.size < 0.4 && near(c.position[0], c.position[2])) out.push({ kind: "circle", id: `crate-${i}`, x: c.position[0], z: c.position[2], r: c.size * 0.85 });
  });
  BARRELS.forEach((b, i) => {
    if (b.scale < 1.5 && near(b.position[0], b.position[2])) out.push({ kind: "circle", id: `barrel-${i}`, x: b.position[0], z: b.position[2], r: 0.17 * b.scale });
  });
  POTS.forEach((p, i) => {
    if (p.scale < 1.5 && near(p.position[0], p.position[2])) out.push({ kind: "circle", id: `pot-${i}`, x: p.position[0], z: p.position[2], r: 0.13 });
  });
  for (const p of STAGE_PLACEMENTS) {
    if (!p.piece.startsWith("tree")) continue;
    const scale = typeof p.scale === "number" ? p.scale : 1;
    if (near(p.position[0], p.position[2], 0.3)) out.push({ kind: "circle", id: `${p.piece}@${p.position[0]},${p.position[2]}`, x: p.position[0], z: p.position[2], r: 0.22 * scale });
  }
  return out;
}

/** Where the cat starts: where Phase 1's fixed camera pointed. */
export const START: { x: number; z: number; direction: number } = { x: 0, z: 0.6, direction: 0 };

/** Things to do on the street. The text is a placeholder for the prototype street, not the real campus. */
type Spec = Omit<Interactable, "approach" | "facing"> & Partial<Pick<Interactable, "approach" | "facing">>;
const SPECS: readonly Spec[] = [
  { id: "bench", x: -3.3, z: 2.75, radius: 0.85, label: "Sit and watch the market", verb: "sit", approach: { x: -3.3, z: 2.85 }, facing: 0 },
  { id: "crates", x: -4.3, z: 1.6, radius: 0.8, label: "Curl up for a nap", verb: "sleep", approach: { x: -4.3, z: 1.75 }, facing: 0 },
  { id: "flowers", x: 3.0, z: -1.0, radius: 0.9, label: "Sniff the flowers", verb: "look", text: "Marigolds and rain-wet stone. A very good smell." },
  { id: "notice", x: -2.7, z: -0.95, radius: 0.8, label: "Read the notice", verb: "look", text: "A notice: \"Lost, one blue button. Ask at the paw-print shop.\" (Made up for this prototype street.)" },
  { id: "sign", x: 1.2, z: -0.95, radius: 0.8, label: "Look at the swinging sign", verb: "look", text: "The paw-print sign creaks on its bracket in the evening breeze." },
];
export const INTERACTABLES: readonly Interactable[] = SPECS.map((i) => ({ approach: { x: i.x, z: i.z }, facing: 0, ...i }));
