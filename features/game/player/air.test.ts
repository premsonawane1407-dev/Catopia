import { describe, expect, it } from "vitest";
import { GRAVITY_PX, KINDS, RECOVER_SECONDS, apexWorld, chooseJump, createAir, flightSeconds, frameFor, landSeconds, launchSpeedPx, speedShare, startFall, startJump, stepAir, type Air, type JumpKindId } from "./air";
import { CLIPS } from "../cat/clips";

const UPP = 0.0155;
const DT = 1 / 240;

/** Runs a jump to the end from level ground (or a floor), recording what the cat did. */
function fly(kind: JumpKindId, floor = 0, landOn = floor) {
  const air = createAir();
  air.y = floor;
  startJump(air, kind);
  const trace: { t: number; y: number; vy: number; frame: number; phase: Air["phase"] }[] = [];
  let t = 0;
  let top = floor;
  let launchedAt = -1;
  let landedAt = -1;
  let support = floor;
  for (let i = 0; i < 240 * 4; i++) {
    t += DT;
    // The floor is where the cat started until it is falling, then it is where it lands.
    if (air.phase === "air" && air.vy < 0) support = landOn;
    const step = stepAir(air, DT, support, UPP);
    if (step.launched) launchedAt = t;
    if (step.landed) landedAt = t;
    top = Math.max(top, air.y);
    trace.push({ t, y: air.y, vy: air.vy, frame: air.frame, phase: air.phase });
    if (step.finished) break;
  }
  return { air, trace, top, launchedAt, landedAt, total: t };
}

describe("the physics of a jump", () => {
  it("crouches first and does not move until the push", () => {
    const { trace, launchedAt } = fly("standard");
    expect(launchedAt).toBeCloseTo(KINDS.standard.windup, 1);
    for (const p of trace.filter((x) => x.t < KINDS.standard.windup - 0.01)) expect(p.y).toBe(0);
  });

  it("rises to the kind's height and stays up for the time gravity says", () => {
    for (const id of ["hop", "standard", "vertical", "long"] as const) {
      const k = KINDS[id];
      const { top, launchedAt, landedAt } = fly(id);
      expect(top, id).toBeCloseTo(apexWorld(k, UPP), 2);
      expect(landedAt - launchedAt, id).toBeCloseTo(flightSeconds(k), 1);
    }
  });

  it("uses gravity, not a drawn curve: the speed falls steadily by gravity", () => {
    const air = createAir();
    startJump(air, "standard");
    let t = 0;
    while (air.phase !== "air") stepAir(air, DT, 0, UPP);
    const v0 = air.vy;
    for (let i = 0; i < 60; i++) {
      stepAir(air, DT, 0, UPP);
      t += DT;
    }
    expect(v0 - air.vy).toBeCloseTo(GRAVITY_PX * UPP * t, 3);
    expect(v0).toBeCloseTo(launchSpeedPx(KINDS.standard) * UPP, 4);
  });

  it("never teleports: the height changes smoothly, by no more than the speed allows in each step", () => {
    const { trace } = fly("vertical");
    let prev = 0;
    let prevVy = 0;
    for (const p of trace) {
      expect(Math.abs(p.y - prev)).toBeLessThanOrEqual(Math.abs(prevVy) * DT + GRAVITY_PX * UPP * DT * DT + 1e-9);
      prev = p.y;
      prevVy = p.vy;
    }
  });

  it("detects the landing: on the ground, and on a platform it is over", () => {
    const ground = fly("standard");
    expect(ground.air.y).toBe(0);
    expect(ground.landedAt).toBeGreaterThan(0);
    // A platform 0.2 up: the cat rises above it and comes down onto it.
    const onto = fly("standard", 0, 0.2);
    expect(onto.trace.some((p) => p.phase === "land" && Math.abs(p.y - 0.2) < 1e-9)).toBe(true);
    expect(onto.air.y).toBeCloseTo(0.2, 6);
    expect(onto.landedAt).toBeLessThan(flightSeconds(KINDS.standard) + KINDS.standard.windup);
  });

  it("lands harder from a higher fall, and holds the squash longer", () => {
    const small = fly("hop").air.impact;
    const big = fly("vertical").air.impact;
    expect(big).toBeGreaterThan(small);
    expect(landSeconds(big)).toBeGreaterThan(landSeconds(small));
    expect(landSeconds(1)).toBeLessThan(0.2);
  });

  it("is over after landing and recovering, and the recovery is not instant", () => {
    const { air } = fly("standard");
    expect(air.phase).toBe("ground");
    expect(RECOVER_SECONDS).toBeGreaterThan(0.05);
  });

  it("falls off a ledge with no push: it speeds up downward, never rises, and lands", () => {
    const air = createAir();
    air.y = 0.4;
    startFall(air);
    let maxY = air.y;
    let landed = false;
    for (let i = 0; i < 240 * 2 && !landed; i++) {
      const step = stepAir(air, DT, 0, UPP);
      maxY = Math.max(maxY, air.y);
      landed = step.landed;
    }
    expect(landed).toBe(true);
    expect(maxY).toBe(0.4);
    expect(air.impact).toBeGreaterThan(0);
  });
});

