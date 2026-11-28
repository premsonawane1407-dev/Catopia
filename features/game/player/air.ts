// A cat leaving the ground and coming back, as real physics: a launch speed, gravity, a floor that may be a platform
// rather than the ground, and the moment of touching down. The animation is chosen from what the cat is actually
// doing (rising, at the top, falling, about to land), so it fits any jump height or length without being retimed.
// Everything is pure data in and out, so it is tested without a browser.
//
// Heights and speeds are in sprite pixels (the cat's own size) and converted to world units with the size of a pixel,
// so a jump is the same jump for the cat whatever the window size.

/** Gravity in sprite pixels a second squared. With the standard jump it gives a hop of about half a second. */
export const GRAVITY_PX = 591;

export type JumpKindId = "hop" | "standard" | "vertical" | "long" | "down";

export interface JumpKind {
  id: JumpKindId;
  label: string;
  /** How high the cat rises above where it launched, in sprite pixels. 0 for stepping off an edge (nothing pushes it up). */
  heightPx: number;
  /** Seconds crouching before the legs push. */
  windup: number;
  /** The least forward speed the push gives, in sprite pixels a second (a leap throws the cat forward). */
  minForwardPx: number;
  /** At the top the body is stretched out long instead of tucked up (a leap, not a hop). */
  stretch: boolean;
}

export const KINDS: Record<JumpKindId, JumpKind> = {
  // A small hop over something low.
  hop: { id: "hop", label: "Small hop", heightPx: 9, windup: 0.06, minForwardPx: 0, stretch: false },
  // The ordinary jump.
  standard: { id: "standard", label: "Jump", heightPx: 22, windup: 0.1, minForwardPx: 0, stretch: false },
  // Up onto something tall, like furniture: a longer crouch and a much stronger push.
  vertical: { id: "vertical", label: "Jump up", heightPx: 44, windup: 0.13, minForwardPx: 0, stretch: false },
  // Across a gap: low and long, thrown forward, stretched out.
  long: { id: "long", label: "Long leap", heightPx: 14, windup: 0.07, minForwardPx: 135, stretch: true },
  // Stepping off a ledge: no push, just falling.
  down: { id: "down", label: "Jump down", heightPx: 0, windup: 0, minForwardPx: 0, stretch: false },
};

/** Launch speed, in sprite pixels a second, for a kind to reach its height. */
export const launchSpeedPx = (kind: JumpKind): number => Math.sqrt(2 * GRAVITY_PX * kind.heightPx);

/** Seconds a jump of this height stays in the air when it lands at the height it left. */
export const flightSeconds = (kind: JumpKind): number => (2 * launchSpeedPx(kind)) / GRAVITY_PX;

/** The launch speed that normalises the frame choice for a fall that began with no push (stepping off a ledge). */
const REFERENCE_PX = launchSpeedPx(KINDS.standard);

export type AirPhase = "ground" | "windup" | "air" | "land" | "recover";

export interface Air {
  phase: AirPhase;
  kind: JumpKindId;
  /** Seconds in this phase. */
  t: number;
  /** Seconds since the feet left the floor. */
  sinceLaunch: number;
  /** Height of the cat's feet above the ground, in world units, and how fast it is rising (negative: falling). */
  y: number;
  vy: number;
  /** The launch speed (world units a second) the frame choice is measured against. */
  launchVy: number;
  /** The floor under the cat, in world units (0 for the ground, more on a platform). */
  support: number;
  /** How hard the last landing was, 0 to 1. */
  impact: number;
  /** Which frame of the jump clip to draw. */
  frame: number;
  /** Set for one step: the feet just left the floor; the cat just touched down. */
  launched: boolean;
  landed: boolean;
}

export function createAir(): Air {
  return { phase: "ground", kind: "standard", t: 0, sinceLaunch: 0, y: 0, vy: 0, launchVy: 0, support: 0, impact: 0, frame: 0, launched: false, landed: false };
}

/** How long the landing squash lasts, in seconds: longer the harder the cat comes down. */
export const landSeconds = (impact: number): number => 0.09 + 0.09 * impact;
export const RECOVER_SECONDS = 0.09;
/** Below this many seconds from the floor a falling cat reaches for it with its front paws. */
const BRACE_SECONDS = 0.09;

export function startJump(air: Air, kind: JumpKindId): void {
  air.phase = "windup";
  air.kind = kind;
  air.t = 0;
  air.sinceLaunch = 0;
  air.impact = 0;
}

/** Steps off an edge: falling from rest. */
export function startFall(air: Air): void {
  air.phase = "air";
  air.kind = "down";
  air.t = 0;
  air.sinceLaunch = 0;
  air.vy = 0;
  air.launchVy = REFERENCE_PX;
  air.impact = 0;
}

export function isAirborne(air: Air): boolean {
  return air.phase === "air";
}

