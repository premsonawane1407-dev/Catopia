// The cat's body as a handful of simple solids (ellipsoids and small pyramids) placed by a pose. One model
// seen from different headings gives every direction of every animation, with a true normal map for free.
//
// Model space: units are sprite pixels, y is up, +z is the way the cat faces, +x is the cat's left, and
// (0, 0, 0) is on the ground under the middle of its body.
import type { PartKind } from "./coat";
import { IDENTITY, add, cross, dot, euler, length, mulVec, normalize, rotX, rotZ, scale, sub, type M3, type V3 } from "./vec";

export type LegName = "FL" | "FR" | "HL" | "HR";
export const LEG_NAMES: readonly LegName[] = ["FL", "FR", "HL", "HR"];

export interface BodyJoint {
  c: V3;
  /** Nose-up tilt in radians. */
  pitch: number;
  roll: number;
  yaw: number;
}
export interface HeadJoint {
  c: V3;
  pitch: number;
  yaw: number;
  roll: number;
}
export interface LegPose {
  /** Where the paw's centre goes. */
  foot: V3;
  /** Toe-down tilt of the paw in radians (a lifted paw hangs a little). */
  pawPitch: number;
  /** Which way the knee or elbow points. */
  pole: V3;
}

export const TAIL_SEGMENTS = 12;

export interface Pose {
  haunch: BodyJoint;
  chest: BodyJoint;
  head: HeadJoint;
  legs: Record<LegName, LegPose>;
  tail: { base: V3; pitch: readonly number[]; yaw: readonly number[] };
  /** Extra outward tilt of the left and right ear, in radians (a twitch). */
  ears: readonly [number, number];
  /** 0 closed, 1 open. */
  eyes: number;
}

export interface EllipsoidPrim {
  kind: "ell";
  part: PartKind;
  side: number;
  /** Position along a limb or the tail, 0 to 1. */
  u: number;
  /** Which leg a leg sphere or paw belongs to. */
  leg?: LegName;
  c: V3;
  /** Local axes to world, as a rotation matrix. */
  R: M3;
  r: V3;
  /** The same ellipsoid in the neutral standing pose, used to place stripes and patches. */
  restC: V3;
  restR: M3;
}

export interface TrianglePrim {
  kind: "tri";
  part: PartKind;
  side: number;
  /** The front (inner) face of an ear shows the pink inner ear. */
  inner: boolean;
  a: V3;
  b: V3;
  c: V3;
}

export type Prim = EllipsoidPrim | TrianglePrim;

// ---- sizes ----

const CHEST_R: V3 = [6.7, 7.3, 6.8];
const HAUNCH_R: V3 = [7.0, 7.4, 7.2];
const BELLY_R: V3 = [6.3, 6.4, 5.2];
const HEAD_R: V3 = [9.3, 7.5, 7.6];
const MUZZLE_R: V3 = [4.0, 3.0, 3.2];
const CHEEK_R: V3 = [3.4, 3.0, 3.5];

const LEG_LENGTHS: Record<LegName, [number, number]> = { FL: [7.5, 7.5], FR: [7.5, 7.5], HL: [7.8, 7.8], HR: [7.8, 7.8] };
const LEG_RADII: Record<LegName, [number, number, number]> = { FL: [2.8, 2.3, 2.0], FR: [2.8, 2.3, 2.0], HL: [3.5, 2.5, 2.0], HR: [3.5, 2.5, 2.0] };
const PAW_R: V3 = [2.5, 1.5, 3.0];
const TAIL_STEP = 1.55;
const TAIL_R0 = 2.7;
const TAIL_R1 = 1.8;

// ---- the neutral standing pose ----

const flat = (n: number, value: number): number[] => Array.from({ length: n }, () => value);

export const REST_POSE: Pose = {
  haunch: { c: [0, 16.4, -4.9], pitch: 0, roll: 0, yaw: 0 },
  chest: { c: [0, 16.8, 4.4], pitch: 0, roll: 0, yaw: 0 },
  head: { c: [0, 23.0, 14.2], pitch: 0, yaw: 0, roll: 0 },
  legs: {
    FL: { foot: [4.0, 1.5, 5.4], pawPitch: 0, pole: [0, 0, -1] },
    FR: { foot: [-4.0, 1.5, 5.4], pawPitch: 0, pole: [0, 0, -1] },
    HL: { foot: [4.2, 1.5, -5.6], pawPitch: 0, pole: [0, 0, 1] },
    HR: { foot: [-4.2, 1.5, -5.6], pawPitch: 0, pole: [0, 0, 1] },
  },
  tail: { base: [0, 18.6, -10.6], pitch: Array.from({ length: TAIL_SEGMENTS }, (_, i) => 0.2 + i * 0.1), yaw: flat(TAIL_SEGMENTS, Math.PI) },
  ears: [0, 0],
  eyes: 1,
};

