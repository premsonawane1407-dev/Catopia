// The cat's animations as poses: given a clip and a frame number, where every joint goes. Walking and
// running are built from a gait (each foot is planted on the ground for part of the cycle and moves back
// at exactly the speed the body moves forward, so feet do not slide), the rest are hand-set key poses
// blended between.
import { CLIPS, CLIP_NAMES, type ClipName, type EmoteClip } from "./clips";
import { DEFAULT_META, LEG_NAMES, REST_POSE, TAIL_SEGMENTS, type BodyJoint, type CatLook, type LegName, type LegPose, type Pose } from "./model";
import { clamp, mix, smooth, type V3 } from "./vec";

const TAU = Math.PI * 2;
const lerp3 = (a: V3, b: V3, t: number): V3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const lerpJoint = (a: BodyJoint, b: BodyJoint, t: number): BodyJoint => ({ c: lerp3(a.c, b.c, t), pitch: mix(a.pitch, b.pitch, t), roll: mix(a.roll, b.roll, t), yaw: mix(a.yaw, b.yaw, t) });

/** Blends two poses. Every number moves in a straight line from one to the other. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const legs = {} as Record<LegName, LegPose>;
  for (const name of LEG_NAMES) {
    const la = a.legs[name];
    const lb = b.legs[name];
    legs[name] = { foot: lerp3(la.foot, lb.foot, t), pawPitch: mix(la.pawPitch, lb.pawPitch, t), pole: lerp3(la.pole, lb.pole, t), meta: mix(la.meta ?? DEFAULT_META[name], lb.meta ?? DEFAULT_META[name], t) };
  }
  const bulkA = a.bulk ?? { chest: 1, haunch: 1, thigh: 1 };
  const bulkB = b.bulk ?? { chest: 1, haunch: 1, thigh: 1 };
  return {
    bulk: { chest: mix(bulkA.chest, bulkB.chest, t), haunch: mix(bulkA.haunch, bulkB.haunch, t), thigh: mix(bulkA.thigh, bulkB.thigh, t) },
    haunch: lerpJoint(a.haunch, b.haunch, t),
    chest: lerpJoint(a.chest, b.chest, t),
    head: { c: lerp3(a.head.c, b.head.c, t), pitch: mix(a.head.pitch, b.head.pitch, t), yaw: mix(a.head.yaw, b.head.yaw, t), roll: mix(a.head.roll, b.head.roll, t) },
    legs,
    tail: {
      base: lerp3(a.tail.base, b.tail.base, t),
      pitch: a.tail.pitch.map((p, i) => mix(p, b.tail.pitch[i], t)),
      yaw: a.tail.yaw.map((p, i) => mix(p, b.tail.yaw[i], t)),
    },
    ears: [mix(a.ears[0], b.ears[0], t), mix(a.ears[1], b.ears[1], t)],
    eyes: mix(a.eyes, b.eyes, t),
  };
}

const copyPose = (p: Pose): Pose => lerpPose(p, p, 0);

/** A tail that rises from the body and curls up at the tip, swaying with `wave`. */
function tailCurve(opts: { rise: number; curl: number; swayAmp: number; phase: number; side?: number; heading?: number }): { pitch: number[]; yaw: number[] } {
  const pitch: number[] = [];
  const yaw: number[] = [];
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const t = i / (TAIL_SEGMENTS - 1);
    pitch.push(opts.rise + opts.curl * t * t + 0.05 * Math.sin(opts.phase - i * 0.45));
    yaw.push((opts.heading ?? Math.PI) + (opts.side ?? 0) * t + opts.swayAmp * t * Math.sin(opts.phase - i * 0.5));
  }
  return { pitch, yaw };
}

// ---- standing, idle ----

const STAND: Pose = copyPose(REST_POSE);

/** Standing and breathing: frames 0 to 3 are the breath (and a tail sway, an ear twitch at 3), frame 4 is a blink. */
function idlePose(frame: number): Pose {
  const p = copyPose(STAND);
  const phase = (frame / 4) * TAU;
  const breath = Math.sin(phase);
  p.chest = { ...p.chest, c: [p.chest.c[0], p.chest.c[1] + 0.45 * breath, p.chest.c[2]] };
  p.head = { ...p.head, c: [p.head.c[0], p.head.c[1] + 0.3 * breath, p.head.c[2]] };
  p.haunch = { ...p.haunch, c: [p.haunch.c[0], p.haunch.c[1] + 0.12 * breath, p.haunch.c[2]] };
  const t = tailCurve({ rise: 0.15, curl: 0.9, swayAmp: 0.3, phase });
  p.tail = { base: p.tail.base, ...t };
  if (frame === 3) p.ears = [0.35, 0];
  if (frame === 4) {
    p.eyes = 0;
    const t2 = tailCurve({ rise: 0.15, curl: 0.9, swayAmp: 0.3, phase: 0 });
    p.tail = { base: p.tail.base, ...t2 };
  }
  return p;
}

