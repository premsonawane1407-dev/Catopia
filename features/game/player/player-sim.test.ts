import { describe, expect, it } from "vitest";
import { FOLLOW_TAU, followTarget, stepFollow } from "./follow-camera";
import { STEP_UP, isClear } from "./colliders";
import { pickInteractable } from "./interactions";
import { createPlayer, stepPlayer, type SimEnv, type SimInput } from "./player-sim";
import { MARKET_STREET as street } from "../world/map/market-street";
import { heightAt } from "../world/map/terrain";
import { CLIPS, RUN_SPEED_PX, WALK_SPEED_PX } from "../cat/clips";

const UPP = 0.0155;
const colliders = street.colliders;
const CAMERA_BOUNDS = street.camera.follow;
const INTERACTABLES = street.interactables;
const START = street.spawn;
const WALK_BOUNDS = street.walkBounds;
/** How high the floor is under a spot of the street (it has terraces and stairs). */
const floorAt = (x: number, z: number) => heightAt(street.terrainGrid, x, z);
const env: SimEnv = {
  unitsPerPx: UPP,
  motion: true,
  params: { walkSpeed: WALK_SPEED_PX * UPP, runSpeed: RUN_SPEED_PX * UPP, radius: 8 * UPP },
  colliders,
  bounds: WALK_BOUNDS,
  interactables: INTERACTABLES,
};
const idle: SimInput = { dt: 1 / 60, move: null, target: null, interact: false };

