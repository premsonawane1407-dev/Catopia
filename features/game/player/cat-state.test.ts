import { describe, expect, it } from "vitest";
import { CLIPS } from "../cat/clips";
import { LIE_DOWN_SECONDS, SIT_AFTER, SIT_DOWN_SECONDS, SLEEP_AFTER, STAND_UP_SECONDS, WAKE_SECONDS, canMove, frameOf, initialAnim, pickDirection, stepAnim, type AnimInput, type CatAnim } from "./cat-state";
import { strideFactor } from "./stride";

const base: AnimInput = { dt: 1 / 60, gait: null, pushX: 0, pushZ: 0, distance: 0, speed: 0, unitsPerPx: 0.0155, motion: true, rest: null };
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
  it("keeps stepping, planted, while it slows down after the push ends, and stands only once it has stopped", () => {
    const s = initialAnim();
    tick(s, 0.1, { gait: "walk", pushX: 1, distance: 0.01, speed: 0.6 });
    const before = s.phase;
    stepAnim(s, { ...base, distance: 0.008, speed: 0.5 });
    expect(s.mode).toBe("walk");
    expect(s.phase).toBeGreaterThan(before);
    stepAnim(s, { ...base, distance: 0, speed: 0.01 });
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
    // Each frame is drawn for the middle of its eighth, so it shows from the start of that eighth to its end.
    expect(frameOf({ ...initialAnim(), mode: "walk", phase: 0.124 }, true).frame).toBe(0);
    expect(frameOf({ ...initialAnim(), mode: "walk", phase: 0.126 }, true).frame).toBe(1);
  });
});

describe("jumping", () => {
  const frames = (s: CatAnim, seconds: number, input: Partial<AnimInput> = {}) => {
    const seen = new Set<number>();
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      stepAnim(s, { ...base, ...input });
      if (s.mode === "jump") seen.add(frameOf(s, true).frame);
    }
    return seen;
  };

  it("starts from standing, walking and running, goes through the whole jump, and ends where it began (standing, or still moving)", () => {
    const s = initialAnim();
    stepAnim(s, { ...base, jump: "standard" });
    expect(s.mode).toBe("jump");
    const seen = frames(s, 1.4);
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(s.mode).toBe("idle");
    expect(s.air.phase).toBe("ground");
    const w = initialAnim();
    tick(w, 0.1, { gait: "walk", pushX: 1, distance: 0.01 });
    stepAnim(w, { ...base, jump: "standard", gait: "walk", pushX: 1 });
    expect(w.mode).toBe("jump");
    frames(w, 1.4, { gait: "walk", pushX: 1 });
    expect(w.mode).toBe("walk");
  });

  it("does not play the walking cycle in the air, and does not advance it", () => {
    const w = initialAnim();
    tick(w, 0.1, { gait: "walk", pushX: 1, distance: 0.01 });
    const phase = w.phase;
    stepAnim(w, { ...base, jump: "standard", gait: "walk", pushX: 1, distance: 0.01 });
    for (let i = 0; i < 20; i++) {
      stepAnim(w, { ...base, gait: "walk", pushX: 1, distance: 0.01 });
      expect(frameOf(w, true).clip).toBe("jump");
    }
    expect(w.phase).toBe(phase);
  });

  it("cannot jump again in mid-air, and can be steered (turned) in the air", () => {
    const s = initialAnim();
    stepAnim(s, { ...base, jump: "standard" });
    tick(s, 0.25);
    expect(s.air.phase).toBe("air");
    const before = s.air.sinceLaunch;
    stepAnim(s, { ...base, jump: "standard" });
    expect(s.air.sinceLaunch).toBeGreaterThan(before);
    expect(s.air.phase).toBe("air");
    tick(s, 0.1, { gait: "walk", pushX: 1, pushZ: 0 });
    expect(s.direction).toBe(2);
    expect(canMove("jump")).toBe(true);
  });

  it("is up off the ground only while in the air, and lands exactly on the floor", () => {
    const s = initialAnim();
    stepAnim(s, { ...base, jump: "standard" });
    let top = 0;
    for (let i = 0; i < 60; i++) {
      stepAnim(s, base);
      top = Math.max(top, s.air.y);
    }
    expect(top).toBeGreaterThan(0.25);
    expect(s.air.y).toBe(0);
  });

  it("lands on a platform when there is one under it, and stays up there", () => {
    const s = initialAnim();
    stepAnim(s, { ...base, jump: "standard", support: 0 });
    for (let i = 0; i < 60; i++) stepAnim(s, { ...base, support: 0.2 });
    expect(s.air.y).toBeCloseTo(0.2, 6);
    expect(s.mode).toBe("idle");
    // Standing on it, the floor is still 0.2 and nothing falls.
    tick(s, 0.5, { support: 0.2 });
    expect(s.air.y).toBeCloseTo(0.2, 6);
    expect(s.mode).not.toBe("jump");
  });

  it("falls when the floor drops away under a standing or walking cat (stepping off a ledge)", () => {
    const s = initialAnim();
    s.air.y = 0.26;
    stepAnim(s, { ...base, support: 0.26 });
    stepAnim(s, { ...base, support: 0 });
    expect(s.mode).toBe("jump");
    expect(s.air.kind).toBe("down");
    for (let i = 0; i < 40; i++) stepAnim(s, { ...base, support: 0 });
    expect(s.air.y).toBe(0);
    expect(s.mode).toBe("idle");
  });

  it("gets a sitting or sleeping cat up instead of jumping", () => {
    const s = initialAnim();
    tick(s, SIT_AFTER + SIT_DOWN_SECONDS + 0.5);
    expect(s.mode).toBe("sit");
    stepAnim(s, { ...base, jump: "standard" });
    expect(s.mode).toBe("standUp");
    const z = initialAnim();
    tick(z, SIT_AFTER + SIT_DOWN_SECONDS + SLEEP_AFTER + LIE_DOWN_SECONDS + 1);
    expect(z.mode).toBe("sleep");
    stepAnim(z, { ...base, jump: "standard" });
    expect(z.mode).toBe("wake");
  });
});