// ---- helpers ----

const jointRot = (j: { pitch: number; roll: number; yaw: number }): M3 => euler(-j.pitch, j.yaw, j.roll);
const headRot = (h: HeadJoint): M3 => euler(-h.pitch, h.yaw, h.roll);

/** Direction from a nose-up angle and a heading (0 = forward). */
export function aim(pitchUp: number, yaw: number): V3 {
  const cp = Math.cos(pitchUp);
  return [Math.sin(yaw) * cp, Math.sin(pitchUp), Math.cos(yaw) * cp];
}

/** The two-bone knee position, bending toward `pole`. */
export function solveKnee(hip: V3, foot: V3, a: number, b: number, pole: V3): { knee: V3; reach: V3 } {
  const d = sub(foot, hip);
  const dist = length(d);
  const dir = dist < 1e-6 ? ([0, -1, 0] as V3) : scale(d, 1 / dist);
  const clamped = Math.min(Math.max(dist, Math.abs(a - b) + 0.05), a + b - 0.02);
  const x = (a * a - b * b + clamped * clamped) / (2 * clamped);
  const h = Math.sqrt(Math.max(a * a - x * x, 0));
  let perp = sub(pole, scale(dir, dot(pole, dir)));
  if (length(perp) < 1e-5) perp = cross(dir, [1, 0, 0]);
  perp = normalize(perp);
  return { knee: add(add(hip, scale(dir, x)), scale(perp, h)), reach: add(hip, scale(dir, clamped)) };
}

/** Every chain of spheres uses a fixed count, so a posed cat and the neutral cat always have the same parts in the same order. */
const LEG_SPHERES = 6;
const TAIL_SPHERES = 2;

type Raw = Omit<EllipsoidPrim, "restC" | "restR">;
type RawPrim = Raw | TrianglePrim;

function chainSpheres(from: V3, to: V3, r0: number, r1: number, part: PartKind, side: number, u0: number, u1: number, count: number, includeStart: boolean, out: RawPrim[], leg?: LegName): void {
  for (let i = includeStart ? 0 : 1; i < count; i++) {
    const t = i / (count - 1);
    out.push({ kind: "ell", part, side, leg, u: u0 + (u1 - u0) * t, c: add(from, scale(sub(to, from), t)), R: IDENTITY, r: [r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t] });
  }
}

const SHOULDER: Record<LegName, V3> = { FL: [3.9, -3.4, 2.4], FR: [-3.9, -3.4, 2.4], HL: [4.2, -2.4, -1.8], HR: [-4.2, -2.4, -1.8] };

/** Where a leg joins the body (shoulder or hip) for a pose. */
export function legHip(pose: Pose, name: LegName): V3 {
  const front = name[0] === "F";
  return add((front ? pose.chest : pose.haunch).c, mulVec(jointRot(front ? pose.chest : pose.haunch), SHOULDER[name]));
}

/** How far past its full stretch a leg would have to reach to get its paw to the target (0 when it can reach). A leg that cannot reach looks detached, so animations must keep this at 0. */
export function legShortfall(pose: Pose, name: LegName): number {
  const [a, b] = LEG_LENGTHS[name];
  const dist = length(sub(add(pose.legs[name].foot, [0, 0.1, -0.5]), legHip(pose, name)));
  return Math.max(0, dist - (a + b - 0.02));
}

