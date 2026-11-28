// Measures foot sliding the way a player would see it: it moves a cat across the ground at a chosen speed and
// direction through the real step logic (the state machine and the distance-driven cycle), works out where each
// planted paw is on the screen, and reports how far that paw wanders from one place while it is supposed to stay still.
//
// Everything is in sprite pixels on the screen. Moving along the ground, the cat travels `ground` pixels per world
// pixel sideways and `sin(pitch)` pixels toward or away from the camera; a drawn paw sits at its sprite position,
// whose vertical size counts `cos(pitch - tilt)` on screen. A planted paw's ground position is the cat's plus the paw's
// place in the sprite; it should stay put.
import { CLIPS, WALK_SPEED_PX, directionHeading } from "../cat/clips";
import { LEG_NAMES, type LegName } from "../cat/model";
import { poseAtCycle, poseFor } from "../cat/poses";
import type { Pose } from "../cat/model";
import { CAMERA, SPRITE_LEAN } from "../world/stage-constants";
import { frameOf, initialAnim, stepAnim } from "./cat-state";
import { footDepthScale, strideFactor } from "./stride";
import { VIEW_ELEVATION_DEG } from "../cat/clips";

export interface SlideReport {
  /** Largest distance, in sprite pixels, any planted paw strays from the middle of its own stance. */
  maxStray: number;
  /** Root-mean-square of the same, over every planted paw in every frame. */
  rmsStray: number;
  /** Stances measured. */
  stances: number;
  /** The most the body moved in one drawn frame, in sprite pixels, so a stray can be compared with a step. */
  stepPx: number;
}

const rad = (d: number) => (d * Math.PI) / 180;

export interface SlideOptions {
  clip: "walk" | "run";
  direction: number;
  /** Speed as a share of the clip's own speed (0.5 is half speed). */
  speedShare: number;
  seconds?: number;
  dt?: number;
}

/** Position of a paw on the screen relative to the cat, in sprite pixels (x right, y down). */
export function pawOnScreen(pose: Pose, direction: number, leg: LegName): { x: number; y: number; planted: boolean } {
  const foot = pose.legs[leg].foot;
  const h = directionHeading(direction);
  // Rotate the model about the vertical by the heading, as the drawing does.
  const x = Math.cos(h) * foot[0] + Math.sin(h) * foot[2];
  const z = -Math.sin(h) * foot[0] + Math.cos(h) * foot[2];
  const e = rad(VIEW_ELEVATION_DEG);
  // Screen up in the drawing is (0, cos e, -sin e); sprite pixels count cos(pitch - tilt) on the real screen.
  const up = foot[1] * Math.cos(e) - z * Math.sin(e);
  const spriteScale = Math.cos(rad(CAMERA.pitch) - rad(CAMERA.pitch) * SPRITE_LEAN);
  return { x, y: -up * spriteScale, planted: foot[1] <= 1.5 + 1e-6 };
}

export function measureSlide({ clip, direction, speedShare, seconds = 6, dt = 1 / 60 }: SlideOptions): SlideReport {
  const unitsPerPx = 0.0155;
  const baseSpeedPx = clip === "walk" ? WALK_SPEED_PX : 105;
  const speed = baseSpeedPx * speedShare * unitsPerPx;
  const h = directionHeading(direction);
  const dirX = Math.sin(h);
  const dirZ = Math.cos(h);
  const anim = initialAnim(direction);
  // Cat position on the screen in sprite pixels: sideways counts 1, toward the camera counts sin(pitch).
  let catX = 0;
  let catY = 0;
  const sinP = Math.sin(rad(CAMERA.pitch));
  void footDepthScale;

  const stance: Record<LegName, { x: number; y: number }[] | null> = { FL: null, FR: null, HL: null, HR: null };
  const strays: number[] = [];
  let stances = 0;
  let stepPx = 0;
  const flush = (leg: LegName) => {
    const list = stance[leg];
    if (list && list.length >= 3) {
      const mx = list.reduce((a, p) => a + p.x, 0) / list.length;
      const my = list.reduce((a, p) => a + p.y, 0) / list.length;
      for (const p of list) strays.push(Math.hypot(p.x - mx, p.y - my));
      stances++;
    }
    stance[leg] = null;
  };

  let lastFrame = -1;
  let lastCat = { x: 0, y: 0 };
  for (let t = 0; t < seconds; t += dt) {
    const dist = speed * dt;
    stepAnim(anim, { dt, gait: clip, pushX: dirX, pushZ: dirZ, distance: dist, speed, unitsPerPx, motion: true, rest: null });
    catX += (dirX * dist) / unitsPerPx;
    catY += (dirZ * dist * sinP) / unitsPerPx;
    const f = frameOf(anim, true);
    if (f.clip !== clip) continue;
    if (f.frame !== lastFrame) {
      if (lastFrame >= 0) stepPx = Math.max(stepPx, Math.hypot(catX - lastCat.x, catY - lastCat.y));
      lastFrame = f.frame;
      lastCat = { x: catX, y: catY };
    }
    // Only judge once the cat is up to speed (the first moments ease in).
    if (t < 0.5) continue;
    for (const leg of LEG_NAMES) {
      const p = pawOnScreen(poseFor(clip, f.frame), direction, leg);
      if (p.planted) (stance[leg] ??= []).push({ x: catX + p.x, y: catY + p.y });
      else flush(leg);
    }
  }
  for (const leg of LEG_NAMES) flush(leg);
  const max = strays.length ? Math.max(...strays) : 0;
  const rms = strays.length ? Math.sqrt(strays.reduce((a, v) => a + v * v, 0) / strays.length) : 0;
  void CLIPS;
  return { maxStray: max, rmsStray: rms, stances, stepPx };
}

