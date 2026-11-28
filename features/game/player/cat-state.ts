// What the cat is doing, as a small state machine: standing, walking, running, sitting down, sitting,
// standing up, lying down, asleep and waking. It decides which clip and frame to show. Walking and running
// advance by the distance travelled (so the feet match the ground at any speed); everything else plays by time.
// Pure data in and out, so every rule here is tested without a browser.
import { BLINK_SEQUENCE, CLIPS, EMOTES, directionFromVector, type ClipName } from "../cat/clips";
import { createAir, startFall, startJump, stepAir, type Air, type JumpKindId } from "./air";
import type { Gait } from "./movement";
import { STEP_UP } from "./colliders";
import { strideFactor } from "./stride";

/** How fast the cat's feet follow a floor that rises or falls under them (a stair), in world units a second. */
const FLOOR_FOLLOW = 2.4;

export type Mode = "idle" | "walk" | "run" | "sitDown" | "sit" | "standUp" | "lieDown" | "sleep" | "wake" | "jump" | "emote";

/** Seconds standing still before the cat sits down on its own, and sitting before it curls up to sleep. */
export const SIT_AFTER = 8;
export const SLEEP_AFTER = 22;
/**
 * Below this speed (sprite pixels a second) a cat that is no longer being pushed counts as stopped. Until then it
 * keeps walking in place of the cycle, so its feet stay planted while it slows down instead of gliding in the standing pose.
 */
export const STOPPED_BELOW_PX = 5;

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
  /** The jump or fall in progress (see air.ts), and seconds since the last one ended. */
  air: Air;
  sinceJump: number;
  /** Which emote is playing (an index into EMOTES), or the one waiting for the cat to sit down. */
  emote: number | null;
  pendingEmote: number | null;
}