describe("emotes", () => {
  it("sit the cat down facing the camera, then play, then go back to sitting", async () => {
    const { EMOTES } = await import("../cat/clips");
    const s = initialAnim(2);
    stepAnim(s, { ...base, emote: 1 });
    expect(s.mode).toBe("sitDown");
    expect(s.direction).toBe(0);
    tick(s, SIT_DOWN_SECONDS + 0.1);
    expect(s.mode).toBe("emote");
    expect(frameOf(s, true).clip).toBe(EMOTES[1].clip);
    tick(s, EMOTES[1].seconds + 0.1);
    expect(s.mode).toBe("sit");
  });

  it("play straight away from a sit, can be replaced by another, and a push cancels them", async () => {
    const { EMOTES } = await import("../cat/clips");
    const s = initialAnim();
    tick(s, SIT_AFTER + SIT_DOWN_SECONDS + 0.5);
    stepAnim(s, { ...base, emote: 0 });
    expect(s.mode).toBe("emote");
    stepAnim(s, { ...base, emote: 3 });
    expect(frameOf(s, true).clip).toBe(EMOTES[3].clip);
    tick(s, 0.1, { gait: "walk", pushX: 1 });
    expect(s.mode).toBe("standUp");
    expect(s.emote).toBeNull();
  });

  it("are ignored while walking, jumping or asleep, and a bad number does nothing", () => {
    const w = initialAnim();
    tick(w, 0.1, { gait: "walk", pushX: 1, distance: 0.01 });
    stepAnim(w, { ...base, emote: 0, gait: "walk", pushX: 1 });
    expect(w.mode).toBe("walk");
    const i = initialAnim();
    stepAnim(i, { ...base, emote: 99 });
    expect(i.mode).toBe("idle");
    const j = initialAnim();
    stepAnim(j, { ...base, jump: "standard" });
    stepAnim(j, { ...base, emote: 0 });
    expect(j.mode).toBe("jump");
  });
});

describe("curling up to sleep", () => {
  it("turns a cat that faces away to face the front or the side, so its face can be seen", async () => {
    const { facingForSleep } = await import("./cat-state");
    expect(facingForSleep(4)).toBe(0);
    expect(facingForSleep(3)).toBe(2);
    expect(facingForSleep(5)).toBe(6);
    expect(facingForSleep(2)).toBe(2);
    expect(facingForSleep(0)).toBe(0);
    const s = initialAnim(4);
    tick(s, SIT_AFTER + SIT_DOWN_SECONDS + SLEEP_AFTER + 0.3);
    expect(s.mode).toBe("lieDown");
    expect(s.direction).toBe(0);
  });
});