/** A small deterministic random number generator, so the bot walks the same way every run. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("the greybox street", () => {
  it("starts the cat on clear ground", () => {
    expect(isClear(START, env.params.radius, colliders, WALK_BOUNDS, floorAt(START.x, START.z))).toBe(true);
  });
  it("has solid houses, stalls and lamps to walk around", () => {
    expect(colliders.filter((c) => c.id.startsWith("house")).length).toBeGreaterThanOrEqual(2);
    expect(colliders.some((c) => c.id.startsWith("stall"))).toBe(true);
    expect(colliders.some((c) => c.id.startsWith("lamp"))).toBe(true);
  });
  it("puts every interaction spot on clear ground, inside the walkable strip", () => {
    for (const i of INTERACTABLES) {
      expect(isClear(i.approach, env.params.radius, colliders, WALK_BOUNDS, floorAt(i.approach.x, i.approach.z)), i.id).toBe(true);
      expect(i.approach.x).toBeGreaterThan(WALK_BOUNDS.minX);
      expect(i.approach.x).toBeLessThan(WALK_BOUNDS.maxX);
    }
  });
  it("keeps the camera's range inside the walkable range", () => {
    expect(CAMERA_BOUNDS.minX).toBeGreaterThanOrEqual(WALK_BOUNDS.minX);
    expect(CAMERA_BOUNDS.maxX).toBeLessThanOrEqual(WALK_BOUNDS.maxX);
  });
  it("lets the cat reach every interaction spot from the start (a grid search over clear ground)", () => {
    const step = 0.05;
    const key = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
    const seen = new Set<string>([key(START.x, START.z)]);
    const queue: [number, number][] = [[START.x, START.z]];
    while (queue.length) {
      const [x, z] = queue.pop() as [number, number];
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx;
        const nz = z + dz;
        const k = key(nx, nz);
        // A step is a walk, not a jump: the floor may change by no more than a stair's rise between neighbouring spots.
        const here = floorAt(x, z);
        const there = floorAt(nx, nz);
        if (seen.has(k) || Math.abs(there - here) > STEP_UP || !isClear({ x: nx, z: nz }, env.params.radius, colliders, WALK_BOUNDS, there)) continue;
        seen.add(k);
        queue.push([nx, nz]);
      }
    }
    for (const i of INTERACTABLES) expect(seen.has(key(i.approach.x, i.approach.z)), i.id).toBe(true);
    // The stairs lead down to the lower level and up to the garden terrace.
    expect(seen.has(key(0.5, 8.5)), "the lower level").toBe(true);
    expect(seen.has(key(-7, -3)), "the park").toBe(true);
    expect(seen.has(key(3.2, 4)), "the café terrace").toBe(true);
    expect(seen.has(key(7.8, 3.5)), "the quay").toBe(true);
  });
});

describe("the street's stairs", () => {
  const walk = (p: ReturnType<typeof createPlayer>, seconds: number, move: { x: number; z: number }) => {
    const modes = new Set<string>();
    let out = stepPlayer(p, { ...idle, move: { ...move, gait: "walk" } }, env);
    for (let i = 1; i < seconds * 60; i++) {
      out = stepPlayer(p, { ...idle, move: { ...move, gait: "walk" } }, env);
      modes.add(out.mode);
    }
    return { out, modes };
  };

  it("are walked down smoothly: the cat does not fall or jump, and ends on the lower floor", () => {
    const p = createPlayer(0, 4.6, 0, floorAt(0, 4.6));
    const { out, modes } = walk(p, 7, { x: 0, z: 1 });
    expect(modes.has("jump")).toBe(false);
    expect(out.z).toBeGreaterThan(8);
    expect(out.lift).toBeCloseTo(0, 2);
  });

  it("are walked up again, to the terrace", () => {
    const p = createPlayer(0, 9, 0, 0);
    const { out, modes } = walk(p, 7, { x: 0, z: -1 });
    expect(modes.has("jump")).toBe(false);
    expect(out.z).toBeLessThan(5);
    expect(out.lift).toBeCloseTo(0.8, 2);
  });

  it("do not let the cat walk up a wall: the terrace's edge is a wall from below", () => {
    const p = createPlayer(-6, 7, 0, 0);
    const { out } = walk(p, 4, { x: 0, z: -1 });
    // Held back at the foot of the terrace wall (z about 5.5 + the cat's radius), still on the lower floor.
    expect(out.z).toBeGreaterThan(5.5);
    expect(out.lift).toBe(0);
  });

  it("step off the terrace's edge into a fall, from above", () => {
    const p = createPlayer(-6, 4.9, 0, 0.8);
    const { modes, out } = walk(p, 4, { x: 0, z: 1 });
    expect(modes.has("jump")).toBe(true);
    expect(out.lift).toBe(0);
  });
});

describe("the camera follow", () => {
  it("leads a moving cat a little and stays in range", () => {
    const t = followTarget({ x: 0, z: 0.6, vx: 1, vz: 0 }, true, CAMERA_BOUNDS);
    expect(t.x).toBeGreaterThan(0);
    expect(t.x).toBeLessThanOrEqual(0.45 + 1e-9);
    expect(followTarget({ x: 99, z: 99, vx: 0, vz: 0 }, true, CAMERA_BOUNDS)).toEqual({ x: CAMERA_BOUNDS.maxX, z: CAMERA_BOUNDS.maxZ });
  });
  it("glides, covering about 63% of the distance in one time constant, at any frame rate", () => {
    for (const fps of [30, 60, 144]) {
      let f = { x: 0, z: 0 };
      for (let i = 0; i < Math.round(FOLLOW_TAU * fps); i++) f = stepFollow(f, { x: 1, z: 0 }, 1 / fps, true);
      expect(f.x).toBeGreaterThan(0.6);
      expect(f.x).toBeLessThan(0.66);
    }
  });
  it("does not glide at all with reduced motion", () => {
    expect(stepFollow({ x: 0, z: 0 }, { x: 1, z: 2 }, 1 / 60, false)).toEqual({ x: 1, z: 2 });
    expect(followTarget({ x: 0, z: 0, vx: 5, vz: 5 }, false, CAMERA_BOUNDS)).toEqual({ x: 0, z: 0 });
  });
});

describe("interaction prompts", () => {
  const list = INTERACTABLES;
  it("show only within range", () => {
    expect(pickInteractable({ x: 0, z: 2 }, list, null)).toBeNull();
    const bench = list.find((i) => i.id === "bench")!;
    expect(pickInteractable({ x: bench.x, z: bench.z }, list, null)?.id).toBe("bench");
  });
  it("stay until the cat is a bit beyond the range, so they do not flicker", () => {
    const bench = list.find((i) => i.id === "bench")!;
    const edge = { x: bench.x + bench.radius * 1.05, z: bench.z };
    expect(pickInteractable(edge, list, null)).toBeNull();
    expect(pickInteractable(edge, list, bench)?.id).toBe("bench");
    expect(pickInteractable({ x: bench.x + bench.radius * 1.3, z: bench.z }, list, bench)).toBeNull();
  });
});

describe("the player", () => {
  it("walks when pushed, and stops when released", () => {
    const p = createPlayer(START.x, START.z, 0, floorAt(START.x, START.z));
    let out = stepPlayer(p, idle, env);
    for (let i = 0; i < 60; i++) out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, env);
    expect(out.mode).toBe("walk");
    expect(out.x).toBeGreaterThan(START.x + 0.2);
    expect(out.direction).toBe(2);
    for (let i = 0; i < 30; i++) out = stepPlayer(p, idle, env);
    expect(out.mode).toBe("idle");
    expect(out.speed).toBeLessThan(0.01);
  });

  it("walks to a tapped point and stops there", () => {
    const p = createPlayer(START.x, START.z, 0, floorAt(START.x, START.z));
    stepPlayer(p, { ...idle, target: { x: 1.5, z: 1.2 } }, env);
    let out = stepPlayer(p, idle, env);
    for (let i = 0; i < 600 && p.autoWalk; i++) out = stepPlayer(p, idle, env);
    expect(p.autoWalk).toBeNull();
    expect(Math.hypot(out.x - 1.5, out.z - 1.2)).toBeLessThan(0.1);
  });

  it("gives up a tap that leads into a wall instead of pushing forever", () => {
    const p = createPlayer(START.x, START.z, 0, floorAt(START.x, START.z));
    stepPlayer(p, { ...idle, target: { x: 0, z: -1.45 + 0 } }, env);
    // Aim past the house fronts, where the strip ends.
    p.autoWalk = { x: -3.9, z: -2.5, arriveRadius: 0.07, runBeyond: 3.2 };
    for (let i = 0; i < 60 * 12 && p.autoWalk; i++) stepPlayer(p, idle, env);
    expect(p.autoWalk).toBeNull();
  });

  it("walks to the bench and sits when asked, then gets up when pushed", () => {
    const p = createPlayer(START.x, START.z, 0, floorAt(START.x, START.z));
    const bench = INTERACTABLES.find((i) => i.id === "bench")!;
    // Walk next to it so its prompt shows.
    stepPlayer(p, { ...idle, target: { x: bench.approach.x, z: bench.approach.z - 0.3 } }, env);
    for (let i = 0; i < 60 * 12 && p.autoWalk; i++) stepPlayer(p, idle, env);
    for (let i = 0; i < 3; i++) stepPlayer(p, idle, env);
    expect(p.prompt?.id).toBe("bench");
    stepPlayer(p, { ...idle, interact: true }, env);
    let out = stepPlayer(p, idle, env);
    for (let i = 0; i < 60 * 8 && out.mode !== "sit"; i++) out = stepPlayer(p, idle, env);
    expect(out.mode).toBe("sit");
    expect(out.direction).toBe(bench.facing);
    for (let i = 0; i < 60 * 30; i++) out = stepPlayer(p, idle, env);
    expect(out.mode).toBe("sit");
    for (let i = 0; i < 40; i++) out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, env);
    expect(["walk", "idle"]).toContain(out.mode);
  });

  it("shows a line of text for a look-at, which fades after a few seconds", () => {
    const p = createPlayer(START.x, START.z, 0, floorAt(START.x, START.z));
    const sign = INTERACTABLES.find((i) => i.id === "notice")!;
    stepPlayer(p, { ...idle, target: { x: sign.x, z: sign.z } }, env);
    for (let i = 0; i < 60 * 10 && p.autoWalk; i++) stepPlayer(p, idle, env);
    stepPlayer(p, idle, env);
    expect(p.prompt?.verb).toBe("look");
    stepPlayer(p, { ...idle, interact: true }, env);
    expect(p.caption?.text).toBe(sign.text);
    for (let i = 0; i < 60 * 6; i++) stepPlayer(p, idle, env);
    expect(p.caption).toBeNull();
  });

  it("runs at about the run speed in the open", () => {
    const p = createPlayer(-1.4, 1.6, 0, floorAt(-1.4, 1.6));
    let out = stepPlayer(p, idle, env);
    for (let i = 0; i < 90; i++) out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "run" } }, env);
    expect(out.mode).toBe("run");
    expect(out.speed).toBeGreaterThan(env.params.runSpeed * 0.95);
  });
});

describe("a five-minute roam by a bot", () => {
  it("never enters a collider, never jumps, never leaves the strip, and does not freeze in place", () => {
    const rand = rng(42);
    const p = createPlayer(START.x, START.z, 0, floorAt(START.x, START.z));
    let move: SimInput["move"] = null;
    let nextChange = 0;
    let t = 0;
    let longest = 0;
    let stillFor = 0;
    let prev = { x: p.motion.x, z: p.motion.z };
    let worstJump = 0;
    let pushingTime = 0;
    let blockedTime = 0;
    for (let i = 0; i < 60 * 300; i++) {
      t += 1 / 60;
      let target: SimInput["target"] = null;
      // A person who stops getting anywhere steers somewhere else; the bot does too, after 0.4 s.
      if (t >= nextChange || (move && stillFor > 0.4)) {
        const r = rand();
        if (r < 0.15) move = null;
        else if (r < 0.2) {
          move = null;
          target = { x: WALK_BOUNDS.minX + rand() * (WALK_BOUNDS.maxX - WALK_BOUNDS.minX), z: WALK_BOUNDS.minZ + rand() * (WALK_BOUNDS.maxZ - WALK_BOUNDS.minZ) };
        } else {
          const a = rand() * Math.PI * 2;
          move = { x: Math.sin(a), z: Math.cos(a), gait: rand() < 0.4 ? "run" : "walk" };
        }
        nextChange = t + 0.4 + rand() * 2.2;
      }
      const out = stepPlayer(p, { dt: 1 / 60, move, target, interact: rand() < 0.002 }, env);
      expect(Number.isFinite(out.x) && Number.isFinite(out.z)).toBe(true);
      if (!isClear({ x: out.x, z: out.z }, env.params.radius, colliders, WALK_BOUNDS, out.lift)) throw new Error(`inside a collider at ${out.x}, ${out.z}, t=${t}`);
      const jump = Math.hypot(out.x - prev.x, out.z - prev.z);
      worstJump = Math.max(worstJump, jump);
      if (move && out.mode !== "sit" && out.mode !== "sleep") {
        pushingTime += 1 / 60;
        if (jump < 0.0005) {
          stillFor += 1 / 60;
          longest = Math.max(longest, stillFor);
          blockedTime += 1 / 60;
        } else stillFor = 0;
      } else stillFor = 0;
      prev = { x: out.x, z: out.z };
    }
    // Faster than the run speed in one frame would be a teleport.
    expect(worstJump).toBeLessThan(env.params.runSpeed / 60 + 0.002);
    // No pocket in the street holds the cat for more than a moment once the player steers away.
    expect(longest).toBeLessThan(0.9);
    expect(pushingTime).toBeGreaterThan(60);
    expect(blockedTime / pushingTime).toBeLessThan(0.5);
  });
});

describe("the step cycle and the ground stay in step", () => {
  const open: SimEnv = { ...env, colliders: [], bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 } };
  const cycleGround = (CLIPS.walk.stridePx ?? 1) * UPP;

  it("makes exactly one cycle for every stride of ground covered, at any speed, through speeding up and slowing down", () => {
    const p = createPlayer(0, 0);
    let walked = 0;
    let last = { x: 0, z: 0 };
    // Slow, normal, a change of speed, then letting go: the stick pushed to different strengths for different times.
    const plan: [number, number][] = [[0.4, 90], [1, 120], [0.55, 90], [1, 60], [0, 60]];
    for (const [push, steps] of plan) {
      for (let i = 0; i < steps; i++) {
        const out = stepPlayer(p, { dt: 1 / 60, move: push > 0 ? { x: push, z: 0, gait: "walk" } : null, target: null, interact: false }, open);
        if (out.mode === "walk") walked += Math.hypot(out.x - last.x, out.z - last.z);
        last = { x: out.x, z: out.z };
      }
    }
    expect(walked).toBeGreaterThan(2);
    // The cycle started when the cat started; compare the cycle with the walked distance, to a hundredth of a cycle.
    const expected = (walked / cycleGround) % 1;
    const diff = Math.abs(((p.anim.phase - expected + 1.5) % 1) - 0.5);
    expect(diff).toBeLessThan(0.01);
  });

  it("does not advance the cycle while the cat is blocked by a wall", () => {
    const wall = { kind: "box" as const, id: "w", x: 0, z: 1, hx: 3, hz: 0.1 };
    const p = createPlayer(0, 0.5);
    for (let i = 0; i < 90; i++) stepPlayer(p, { dt: 1 / 60, move: { x: 0, z: 1, gait: "walk" }, target: null, interact: false }, { ...open, colliders: [wall] });
    const before = p.anim.phase;
    for (let i = 0; i < 60; i++) stepPlayer(p, { dt: 1 / 60, move: { x: 0, z: 1, gait: "walk" }, target: null, interact: false }, { ...open, colliders: [wall] });
    expect(Math.abs(p.anim.phase - before)).toBeLessThan(0.002);
  });

  it("keeps the leftover (how far the cat is ahead of the frame shown) within half a frame, and none at rest", async () => {
    const { cycleResidual, initialAnim } = await import("./cat-state");
    const idle = initialAnim();
    expect(cycleResidual(idle, UPP)).toBe(0);
    const p = createPlayer(0, 0);
    let worst = 0;
    for (let i = 0; i < 300; i++) {
      const out = stepPlayer(p, { dt: 1 / 60, move: { x: 1, z: 0, gait: "walk" }, target: null, interact: false }, open);
      worst = Math.max(worst, Math.abs(Math.hypot(out.lock.x, out.lock.z)));
    }
    expect(worst).toBeLessThanOrEqual(cycleGround / 16 + 1e-6);
    expect(worst).toBeGreaterThan(cycleGround / 16 * 0.8);
  });
});

describe("jumping in the player: real movement, platforms and landing", () => {
  const open: SimEnv = { ...env, colliders: [], bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 } };

  it("hops in place: rises to the jump's height and comes back, staying where it was, and ends standing", () => {
    const p = createPlayer(0, 0);
    stepPlayer(p, { ...idle, jump: true }, open);
    let top = 0;
    let out = stepPlayer(p, idle, open);
    for (let i = 0; i < 70; i++) {
      out = stepPlayer(p, idle, open);
      top = Math.max(top, out.lift);
    }
    expect(top).toBeGreaterThan(20 * UPP);
    expect(top).toBeLessThanOrEqual(22 * UPP + 1e-3);
    expect(out.lift).toBe(0);
    expect(Math.hypot(out.x, out.z)).toBeLessThan(0.01);
    expect(out.mode).toBe("idle");
  });

  it("carries its speed through the air and lands further on, not stopping dead in the air", () => {
    const p = createPlayer(0, 0);
    for (let i = 0; i < 40; i++) stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, open);
    const before = p.motion.x;
    stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" }, jump: true }, open);
    let airborne = 0;
    let speedInAir = 0;
    for (let i = 0; i < 60; i++) {
      // Hands off the controls once airborne: momentum has to carry it.
      const out = stepPlayer(p, idle, open);
      if (out.airborne) {
        airborne++;
        speedInAir = out.speed;
      }
    }
    expect(airborne).toBeGreaterThan(20);
    expect(speedInAir).toBeGreaterThan(env.params.walkSpeed * 0.8);
    expect(p.motion.x - before).toBeGreaterThan(0.3);
  });

  it("jumps further when running: a leap is thrown forward and low", () => {
    const hop = createPlayer(0, 0);
    for (let i = 0; i < 40; i++) stepPlayer(hop, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, open);
    stepPlayer(hop, { ...idle, move: { x: 1, z: 0, gait: "walk" }, jump: true }, open);
    let walkTop = 0;
    for (let i = 0; i < 80; i++) walkTop = Math.max(walkTop, stepPlayer(hop, idle, open).lift);
    const leap = createPlayer(0, 0);
    for (let i = 0; i < 40; i++) stepPlayer(leap, { ...idle, move: { x: 1, z: 0, gait: "run" } }, open);
    const startX = leap.motion.x;
    const out = stepPlayer(leap, { ...idle, move: { x: 1, z: 0, gait: "run" }, jump: true }, open);
    expect(out.jumpKind).toBe("long");
    let leapTop = 0;
    for (let i = 0; i < 80; i++) leapTop = Math.max(leapTop, stepPlayer(leap, idle, open).lift);
    expect(leapTop).toBeLessThan(walkTop);
    expect(leap.motion.x - startX).toBeGreaterThan(0.9);
  });

  it("jumps onto a low platform and stands on top of it", () => {
    const bench = { kind: "box" as const, id: "bench", x: 1, z: 0, hx: 0.4, hz: 0.5, height: 0.2 };
    const e = { ...open, colliders: [bench] };
    const p = createPlayer(0.3, 0);
    for (let i = 0; i < 25; i++) stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, e);
    // Pushing against it on the ground does not get on.
    expect(p.motion.x).toBeLessThan(0.6 - env.params.radius + 0.05);
    stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" }, jump: true }, e);
    let out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, e);
    for (let i = 0; i < 70; i++) out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, e);
    expect(out.lift).toBeCloseTo(0.2, 3);
    expect(out.shadowY).toBeCloseTo(0.2, 3);
    expect(Math.abs(out.x - bench.x)).toBeLessThan(bench.hx + 0.05);
  });

  it("cannot jump onto something too tall, and is stopped by it like a wall", () => {
    const wall = { kind: "box" as const, id: "stall", x: 1, z: 0, hx: 0.4, hz: 1, height: 1.4 };
    const e = { ...open, colliders: [wall] };
    const p = createPlayer(0.2, 0);
    for (let i = 0; i < 200; i++) {
      stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "run" }, jump: i % 40 === 0 }, e);
      expect(p.motion.x).toBeLessThan(0.6 - env.params.radius + 0.02);
    }
    expect(p.anim.air.y).toBe(0);
  });

  it("jumps up onto a tall stack with the vertical jump, which the ordinary jump cannot do", () => {
    const low = { kind: "circle" as const, id: "c1", x: 1, z: 0, r: 0.25, height: 0.24 };
    const high = { kind: "circle" as const, id: "c2", x: 1, z: 0, r: 0.15, height: 0.46 };
    const e = { ...open, colliders: [low, high] };
    const p = createPlayer(0.3, 0);
    const kinds = new Set<string | null>();
    let standing = 0;
    for (let i = 0; i < 110; i++) {
      const out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" }, jump: i === 10 }, e);
      kinds.add(out.jumpKind);
      if (out.mode !== "jump") standing = Math.max(standing, out.lift);
    }
    expect(kinds.has("vertical")).toBe(true);
    expect(standing).toBeCloseTo(0.46, 2);
    // The ordinary jump, forced, only gets as high as the low crate, if that.
    const q = createPlayer(0.3, 0);
    let topSeen = 0;
    for (let i = 0; i < 150; i++) {
      const out = stepPlayer(q, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, e);
      if (i === 10) q.anim.air.kind = "standard";
      topSeen = Math.max(topSeen, out.lift);
    }
    expect(topSeen).toBeLessThan(0.3);
  });

  it("jumps onto the lower crate with the ordinary jump when only it is there", () => {
    const low = { kind: "circle" as const, id: "c1", x: 1, z: 0, r: 0.25, height: 0.24 };
    const e = { ...open, colliders: [low] };
    const p = createPlayer(0.3, 0);
    const kinds = new Set<string | null>();
    let standing = 0;
    for (let i = 0; i < 110; i++) {
      const out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" }, jump: i === 10 }, e);
      kinds.add(out.jumpKind);
      if (out.mode !== "jump") standing = Math.max(standing, out.lift);
    }
    expect(kinds.has("standard")).toBe(true);
    expect(standing).toBeCloseTo(0.24, 2);
  });

  it("steps off the edge of a platform into a fall and lands on the ground, without teleporting", () => {
    const bench = { kind: "box" as const, id: "bench", x: 0, z: 0, hx: 0.4, hz: 0.5, height: 0.26 };
    const e = { ...open, colliders: [bench] };
    const p = createPlayer(0, 0);
    p.anim.air.y = 0.26;
    p.motion = { x: 0.3, z: 0, vx: 0, vz: 0 };
    let last = 0.26;
    let sawFall = false;
    let worstStep = 0;
    for (let i = 0; i < 90; i++) {
      const out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, e);
      if (out.jumpKind === "down") sawFall = true;
      worstStep = Math.max(worstStep, Math.abs(out.lift - last));
      last = out.lift;
    }
    expect(sawFall).toBe(true);
    expect(last).toBe(0);
    expect(worstStep).toBeLessThan(0.05);
  });

  it("does not hop through a wall: the jump moves the picture, not the cat's place on the ground", () => {
    const wall = { kind: "box" as const, id: "w", x: 1, z: 0, hx: 0.1, hz: 3, height: 5 };
    const p = createPlayer(0.5, 0);
    for (let i = 0; i < 180; i++) stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "run" }, jump: i % 30 === 0 }, { ...open, colliders: [wall] });
    expect(p.motion.x).toBeLessThan(1 - 0.1 - 8 * UPP + 1e-6);
  });

  it("makes the same jump at any frame rate", () => {
    const top = (fps: number) => {
      const p = createPlayer(0, 0);
      let best = 0;
      stepPlayer(p, { ...idle, dt: 1 / fps, jump: true }, open);
      for (let i = 0; i < fps; i++) best = Math.max(best, stepPlayer(p, { ...idle, dt: 1 / fps }, open).lift);
      return best;
    };
    expect(Math.abs(top(30) - top(144))).toBeLessThan(0.02);
  });
});

describe("emoting in the player", () => {
  const open: SimEnv = { ...env, colliders: [], bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 } };
  it("shows a floating picture while an emote plays and while asleep, and none otherwise", () => {
    const p = createPlayer(0, 0);
    let out = stepPlayer(p, idle, open);
    expect(out.bubble).toBeNull();
    stepPlayer(p, { ...idle, emote: 2 }, open);
    for (let i = 0; i < 40; i++) out = stepPlayer(p, idle, open);
    expect(out.mode).toBe("emote");
    expect(out.bubble?.icon).toBe("question");
    expect(out.bubble?.seconds).toBeCloseTo(2.8);
    for (let i = 0; i < 60 * 40; i++) out = stepPlayer(p, { ...idle, move: null }, open);
    expect(out.mode).toBe("sleep");
    expect(out.bubble?.icon).toBe("zzz");
    expect(Number.isFinite(out.bubble?.seconds ?? 0)).toBe(false);
    out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "walk" } }, open);
    expect(out.bubble).toBeNull();
  });
});
