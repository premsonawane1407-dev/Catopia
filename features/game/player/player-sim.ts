// The whole player in one step function: input in, a cat position, a clip and frame, the camera's wanted
// spot and the interaction prompt out. It owns no rendering and reads no devices, so the same code runs in the
// game and in tests (including a bot that roams for minutes to look for places the cat gets stuck).
import { frameOf, initialAnim, canMove, stepAnim, cycleResidual, type CatAnim, type RestRequest } from "./cat-state";
import { KINDS, chooseJump, isAirborne, speedShare, type JumpKindId } from "./air";
import { platformAhead, supportHeight, type Bounds, type Collider } from "./colliders";
import { CAPTION_SECONDS, pickInteractable, type Interactable } from "./interactions";
import { AUTO_WALK_ARRIVE, AUTO_WALK_RUN_BEYOND, STUCK_LIMIT, autoWalkIntent, stepMotion, updateStuck, type AutoWalk, type Gait, type Intent, type Motion, type MoveParams, type StuckTimer } from "./movement";
import { EMOTES, directionHeading, type BubbleIcon, type ClipName } from "../cat/clips";

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

export function createPlayer(x: number, z: number, direction = 0, y = 0): PlayerState {
  const anim = initialAnim(direction);
  // The cat starts standing on the floor under it, which may be raised ground.
  anim.air.y = y;
  anim.air.support = y;
  return { motion: { x, z, vx: 0, vz: 0 }, anim, autoWalk: null, stuck: { time: 0 }, rest: null, pending: null, prompt: null, caption: null };
}

export interface SimInput {
  dt: number;
  /** Pushed by keyboard, stick or touch stick, in world axes (length 0 to 1). Null when nothing is pushed. */
  move: { x: number; z: number; gait: Gait } | null;
  /** A new point to walk to (a tap or click), already turned into world coordinates. */
  target: { x: number; z: number } | null;
  /** The interact button was pressed this frame. */
  interact: boolean;
  /** The jump button was pressed this frame. */
  jump?: boolean;
  /** An emote was chosen this frame (an index into EMOTES). */
  emote?: number | null;
}

export interface SimEnv {
  unitsPerPx: number;
  /** The map camera's pitch in degrees (see AnimInput). */
  pitchDeg?: number;
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
  /** How high the cat's feet are above the ground, in world units (a jump, or standing on something). */
  lift: number;
  /** The height of the floor under the cat (the ground, or the top of what it stands over): where its shadow falls. */
  shadowY: number;
  airborne: boolean;
  /** The kind of jump in progress, if any. */
  jumpKind: JumpKindId | null;
  /** The picture floating above the cat (an emote's, or the sleeper's Zzz), how long it has been there and for how long in all. */
  bubble: { icon: BubbleIcon; age: number; seconds: number } | null;
  /** Where the picture of the cat would have to move (world units) to hold its planted paws still on the ground; see cycleResidual. */
  lock: { x: number; z: number };
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
  const height = s.anim.air.y;

  // A jump press: which jump suits the moment (a leap when running, a vertical jump at something tall, a hop at something low).
  let jump: JumpKindId | null = null;
  if (input.jump) {
    const speedNow = Math.hypot(s.motion.vx, s.motion.vz);
    const heading = directionHeading(s.anim.direction);
    const dx = intent ? intent.x : speedNow > 0.05 ? s.motion.vx : Math.sin(heading);
    const dz = intent ? intent.z : speedNow > 0.05 ? s.motion.vz : Math.cos(heading);
    const top = platformAhead(s.motion, dx, dz, env.params.radius, env.colliders, height, 0.55);
    jump = chooseJump({ running: (intent?.gait ?? "walk") === "run" || speedNow > env.params.walkSpeed * 1.4, platformAbove: top > height + 0.03 ? top - height : 0, unitsPerPx: env.unitsPerPx });
  }

  // In a jump the cat crouches and lands slowly, keeps its speed through the air and is hardly steerable there.
  const share = s.anim.mode === "jump" ? speedShare(s.anim.air) : 1;
  const params = { ...env.params, walkSpeed: env.params.walkSpeed * share, runSpeed: env.params.runSpeed * share, // Crouching to jump keeps the cat's momentum, like the air does: a cat that is going does not brake to crouch.
    airborne: isAirborne(s.anim.air) || s.anim.air.phase === "windup", height };
  const step = stepMotion(s.motion, free ? intent : null, dt, params, env.colliders, env.bounds);
  s.motion = { x: step.x, z: step.z, vx: step.vx, vz: step.vz };
  // The floor under the cat now (the ground, or the top of what it is over), for landing and for stepping off edges.
  const support = supportHeight(s.motion, env.params.radius, env.colliders, height);

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
    speed: Math.hypot(s.motion.vx, s.motion.vz),
    unitsPerPx: env.unitsPerPx,
    pitchDeg: env.pitchDeg,
    motion: env.motion,
    rest: s.rest,
    jump,
    support,
    emote: input.emote ?? null,
  });

  // The push of a jump throws the cat forward at least as fast as its kind says, the way it was already going.
  if (s.anim.air.launched) {
    const kind = KINDS[s.anim.air.kind];
    const speedNow = Math.hypot(s.motion.vx, s.motion.vz);
    const heading = directionHeading(s.anim.direction);
    const ux = speedNow > 0.05 ? s.motion.vx / speedNow : Math.sin(heading);
    const uz = speedNow > 0.05 ? s.motion.vz / speedNow : Math.cos(heading);
    const target = Math.max(speedNow, kind.minForwardPx * env.unitsPerPx);
    if (target > speedNow && (speedNow > 0.05 || kind.minForwardPx > 0)) s.motion = { ...s.motion, vx: ux * target, vz: uz * target };
  }

  // The prompt shows only when the cat is free to act on it.
  const settled = s.anim.mode === "idle" || s.anim.mode === "walk" || s.anim.mode === "run" || s.anim.mode === "sit";
  const wantPrompt = settled && !s.pending && !s.autoWalk && s.rest === null;
  s.prompt = wantPrompt ? pickInteractable(s.motion, env.interactables, s.prompt) : null;

  if (s.caption) {
    s.caption.left -= dt;
    if (s.caption.left <= 0) s.caption = null;
  }

  const { clip, frame } = frameOf(s.anim, env.motion);
  const back = -cycleResidual(s.anim, env.unitsPerPx, env.pitchDeg);
  const emote = s.anim.mode === "emote" && s.anim.emote !== null ? EMOTES[s.anim.emote] : null;
  const bubble: SimOutput["bubble"] = emote ? { icon: emote.icon, age: s.anim.clock, seconds: emote.seconds } : s.anim.mode === "sleep" ? { icon: "zzz", age: s.anim.clock, seconds: Infinity } : null;
  const heading = directionHeading(s.anim.direction);
  return { x: s.motion.x, z: s.motion.z, vx: s.motion.vx, vz: s.motion.vz, speed: Math.hypot(s.motion.vx, s.motion.vz), clip, frame, direction: s.anim.direction, mode: s.anim.mode, lift: s.anim.air.y, shadowY: s.anim.air.support, airborne: isAirborne(s.anim.air), jumpKind: s.anim.mode === "jump" ? s.anim.air.kind : null, bubble, lock: { x: back * Math.sin(heading), z: back * Math.cos(heading) } };
}
