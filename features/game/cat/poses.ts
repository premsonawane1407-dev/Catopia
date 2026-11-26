// The cat's animations as poses: given a clip and a frame number, where every joint goes. Walking and
// running are built from a gait (each foot is planted on the ground for part of the cycle and moves back
// at exactly the speed the body moves forward, so feet do not slide), the rest are hand-set key poses
// blended between.
import { CLIPS, CLIP_NAMES, type ClipName } from "./clips";
import { LEG_NAMES, REST_POSE, TAIL_SEGMENTS, type BodyJoint, type LegName, type LegPose, type Pose } from "./model";
import { clamp, mix, smooth, type V3 } from "./vec";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const lerp3 = (a: V3, b: V3, t: number): V3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const lerpJoint = (a: BodyJoint, b: BodyJoint, t: number): BodyJoint => ({ c: lerp3(a.c, b.c, t), pitch: mix(a.pitch, b.pitch, t), roll: mix(a.roll, b.roll, t), yaw: mix(a.yaw, b.yaw, t) });

/** Blends two poses. Every number moves in a straight line from one to the other. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const legs = {} as Record<LegName, LegPose>;
  for (const name of LEG_NAMES) {
    const la = a.legs[name];
    const lb = b.legs[name];
    legs[name] = { foot: lerp3(la.foot, lb.foot, t), pawPitch: mix(la.pawPitch, lb.pawPitch, t), pole: lerp3(la.pole, lb.pole, t) };
  }
  return {
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

export const WALK_GAIT: Gait = { stride: CLIPS.walk.stridePx ?? 26, duty: 0.62, lift: 3.4, offsets: { HL: 0, FL: 0.25, HR: 0.5, FR: 0.75 } };
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
}

const ease = (t: number): number => t * t * (3 - 2 * t);

/** Where one foot is at a point in the cycle. While planted it moves back at the body's own speed. */
export function footAt(gait: Gait, leg: LegName, cycle: number): FootState {
  const phase = (((cycle + gait.offsets[leg]) % 1) + 1) % 1;
  const reach = gait.stride * gait.duty;
  if (phase < gait.duty) {
    return { planted: true, z: reach * (0.5 - phase / gait.duty), y: FOOT_Y, phase };
  }
  const t = (phase - gait.duty) / (1 - gait.duty);
  return { planted: false, z: -reach / 2 + reach * ease(t), y: FOOT_Y + gait.lift * Math.sin(Math.PI * t) ** 0.8, phase };
}

function gaitFeet(gait: Gait, cycle: number, spreadX = 0): Record<LegName, LegPose> {
  const legs = {} as Record<LegName, LegPose>;
  for (const name of LEG_NAMES) {
    const rest = REST_POSE.legs[name];
    const f = footAt(gait, name, cycle);
    // A lifted paw hangs toe-down at the start of its swing and flicks level as it lands.
    const swingT = f.planted ? 0 : (f.phase - gait.duty) / (1 - gait.duty);
    const pawPitch = f.planted ? 0 : 0.5 * (1 - swingT) * Math.sin(Math.PI * Math.min(1, swingT * 1.4)) + 0.15;
    legs[name] = { foot: [rest.foot[0] + Math.sign(rest.foot[0]) * spreadX, f.y, rest.foot[2] + f.z], pawPitch, pole: rest.pole };
  }
  return legs;
}

