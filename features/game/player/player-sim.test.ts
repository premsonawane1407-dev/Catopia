import { describe, expect, it } from "vitest";
import { FOLLOW_TAU, followTarget, stepFollow } from "./follow-camera";
import { isClear } from "./colliders";
import { pickInteractable } from "./interactions";
import { createPlayer, stepPlayer, type SimEnv, type SimInput } from "./player-sim";
import { CAMERA_BOUNDS, INTERACTABLES, START, WALK_BOUNDS, buildColliders } from "../world/greybox";
import { RUN_SPEED_PX, WALK_SPEED_PX } from "../cat/clips";

const UPP = 0.0155;
const colliders = buildColliders();
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
    expect(isClear(START, env.params.radius, colliders, WALK_BOUNDS)).toBe(true);
  });
  it("has solid houses, stalls and lamps to walk around", () => {
    expect(colliders.filter((c) => c.id.startsWith("house")).length).toBeGreaterThanOrEqual(2);
    expect(colliders.some((c) => c.id.startsWith("stall"))).toBe(true);
    expect(colliders.some((c) => c.id.startsWith("lamp"))).toBe(true);
  });
  it("puts every interaction spot on clear ground, inside the walkable strip", () => {
    for (const i of INTERACTABLES) {
      expect(isClear(i.approach, env.params.radius, colliders, WALK_BOUNDS), i.id).toBe(true);
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
        if (seen.has(k) || !isClear({ x: nx, z: nz }, env.params.radius, colliders, WALK_BOUNDS)) continue;
        seen.add(k);
        queue.push([nx, nz]);
      }
    }
    for (const i of INTERACTABLES) expect(seen.has(key(i.approach.x, i.approach.z)), i.id).toBe(true);
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
    const p = createPlayer(START.x, START.z);
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
    const p = createPlayer(START.x, START.z);
    stepPlayer(p, { ...idle, target: { x: 1.5, z: 1.2 } }, env);
    let out = stepPlayer(p, idle, env);
    for (let i = 0; i < 600 && p.autoWalk; i++) out = stepPlayer(p, idle, env);
    expect(p.autoWalk).toBeNull();
    expect(Math.hypot(out.x - 1.5, out.z - 1.2)).toBeLessThan(0.1);
  });

  it("gives up a tap that leads into a wall instead of pushing forever", () => {
    const p = createPlayer(START.x, START.z);
    stepPlayer(p, { ...idle, target: { x: 0, z: -1.45 + 0 } }, env);
    // Aim past the house fronts, where the strip ends.
    p.autoWalk = { x: -3.9, z: -2.5, arriveRadius: 0.07, runBeyond: 3.2 };
    for (let i = 0; i < 60 * 12 && p.autoWalk; i++) stepPlayer(p, idle, env);
    expect(p.autoWalk).toBeNull();
  });

  it("walks to the bench and sits when asked, then gets up when pushed", () => {
    const p = createPlayer(START.x, START.z);
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
    const p = createPlayer(START.x, START.z);
    const sign = INTERACTABLES.find((i) => i.id === "sign")!;
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
    const p = createPlayer(-1, 0.9);
    let out = stepPlayer(p, idle, env);
    for (let i = 0; i < 90; i++) out = stepPlayer(p, { ...idle, move: { x: 1, z: 0, gait: "run" } }, env);
    expect(out.mode).toBe("run");
    expect(out.speed).toBeGreaterThan(env.params.runSpeed * 0.95);
  });
});

describe("a five-minute roam by a bot", () => {
  it("never enters a collider, never jumps, never leaves the strip, and does not freeze in place", () => {
    const rand = rng(42);
    const p = createPlayer(START.x, START.z);
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
      if (t >= nextChange) {
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
      if (!isClear({ x: out.x, z: out.z }, env.params.radius, colliders, WALK_BOUNDS)) throw new Error(`inside a collider at ${out.x}, ${out.z}, t=${t}`);
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
    // A push straight into a wall stays put by design, but only until the bot turns (at most about 2.6 s), never for good.
    expect(longest).toBeLessThan(3);
    expect(pushingTime).toBeGreaterThan(60);
    expect(blockedTime / pushingTime).toBeLessThan(0.5);
  });
});
