// Turning raw device readings (held keys, gamepad sticks, a dragged touch stick) into one "push" on the cat.
// Pure functions, so deadzones, diagonals and the walk-or-run choice are tested without a keyboard or a pad.
import type { Gait } from "./movement";

export type Device = "keyboard" | "gamepad" | "touch" | "mouse";

export interface Push {
  /** World axes: +x is screen right, +z is toward the camera (screen down). Length 0 to 1. */
  x: number;
  z: number;
  gait: Gait;
}

const UP = ["ArrowUp", "KeyW"];
const DOWN = ["ArrowDown", "KeyS"];
const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];
export const RUN_KEYS = ["ShiftLeft", "ShiftRight"];
export const INTERACT_KEYS = ["KeyE"];
/** Space hops. */
export const JUMP_KEYS = ["Space"];
/** The number keys 1 to 6 choose an emote; Q opens the emote picker. */
export const EMOTE_MENU_KEY = "KeyQ";
const EMOTE_KEY_LIST = [1, 2, 3, 4, 5, 6].map((n) => [`Digit${n}`, `Numpad${n}`]);
/** Which emote a key chooses (0 to 5), or -1. */
export function emoteIndexForKey(code: string): number {
  return EMOTE_KEY_LIST.findIndex((codes) => codes.includes(code));
}
/** Keys the game takes over while playing, so the page does not scroll under them. */
export const GAME_KEYS = [...UP, ...DOWN, ...LEFT, ...RIGHT, ...RUN_KEYS, ...INTERACT_KEYS, ...JUMP_KEYS, EMOTE_MENU_KEY, ...EMOTE_KEY_LIST.flat()];

const any = (keys: ReadonlySet<string>, list: readonly string[]) => list.some((k) => keys.has(k));

/** Held keys to a push in world axes. Opposite keys cancel, and a diagonal is no faster than a straight line. */
export function keyboardPush(keys: ReadonlySet<string>): Push | null {
  const x = (any(keys, RIGHT) ? 1 : 0) - (any(keys, LEFT) ? 1 : 0);
  const z = (any(keys, DOWN) ? 1 : 0) - (any(keys, UP) ? 1 : 0);
  if (x === 0 && z === 0) return null;
  const m = Math.hypot(x, z);
  return { x: x / m, z: z / m, gait: any(keys, RUN_KEYS) ? "run" : "walk" };
}

/** Ignores the small wobble of a resting stick, then rescales so the push still reaches 1 at full tilt. */
export function applyDeadzone(x: number, y: number, dead: number): { x: number; y: number; mag: number } {
  const m = Math.hypot(x, y);
  if (m <= dead) return { x: 0, y: 0, mag: 0 };
  const scaled = Math.min(1, (m - dead) / (1 - dead));
  return { x: (x / m) * scaled, y: (y / m) * scaled, mag: scaled };
}

export const STICK_DEADZONE = 0.2;
/** Past this much tilt a stick runs rather than walks. */
export const STICK_RUN_AT = 0.82;

/** A stick (gamepad or touch) to a push. `y` points down the screen. */
export function stickPush(x: number, y: number, runHeld: boolean, dead = STICK_DEADZONE): Push | null {
  const d = applyDeadzone(x, y, dead);
  if (d.mag === 0) return null;
  return { x: d.x, z: d.y, gait: runHeld || d.mag >= STICK_RUN_AT ? "run" : "walk" };
}

export interface PadReading {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
}

export interface PadState {
  push: Push | null;
  /** X: interact. */
  interact: boolean;
  /** A: jump. */
  jump: boolean;
  /** Y: play the chosen emote. */
  emotePlay: boolean;
  /** Left bumper: choose the next emote. */
  emoteNext: boolean;
  anyInput: boolean;
}

/** Standard-mapping gamepad: left stick or d-pad moves, B or a right shoulder or trigger held runs, A jumps, X interacts, Y plays the chosen emote, the left bumper chooses the next one. */
export function readPad(pad: PadReading | null): PadState {
  if (!pad) return { push: null, interact: false, jump: false, emotePlay: false, emoteNext: false, anyInput: false };
  const b = (i: number) => pad.buttons[i]?.pressed === true;
  let x = pad.axes[0] ?? 0;
  let y = pad.axes[1] ?? 0;
  const dpadX = (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
  const dpadY = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
  if (dpadX || dpadY) {
    const m = Math.hypot(dpadX, dpadY);
    x = dpadX / m;
    y = dpadY / m;
  }
  const run = b(1) || b(7) || b(5);
  const push = stickPush(x, y, run);
  const interact = b(2);
  const jump = b(0);
  const emotePlay = b(3);
  const emoteNext = b(4);
  return { push, interact, jump, emotePlay, emoteNext, anyInput: push !== null || interact || jump || emotePlay || emoteNext };
}

/** Where a drag of the touch stick points: the drag from its centre, limited to a radius, as a stick reading. */
export function dragToStick(dx: number, dy: number, radius: number): { x: number; y: number } {
  const m = Math.hypot(dx, dy);
  if (m < 1e-6) return { x: 0, y: 0 };
  const k = Math.min(1, m / radius) / m;
  return { x: dx * k, y: dy * k };
}

/** Is a touch a tap (short and nearly still) rather than the start of a stick drag? */
export function isTap(movedPx: number, ms: number): boolean {
  return movedPx < 12 && ms < 320;
}

/** Combines the sources: the most recently active device wins, so resting a hand on one never blocks another. */
export function chooseDevice(readings: { device: Device; push: Push | null }[]): Push | null {
  for (const r of readings) if (r.push) return r.push;
  return null;
}