// ---- gaits ----

export interface Gait {
  /** How far the body travels during one full cycle, in sprite pixels. */
  stride: number;
  /** Share of the cycle each foot spends on the ground. */
  duty: number;
  /** How high a foot lifts while swinging. */
  lift: number;
  /** Where in the cycle each foot lands, as a fraction. */
  offsets: Record<LegName, number>;
}

export const WALK_GAIT: Gait = { stride: CLIPS.walk.stridePx ?? 26, duty: 0.625, lift: 3.4, offsets: { HL: 0, FL: 0.25, HR: 0.5, FR: 0.75 } };
export const RUN_GAIT: Gait = { stride: CLIPS.run.stridePx ?? 50, duty: 0.34, lift: 5.2, offsets: { FL: 0, FR: 0.07, HL: 0.46, HR: 0.53 } };

const FOOT_Y = REST_POSE.legs.FL.foot[1];

export interface FootState {
  /** True while the foot is on the ground. */
  planted: boolean;
  /** How far forward of its neutral place the paw is, in the cat's own frame (pixels). */
  z: number;
  y: number;
  /** Phase of this foot within its own cycle, 0 to 1. */
  phase: number;
  /** How far through its time on the ground (0 landing, 1 pushing off); 0 while swinging. */
  stanceU: number;
  /** How far through its swing through the air (0 just lifted, 1 landing); 0 while planted. */
  swingT: number;
}

const ease = (t: number): number => t * t * (3 - 2 * t);

/** Where one foot is at a point in the cycle. While planted it moves back at the body's own speed. */
export function footAt(gait: Gait, leg: LegName, cycle: number): FootState {
  const phase = (((cycle + gait.offsets[leg]) % 1) + 1) % 1;
  const reach = gait.stride * gait.duty;
  if (phase < gait.duty) {
    return { planted: true, z: reach * (0.5 - phase / gait.duty), y: FOOT_Y, phase, stanceU: phase / gait.duty, swingT: 0 };
  }
  const t = (phase - gait.duty) / (1 - gait.duty);
  // The paw leaves the ground quickly, passes close under the body and reaches forward to land.
  const lift = gait.lift * (leg[0] === "H" ? 0.9 : 1);
  return { planted: false, z: -reach / 2 + reach * ease(t), y: FOOT_Y + lift * Math.sin(Math.PI * Math.pow(t, 0.8)), phase, stanceU: 0, swingT: t };
}

/**
 * How the lowest leg bone leans at each moment (see LegPose.meta). On the ground the front wrist and the hind hock
 * start leaning forward as the paw lands, straighten under the body and trail as the leg pushes off; in the air
 * the paw hangs folded behind the wrist or hock, then reaches forward to land.
 */
export function legMeta(leg: LegName, f: FootState): number {
  const front = leg[0] === "F";
  if (f.planted) return front ? 0.25 - 0.45 * f.stanceU : 0.6 - 0.9 * f.stanceU;
  const s = smooth(f.swingT);
  return front ? mix(-0.6, 0.3, s) : mix(-0.45, 0.6, s);
}

function gaitFeet(gait: Gait, cycle: number): Record<LegName, LegPose> {
  const legs = {} as Record<LegName, LegPose>;
  for (const name of LEG_NAMES) {
    const rest = REST_POSE.legs[name];
    const f = footAt(gait, name, cycle);
    // A lifted paw hangs toe-down at the start of its swing and levels out as it lands, and swings a little
    // toward the middle line so the paws walk in a straight track.
    const pawPitch = f.planted ? 0 : 0.7 * Math.pow(1 - f.swingT, 1.3);
    const x = rest.foot[0] * (f.planted ? 1 : 1 - 0.2 * Math.sin(Math.PI * f.swingT));
    legs[name] = { foot: [x, f.y, rest.foot[2] + f.z], pawPitch, pole: rest.pole, meta: legMeta(name, f) };
  }
  return legs;
}

