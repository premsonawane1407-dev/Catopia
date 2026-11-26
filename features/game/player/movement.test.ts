import { describe, expect, it } from "vitest";
import { isClear, resolveCollisions, type Bounds, type Collider } from "./colliders";
import { autoWalkIntent, stepMotion, updateStuck, wantedVelocity, type Motion, type MoveParams } from "./movement";

const params: MoveParams = { walkSpeed: 0.6, runSpeed: 1.6, radius: 0.12 };
const bounds: Bounds = { minX: -5, maxX: 5, minZ: -2, maxZ: 3 };
const wall: Collider = { kind: "box", id: "wall", x: 0, z: 1, hx: 2, hz: 0.2 };
const post: Collider = { kind: "circle", id: "post", x: 1, z: 0, r: 0.1 };

const run = (m: Motion, intent: Parameters<typeof stepMotion>[1], seconds: number, colliders: Collider[] = []): Motion => {
  let cur = m;
  for (let i = 0; i < seconds * 60; i++) {
    const r = stepMotion(cur, intent, 1 / 60, params, colliders, bounds);
    cur = { x: r.x, z: r.z, vx: r.vx, vz: r.vz };
  }
  return cur;
};

describe("collisions", () => {
  it("pushes a circle out of a box along the shortest way", () => {
    const p = resolveCollisions({ x: 0, z: 0.75 }, 0.12, [wall], bounds);
    expect(p.z).toBeCloseTo(1 - 0.2 - 0.12, 5);
    expect(p.x).toBeCloseTo(0, 5);
  });
  it("leaves through the nearest face if the centre is inside a box", () => {
    const p = resolveCollisions({ x: 0, z: 1.15 }, 0.12, [wall], bounds);
    expect(p.z).toBeCloseTo(1 + 0.2 + 0.12, 5);
  });
  it("pushes a circle out of a circle", () => {
    const p = resolveCollisions({ x: 0.95, z: 0 }, 0.12, [post], bounds);
    expect(Math.hypot(p.x - post.x, p.z - post.z)).toBeCloseTo(0.22, 5);
  });
  it("keeps the cat inside the walkable edge", () => {
    expect(resolveCollisions({ x: 9, z: -9 }, 0.12, [], bounds)).toEqual({ x: 5 - 0.12, z: -2 + 0.12 });
  });
  it("is clear in open ground and not clear inside a wall", () => {
    expect(isClear({ x: 3, z: -1 }, 0.12, [wall, post], bounds)).toBe(true);
    expect(isClear({ x: 0, z: 1 }, 0.12, [wall, post], bounds)).toBe(false);
  });
});

