import { describe, expect, it } from "vitest";
import { CLIPS } from "../cat/clips";
import { analyzeContact, measureSlide } from "./slide-check";

describe("planted paws on the screen, through the real step logic", () => {
  for (const clip of ["walk", "run"] as const) {
    const stride = CLIPS[clip].stridePx ?? 0;
    // With eight frames a drawn paw can be up to half a body step from where the ground would put it (and it comes
    // back to zero as the next frame arrives): that is the most any eight-frame cycle can do.
    const limit = stride / 16 + 0.25;
    for (const share of [0.4, 1, 1.6]) {
      it(`${clip} at ${share} times its speed stays within half a step (${limit.toFixed(1)} px) in every direction`, () => {
        for (let d = 0; d < 8; d++) {
          const r = measureSlide({ clip, direction: d, speedShare: share });
          expect(r.stances, `direction ${d}`).toBeGreaterThan(4);
          expect(r.maxStray, `direction ${d}`).toBeLessThanOrEqual(limit);
        }
      });
    }
  }
  it("is the same at slow, normal and fast speed (the cycle follows distance, not time)", () => {
    for (const d of [0, 2, 4]) {
      const a = measureSlide({ clip: "walk", direction: d, speedShare: 0.4 }).maxStray;
      const b = measureSlide({ clip: "walk", direction: d, speedShare: 1.6 }).maxStray;
      expect(Math.abs(a - b)).toBeLessThan(0.2);
    }
  });
  it("is steadier toward and away from the camera than sideways (the ground foreshortening is corrected)", () => {
    expect(measureSlide({ clip: "walk", direction: 0, speedShare: 1 }).maxStray).toBeLessThan(measureSlide({ clip: "walk", direction: 2, speedShare: 1 }).maxStray + 0.01);
  });
});

describe("where planted-paw drift comes from", () => {
  const dirs = [0, 1, 2, 3, 4, 5, 6, 7];
  it("the animation's own motion has no foot sliding: played continuously, a planted paw stays exactly put when walking along the screen's axes", () => {
    for (const clip of ["walk", "run"] as const) {
      for (const share of [0.4, 1, 1.6]) {
        for (const d of [0, 2, 4, 6]) expect(analyzeContact({ clip, direction: d, speedShare: share, frames: 0, lock: 0 }).pawStray, `${clip} ${share} ${d}`).toBeLessThan(0.01);
      }
    }
  });

  it("on the diagonals a small drift remains even played continuously (at most about half a pixel): the cat is drawn from 28 degrees and the camera looks down at 34", () => {
    for (const d of [1, 3, 5, 7]) {
      const r = analyzeContact({ clip: "walk", direction: d, speedShare: 1, frames: 0, lock: 0 }).pawStray;
      expect(r).toBeGreaterThan(0.2);
      expect(r).toBeLessThan(0.6);
    }
  });

  it("the drift is sampling: with eight frames it is half a body step sideways, and it halves toward the camera", () => {
    const side = analyzeContact({ clip: "walk", direction: 2, speedShare: 1, frames: 8, lock: 0 }).pawStray;
    const toward = analyzeContact({ clip: "walk", direction: 0, speedShare: 1, frames: 8, lock: 0 }).pawStray;
    expect(side).toBeGreaterThan(1.5);
    expect(side).toBeLessThan(1.8);
    expect(toward).toBeLessThan(side * 0.55);
  });

  it("more frames cut the drift in proportion: twelve about 1.1 px, sixteen about 0.8 px (side view)", () => {
    const at = (frames: number) => analyzeContact({ clip: "walk", direction: 2, speedShare: 1, frames, lock: 0 }).pawStray;
    expect(at(12)).toBeCloseTo(26 / 24, 1);
    expect(at(16)).toBeCloseTo(26 / 32, 1);
  });

  it("a full foot lock holds planted paws still and moves the cost to the body, which steps by the same amount", () => {
    for (const d of dirs) {
      const free = analyzeContact({ clip: "walk", direction: d, speedShare: 1, frames: 8, lock: 0 });
      const locked = analyzeContact({ clip: "walk", direction: d, speedShare: 1, frames: 8, lock: 1 });
      const diagonal = d % 2 === 1;
      expect(locked.pawStray, `direction ${d}`).toBeLessThan(diagonal ? 0.6 : 0.02);
      if (!diagonal) expect(Math.abs(locked.bodyOffset - free.pawStray), `direction ${d}`).toBeLessThan(0.15);
    }
  });

  it("a half lock splits the cost between the two", () => {
    const half = analyzeContact({ clip: "walk", direction: 2, speedShare: 1, frames: 8, lock: 0.5 });
    expect(half.pawStray).toBeCloseTo(0.85, 1);
    expect(half.bodyOffset).toBeCloseTo(0.81, 1);
  });

  it("agrees with the measurement made through the real step logic when nothing is locked", () => {
    for (const d of [0, 2, 4]) {
      const real = measureSlide({ clip: "walk", direction: d, speedShare: 1 }).maxStray;
      const model = analyzeContact({ clip: "walk", direction: d, speedShare: 1, frames: 8, lock: 0 }).pawStray;
      expect(Math.abs(real - model), `direction ${d}`).toBeLessThan(0.1);
    }
  });
});