/**
 * The walk, eight frames. Each frame is drawn in the middle of its eighth of the cycle, so the frame that is shown
 * while the cat is anywhere in that eighth is never more than half a step from the truth. Four-beat gait: left hind,
 * left front, right hind, right front, each paw on the ground for five eighths, so two or three paws always bear weight.
 * The body is highest in the middle of each diagonal pair of supporting paws, the shoulders and hips turn against
 * each other, and the head and tail do very little.
 */
function walkPose(frame: number): Pose {
  return walkPoseAt((frame + 0.5) / CLIPS.walk.frames);
}

/** The walk at any point in the cycle (0 to 1), not only at the eight drawn frames: used to tell what is drawing error and what is the animation's own. */
function walkPoseAt(cycle: number): Pose {
  const phase = cycle * TAU;
  const p = copyPose(STAND);
  p.legs = gaitFeet(WALK_GAIT, cycle);
  // Diagonal pairs (left hind with right front, then left front with right hind) carry the body in the middle of the cycle's second
  // and last quarters, so that is when it is highest.
  const bob = 0.5 * Math.cos(2 * (phase - 0.44 * TAU)) - 0.35;
  const sway = 0.55 * Math.sin(phase - 0.2);
  const turn = Math.sin(phase - 0.2);
  p.haunch = { c: [-sway, p.haunch.c[1] + bob, p.haunch.c[2]], pitch: -0.025 * Math.cos(2 * (phase - 0.2 * TAU)), roll: 0.03 * turn, yaw: -0.06 * turn };
  p.chest = { c: [sway, p.chest.c[1] + bob, p.chest.c[2]], pitch: 0.025 * Math.cos(2 * (phase - 0.2 * TAU)), roll: -0.03 * turn, yaw: 0.06 * turn };
  p.head = { c: [sway * 0.35, p.head.c[1] + bob - 0.15 * Math.cos(2 * (phase - 0.44 * TAU)), p.head.c[2] + 0.3 * Math.sin(2 * (phase - 0.44 * TAU))], pitch: -0.04, yaw: -0.04 * turn, roll: 0.015 * turn };
  p.tail = { base: [0, p.tail.base[1] + bob, p.tail.base[2]], ...tailCurve({ rise: 0.38, curl: 0.95, swayAmp: 0.3, phase: phase + 1.2 }) };
  return p;
}

function runPose(frame: number): Pose {
  return runPoseAt((frame + 0.5) / CLIPS.run.frames);
}

function runPoseAt(cycle: number): Pose {
  const phase = cycle * TAU;
  const p = copyPose(STAND);
  p.legs = gaitFeet(RUN_GAIT, cycle);
  // The back flexes like a spring: chest and haunch rise and fall out of step, and the body stretches in the air.
  const lift = Math.sin(phase + 0.2);
  const stretch = Math.sin(phase + 1.1);
  p.haunch = { c: [0, p.haunch.c[1] - 1.8 + 1.7 * Math.sin(phase + 2.4), p.haunch.c[2] - 1.6 - 1.6 * stretch], pitch: 0.2 * Math.sin(phase + 2.6), roll: 0, yaw: 0 };
  p.chest = { c: [0, p.chest.c[1] - 2.2 + 1.8 * lift, p.chest.c[2] + 1.0 + 1.2 * stretch], pitch: -0.22 * Math.sin(phase + 0.4) - 0.04, roll: 0, yaw: 0 };
  p.head = { c: [0, p.head.c[1] - 4.2 + 1.2 * lift, p.head.c[2] + 2.8 + 1.4 * stretch], pitch: -0.12 + 0.12 * Math.sin(phase + 0.2), yaw: 0, roll: 0 };
  p.tail = { base: [0, p.tail.base[1] - 1.8 + 1.7 * Math.sin(phase + 2.4), p.tail.base[2] - 1.6 - 1.6 * stretch], ...tailCurve({ rise: 0.12, curl: 0.55, swayAmp: 0.22, phase: phase + 1.8 }) };
  p.ears = [-0.25, -0.25];
  return p;
}

// ---- sitting and sleeping ----