describe("moving", () => {
  it("asks for no velocity without an intent", () => {
    expect(wantedVelocity(null, params)).toEqual({ vx: 0, vz: 0 });
  });
  it("walks and runs at their own speeds at full push", () => {
    expect(Math.hypot(...Object.values(wantedVelocity({ x: 1, z: 0, gait: "walk" }, params)))).toBeCloseTo(0.6);
    expect(Math.hypot(...Object.values(wantedVelocity({ x: 0, z: -1, gait: "run" }, params)))).toBeCloseTo(1.6);
  });
  it("never creeps slower than a share of the gait speed", () => {
    expect(Math.hypot(...Object.values(wantedVelocity({ x: 0.05, z: 0, gait: "walk" }, params)))).toBeCloseTo(0.6 * 0.35);
  });
  it("is no faster diagonally", () => {
    const v = wantedVelocity({ x: 0.7071, z: 0.7071, gait: "walk" }, params);
    expect(Math.hypot(v.vx, v.vz)).toBeLessThan(0.62);
  });
  it("eases in and stops within a fraction of a second", () => {
    const first = stepMotion({ x: 0, z: 0, vx: 0, vz: 0 }, { x: 1, z: 0, gait: "walk" }, 1 / 60, params, [], bounds);
    expect(first.vx).toBeGreaterThan(0);
    expect(first.vx).toBeLessThan(0.6);
    const going = run({ x: 0, z: 0, vx: 0, vz: 0 }, { x: 1, z: 0, gait: "walk" }, 1);
    const stopped = run(going, null, 0.4);
    expect(Math.hypot(stopped.vx, stopped.vz)).toBeLessThan(0.01);
  });
  it("covers the same ground at 30 and 120 frames a second", () => {
    const go = (fps: number) => {
      let m: Motion = { x: 0, z: 0, vx: 0, vz: 0 };
      for (let i = 0; i < fps; i++) {
        const r = stepMotion(m, { x: 1, z: 0, gait: "walk" }, 1 / fps, params, [], bounds);
        m = { x: r.x, z: r.z, vx: r.vx, vz: r.vz };
      }
      return m.x;
    };
    expect(Math.abs(go(30) - go(120))).toBeLessThan(0.05);
  });
  it("slides along a wall instead of sticking to it", () => {
    const start: Motion = { x: -1, z: 0.4, vx: 0, vz: 0 };
    const end = run(start, { x: 0.7071, z: 0.7071, gait: "walk" }, 2, [wall]);
    expect(end.x - start.x).toBeGreaterThan(0.6);
    expect(end.z).toBeLessThanOrEqual(1 - 0.2 - 0.12 + 1e-6);
  });
  it("never ends up inside a wall, however hard it pushes", () => {
    let m: Motion = { x: 0, z: 0, vx: 0, vz: 0 };
    for (let i = 0; i < 600; i++) {
      const r = stepMotion(m, { x: 0, z: 1, gait: "run" }, 1 / 60, params, [wall], bounds);
      m = { x: r.x, z: r.z, vx: r.vx, vz: r.vz };
      expect(isClear(m, params.radius, [wall], bounds)).toBe(true);
    }
  });
  it("reports being blocked when pushing straight into a wall", () => {
    let m: Motion = { x: 0, z: 0.5, vx: 0, vz: 0 };
    let blocked = false;
    for (let i = 0; i < 120; i++) {
      const r = stepMotion(m, { x: 0, z: 1, gait: "walk" }, 1 / 60, params, [wall], bounds);
      m = { x: r.x, z: r.z, vx: r.vx, vz: r.vz };
      blocked = r.blocked;
    }
    expect(blocked).toBe(true);
  });
});

describe("walking to a point", () => {
  it("heads for the point, eases off near it, and stops on arrival", () => {
    expect(autoWalkIntent({ x: 0, z: 0, vx: 0, vz: 0 }, { x: 2, z: 0, arriveRadius: 0.07, runBeyond: 3.2 })?.x).toBeGreaterThan(0.9);
    const near = autoWalkIntent({ x: 0, z: 0, vx: 0, vz: 0 }, { x: 0.1, z: 0, arriveRadius: 0.07, runBeyond: 3.2 });
    expect(Math.hypot(near!.x, near!.z)).toBeLessThan(0.7);
    expect(autoWalkIntent({ x: 0, z: 0, vx: 0, vz: 0 }, { x: 0.05, z: 0, arriveRadius: 0.07, runBeyond: 3.2 })).toBeNull();
  });
  it("runs for far targets and walks for near ones", () => {
    expect(autoWalkIntent({ x: 0, z: 0, vx: 0, vz: 0 }, { x: 5, z: 0, arriveRadius: 0.07, runBeyond: 3.2 })?.gait).toBe("run");
    expect(autoWalkIntent({ x: 0, z: 0, vx: 0, vz: 0 }, { x: 1, z: 0, arriveRadius: 0.07, runBeyond: 3.2 })?.gait).toBe("walk");
  });
  it("counts time spent pushing without getting anywhere, and forgives otherwise", () => {
    const t = { time: 0 };
    updateStuck(t, true, true, 0.3);
    expect(updateStuck(t, true, true, 0.3)).toBeCloseTo(0.6);
    expect(updateStuck(t, true, false, 0.1)).toBe(0);
  });
});
