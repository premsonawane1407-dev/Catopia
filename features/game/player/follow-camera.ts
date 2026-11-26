// The camera's follow: it drifts toward the cat with a little look-ahead, never leaves the area where there is
// street to see, and with reduced motion sticks to the cat rigidly (no easing, no lag, no sway).
import type { Bounds } from "./colliders";

export interface Follow {
  x: number;
  z: number;
}

/** Time constant of the glide, in seconds. About a third of a second feels floaty without lagging far behind. */
export const FOLLOW_TAU = 0.32;
/** How far ahead of a moving cat the camera aims, in seconds of travel, and the most it may lead by. */
export const LOOK_AHEAD_SECONDS = 0.35;
export const LOOK_AHEAD_MAX = 0.45;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function followTarget(cat: { x: number; z: number; vx: number; vz: number }, smooth: boolean, bounds: Bounds): Follow {
  const lead = smooth ? LOOK_AHEAD_SECONDS : 0;
  const lx = clamp(cat.vx * lead, -LOOK_AHEAD_MAX, LOOK_AHEAD_MAX);
  const lz = clamp(cat.vz * lead, -LOOK_AHEAD_MAX, LOOK_AHEAD_MAX);
  return { x: clamp(cat.x + lx, bounds.minX, bounds.maxX), z: clamp(cat.z + lz, bounds.minZ, bounds.maxZ) };
}

/** Moves the camera toward its target. Frame-rate independent. */
export function stepFollow(f: Follow, target: Follow, dt: number, smooth: boolean): Follow {
  if (!smooth) return { x: target.x, z: target.z };
  const k = 1 - Math.exp(-dt / FOLLOW_TAU);
  return { x: f.x + (target.x - f.x) * k, z: f.z + (target.z - f.z) * k };
}