const SIT: Pose = (() => {
  const p = copyPose(STAND);
  p.haunch = { c: [0, 7.4, -3.6], pitch: 0.4, roll: 0, yaw: 0 };
  p.chest = { c: [0, 16.6, 1.4], pitch: 1.08, roll: 0, yaw: 0 };
  p.head = { c: [0, 29.4, 4.2], pitch: -0.1, yaw: 0, roll: 0 };
  p.legs = {
    FL: { foot: [3.5, 1.5, 6.2], pawPitch: 0, pole: [0, 0, -1] },
    FR: { foot: [-3.5, 1.5, 6.2], pawPitch: 0, pole: [0, 0, -1] },
    HL: { foot: [5.8, 1.5, 3.0], pawPitch: 0, pole: [0.35, 0.9, 0.35], meta: 1.35 },
    HR: { foot: [-5.8, 1.5, 3.0], pawPitch: 0, pole: [-0.35, 0.9, 0.35], meta: 1.35 },
  };
  const yaw: number[] = [];
  const pitch: number[] = [];
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    yaw.push(Math.PI - 0.17 * i);
    pitch.push(-0.02);
  }
  p.tail = { base: [3.6, 2.9, -8.2], pitch, yaw };
  return p;
})();

/**
 * Asleep: a loaf. The body lies low on its belly with the hind legs tucked under the hips, the front paws stretched
 * out in front, the head resting on them with the nose down and the eyes closed, and the tail wrapped round the side of
 * the body toward the nose.
 */
const SLEEP: Pose = (() => {
  const p = copyPose(STAND);
  p.bulk = { chest: 1.1, haunch: 1.15, thigh: 1.35 };
  p.haunch = { c: [0, 7.3, -3.8], pitch: 0, roll: 0, yaw: 0 };
  p.chest = { c: [0, 7.6, 4.2], pitch: -0.05, roll: 0, yaw: 0 };
  p.head = { c: [0, 9.6, 13.4], pitch: 0.3, yaw: 0, roll: 0.06 };
  p.legs = {
    FL: { foot: [4.2, 1.5, 18.6], pawPitch: 0, pole: [0, 0.5, -1], meta: 1.25 },
    FR: { foot: [-4.2, 1.5, 18.6], pawPitch: 0, pole: [0, 0.5, -1], meta: 1.25 },
    HL: { foot: [5.2, 1.5, -1.2], pawPitch: 0, pole: [0.3, 0.9, 0.4], meta: 1.4 },
    HR: { foot: [-5.2, 1.5, -1.2], pawPitch: 0, pole: [-0.3, 0.9, 0.4], meta: 1.4 },
  };
  p.ears = [0, 0];
  p.eyes = 0;
  const yaw: number[] = [];
  const pitch: number[] = [];
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    yaw.push(Math.PI - 0.14 * i - 0.011 * i * i);
    pitch.push(-0.02);
  }
  p.tail = { base: [3.4, 3.0, -9.6], pitch, yaw };
  return p;
})();

/**
 * The refined sitting pose: the same front-facing sit, but fuller. The chest and haunches are rounder, the thighs show as
 * the round hips either side of the body, the front legs stand as two separate columns a paw's width apart, the head sits
 * on a longer neck, and the tail comes out from behind the body and curls round to the front.
 */
const SIT_REFINED: Pose = (() => {
  const p = copyPose(SIT);
  p.bulk = { chest: 1.3, haunch: 1.15, thigh: 1.6 };
  p.haunch = { c: [0, 8.6, -3.0], pitch: 0.45, roll: 0, yaw: 0 };
  p.chest = { c: [0, 17.6, 1.0], pitch: 0.98, roll: 0, yaw: 0 };
  p.head = { c: [0, 29.6, 4.6], pitch: -0.05, yaw: 0, roll: 0 };
  p.legs = {
    FL: { foot: [4.5, 1.5, 6.8], pawPitch: 0, pole: [0, 0, -1] },
    FR: { foot: [-4.5, 1.5, 6.8], pawPitch: 0, pole: [0, 0, -1] },
    HL: { foot: [5.6, 1.5, 2.6], pawPitch: 0, pole: [0.35, 0.9, 0.35], meta: 1.35 },
    HR: { foot: [-5.6, 1.5, 2.6], pawPitch: 0, pole: [-0.35, 0.9, 0.35], meta: 1.35 },
  };
  const yaw: number[] = [];
  const pitch: number[] = [];
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    yaw.push(Math.PI - 0.1 * i - 0.022 * i * i);
    pitch.push(i < 7 ? -0.02 : -0.02 + 0.1 * (i - 6));
  }
  p.tail = { base: [3.8, 3.0, -7.2], pitch, yaw };
  return p;
})();

