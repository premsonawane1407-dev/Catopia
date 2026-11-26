// The whole player in one step function: input in, a cat position, a clip and frame, the camera's wanted
// spot and the interaction prompt out. It owns no rendering and reads no devices, so the same code runs in the
// game and in tests (including a bot that roams for minutes to look for places the cat gets stuck).
import { frameOf, initialAnim, canMove, stepAnim, type CatAnim, type RestRequest } from "./cat-state";
import type { Bounds, Collider } from "./colliders";
import { CAPTION_SECONDS, pickInteractable, type Interactable } from "./interactions";
import { AUTO_WALK_ARRIVE, AUTO_WALK_RUN_BEYOND, STUCK_LIMIT, autoWalkIntent, stepMotion, updateStuck, type AutoWalk, type Gait, type Intent, type Motion, type MoveParams, type StuckTimer } from "./movement";
import type { ClipName } from "../cat/clips";

export interface PlayerState {
  motion: Motion;
  anim: CatAnim;
  autoWalk: AutoWalk | null;
  stuck: StuckTimer;
  rest: RestRequest;
  /** An interaction to carry out once the cat has walked to its spot. */
  pending: Interactable | null;
  prompt: Interactable | null;
  caption: { text: string; left: number } | null;
}

export function createPlayer(x: number, z: number, direction = 0): PlayerState {
  return { motion: { x, z, vx: 0, vz: 0 }, anim: initialAnim(direction), autoWalk: null, stuck: { time: 0 }, rest: null, pending: null, prompt: null, caption: null };
}

export interface SimInput {
  dt: number;
  /** Pushed by keyboard, stick or touch stick, in world axes (length 0 to 1). Null when nothing is pushed. */
  move: { x: number; z: number; gait: Gait } | null;
  /** A new point to walk to (a tap or click), already turned into world coordinates. */
  target: { x: number; z: number } | null;
  /** The interact button was pressed this frame. */
  interact: boolean;
}

export interface SimEnv {
  unitsPerPx: number;
  motion: boolean;
  params: MoveParams;
  colliders: readonly Collider[];
  bounds: Bounds;
  interactables: readonly Interactable[];
}

export interface SimOutput {
  x: number;
  z: number;
  vx: number;
  vz: number;
  speed: number;
  clip: ClipName;
  frame: number;
  direction: number;
  mode: CatAnim["mode"];
}

function cancelPlans(s: PlayerState): void {
  s.autoWalk = null;
  s.pending = null;
  s.rest = null;
}

export function stepPlayer(s: PlayerState, input: SimInput, env: SimEnv): SimOutput {
  const dt = Math.min(input.dt, 0.05);

  // What the player wants: a push beats a walk-to, and either cancels any settling in progress.
  if (input.move) cancelPlans(s);
  else if (input.target) {
    cancelPlans(s);
    s.autoWalk = { x: input.target.x, z: input.target.z, arriveRadius: AUTO_WALK_ARRIVE, runBeyond: AUTO_WALK_RUN_BEYOND };
    s.stuck.time = 0;
  }

  // The interaction button: offer, then carry out once the cat is at the spot.
  if (input.interact && s.prompt && !s.pending && s.rest === null) {
    const it = s.prompt;
    if (it.verb === "look") {
      s.caption = { text: it.text ?? it.label, left: CAPTION_SECONDS };
    } else {
      s.pending = it;
      s.autoWalk = { x: it.approach.x, z: it.approach.z, arriveRadius: AUTO_WALK_ARRIVE, runBeyond: AUTO_WALK_RUN_BEYOND };
      s.stuck.time = 0;
    }
  }

  let intent: Intent | null = input.move ? { x: input.move.x, z: input.move.z, gait: input.move.gait } : null;
  if (!intent && s.autoWalk) {
    intent = autoWalkIntent(s.motion, s.autoWalk);
    if (!intent) {
      s.autoWalk = null;
      if (s.pending) {
        s.anim.direction = s.pending.facing;
        s.rest = s.pending.verb === "sleep" ? "sleep" : "sit";
        s.pending = null;
      }
    }
  }

  const free = canMove(s.anim.mode);
  const step = stepMotion(s.motion, free ? intent : null, dt, env.params, env.colliders, env.bounds);
  s.motion = { x: step.x, z: step.z, vx: step.vx, vz: step.vz };

  // A tap that leads into a wall is given up after a moment.
  if (s.autoWalk && updateStuck(s.stuck, intent !== null && free, step.blocked, dt) > STUCK_LIMIT) {
    cancelPlans(s);
    s.stuck.time = 0;
  }

  stepAnim(s.anim, {
    dt,
    gait: intent ? intent.gait : null,
    pushX: intent?.x ?? 0,
    pushZ: intent?.z ?? 0,
    distance: step.moved,
    unitsPerPx: env.unitsPerPx,
    motion: env.motion,
    rest: s.rest,
  });

  // The prompt shows only when the cat is free to act on it.
  const settled = s.anim.mode === "idle" || s.anim.mode === "walk" || s.anim.mode === "run" || s.anim.mode === "sit";
  const wantPrompt = settled && !s.pending && !s.autoWalk && s.rest === null;
  s.prompt = wantPrompt ? pickInteractable(s.motion, env.interactables, s.prompt) : null;

  if (s.caption) {
    s.caption.left -= dt;
    if (s.caption.left <= 0) s.caption = null;
  }

  const { clip, frame } = frameOf(s.anim, env.motion);
  return { x: s.motion.x, z: s.motion.z, vx: s.motion.vx, vz: s.motion.vz, speed: Math.hypot(s.motion.vx, s.motion.vz), clip, frame, direction: s.anim.direction, mode: s.anim.mode };
}
