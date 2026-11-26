// What the cat is doing, as a small state machine: standing, walking, running, sitting down, sitting,
// standing up, lying down, asleep and waking. It decides which clip and frame to show. Walking and running
// advance by the distance travelled (so the feet match the ground at any speed); everything else plays by time.
// Pure data in and out, so every rule here is tested without a browser.
import { BLINK_SEQUENCE, CLIPS, directionFromVector, type ClipName } from "../cat/clips";
import type { Gait } from "./movement";
import { strideFactor } from "./stride";

export type Mode = "idle" | "walk" | "run" | "sitDown" | "sit" | "standUp" | "lieDown" | "sleep" | "wake";

/** Seconds standing still before the cat sits down on its own, and sitting before it curls up to sleep. */
export const SIT_AFTER = 8;
export const SLEEP_AFTER = 22;
/** Getting up is quick, so a pressed key is never kept waiting long. */
export const STAND_UP_SECONDS = 0.25;
export const WAKE_SECONDS = 0.25;
export const SIT_DOWN_SECONDS = CLIPS.sitDown.frames / CLIPS.sitDown.fps;
export const LIE_DOWN_SECONDS = CLIPS.lieDown.frames / CLIPS.lieDown.fps;

/** Where the cat was asked to settle (by an interaction). It stays there until the player moves. */
export type RestRequest = "sit" | "sleep" | null;

export interface CatAnim {
  mode: Mode;
  /** 0 to 7, the way the cat faces. */
  direction: number;
  /** Position in the step cycle, 0 to 1. */
  phase: number;
  /** Seconds in the current mode (also the clock for idle, sit and sleep loops). */
  clock: number;
  /** How far through a one-way transition, 0 to 1. */
  progress: number;
  /** Seconds standing or sitting with nothing to do. */
  restless: number;
}

export function initialAnim(direction = 0): CatAnim {
  return { mode: "idle", direction, phase: 0, clock: 0, progress: 0, restless: 0 };
}

export interface AnimInput {
  dt: number;
  /** The gait being asked for, or null when the player is not asking to move. */
  gait: Gait | null;
  /** The direction being pushed in the world axes (screen right = +x, toward camera = +z), if any. */
  pushX: number;
  pushZ: number;
  /** Ground distance covered in this step, in world units. */
  distance: number;
  /** World units per sprite pixel (the cat's size in the world). */
  unitsPerPx: number;
  /** Ambient movement on: idle fidgets and the cat settling down by itself. */
  motion: boolean;
  /** Where an interaction asked the cat to settle. */
  rest: RestRequest;
}

/** Facing changes only when the push points clearly into the next direction, so the sprite does not flicker on a boundary. */
export function pickDirection(current: number, x: number, z: number): number {
  const next = directionFromVector(x, z, current);
  if (next === current) return current;
  const heading = Math.atan2(x, z);
  const centre = (current * Math.PI) / 4;
  let off = Math.abs(heading - centre) % (Math.PI * 2);
  if (off > Math.PI) off = Math.PI * 2 - off;
  // Half a sector is 22.5 degrees; require a few degrees more before turning.
  return off > (Math.PI / 8) * 1.18 ? next : current;
}

/** Can the cat be moved by the player in this mode? */
export function canMove(mode: Mode): boolean {
  return mode === "idle" || mode === "walk" || mode === "run";
}

