import { describe, expect, it } from "vitest";
import { haloAlpha, poolAlpha, smoothstep } from "./window-light-shapes";

const N = 200;
const samples = Array.from({ length: N + 1 }, (_, i) => i / N);

/** The biggest jump in brightness between two neighbouring samples along a line: a hard edge shows up as a large one. */
function steepest(values: number[]): number {
  let worst = 0;
  for (let i = 1; i < values.length; i++) worst = Math.max(worst, Math.abs(values[i] - values[i - 1]));
  return worst;
}

describe("smoothstep", () => {
  it("is 0 before, 1 after and exactly half way in the middle", () => {
    expect(smoothstep(0.2, 0.6, 0.1)).toBe(0);
    expect(smoothstep(0.2, 0.6, 0.9)).toBe(1);
    expect(smoothstep(0.2, 0.6, 0.4)).toBeCloseTo(0.5, 9);
  });
});

describe("haloAlpha", () => {
  it("is brightest in the middle and never above 1", () => {
    expect(haloAlpha(0.5, 0.5)).toBeCloseTo(0.9, 9);
    for (const u of samples) for (const v of samples) expect(haloAlpha(u, v)).toBeLessThanOrEqual(0.9 + 1e-9);
  });

  it("fades to nothing at every edge and corner, so no box outline can show", () => {
    for (const t of samples) {
      expect(haloAlpha(0, t)).toBe(0);
      expect(haloAlpha(1, t)).toBe(0);
      expect(haloAlpha(t, 0)).toBe(0);
      expect(haloAlpha(t, 1)).toBe(0);
    }
  });

  it("changes gently everywhere: no step in brightness along any row or column", () => {
    for (const fixed of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(steepest(samples.map((u) => haloAlpha(u, fixed)))).toBeLessThan(0.03);
      expect(steepest(samples.map((v) => haloAlpha(fixed, v)))).toBeLessThan(0.03);
    }
  });

  it("is symmetric left and right and up and down", () => {
    expect(haloAlpha(0.2, 0.4)).toBeCloseTo(haloAlpha(0.8, 0.4), 12);
    expect(haloAlpha(0.35, 0.2)).toBeCloseTo(haloAlpha(0.35, 0.8), 12);
  });
});

describe("poolAlpha", () => {
  it("never goes above its peak, or below nothing", () => {
    for (const u of samples) for (const v of samples) {
      const a = poolAlpha(u, v);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(0.8 + 1e-9);
    }
  });

  it("is brightest close to the wall and fades with distance", () => {
    const along = (v: number) => poolAlpha(0.4, v);
    expect(along(0.12)).toBeGreaterThan(along(0.3));
    expect(along(0.3)).toBeGreaterThan(along(0.6));
    expect(along(0.6)).toBeGreaterThan(along(0.9));
    expect(poolAlpha(0.4, 1)).toBe(0);
  });

  it("starts about as wide as the window and widens as it moves away from the wall", () => {
    const widthAt = (v: number) => samples.filter((u) => poolAlpha(u, v) > 0.25 * poolAlpha(0.4, v)).length / N;
    expect(widthAt(0.1)).toBeGreaterThan(0.4);
    expect(widthAt(0.1)).toBeLessThan(0.7);
    expect(widthAt(0.5)).toBeGreaterThan(widthAt(0.1));
  });

  it("leaves nothing at the sides of the quad where a cut-off would show", () => {
    for (const v of samples) {
      expect(poolAlpha(0, v)).toBeLessThan(0.02);
      expect(poolAlpha(1, v)).toBeLessThan(0.02);
    }
  });

  it("has no hard edge anywhere: brightness never jumps between neighbouring samples", () => {
    for (const fixed of [0.02, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8]) {
      expect(steepest(samples.map((u) => poolAlpha(u, fixed))), `row at depth ${fixed}`).toBeLessThan(0.08);
    }
    for (const fixed of [0.05, 0.25, 0.4, 0.5, 0.6, 0.75]) {
      expect(steepest(samples.map((v) => poolAlpha(fixed, v))), `column at ${fixed}`).toBeLessThan(0.08);
    }
  });

  it("is symmetric left and right of the middle", () => {
    expect(poolAlpha(0.3, 0.4)).toBeCloseTo(poolAlpha(0.7, 0.4), 12);
  });

  it("shows the shadow of the window bar down the middle, softer further from the wall", () => {
    const dip = (v: number) => 1 - poolAlpha(0.5, v) / poolAlpha(0.42, v);
    expect(dip(0.15)).toBeGreaterThan(0.1);
    expect(dip(0.15)).toBeGreaterThan(dip(0.55));
  });
});
