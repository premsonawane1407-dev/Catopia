// Moving the cat: turning an intent (a direction and how hard it is pushed) into a smooth velocity, then
// into a position that respects the greybox. Pure functions on plain data, so they are tested without a browser.
import { resolveCollisions, type Bounds, type Collider } from "./colliders";

export type Gait = "walk" | "run";

export interface Motion {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

export interface Intent {
  /** Where the player pushes, in world axes: +x is screen right and +z is toward the camera (screen down). Length 0 to 1. */
  x: number;
  z: number;
  gait: Gait;
}

export interface MoveParams {
  /** World units per second at each gait. */
  walkSpeed: number;
  runSpeed: number;
  /** The cat's collision radius in world units. */
  radius: number;
}

/** How quickly velocity follows the wanted velocity, as a time constant in seconds. Short is snappy; the cat still eases in and out. */
export const ACCEL_TAU = 0.06;
export const DECEL_TAU = 0.045;

/** The slowest a pushed stick may move the cat, as a share of the gait's speed, so a light touch is never a crawl. */
export const MIN_SPEED_SHARE = 0.35;

/** The velocity an intent asks for. */
export function wantedVelocity(intent: Intent | null, params: MoveParams): { vx: number; vz: number } {
  if (!intent) return { vx: 0, vz: 0 };
  const mag = Math.min(1, Math.hypot(intent.x, intent.z));
  if (mag < 1e-6) return { vx: 0, vz: 0 };
  const base = intent.gait === "run" ? params.runSpeed : params.walkSpeed;
  const speed = base * Math.max(MIN_SPEED_SHARE, mag);
  return { vx: (intent.x / mag) * speed, vz: (intent.z / mag) * speed };
}

export interface StepResult extends Motion {
  /** How far the cat actually moved. */
  moved: number;
  /** Pushing into something and getting nowhere much. */
  blocked: boolean;
}

/** Advances the cat one step. */
export function stepMotion(m: Motion, intent: Intent | null, dt: number, params: MoveParams, colliders: readonly Collider[], bounds: Bounds): StepResult {
  const want = wantedVelocity(intent, params);
  const tau = want.vx === 0 && want.vz === 0 ? DECEL_TAU : ACCEL_TAU;
  const k = 1 - Math.exp(-dt / tau);
  const vx = m.vx + (want.vx - m.vx) * k;
  const vz = m.vz + (want.vz - m.vz) * k;
  const tryPos = { x: m.x + vx * dt, z: m.z + vz * dt };
  const pos = resolveCollisions(tryPos, params.radius, colliders, bounds);
  const dx = pos.x - m.x;
  const dz = pos.z - m.z;
  const moved = Math.hypot(dx, dz);
  const wanted = Math.hypot(vx, vz) * dt;
  // After a collision the velocity is what really happened, so it never piles up against a wall.
  const nvx = dt > 0 ? dx / dt : 0;
  const nvz = dt > 0 ? dz / dt : 0;
  return { x: pos.x, z: pos.z, vx: nvx, vz: nvz, moved, blocked: wanted > 1e-6 && moved < wanted * 0.35 };
}

// ---- walking to a point (tap or click to move, and walking to an interaction spot) ----

export interface AutoWalk {
  x: number;
  z: number;
  /** Stop when this close. */
  arriveRadius: number;
  /** Run when farther than this from the target. */
  runBeyond: number;
}

export const AUTO_WALK_ARRIVE = 0.07;
export const AUTO_WALK_RUN_BEYOND = 3.2;

/** The intent that walks toward a target, easing off near it. Returns null on arrival. */
export function autoWalkIntent(m: Motion, target: AutoWalk): Intent | null {
  const dx = target.x - m.x;
  const dz = target.z - m.z;
  const d = Math.hypot(dx, dz);
  if (d <= target.arriveRadius) return null;
  const ease = Math.min(1, 0.45 + d / 0.5);
  return { x: (dx / d) * ease, z: (dz / d) * ease, gait: d > target.runBeyond ? "run" : "walk" };
}

/**
 * Watches for a cat that keeps trying to move and does not get anywhere (walking into a wall on the way to a
 * tap). It reports "stuck" after `limit` seconds of that, so the walk can be given up.
 */
export interface StuckTimer {
  time: number;
}
export function updateStuck(timer: StuckTimer, pushing: boolean, blocked: boolean, dt: number): number {
  timer.time = pushing && blocked ? timer.time + dt : 0;
  return timer.time;
}
export const STUCK_LIMIT = 0.7;
