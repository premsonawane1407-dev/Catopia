import { describe, expect, it } from "vitest";
import { COAT_PRESETS, DEFAULT_COAT, buildPalette, coatById, hexToRgb, makeRamp, outlineOf, rgbToHex, rgbToHsl } from "./coat";
import { rampHueTurn } from "./quality";

const lum = (c: readonly [number, number, number]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

describe("coats", () => {
  it("round-trips colours", () => {
    expect(rgbToHex(hexToRgb("#e0833a"))).toBe("#e0833a");
  });
  it("makes ramps that get lighter at every step", () => {
    for (const coat of COAT_PRESETS) {
      const p = buildPalette(coat);
      for (const ramp of Object.values(p.ramps)) for (let i = 1; i < 5; i++) expect(lum(ramp[i])).toBeGreaterThanOrEqual(lum(ramp[i - 1]) - 0.5);
    }
  });
  it("makes every outline darker than the darkest fill of its ramp", () => {
    for (const coat of COAT_PRESETS) {
      const p = buildPalette(coat);
      for (const m of ["base", "mark", "white", "patch"] as const) expect(lum(p.outline[m])).toBeLessThanOrEqual(lum(p.ramps[m][0]));
    }
  });
  it("turns hue across the ramp of a coloured coat (shadows cool, highlights warm)", () => {
    expect(rampHueTurn(makeRamp("#e0833a").map(rgbToHex))).toBeGreaterThanOrEqual(15);
    const [hDark] = rgbToHsl(makeRamp("#e0833a")[0]);
    const [hLight] = rgbToHsl(makeRamp("#e0833a")[4]);
    expect(Math.abs(hDark - hLight)).toBeGreaterThan(5);
  });
  it("has an outline darker than the darkest tone", () => {
    const r = makeRamp("#8d95a8");
    expect(lum(outlineOf(r))).toBeLessThan(lum(r[0]));
  });
  it("falls back to the default coat for an unknown id", () => {
    expect(coatById("nope")).toBe(DEFAULT_COAT);
    expect(coatById("tuxedo").id).toBe("tuxedo");
  });
  it("has unique ids", () => {
    expect(new Set(COAT_PRESETS.map((c) => c.id)).size).toBe(COAT_PRESETS.length);
  });
});