export function stepAnim(s: CatAnim, input: AnimInput): CatAnim {
  const wantsMove = input.gait !== null;
  if (wantsMove) s.direction = pickDirection(s.direction, input.pushX, input.pushZ);
  s.clock += input.dt;

  switch (s.mode) {
    case "idle":
    case "walk":
    case "run": {
      if (wantsMove) {
        const mode: Mode = input.gait === "run" ? "run" : "walk";
        if (s.mode !== mode) {
          if (s.mode === "idle") s.phase = 0;
          s.mode = mode;
          s.clock = 0;
        }
        s.restless = 0;
        const clip = mode === "run" ? CLIPS.run : CLIPS.walk;
        const stride = (clip.stridePx ?? 1) * input.unitsPerPx * strideFactor(s.direction);
        s.phase = (s.phase + input.distance / stride) % 1;
        break;
      }
      if (s.mode !== "idle") {
        s.mode = "idle";
        s.clock = 0;
      }
      s.restless += input.dt;
      if (input.rest || (input.motion && s.restless > SIT_AFTER)) {
        s.mode = "sitDown";
        s.progress = 0;
        s.clock = 0;
      }
      break;
    }
    case "sitDown": {
      if (wantsMove && !input.rest) {
        s.mode = "standUp";
        s.progress = 1 - s.progress;
        break;
      }
      s.progress += input.dt / SIT_DOWN_SECONDS;
      if (s.progress >= 1) {
        s.mode = "sit";
        s.clock = 0;
        s.restless = 0;
      }
      break;
    }
    case "sit": {
      if (wantsMove) {
        s.mode = "standUp";
        s.progress = 0;
        break;
      }
      s.restless += input.dt;
      if (input.rest === "sleep" || (!input.rest && input.motion && s.restless > SLEEP_AFTER)) {
        s.mode = "lieDown";
        s.progress = 0;
        s.clock = 0;
      }
      break;
    }
    case "standUp": {
      s.progress += input.dt / STAND_UP_SECONDS;
      if (s.progress >= 1) {
        s.mode = "idle";
        s.clock = 0;
        s.restless = 0;
        s.progress = 0;
      }
      break;
    }
    case "lieDown": {
      if (wantsMove) {
        s.mode = "wake";
        s.progress = 1 - s.progress;
        break;
      }
      s.progress += input.dt / LIE_DOWN_SECONDS;
      if (s.progress >= 1) {
        s.mode = "sleep";
        s.clock = 0;
      }
      break;
    }
    case "sleep": {
      if (wantsMove) {
        s.mode = "wake";
        s.progress = 0;
      }
      break;
    }
    case "wake": {
      s.progress += input.dt / WAKE_SECONDS;
      if (s.progress >= 1) {
        s.mode = "standUp";
        s.progress = 0;
      }
      break;
    }
  }
  return s;
}

const SLEEP_BREATH: readonly number[] = [0, 1, 2, 3, 2, 1];

/** Which clip and frame to draw. With motion reduced, loops that exist only for life (breathing, blinking) hold still. */
export function frameOf(s: CatAnim, motion: boolean): { clip: ClipName; frame: number } {
  switch (s.mode) {
    case "walk":
      return { clip: "walk", frame: Math.floor(s.phase * CLIPS.walk.frames) % CLIPS.walk.frames };
    case "run":
      return { clip: "run", frame: Math.floor(s.phase * CLIPS.run.frames) % CLIPS.run.frames };
    case "idle":
    case "sit": {
      const clip: ClipName = s.mode;
      if (!motion) return { clip, frame: 0 };
      const step = Math.floor(s.clock * CLIPS[clip].fps) % BLINK_SEQUENCE.length;
      return { clip, frame: BLINK_SEQUENCE[step] };
    }
    case "sitDown":
      return { clip: "sitDown", frame: Math.min(CLIPS.sitDown.frames - 1, Math.floor(s.progress * CLIPS.sitDown.frames)) };
    case "standUp":
      return { clip: "sitDown", frame: CLIPS.sitDown.frames - 1 - Math.min(CLIPS.sitDown.frames - 1, Math.floor(s.progress * CLIPS.sitDown.frames)) };
    case "lieDown":
      return { clip: "lieDown", frame: Math.min(CLIPS.lieDown.frames - 1, Math.floor(s.progress * CLIPS.lieDown.frames)) };
    case "wake":
      return { clip: "lieDown", frame: CLIPS.lieDown.frames - 1 - Math.min(CLIPS.lieDown.frames - 1, Math.floor(s.progress * CLIPS.lieDown.frames)) };
    case "sleep": {
      if (!motion) return { clip: "sleep", frame: 0 };
      return { clip: "sleep", frame: SLEEP_BREATH[Math.floor(s.clock * CLIPS.sleep.fps) % SLEEP_BREATH.length] };
    }
  }
}