describe("which frame shows", () => {
  const order = (trace: { frame: number }[]) => {
    const seen: number[] = [];
    for (const p of trace) if (seen[seen.length - 1] !== p.frame) seen.push(p.frame);
    return seen;
  };

  it("goes crouch, take-off, rise, top, fall, brace, land, landed, recover, in that order", () => {
    expect(order(fly("standard").trace)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("does the same through every height, because it follows the motion and not a clock", () => {
    for (const id of ["hop", "standard", "vertical"] as const) expect(order(fly(id).trace), id).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("stretches the whole body, flat and long, for a leap", () => {
    const frames = new Set(fly("long").trace.map((p) => p.frame));
    expect(frames.has(9)).toBe(true);
    expect(frames.has(3)).toBe(false);
    expect(frames.has(2)).toBe(false);
  });

  it("shows only valid frames, and never the rise or the top, for a fall off a ledge", () => {
    const air = createAir();
    air.y = 0.4;
    startFall(air);
    const frames = new Set<number>();
    for (let i = 0; i < 240; i++) {
      stepAir(air, DT, 0, UPP);
      frames.add(air.frame);
    }
    for (const f of frames) expect(f).toBeLessThan(CLIPS.jump.frames);
    expect(frames.has(2)).toBe(false);
    expect(frames.has(3)).toBe(false);
    expect(frames.has(4)).toBe(true);
  });

  it("puts the front paws down before the hind paws: frame 6 (front contact) shows before frame 7 (all four)", () => {
    const air = createAir();
    air.phase = "land";
    air.impact = 0.6;
    air.t = 0;
    expect(frameFor(air)).toBe(6);
    air.t = landSeconds(0.6) * 0.8;
    expect(frameFor(air)).toBe(7);
  });
});

describe("choosing the jump", () => {
  it("jumps ordinarily from standing or walking, and leaps when running", () => {
    expect(chooseJump({ running: false, platformAbove: 0, unitsPerPx: UPP })).toBe("standard");
    expect(chooseJump({ running: true, platformAbove: 0, unitsPerPx: UPP })).toBe("long");
  });
  it("hops at something low, jumps at something medium and jumps up at something tall", () => {
    expect(chooseJump({ running: false, platformAbove: 0.08, unitsPerPx: UPP })).toBe("hop");
    expect(chooseJump({ running: false, platformAbove: 0.26, unitsPerPx: UPP })).toBe("standard");
    expect(chooseJump({ running: false, platformAbove: 0.45, unitsPerPx: UPP })).toBe("vertical");
    expect(chooseJump({ running: true, platformAbove: 0.45, unitsPerPx: UPP })).toBe("vertical");
  });
  it("gives each kind a height that reaches what it is chosen for", () => {
    expect(apexWorld(KINDS.hop, UPP)).toBeLessThan(apexWorld(KINDS.standard, UPP));
    expect(apexWorld(KINDS.standard, UPP)).toBeLessThan(apexWorld(KINDS.vertical, UPP));
    expect(KINDS.long.minForwardPx).toBeGreaterThan(100);
  });
  it("keeps most of its speed while crouching, is slow landing and has full speed in the air", () => {
    const a = createAir();
    startJump(a, "standard");
    expect(speedShare(a)).toBeGreaterThan(0.7);
    a.phase = "air";
    expect(speedShare(a)).toBe(1);
    a.phase = "land";
    expect(speedShare(a)).toBeLessThan(0.5);
  });
});