// ---- where the error comes from ----

export interface ContactOptions {
  clip: "walk" | "run";
  direction: number;
  /** Speed as a share of the clip's own speed. */
  speedShare: number;
  /** Frames the cycle is drawn in. 0 means no frames at all: the animation's own continuous motion. */
  frames: number;
  /**
   * How much of the leftover between where the cat really is in its cycle and the middle of the frame being shown is taken out by
   * moving the picture back along the ground: 0 leaves it (paws drift, body smooth), 1 takes it all out (paws locked, body
   * steps with the frames).
   */
  lock: number;
  seconds?: number;
}

export interface ContactReport {
  /** Largest distance a planted paw strays from the middle of its stance, in sprite pixels on the screen. */
  pawStray: number;
  /** Largest distance the picture of the body is moved off the cat's true path to hold the paws, in the same pixels. */
  bodyOffset: number;
  stances: number;
}

/** Foot sliding by cause: sampling the cycle into frames, an optional lock that trades it for body offset, or the data itself. */
export function analyzeContact({ clip, direction, speedShare, frames, lock, seconds = 8 }: ContactOptions): ContactReport {
  const unitsPerPx = 0.0155;
  const dt = 1 / 240;
  const clipSpec = CLIPS[clip];
  const base = clip === "walk" ? WALK_SPEED_PX : 105;
  const speed = base * speedShare * unitsPerPx;
  const h = directionHeading(direction);
  const sinP = Math.sin(rad(CAMERA.pitch));
  // Ground a full cycle covers, in sprite pixels (what the state machine's distance-driven phase divides by).
  const cycleGround = (clipSpec.stridePx ?? 1) * strideFactorFor(direction);
  let catGround = 0;
  const stance: Record<LegName, { x: number; y: number }[] | null> = { FL: null, FR: null, HL: null, HR: null };
  const strays: number[] = [];
  let stances = 0;
  let bodyOffset = 0;
  const flush = (leg: LegName) => {
    const list = stance[leg];
    if (list && list.length >= 3) {
      const mx = list.reduce((a, p) => a + p.x, 0) / list.length;
      const my = list.reduce((a, p) => a + p.y, 0) / list.length;
      for (const p of list) strays.push(Math.hypot(p.x - mx, p.y - my));
      stances++;
    }
    stance[leg] = null;
  };
  for (let t = 0; t < seconds; t += dt) {
    catGround += (speed * dt) / unitsPerPx;
    if (t < 0.5) continue;
    const phase = (catGround / cycleGround) % 1;
    let cycle = phase;
    let back = 0;
    if (frames > 0) {
      const k = Math.min(frames - 1, Math.floor(phase * frames));
      cycle = (k + 0.5) / frames;
      // The cat is further along its cycle than the frame shows by this much ground; the picture can move back to make up for it.
      back = lock * (phase - cycle) * cycleGround;
    }
    bodyOffset = Math.max(bodyOffset, Math.abs(back) * Math.hypot(Math.sin(h), Math.cos(h) * sinP));
    const pose = poseAtCycle(clip, cycle);
    const along = catGround - back;
    const sx = along * Math.sin(h);
    const sy = along * Math.cos(h) * sinP;
    for (const leg of LEG_NAMES) {
      const p = pawOnScreen(pose, direction, leg);
      if (p.planted) (stance[leg] ??= []).push({ x: sx + p.x, y: sy + p.y });
      else flush(leg);
    }
  }
  for (const leg of LEG_NAMES) flush(leg);
  return { pawStray: strays.length ? Math.max(...strays) : 0, bodyOffset, stances };
}

function strideFactorFor(direction: number): number {
  return strideFactor(direction);
}