/** How much of its normal speed a cat has in each phase of a jump: a little less while crouching (it still keeps going), slow while landing, full in the air. */
export function speedShare(air: Air): number {
  switch (air.phase) {
    case "windup":
      return 0.8;
    case "land":
      return 0.35;
    case "recover":
      return 0.75;
    default:
      return 1;
  }
}

export interface AirStep {
  launched: boolean;
  landed: boolean;
  /** The whole jump is over: the cat is on the ground (or a platform) and free again. */
  finished: boolean;
}

/** Which of the ten drawn frames shows, from what the cat is doing: see the jump clip. */
export function frameFor(air: Air): number {
  const kind = KINDS[air.kind];
  switch (air.phase) {
    case "windup":
      return 0; // anticipation: lowered, hind legs compressed, weight back
    case "air": {
      if (kind.id !== "down" && air.sinceLaunch < 0.06 && air.vy > 0) return 1; // take-off: the legs push, front paws leave first
      const ref = air.launchVy > 0 ? air.launchVy : 1;
      const v = air.vy / ref;
      if (kind.id === "down") {
        // Nothing pushed the cat, so it never shows the rise or the top.
        if (v > -0.3) return 4;
      } else {
        if (v > 0.4) return kind.stretch ? 9 : 2; // rising: stretched out
        if (v > -0.3) return kind.stretch ? 9 : 3; // the top: tucked up (or still stretched in a leap)
      }
      const heightAbove = air.y - air.support;
      const secondsToFloor = air.vy < 0 ? heightAbove / -air.vy : Infinity;
      return secondsToFloor < BRACE_SECONDS ? 5 : 4; // falling, then reaching for the floor with the front paws
    }
    case "land":
      // The front paws touch first and take the weight; then the hind paws, and the whole body compresses.
      return air.t < landSeconds(air.impact) * 0.45 ? 6 : 7;
    default:
      return 8; // recover
  }
}

/**
 * Advances a jump by \`dt\` seconds. \`support\` is the height of the floor under the cat now; \`unitsPerPx\` the size of a sprite
 * pixel in the world. Gravity pulls, the floor stops the cat, and touching the floor while falling is a landing.
 */
export function stepAir(air: Air, dt: number, support: number, unitsPerPx: number): AirStep {
  const step: AirStep = { launched: false, landed: false, finished: false };
  air.launched = false;
  air.landed = false;
  air.support = support;
  air.t += dt;
  switch (air.phase) {
    case "ground":
      air.y = support;
      air.vy = 0;
      break;
    case "windup": {
      air.y = support;
      const kind = KINDS[air.kind];
      if (air.t >= kind.windup) {
        air.vy = launchSpeedPx(kind) * unitsPerPx;
        air.launchVy = air.vy;
        air.phase = "air";
        air.t = 0;
        air.sinceLaunch = 0;
        air.launched = true;
        step.launched = true;
      }
      break;
    }
    case "air": {
      air.sinceLaunch += dt;
      // Exact motion under constant gravity, so the height does not depend on the step length.
      const g = GRAVITY_PX * unitsPerPx;
      air.y += air.vy * dt - 0.5 * g * dt * dt;
      air.vy -= g * dt;
      if (air.vy <= 0 && air.y <= support) {
        air.impact = Math.min(1, -air.vy / (REFERENCE_PX * 1.6 * unitsPerPx));
        air.y = support;
        air.vy = 0;
        air.phase = "land";
        air.t = 0;
        air.landed = true;
        step.landed = true;
      }
      break;
    }
    case "land":
      air.y = support;
      if (air.t >= landSeconds(air.impact)) {
        air.phase = "recover";
        air.t = 0;
      }
      break;
    case "recover":
      air.y = support;
      if (air.t >= RECOVER_SECONDS) {
        air.phase = "ground";
        air.t = 0;
        step.finished = true;
      }
      break;
  }
  air.frame = frameFor(air);
  return step;
}

export interface JumpContext {
  /** Moving at a run. */
  running: boolean;
  /** The tallest standable thing just ahead above the cat's feet, in world units above where it stands; 0 for none. */
  platformAbove: number;
  unitsPerPx: number;
}

/** What a jump press should do now: a hop for something low, a vertical jump for something tall, a leap when running, otherwise the ordinary jump. */
export function chooseJump({ running, platformAbove, unitsPerPx }: JumpContext): JumpKindId {
  const reach = (id: JumpKindId) => KINDS[id].heightPx * unitsPerPx * 0.9;
  if (platformAbove > 0) {
    if (platformAbove <= reach("hop")) return "hop";
    if (platformAbove <= reach("standard")) return "standard";
    if (platformAbove <= reach("vertical")) return "vertical";
    return "standard";
  }
  return running ? "long" : "standard";
}

/** How high a kind rises, in world units. */
export const apexWorld = (kind: JumpKind, unitsPerPx: number): number => kind.heightPx * unitsPerPx;