function sitPose(frame: number, look: CatLook): Pose {
  const p = copyPose(look === "refined" ? SIT_REFINED : SIT);
  const phase = (frame / 4) * TAU;
  const breath = Math.sin(phase);
  p.chest = { ...p.chest, c: [p.chest.c[0], p.chest.c[1] + 0.35 * breath, p.chest.c[2]] };
  p.head = { ...p.head, c: [p.head.c[0], p.head.c[1] + 0.3 * breath, p.head.c[2]] };
  // The tip of the curled tail flicks.
  const pitch = p.tail.pitch.slice();
  const yaw = p.tail.yaw.slice();
  for (let i = TAIL_SEGMENTS - 4; i < TAIL_SEGMENTS; i++) {
    pitch[i] += 0.16 * (i - (TAIL_SEGMENTS - 5)) * Math.max(0, Math.sin(phase));
    yaw[i] += 0.08 * Math.sin(phase);
  }
  p.tail = { ...p.tail, pitch, yaw };
  if (frame === 3) p.ears = [0.3, 0];
  if (frame === 4) p.eyes = 0;
  return p;
}

function sleepPose(frame: number): Pose {
  const p = copyPose(SLEEP);
  const breath = Math.sin((frame / 4) * TAU);
  p.chest = { ...p.chest, c: [p.chest.c[0], p.chest.c[1] + 0.5 * breath, p.chest.c[2]] };
  p.haunch = { ...p.haunch, c: [p.haunch.c[0], p.haunch.c[1] + 0.3 * breath, p.haunch.c[2]] };
  p.head = { ...p.head, c: [p.head.c[0], p.head.c[1] + 0.2 * breath, p.head.c[2]] };
  return p;
}

/** Fractions of the way from the first pose to the second that the three frames of a transition show. */
const SIT_DOWN_AT = [0.3, 0.62, 0.88];
const LIE_DOWN_AT = [0.3, 0.62, 0.88];

// ---- jumping ----

const legsAt = (fl: V3, fr: V3, hl: V3, hr: V3, o: { frontPitch?: number; hindMeta?: number; frontMeta?: number; hindPole?: V3 } = {}): Record<LegName, LegPose> => ({
  FL: { foot: fl, pawPitch: o.frontPitch ?? 0, pole: [0, 0, -1], meta: o.frontMeta ?? 0.1 },
  FR: { foot: fr, pawPitch: o.frontPitch ?? 0, pole: [0, 0, -1], meta: o.frontMeta ?? 0.1 },
  HL: { foot: hl, pawPitch: 0.15, pole: o.hindPole ?? [0, 0, 1], meta: o.hindMeta ?? 0.3 },
  HR: { foot: hr, pawPitch: 0.15, pole: o.hindPole ?? [0, 0, 1], meta: o.hindMeta ?? 0.3 },
});

/**
 * A jump, ten frames, from what a cat's body does (see player/air.ts for which one shows when):
 * 0 anticipation: lowered, the hind legs bent and compressed, the weight shifted back, the front paws starting to lift;
 * 1 take-off: the hind legs extend with a push, the front paws leave the ground first, the body angled up;
 * 2 rising: stretched out, front paws reaching forward, hind legs trailing behind;
 * 3 the top: tucked up, the tail curled for balance, a slight twist of the body;
 * 4 falling: nose a little down, the legs reaching for the ground;
 * 5 bracing: the front paws stretched out to meet the ground, the hind legs still dropping;
 * 6 landing: the front paws touch first and bend, the hind paws still in the air;
 * 7 landed: all four paws down, the body compressed low to take the impact;
 * 8 recovering: rising back toward standing, the tail settling;
 * 9 a leap's stretch: the whole body long and flat, front paws reaching forward and hind legs straight back.
 * The picture is lifted off the ground by the cat's real height in the game; these poses only give the shape of the body.
 */