function walkPose(frame: number): Pose {
  const cycle = frame / CLIPS.walk.frames;
  const phase = cycle * TAU;
  const p = copyPose(STAND);
  p.legs = gaitFeet(WALK_GAIT, cycle);
  const bob = 0.55 * Math.sin(2 * phase + 0.6);
  const sway = 0.7 * Math.sin(phase);
  p.haunch = { c: [-sway, p.haunch.c[1] + bob - 0.3, p.haunch.c[2]], pitch: 0.03 * Math.sin(phase), roll: 0.03 * Math.sin(phase), yaw: -0.07 * Math.sin(phase) };
  p.chest = { c: [sway, p.chest.c[1] + bob - 0.3, p.chest.c[2]], pitch: -0.03 * Math.sin(phase), roll: -0.03 * Math.sin(phase), yaw: 0.07 * Math.sin(phase) };
  p.head = { c: [sway * 0.3, p.head.c[1] + bob * 0.5 - 0.3, p.head.c[2] + 0.5 * Math.sin(phase + 0.4)], pitch: -0.05, yaw: -0.05 * Math.sin(phase), roll: 0.02 * Math.sin(phase) };
  const t = tailCurve({ rise: 0.38, curl: 0.95, swayAmp: 0.35, phase: phase + 1.2 });
  p.tail = { base: [0, p.tail.base[1] + bob - 0.3, p.tail.base[2]], ...t };
  return p;
}

function runPose(frame: number): Pose {
  const cycle = frame / CLIPS.run.frames;
  const phase = cycle * TAU;
  const p = copyPose(STAND);
  p.legs = gaitFeet(RUN_GAIT, cycle, 0);
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
    HL: { foot: [7.4, 1.5, 3.2], pawPitch: 0, pole: [1, 0.8, -0.3] },
    HR: { foot: [-7.4, 1.5, 3.2], pawPitch: 0, pole: [-1, 0.8, -0.3] },
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

const SLEEP: Pose = (() => {
  const p = copyPose(STAND);
  p.haunch = { c: [1.6, 6.8, -4.2], pitch: 0, roll: 0, yaw: 0.35 };
  p.chest = { c: [-0.8, 7.6, 3.6], pitch: 0, roll: 0, yaw: -0.2 };
  p.head = { c: [-2.4, 7.8, 12.2], pitch: -0.45, yaw: -0.5, roll: 0.5 };
  p.legs = {
    FL: { foot: [3.4, 1.5, 13.2], pawPitch: 0, pole: [0, 0, -1] },
    FR: { foot: [-3.6, 1.5, 11.6], pawPitch: 0, pole: [0, 0, -1] },
    HL: { foot: [7.6, 1.5, -2.0], pawPitch: 0, pole: [1, 0.8, 0] },
    HR: { foot: [-6.6, 1.5, -1.0], pawPitch: 0, pole: [-1, 0.8, 0] },
  };
  p.ears = [0, 0];
  p.eyes = 0;
  const yaw: number[] = [];
  const pitch: number[] = [];
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    yaw.push(Math.PI + 0.1 - 0.26 * i);
    pitch.push(-0.02);
  }
  p.tail = { base: [-2.6, 2.9, -9.4], pitch, yaw };
  return p;
})();

function sitPose(frame: number): Pose {
  const p = copyPose(SIT);
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

/** The pose for one frame of one clip. */
export function poseFor(clip: ClipName, frame: number): Pose {
  switch (clip) {
    case "idle":
      return idlePose(frame);
    case "walk":
      return walkPose(frame);
    case "run":
      return runPose(frame);
    case "sitDown": {
      const t = SIT_DOWN_AT[clamp(frame, 0, SIT_DOWN_AT.length - 1)];
      const p = lerpPose(STAND, SIT, smooth(t));
      // Feet drag a little and the head dips on the way down.
      return { ...p, head: { ...p.head, c: [p.head.c[0], p.head.c[1] - 1.2 * Math.sin(Math.PI * t), p.head.c[2]] } };
    }
    case "sit":
      return sitPose(frame);
    case "lieDown": {
      const t = LIE_DOWN_AT[clamp(frame, 0, LIE_DOWN_AT.length - 1)];
      const p = lerpPose(SIT, SLEEP, smooth(t));
      return { ...p, eyes: t > 0.5 ? 0 : 1 };
    }
    case "sleep":
      return sleepPose(frame);
  }
}

/** Every frame of every clip, in order, for checks and sheets. */
export function allClipPoses(): { clip: ClipName; frame: number; pose: Pose }[] {
  return CLIP_NAMES.flatMap((clip) => Array.from({ length: CLIPS[clip].frames }, (_, frame) => ({ clip, frame, pose: poseFor(clip, frame) })));
}
