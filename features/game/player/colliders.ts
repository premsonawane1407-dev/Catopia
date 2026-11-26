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
}
export interface CircleCollider {
  kind: "circle";
  id: string;
  x: number;
  z: number;
  r: number;
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

/** Keeps a circle inside the walkable area and outside every collider. A few passes settle corners where two things meet. */
export function resolveCollisions(p: Point, radius: number, colliders: readonly Collider[], bounds: Bounds): Point {
  let pos = p;
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (const c of colliders) {
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
export function isClear(p: Point, radius: number, colliders: readonly Collider[], bounds: Bounds): boolean {
  const r = resolveCollisions(p, radius - 0.003, colliders, bounds);
  return Math.abs(r.x - p.x) < 1e-6 && Math.abs(r.z - p.z) < 1e-6;
}
