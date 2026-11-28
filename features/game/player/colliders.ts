// Collision for a small round cat against a greybox: boxes and circles on the ground plane (x and z, in
// world units) plus the edge of the walkable area. The cat is a circle; a move that ends inside something is
// pushed back out the shortest way, which makes it slide along walls instead of sticking to them.

export interface BoxCollider {
  kind: "box";
  id: string;
  /** Centre. */
  x: number;
  z: number;
  /** Half the size along x and z. */
  hx: number;
  hz: number;
  /** How tall it is, in world units. Left out, it is a wall. A cat that is higher than this stands on top of it instead of bumping into it. */
  height?: number;
}
export interface CircleCollider {
  kind: "circle";
  id: string;
  x: number;
  z: number;
  r: number;
  height?: number;
}
export type Collider = BoxCollider | CircleCollider;

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Point {
  x: number;
  z: number;
}

/** Pushes a circle out of one collider. Returns the new centre, or the same point when there is no overlap. */
function pushOut(p: Point, radius: number, c: Collider): Point {
  if (c.kind === "circle") {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const min = radius + c.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return p;
    const d = Math.sqrt(d2);
    if (d < 1e-6) return { x: p.x + min, z: p.z };
    return { x: c.x + (dx / d) * min, z: c.z + (dz / d) * min };
  }
  // Closest point on the box to the circle's centre.
  const cx = Math.min(c.x + c.hx, Math.max(c.x - c.hx, p.x));
  const cz = Math.min(c.z + c.hz, Math.max(c.z - c.hz, p.z));
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= radius * radius) return p;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    return { x: cx + (dx / d) * radius, z: cz + (dz / d) * radius };
  }
  // The centre is inside the box: leave through the nearest face.
  const left = p.x - (c.x - c.hx);
  const right = c.x + c.hx - p.x;
  const near = p.z - (c.z - c.hz);
  const far = c.z + c.hz - p.z;
  const m = Math.min(left, right, near, far);
  if (m === left) return { x: c.x - c.hx - radius, z: p.z };
  if (m === right) return { x: c.x + c.hx + radius, z: p.z };
  if (m === near) return { x: p.x, z: c.z - c.hz - radius };
  return { x: p.x, z: c.z + c.hz + radius };
}

/**
 * How high a step the cat simply walks up (and down) without jumping, in world units: the rise of a stair, a kerb. Anything
 * taller than this above the cat's feet is a wall to it until it has jumped high enough.
 */
export const STEP_UP = 0.18;

/** Is the cat, at height `y`, able to walk onto this thing (so it does not block)? */
const isBelowCat = (c: Collider, y: number): boolean => c.height !== undefined && y >= c.height - STEP_UP;

/**
 * Keeps a circle inside the walkable area and outside every collider it is not above. A few passes settle corners where two
 * things meet. `y` is how high the cat's feet are: a cat higher than a collider's top walks over it.
 */
export function resolveCollisions(p: Point, radius: number, colliders: readonly Collider[], bounds: Bounds, y = 0): Point {
  let pos = p;
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (const c of colliders) {
      if (isBelowCat(c, y)) continue;
      const next = pushOut(pos, radius, c);
      if (next !== pos) {
        pos = next;
        moved = true;
      }
    }
    const clamped = { x: Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, pos.x)), z: Math.min(bounds.maxZ - radius, Math.max(bounds.minZ + radius, pos.z)) };
    if (clamped.x !== pos.x || clamped.z !== pos.z) {
      pos = clamped;
      moved = true;
    }
    if (!moved) break;
  }
  return pos;
}

/** Is a circle clear of everything? */
export function isClear(p: Point, radius: number, colliders: readonly Collider[], bounds: Bounds, y = 0): boolean {
  const r = resolveCollisions(p, radius - 0.003, colliders, bounds, y);
  return Math.abs(r.x - p.x) < 1e-6 && Math.abs(r.z - p.z) < 1e-6;
}

/** Is a point over the top of a collider (with a little give, since a cat's paws overhang the edge)? */
function overFootprint(p: Point, c: Collider, margin: number): boolean {
  if (c.kind === "circle") return Math.hypot(p.x - c.x, p.z - c.z) <= c.r + margin;
  return Math.abs(p.x - c.x) <= c.hx + margin && Math.abs(p.z - c.z) <= c.hz + margin;
}

/**
 * The height of the floor under a cat at `p` whose feet are at `y`: the top of the highest thing it is over that it could stand
 * on (not higher than a step above where it is), or 0 for the ground.
 */
export function supportHeight(p: Point, radius: number, colliders: readonly Collider[], y: number): number {
  let best = 0;
  for (const c of colliders) {
    if (c.height === undefined) continue;
    if (c.height > y + STEP_UP) continue;
    if (c.height > best && overFootprint(p, c, radius * 0.7)) best = c.height;
  }
  return best;
}

/** The tallest standable surface within `reach` ahead of `p` along (dx, dz) that is above `y`, or 0 when there is none. */
export function platformAhead(p: Point, dx: number, dz: number, radius: number, colliders: readonly Collider[], y: number, reach: number): number {
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return 0;
  let best = 0;
  for (let d = radius; d <= reach + 1e-9; d += 0.08) {
    const q = { x: p.x + (dx / len) * d, z: p.z + (dz / len) * d };
    for (const c of colliders) {
      if (c.height === undefined || c.height <= y + 0.03) continue;
      if (c.height > best && overFootprint(q, c, radius * 0.5)) best = c.height;
    }
  }
  return best;
}
