import { describe, expect, it } from "vitest";
import { CLIPS } from "../cat/clips";
import { LIE_DOWN_SECONDS, SIT_AFTER, SIT_DOWN_SECONDS, SLEEP_AFTER, STAND_UP_SECONDS, WAKE_SECONDS, canMove, frameOf, initialAnim, pickDirection, stepAnim, type AnimInput, type CatAnim } from "./cat-state";
import { strideFactor } from "./stride";

const base: AnimInput = { dt: 1 / 60, gait: null, pushX: 0, pushZ: 0, distance: 0, unitsPerPx: 0.0155, motion: true, rest: null };
const tick = (s: CatAnim, seconds: number, input: Partial<AnimInput> = {}): CatAnim => {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepAnim(s, { ...base, ...input });
  return s;
};

describe("facing", () => {
  it("turns toward the push", () => {
    expect(pickDirection(0, 1, 0)).toBe(2);
    expect(pickDirection(0, 0, -1)).toBe(4);
  });
  it("does not flicker on the edge between two directions", () => {
    // 22.5 degrees is the edge between S and SE; just past it is not enough to turn.
    const a = (22.5 + 2) * (Math.PI / 180);
    expect(pickDirection(0, Math.sin(a), Math.cos(a))).toBe(0);
    const b = (22.5 + 12) * (Math.PI / 180);
    expect(pickDirection(0, Math.sin(b), Math.cos(b))).toBe(1);
  });
});

describe("the cat's states", () => {
  it("starts standing", () => {
    expect(initialAnim().mode).toBe("idle");
  });
  it("walks when asked to, runs when asked to run, and stops", () => {
    const s = initialAnim();
    tick(s, 0.1, { gait: "walk", pushX: 1, distance: 0.01 });
    expect(s.mode).toBe("walk");
    tick(s, 0.1, { gait: "run", pushX: 1, distance: 0.03 });
    expect(s.mode).toBe("run");
    tick(s, 0.1, {});
    expect(s.mode).toBe("idle");
  });
  it("advances the step cycle by distance, not time", () => {
    const a = initialAnim();
    tick(a, 1, { gait: "walk", pushX: 1, distance: 0 });
    expect(a.phase).toBe(0);
    const b = initialAnim();
    const stride = (CLIPS.walk.stridePx ?? 0) * base.unitsPerPx * strideFactor(0 + 2);
    stepAnim(b, { ...base, gait: "walk", pushX: 1, distance: stride / 4 });
    expect(b.phase).toBeCloseTo(0.25, 5);
  });
  it("needs a shorter step cycle toward the camera than sideways, to keep the feet planted on screen", () => {
    expect(strideFactor(0)).toBeLessThan(strideFactor(2));
    expect(strideFactor(2)).toBeCloseTo(1, 5);
    expect(strideFactor(0)).toBeCloseTo(strideFactor(4), 5);
  });
  it("sits down by itself after a while, then curls up to sleep", () => {
    const s = initialAnim();
    tick(s, SIT_AFTER + 0.2);
    expect(s.mode).toBe("sitDown");
    tick(s, SIT_DOWN_SECONDS + 0.1);
    expect(s.mode).toBe("sit");
    tick(s, SLEEP_AFTER + 0.2);
    expect(s.mode).toBe("lieDown");
    tick(s, LIE_DOWN_SECONDS + 0.1);
    expect(s.mode).toBe("sleep");
  });
  it("does not settle by itself when ambient motion is off", () => {
    const s = initialAnim();
    tick(s, SIT_AFTER + 30, { motion: false });
    expect(s.mode).toBe("idle");
  });
  it("settles when asked to, even with motion off, and stays until the player moves", () => {
    const s = initialAnim();
    tick(s, 0.1, { motion: false, rest: "sit" });
    tick(s, SIT_DOWN_SECONDS + SLEEP_AFTER + 1, { motion: false, rest: "sit" });
    expect(s.mode).toBe("sit");
    tick(s, 0.1, { motion: false, rest: "sleep" });
    tick(s, LIE_DOWN_SECONDS + 0.1, { motion: false, rest: "sleep" });
    expect(s.mode).toBe("sleep");
  });
  it("gets up quickly: from sitting in a quarter of a second, from sleep in half a second, then walks", () => {
    const sit = initialAnim();
    tick(sit, SIT_AFTER + SIT_DOWN_SECONDS + 0.5);
    expect(sit.mode).toBe("sit");
    tick(sit, STAND_UP_SECONDS + 0.05, { gait: "walk", pushX: 1 });
    expect(canMove(sit.mode)).toBe(true);
    const sleeper = initialAnim();
    tick(sleeper, SIT_AFTER + SIT_DOWN_SECONDS + SLEEP_AFTER + LIE_DOWN_SECONDS + 1);
    expect(sleeper.mode).toBe("sleep");
    tick(sleeper, WAKE_SECONDS + STAND_UP_SECONDS + 0.1, { gait: "walk", pushX: 1 });
    expect(canMove(sleeper.mode)).toBe(true);
  });
  it("can be interrupted half way down and reverses from where it was", () => {
    const s = initialAnim();
    tick(s, 0.1, { rest: "sit" });
    tick(s, SIT_DOWN_SECONDS / 2, { rest: "sit" });
    expect(s.mode).toBe("sitDown");
    const before = s.progress;
    stepAnim(s, { ...base, gait: "walk", pushX: 1 });
    expect(s.mode).toBe("standUp");
    expect(s.progress).toBeCloseTo(1 - before, 1);
  });
});

describe("which frame is drawn", () => {
  it("holds still with ambient motion off", () => {
    const s = initialAnim();
    s.clock = 3.3;
    expect(frameOf(s, false)).toEqual({ clip: "idle", frame: 0 });
    expect(frameOf({ ...s, mode: "sleep" }, false)).toEqual({ clip: "sleep", frame: 0 });
  });
  it("blinks now and then when idle", () => {
    const s = initialAnim();
    const frames = new Set<number>();
    for (let t = 0; t < 5; t += 0.05) {
      s.clock = t;
      frames.add(frameOf(s, true).frame);
    }
    expect(frames.has(CLIPS.idle.frames - 1)).toBe(true);
  });
  it("plays standing up as sitting down backwards", () => {
    const down = frameOf({ ...initialAnim(), mode: "sitDown", progress: 0 }, true).frame;
    const up = frameOf({ ...initialAnim(), mode: "standUp", progress: 0 }, true).frame;
    expect(down).toBe(0);
    expect(up).toBe(CLIPS.sitDown.frames - 1);
  });
  it("picks walk and run frames from the cycle", () => {
    expect(frameOf({ ...initialAnim(), mode: "walk", phase: 0.5 }, true)).toEqual({ clip: "walk", frame: 4 });
    expect(frameOf({ ...initialAnim(), mode: "run", phase: 0.99 }, true)).toEqual({ clip: "run", frame: 7 });
  });
});