export function initialAnim(direction = 0): CatAnim {
  return { mode: "idle", direction, phase: 0, clock: 0, progress: 0, restless: 0, air: createAir(), sinceJump: 99, emote: null, pendingEmote: null };
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
  /** How fast the cat is actually moving, in world units a second. */
  speed: number;
  /** World units per sprite pixel (the cat's size in the world). */
  unitsPerPx: number;
  /** The map camera's pitch in degrees, which decides how far a step cycle must travel toward or away from it. Left out, the market street's. */
  pitchDeg?: number;
  /** Ambient movement on: idle fidgets and the cat settling down by itself. */
  motion: boolean;
  /** Where an interaction asked the cat to settle. */
  rest: RestRequest;
  /** A jump starts this step, of this kind (chosen by the caller from the situation). */
  jump?: JumpKindId | null;
  /** Height of the floor under the cat now, in world units (0 for the ground, more on a platform). */
  support?: number;
  /** An emote was chosen this step (an index into EMOTES). */
  emote?: number | null;
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

/** Can the cat be moved by the player in this mode? (In the air it can be steered.) */
export function canMove(mode: Mode): boolean {
  return mode === "idle" || mode === "walk" || mode === "run" || mode === "jump";
}

/** Seconds after a landing before another jump may start. */
export const JUMP_COOLDOWN = 0.05;

/** A cat that is on its feet and not busy can hop. */
const canJump = (mode: Mode): boolean => mode === "idle" || mode === "walk" || mode === "run";

/** Turning a back-facing cat to the front or the side when it curls up, so its face and closed eyes can be seen. */
export function facingForSleep(direction: number): number {
  if (direction === 4) return 0;
  if (direction === 3) return 2;
  if (direction === 5) return 6;
  return direction;
}

export function stepAnim(s: CatAnim, input: AnimInput): CatAnim {
  s.sinceJump += input.dt;
  const support = input.support ?? 0;
  const wantsJump = input.jump !== undefined && input.jump !== null;
  const startsJump = wantsJump && canJump(s.mode) && s.air.phase === "ground" && s.sinceJump >= JUMP_COOLDOWN;
  // Pressing jump while sitting, asleep or emoting gets the cat up, the same as pressing a direction does.
  const wakes = wantsJump && !startsJump && (s.mode === "sit" || s.mode === "emote" || s.mode === "sleep" || s.mode === "lieDown" || s.mode === "sitDown");
  const wantsMove = input.gait !== null || wakes;
  if (input.gait !== null) s.direction = pickDirection(s.direction, input.pushX, input.pushZ);
  s.clock += input.dt;

  // An emote: sit down first if standing, then play; a new choice replaces the one playing.
  if (input.emote !== undefined && input.emote !== null && input.emote >= 0 && input.emote < EMOTES.length && !wantsMove && !startsJump) {
    if (s.mode === "idle") {
      s.direction = 0;
      s.pendingEmote = input.emote;
      s.mode = "sitDown";
      s.progress = 0;
      s.clock = 0;
    } else if (s.mode === "sit" || s.mode === "emote") {
      s.direction = 0;
      s.mode = "emote";
      s.emote = input.emote;
      s.clock = 0;
    }
  }
  if (startsJump) {
    s.mode = "jump";
    startJump(s.air, input.jump as JumpKindId);
    s.clock = 0;
    s.restless = 0;
  } else if (s.mode !== "jump") {
    // On the ground or a platform: follow the floor, and step off an edge into a fall.
    if (support < s.air.y - STEP_UP && (s.mode === "idle" || s.mode === "walk" || s.mode === "run")) {
      s.mode = "jump";
      startFall(s.air);
      s.clock = 0;
      s.restless = 0;
    } else {
      // Follow the floor: a stair is climbed or descended smoothly, a bigger change of floor is taken at once.
      const rate = FLOOR_FOLLOW * input.dt;
      s.air.y = Math.abs(support - s.air.y) <= rate || Math.abs(support - s.air.y) > STEP_UP ? support : s.air.y + Math.sign(support - s.air.y) * rate;
      s.air.support = s.air.y;
    }
  }

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
        const stride = (clip.stridePx ?? 1) * input.unitsPerPx * strideFactor(s.direction, input.pitchDeg);
        s.phase = (s.phase + input.distance / stride) % 1;
        break;
      }
      if (s.mode !== "idle") {
        // Slowing down after the player lets go: the step cycle carries on with the distance still covered.
        if (input.speed / input.unitsPerPx > STOPPED_BELOW_PX) {
          const clip = s.mode === "run" ? CLIPS.run : CLIPS.walk;
          s.phase = (s.phase + input.distance / ((clip.stridePx ?? 1) * input.unitsPerPx * strideFactor(s.direction, input.pitchDeg))) % 1;
          break;
        }
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
        s.pendingEmote = null;
        break;
      }
      s.progress += input.dt / SIT_DOWN_SECONDS;
      if (s.progress >= 1) {
        s.clock = 0;
        s.restless = 0;
        if (s.pendingEmote !== null) {
          s.mode = "emote";
          s.emote = s.pendingEmote;
          s.pendingEmote = null;
        } else s.mode = "sit";
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
        s.direction = facingForSleep(s.direction);
      }
      break;
    }
    case "emote": {
      if (wantsMove) {
        s.mode = "standUp";
        s.progress = 0;
        s.emote = null;
        break;
      }
      s.restless = 0;
      const seconds = s.emote !== null ? EMOTES[s.emote].seconds : 0;
      if (s.clock >= seconds) {
        s.mode = "sit";
        s.clock = 0;
        s.emote = null;
      }
      break;
    }
    case "jump": {
      const r = stepAir(s.air, input.dt, support, input.unitsPerPx);
      if (r.finished) {
        s.mode = input.gait === null ? "idle" : input.gait === "run" ? "run" : "walk";
        s.clock = 0;
        s.restless = 0;
        s.sinceJump = 0;
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

/**
 * How much further along its step cycle the cat really is than the frame being shown depicts, as ground distance in world
 * units (positive when the cat is ahead of the picture). Each drawn frame stands for the middle of its slice of the cycle, so
 * between frame changes the planted paws drift this far from the ground spot they should hold. Moving the picture back along
 * the ground by this much (all of it, or part) holds them still, at the price of the body stepping with the frames.
 */
export function cycleResidual(s: CatAnim, unitsPerPx: number, pitchDeg?: number): number {
  if (s.mode !== "walk" && s.mode !== "run") return 0;
  const clip = s.mode === "run" ? CLIPS.run : CLIPS.walk;
  const frame = Math.min(clip.frames - 1, Math.floor(s.phase * clip.frames));
  const centre = (frame + 0.5) / clip.frames;
  return (s.phase - centre) * (clip.stridePx ?? 1) * unitsPerPx * strideFactor(s.direction, pitchDeg);
}

/** How much of the cycle's leftover is taken out of the picture by default (0 to 1). Set after comparing in the game. */
export const FOOT_LOCK_DEFAULT = 0;

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
    case "jump":
      return { clip: "jump", frame: s.air.frame };
    case "emote": {
      const spec = EMOTES[s.emote ?? 0];
      const clip = CLIPS[spec.clip];
      return { clip: spec.clip, frame: Math.floor(s.clock * clip.fps) % clip.frames };
    }
    case "sleep": {
      if (!motion) return { clip: "sleep", frame: 0 };
      return { clip: "sleep", frame: SLEEP_BREATH[Math.floor(s.clock * CLIPS.sleep.fps) % SLEEP_BREATH.length] };
    }
  }
}

/** How high the cat's feet are above the ground, in world units (a jump, or standing on something). */
export const heightOf = (s: CatAnim): number => s.air.y;
