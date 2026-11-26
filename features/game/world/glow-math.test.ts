import { describe, expect, it } from "vitest";
import { TIME_PRESETS } from "../render/time-presets";
import { glowFlicker, glowIntensity, windowFlicker } from "./glow-math";

describe("glowIntensity", () => {
  it("is brighter for stronger lanterns", () => {
    expect(glowIntensity("lamp", 14)).toBeGreaterThan(glowIntensity("lamp", 9));
    expect(glowIntensity("lamp", 9)).toBeGreaterThan(glowIntensity("lamp", 2.5));
  });

  it("keeps the distant halo dimmer than a lamp", () => {
    for (const p of Object.values(TIME_PRESETS)) expect(glowIntensity("far", p.lanternIntensity)).toBeLessThan(glowIntensity("lamp", p.lanternIntensity));
  });

  it("caps the big foreground halos so they cannot blow out the corners", () => {
    for (const p of Object.values(TIME_PRESETS)) expect(glowIntensity("foreground", p.lanternIntensity)).toBeLessThanOrEqual(0.9);
    expect(glowIntensity("foreground", 100)).toBeCloseTo(0.9, 6);
  });
});

describe("flicker", () => {
  it("stays close to 1 for lamp halos", () => {
    for (let t = 0; t < 30; t += 0.1) expect(Math.abs(glowFlicker(t, 1.7) - 1)).toBeLessThanOrEqual(0.05);
  });

  it("keeps window light between 80% and 100% of full, and perfectly still when the amount is 0", () => {
    for (let t = 0; t < 60; t += 0.1) {
      const k = windowFlicker(t, 3.1);
      expect(k).toBeGreaterThanOrEqual(0.8 - 1e-9);
      expect(k).toBeLessThanOrEqual(1 + 1e-9);
      expect(windowFlicker(t, 3.1, 0)).toBe(1);
    }
  });

  it("differs from window to window", () => {
    expect(windowFlicker(5, 0.7)).not.toBeCloseTo(windowFlicker(5, 2.6), 4);
  });
});
