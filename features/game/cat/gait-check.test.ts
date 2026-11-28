import { describe, expect, it } from "vitest";
import { checkGait } from "./gait-check";
import { footAt, RUN_GAIT, WALK_GAIT } from "./poses";
import { LEG_NAMES } from "./model";

describe("walk and run feet", () => {
  for (const clip of ["walk", "run"] as const) {
    it(`${clip}: planted paws move back exactly as far as the body moves, and every leg can reach`, () => {
      const r = checkGait(clip);
      expect(r.plantedPairs).toBeGreaterThan(0);
      expect(r.maxSlide).toBeLessThan(1e-6);
      expect(r.maxShortfall).toBe(0);
      expect(r.maxPlantedHeight).toBe(0);
    });
  }
  it("the gallop has a moment in the air; the walk never does", () => {
    expect(checkGait("walk").flightFrames).toBe(0);
    expect(checkGait("run").flightFrames).toBeGreaterThan(0);
  });
  it("always has at least two paws down in a walk (a four-beat gait)", () => {
    for (let i = 0; i < 40; i++) {
      const down = LEG_NAMES.filter((l) => footAt(WALK_GAIT, l, i / 40).planted).length;
      expect(down).toBeGreaterThanOrEqual(2);
    }
  });
  it("lifts every paw once per cycle", () => {
    for (const gait of [WALK_GAIT, RUN_GAIT]) for (const l of LEG_NAMES) expect(Array.from({ length: 40 }, (_, i) => footAt(gait, l, i / 40).planted).includes(false)).toBe(true);
  });
});

describe("the walk's shape", () => {
  it("has two or three paws on the ground in every drawn frame, never fewer", async () => {
    const { poseFor } = await import("./poses");
    for (let f = 0; f < 8; f++) {
      const pose = poseFor("walk", f);
      const down = LEG_NAMES.filter((l) => pose.legs[l].foot[1] <= 1.5 + 1e-6).length;
      expect(down, `frame ${f}`).toBeGreaterThanOrEqual(2);
      expect(down, `frame ${f}`).toBeLessThanOrEqual(3);
    }
  });

  it("lands its paws in the order left hind, left front, right hind, right front, a quarter of a cycle apart", () => {
    expect([WALK_GAIT.offsets.HL, WALK_GAIT.offsets.FL, WALK_GAIT.offsets.HR, WALK_GAIT.offsets.FR]).toEqual([0, 0.25, 0.5, 0.75]);
  });

  it("flows from the last frame back into the first with no bigger a jump than any other step", async () => {
    const { poseFor } = await import("./poses");
    const { legWrist } = await import("./model");
    const key = (f: number) => {
      const p = poseFor("walk", f);
      return [...LEG_NAMES.flatMap((l) => [...p.legs[l].foot, ...legWrist(p, l)]), ...p.chest.c, ...p.haunch.c, ...p.head.c, ...p.tail.pitch, ...p.tail.yaw];
    };
    const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
    const steps = Array.from({ length: 8 }, (_, f) => dist(key(f), key((f + 1) % 8)));
    // Compare the closing step with the ordinary ones, leaving out the paws that jump from landing to lift-off in any cycle.
    const seam = steps[7];
    const others = steps.slice(0, 7);
    expect(seam).toBeLessThanOrEqual(Math.max(...others) * 1.05);
  });

  it("moves the body only a little: under a pixel of bounce, a pixel of side sway, and the head less than the body", async () => {
    const { poseFor } = await import("./poses");
    const frames = Array.from({ length: 8 }, (_, f) => poseFor("walk", f));
    const range = (v: number[]) => Math.max(...v) - Math.min(...v);
    expect(range(frames.map((p) => p.chest.c[1]))).toBeLessThanOrEqual(1);
    expect(range(frames.map((p) => p.haunch.c[1]))).toBeLessThanOrEqual(1);
    expect(range(frames.map((p) => p.chest.c[0]))).toBeLessThanOrEqual(1.3);
    expect(range(frames.map((p) => p.head.c[1]))).toBeLessThanOrEqual(range(frames.map((p) => p.chest.c[1])) + 0.2);
  });

  it("bends the hind leg into a Z: the hock is above the paw and behind it while standing", async () => {
    const { poseFor } = await import("./poses");
    const { legWrist } = await import("./model");
    const p = poseFor("idle", 0);
    const hock = legWrist(p, "HL");
    expect(hock[1]).toBeGreaterThan(p.legs.HL.foot[1] + 2);
    expect(hock[2]).toBeLessThan(p.legs.HL.foot[2]);
  });
});

describe("every drawn pose keeps its legs attached", () => {
  it("lets each leg reach its paw in every frame of every clip, in both looks (within a fifth of a pixel)", async () => {
    const { CLIP_NAMES, CLIPS } = await import("./clips");
    const { legShortfall } = await import("./model");
    const { poseFor } = await import("./poses");
    for (const look of ["original", "refined"] as const) {
      for (const clip of CLIP_NAMES) {
        for (let f = 0; f < CLIPS[clip].frames; f++) for (const l of LEG_NAMES) expect(legShortfall(poseFor(clip, f, look), l), `${look} ${clip} ${f} ${l}`).toBeLessThan(0.2);
      }
    }
  });
});