function jumpPose(frame: number): Pose {
  const p = copyPose(STAND);
  const tail = (rise: number, curl: number, sway = 0.1) => tailCurve({ rise, curl, swayAmp: sway, phase: 0 });
  switch (frame) {
    case 0: // anticipation
      p.haunch = { c: [0, 14.2, -7.4], pitch: -0.14, roll: 0, yaw: 0 };
      p.chest = { c: [0, 14.8, 3.0], pitch: 0.12, roll: 0, yaw: 0 };
      p.head = { c: [0, 21.6, 12.6], pitch: 0.12, yaw: 0, roll: 0 };
      p.legs = legsAt([3.9, 2.6, 6.4], [-3.9, 2.6, 6.4], [4.4, 1.5, -3.6], [-4.4, 1.5, -3.6], { frontPitch: 0.35, hindMeta: 0.75 });
      p.tail = { base: [0, 16.4, -12.6], ...tail(0.04, 0.45) };
      p.ears = [-0.15, -0.15];
      break;
    case 1: // take-off
      p.haunch = { c: [0, 19.2, -7.0], pitch: 0.3, roll: 0, yaw: 0 };
      p.chest = { c: [0, 21.2, 6.4], pitch: 0.36, roll: 0, yaw: 0 };
      p.head = { c: [0, 28.4, 16.6], pitch: 0.22, yaw: 0, roll: 0 };
      p.legs = legsAt([3.8, 12.2, 13.2], [-3.8, 12.2, 13.2], [4.2, 2.2, -12.2], [-4.2, 2.2, -12.2], { frontPitch: 0.4, frontMeta: -0.3, hindMeta: -0.3 });
      p.tail = { base: [0, 21.4, -12.0], ...tail(0.12, 0.2) };
      break;
    case 2: // rising, stretched
      p.haunch = { c: [0, 19.8, -6.8], pitch: 0.2, roll: 0, yaw: 0 };
      p.chest = { c: [0, 21.4, 6.4], pitch: 0.26, roll: 0, yaw: 0 };
      p.head = { c: [0, 27.8, 16.6], pitch: 0.14, yaw: 0, roll: 0 };
      p.legs = legsAt([3.7, 14.4, 16.0], [-3.7, 14.4, 16.0], [4.2, 8.6, -13.8], [-4.2, 8.6, -13.8], { frontPitch: 0.15, frontMeta: 0.05, hindMeta: -0.25 });
      p.tail = { base: [0, 21.0, -11.8], ...tail(0.3, 0.5) };
      break;
    case 3: // the top, tucked, a little twist
      p.haunch = { c: [0, 19.8, -5.6], pitch: 0.02, roll: 0.05, yaw: -0.04 };
      p.chest = { c: [0, 20.2, 5.2], pitch: 0, roll: -0.05, yaw: 0.04 };
      p.head = { c: [0, 26.6, 15.4], pitch: 0, yaw: 0.04, roll: 0.03 };
      p.legs = legsAt([4.4, 9.6, 8.4], [-4.4, 9.6, 8.4], [4.6, 8.2, -3.4], [-4.6, 8.2, -3.4], { frontPitch: 0.5, frontMeta: -0.5, hindMeta: 0.6 });
      p.tail = { base: [0, 20.6, -11.2], ...tail(0.5, 1.0) };
      p.ears = [0.15, 0.15];
      break;
    case 4: // falling
      p.haunch = { c: [0, 19.6, -5.8], pitch: -0.1, roll: 0, yaw: 0 };
      p.chest = { c: [0, 19.4, 5.4], pitch: -0.2, roll: 0, yaw: 0 };
      p.head = { c: [0, 25.4, 15.8], pitch: -0.1, yaw: 0, roll: 0 };
      p.legs = legsAt([3.9, 6.6, 12.6], [-3.9, 6.6, 12.6], [4.2, 5.4, -6.2], [-4.2, 5.4, -6.2], { frontPitch: 0.3, hindMeta: 0.4 });
      p.tail = { base: [0, 20.2, -11.0], ...tail(0.38, 0.8) };
      p.ears = [-0.1, -0.1];
      break;
    case 5: // bracing: front paws out to meet the ground
      p.haunch = { c: [0, 19.0, -5.6], pitch: -0.14, roll: 0, yaw: 0 };
      p.chest = { c: [0, 18.6, 5.6], pitch: -0.22, roll: 0, yaw: 0 };
      p.head = { c: [0, 24.6, 16.0], pitch: 0.06, yaw: 0, roll: 0 };
      p.legs = legsAt([3.9, 2.6, 14.4], [-3.9, 2.6, 14.4], [4.2, 6.2, -5.6], [-4.2, 6.2, -5.6], { frontPitch: -0.1, frontMeta: 0.2, hindMeta: 0.4 });
      p.tail = { base: [0, 19.8, -11.0], ...tail(0.45, 0.8) };
      p.ears = [-0.2, -0.2];
      break;
    case 6: // landing: front paws down and bending, hind paws still in the air
      p.haunch = { c: [0, 18.0, -5.6], pitch: -0.12, roll: 0, yaw: 0 };
      p.chest = { c: [0, 16.0, 5.4], pitch: -0.18, roll: 0, yaw: 0 };
      p.head = { c: [0, 22.4, 15.8], pitch: 0, yaw: 0, roll: 0 };
      p.legs = legsAt([4.0, 1.5, 12.4], [-4.0, 1.5, 12.4], [4.2, 4.4, -4.8], [-4.2, 4.4, -4.8], { frontMeta: 0.25, hindMeta: 0.5 });
      p.tail = { base: [0, 19.0, -11.0], ...tail(0.5, 0.9) };
      p.ears = [-0.25, -0.25];
      break;
    case 7: // landed: all four down, compressed
      p.haunch = { c: [0, 14.0, -5.6], pitch: -0.08, roll: 0, yaw: 0 };
      p.chest = { c: [0, 14.4, 5.2], pitch: -0.1, roll: 0, yaw: 0 };
      p.head = { c: [0, 20.8, 15.6], pitch: -0.08, yaw: 0, roll: 0 };
      p.legs = legsAt([4.3, 1.5, 7.4], [-4.3, 1.5, 7.4], [4.4, 1.5, -4.4], [-4.4, 1.5, -4.4], { hindMeta: 0.7 });
      p.tail = { base: [0, 16.0, -11.0], ...tail(0.55, 0.9) };
      p.ears = [-0.25, -0.25];
      break;
    case 8: // recovering
      p.haunch = { c: [0, 17.6, -5.2], pitch: 0, roll: 0, yaw: 0 };
      p.chest = { c: [0, 18.0, 4.8], pitch: 0, roll: 0, yaw: 0 };
      p.head = { c: [0, 24.2, 14.6], pitch: 0, yaw: 0, roll: 0 };
      p.tail = { base: [0, 19.2, -10.8], ...tail(0.4, 0.9) };
      break;
    default: // 9: a leap's stretch, long and flat
      p.haunch = { c: [0, 19.8, -7.4], pitch: 0.06, roll: 0, yaw: 0 };
      p.chest = { c: [0, 20.4, 7.0], pitch: 0.04, roll: 0, yaw: 0 };
      p.head = { c: [0, 26.2, 17.4], pitch: 0.04, yaw: 0, roll: 0 };
      p.legs = legsAt([3.7, 15.4, 17.6], [-3.7, 15.4, 17.6], [4.2, 15.2, -16.6], [-4.2, 15.2, -16.6], { frontPitch: 0.1, frontMeta: 0.05, hindMeta: -0.5 });
      p.tail = { base: [0, 20.8, -12.4], ...tail(0.05, 0.1) };
      p.ears = [-0.2, -0.2];
  }
  return p;
}