function assemble(pose: Pose): RawPrim[] {
  const out: RawPrim[] = [];
  const hR = jointRot(pose.haunch);
  const cR = jointRot(pose.chest);
  const headR = headRot(pose.head);

  // Torso: haunch, a belly joining them, and the chest.
  out.push({ kind: "ell", part: "haunch", side: 0, u: 0, c: pose.haunch.c, R: hR, r: HAUNCH_R });
  const bellyC: V3 = [(pose.haunch.c[0] + pose.chest.c[0]) / 2, (pose.haunch.c[1] + pose.chest.c[1]) / 2 - 0.9, (pose.haunch.c[2] + pose.chest.c[2]) / 2];
  const bellyR = jointRot({ pitch: (pose.haunch.pitch + pose.chest.pitch) / 2, roll: (pose.haunch.roll + pose.chest.roll) / 2, yaw: (pose.haunch.yaw + pose.chest.yaw) / 2 });
  out.push({ kind: "ell", part: "belly", side: 0, u: 0, c: bellyC, R: bellyR, r: BELLY_R });
  out.push({ kind: "ell", part: "chest", side: 0, u: 0, c: pose.chest.c, R: cR, r: CHEST_R });

  // Neck: fills the gap between the chest and the head.
  const neckC: V3 = [pose.chest.c[0] * 0.45 + pose.head.c[0] * 0.55, pose.chest.c[1] * 0.4 + pose.head.c[1] * 0.6 - 0.6, pose.chest.c[2] * 0.4 + pose.head.c[2] * 0.6 - 0.8];
  out.push({ kind: "ell", part: "chest", side: 0, u: 0, c: neckC, R: cR, r: [5.4, 5.2, 5.0] });

  // Head, muzzle and cheeks.
  out.push({ kind: "ell", part: "head", side: 0, u: 0, c: pose.head.c, R: headR, r: HEAD_R });
  out.push({ kind: "ell", part: "muzzle", side: 0, u: 0, c: add(pose.head.c, mulVec(headR, [0, -2.8, 6.2])), R: headR, r: MUZZLE_R });
  for (const side of [1, -1]) out.push({ kind: "ell", part: "cheek", side, u: 0, c: add(pose.head.c, mulVec(headR, [side * 5.8, -2.6, 2.6])), R: headR, r: CHEEK_R });

  // Ears: a pyramid each. In head space the base sits on top of the skull and the tip points up and a little out.
  [1, -1].forEach((side, i) => {
    const tilt = pose.ears[i];
    const local = (x: number, y: number, z: number): V3 => add(pose.head.c, mulVec(headR, mulVec(rotZ(-tilt * side), [x * side, y, z])));
    const tip = local(5.0, 12.4, 0.2);
    const front = local(1.6, 5.2, 2.8);
    const outer = local(8.0, 3.4, 0.8);
    const back = local(4.0, 5.4, -3.0);
    out.push({ kind: "tri", part: "ear", side, inner: true, a: front, b: outer, c: tip });
    out.push({ kind: "tri", part: "ear", side, inner: false, a: outer, b: back, c: tip });
    out.push({ kind: "tri", part: "ear", side, inner: false, a: back, b: front, c: tip });
    out.push({ kind: "tri", part: "ear", side, inner: false, a: front, b: back, c: outer });
  });

  // Legs: upper bone, lower bone and the paw.
  for (const name of LEG_NAMES) {
    const leg = pose.legs[name];
    const front = name[0] === "F";
    const side = name[1] === "L" ? 1 : -1;
    const hip = legHip(pose, name);
    const [a, b] = LEG_LENGTHS[name];
    const { knee, reach } = solveKnee(hip, add(leg.foot, [0, 0.1, -0.5]), a, b, leg.pole);
    const [rUpper, rMid, rLow] = LEG_RADII[name];
    chainSpheres(hip, knee, rUpper, rMid, "leg", side, 0, 0.5, LEG_SPHERES, true, out, name);
    chainSpheres(knee, reach, rMid, rLow, "leg", side, 0.5, 1, LEG_SPHERES, false, out, name);
    out.push({ kind: "ell", part: "paw", side, leg: name, u: 1, c: leg.foot, R: rotX(leg.pawPitch), r: PAW_R });
  }

  // Tail: a chain of spheres following the pose's angles.
  let p = pose.tail.base;
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const next = add(p, scale(aim(pose.tail.pitch[i] ?? 0.5, pose.tail.yaw[i] ?? Math.PI), TAIL_STEP));
    const t0 = i / TAIL_SEGMENTS;
    const t1 = (i + 1) / TAIL_SEGMENTS;
    chainSpheres(p, next, TAIL_R0 + (TAIL_R1 - TAIL_R0) * t0, TAIL_R0 + (TAIL_R1 - TAIL_R0) * t1, "tail", 0, t0, t1, TAIL_SPHERES + 1, i === 0, out);
    p = next;
  }
  return out;
}

let restParts: RawPrim[] | null = null;

/** Builds every solid of the cat for one pose, each carrying where it sits in the neutral standing pose. */
export function buildParts(pose: Pose): Prim[] {
  const posed = assemble(pose);
  restParts ??= assemble(REST_POSE);
  const rest = restParts;
  return posed.map((p, i): Prim => {
    if (p.kind === "tri") return p;
    const r = rest[i];
    if (r.kind !== "ell") throw new Error("The neutral cat and the posed cat have different parts");
    return { ...p, restC: r.c, restR: r.R };
  });
}