// ---- emotes: sitting facing the camera and saying something ----

function emotePose(clip: EmoteClip, frame: number, look: CatLook): Pose {
  const p = copyPose(look === "refined" ? SIT_REFINED : SIT);
  const f = Math.min(3, Math.max(0, frame));
  const phase = (f / 4) * TAU;
  // The body (and, for a bounce or a startled hop, the paws too) moves up by `dy`.
  const nudge = (dy: number, paws = false) => {
    p.chest = { ...p.chest, c: [p.chest.c[0], p.chest.c[1] + dy, p.chest.c[2]] };
    p.head = { ...p.head, c: [p.head.c[0], p.head.c[1] + dy, p.head.c[2]] };
    if (paws) for (const name of LEG_NAMES) p.legs = { ...p.legs, [name]: { ...p.legs[name], foot: [p.legs[name].foot[0], p.legs[name].foot[1] + dy, p.legs[name].foot[2]] as V3 } };
  };
  const wag = (amount: number) => {
    const yaw = p.tail.yaw.map((y, i) => y + amount * (i / (TAIL_SEGMENTS - 1)) * Math.sin(phase * 2 + i * 0.3));
    p.tail = { ...p.tail, yaw };
  };
  switch (clip) {
    case "emoteMeow": {
      const mouth = [0, 1, 0.7, 0][f];
      const pitch = [0.04, 0.26, 0.18, 0.04][f];
      p.head = { ...p.head, pitch, c: [p.head.c[0], p.head.c[1] + [0, 0.6, 0.4, 0][f], p.head.c[2]] };
      p.expression = { mouth, eyes: mouth > 0.5 ? "half" : undefined };
      p.ears = [0.1, 0.1];
      wag(0.3);
      break;
    }
    case "emoteHappy": {
      nudge([0, 0.9, 0, 0.9][f], true);
      p.expression = { eyes: "happy", mouth: 0 };
      p.ears = [0.12, 0.12];
      p.head = { ...p.head, roll: [0.05, -0.05, 0.05, -0.05][f] };
      wag(0.9);
      break;
    }
    case "emoteCurious": {
      p.head = { ...p.head, roll: [0, 0.34, 0.34, 0.26][f], pitch: 0.1 };
      p.expression = { eyes: "wide" };
      p.ears = [[0, 0.3, 0.1, 0.3][f], [0.1, 0, 0.25, 0][f]];
      wag(0.2);
      break;
    }
    case "emoteSurprised": {
      nudge([0, 1.8, 1.8, 0.7][f], true);
      p.expression = { eyes: "wide", mouth: [0, 0.55, 0.55, 0.3][f] };
      p.ears = [0.3, 0.3];
      p.head = { ...p.head, pitch: 0.16 };
      p.tail = { ...p.tail, pitch: p.tail.pitch.map((v, i) => v + (i > 3 ? 0.35 : 0)) };
      break;
    }
    case "emoteSleepy": {
      p.expression = { eyes: (["half", undefined, undefined, "half"] as const)[f], mouth: [0, 1, 0.9, 0][f] };
      p.eyes = f === 1 || f === 2 ? 0 : 1;
      p.head = { ...p.head, pitch: [0.04, 0.34, 0.3, -0.16][f] };
      nudge([0, 0.5, 0.4, -0.5][f]);
      p.ears = [-0.2, -0.2];
      break;
    }
    case "emoteWave": {
      const sway = [-1.3, 0.7, -1.3, 0.7][f];
      p.legs = { ...p.legs, FR: { foot: [-3.2 + sway, 17.2 + [0, 0.8, 0, 0.8][f], 9.6], pawPitch: -0.2, pole: [-1, 0.5, -0.3], meta: -0.15 } };
      p.expression = { eyes: "happy", mouth: [0, 0.3, 0, 0.3][f] };
      p.head = { ...p.head, roll: 0.1 };
      p.ears = [0.1, 0.1];
      wag(0.4);
      break;
    }
  }
  return p;
}

/** The walk or run at any point of its cycle, 0 to 1. The drawn frames are this function sampled at the middle of each equal part. */
export function poseAtCycle(clip: "walk" | "run", cycle: number): Pose {
  return clip === "walk" ? walkPoseAt(cycle) : runPoseAt(cycle);
}

/** The pose for one frame of one clip. */
export function poseFor(clip: ClipName, frame: number, look: CatLook = "original"): Pose {
  const sit = look === "refined" ? SIT_REFINED : SIT;
  switch (clip) {
    case "idle":
      return idlePose(frame);
    case "walk":
      return walkPose(frame);
    case "run":
      return runPose(frame);
    case "sitDown": {
      const t = SIT_DOWN_AT[clamp(frame, 0, SIT_DOWN_AT.length - 1)];
      const p = lerpPose(STAND, sit, smooth(t));
      // Feet drag a little and the head dips on the way down.
      return { ...p, head: { ...p.head, c: [p.head.c[0], p.head.c[1] - 1.2 * Math.sin(Math.PI * t), p.head.c[2]] } };
    }
    case "sit":
      return sitPose(frame, look);
    case "lieDown": {
      const t = LIE_DOWN_AT[clamp(frame, 0, LIE_DOWN_AT.length - 1)];
      const p = lerpPose(sit, SLEEP, smooth(t));
      return { ...p, eyes: t > 0.5 ? 0 : 1 };
    }
    case "sleep":
      return sleepPose(frame);
    case "jump":
      return jumpPose(frame);
    default:
      return emotePose(clip, frame, look);
  }
}

/** Every frame of every clip, in order, for checks and sheets. */
export function allClipPoses(): { clip: ClipName; frame: number; pose: Pose }[] {
  return CLIP_NAMES.flatMap((clip) => Array.from({ length: CLIPS[clip].frames }, (_, frame) => ({ clip, frame, pose: poseFor(clip, frame) })));
}
