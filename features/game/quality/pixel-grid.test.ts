import { describe, expect, it } from "vitest";
import { computePixelGrid, isNarrowPortrait } from "./pixel-grid";

const FRACTION = 0.115;
const camera = { spriteScreenFraction: FRACTION, fovDeg: 28, depth: 13, spritePx: 48 };
const viewHeightUnits = (depth: number, fovDeg: number) => 2 * depth * Math.tan((fovDeg * Math.PI) / 360);

/** How the cat was sized in Phase 0 (whole-number scale at a 270-row target), kept here to show how much smaller it is now. */
const phase0Fraction = (deviceHeight: number) => (48 * Math.max(1, Math.round(deviceHeight / 270))) / deviceHeight;

describe("computePixelGrid", () => {
  it("gives 2 pixels per sprite pixel in the Phase 0 test window (1280x720 at 1.25)", () => {
    const g = computePixelGrid({ cssWidth: 1280, cssHeight: 720, dpr: 1.25, ...camera });
    expect(g.deviceHeight).toBe(900);
    expect(g.scale).toBe(2);
    expect(g.gameRows).toBe(450);
    expect(g.unitsPerGamePx).toBeCloseTo(0.014406, 5);
    expect(g.spriteWorldWidth).toBeCloseTo(48 * g.unitsPerGamePx, 6);
  });

  it("uses a whole-number scale on a 1080p screen", () => {
    const g = computePixelGrid({ cssWidth: 1920, cssHeight: 1080, dpr: 1, ...camera });
    expect(g.scale).toBe(3);
    expect(g.gameRows).toBe(360);
  });

  it("picks a bigger whole-number scale on a phone held upright, which has more pixels", () => {
    const g = computePixelGrid({ cssWidth: 375, cssHeight: 812, dpr: 2, ...camera });
    expect(g.scale).toBe(4);
    expect(g.gameRows).toBeCloseTo(406, 6);
  });

  it("never returns a scale below 1, even for tiny windows", () => {
    const g = computePixelGrid({ cssWidth: 100, cssHeight: 60, dpr: 1, ...camera });
    expect(g.scale).toBe(1);
    expect(g.spriteWorldWidth).toBeGreaterThan(0);
  });

  it("makes each sprite pixel cover exactly `scale` screen pixels, whatever the window", () => {
    for (const [cssHeight, dpr] of [[540, 1], [720, 1.25], [868, 1.25], [1080, 1], [812, 2], [1440, 1.5]] as const) {
      const g = computePixelGrid({ cssWidth: 1000, cssHeight, dpr, ...camera });
      const pixelsPerSpritePixel = (g.unitsPerGamePx * g.deviceHeight) / viewHeightUnits(camera.depth, camera.fovDeg);
      expect(pixelsPerSpritePixel).toBeCloseTo(g.scale, 9);
    }
  });

  it("makes the sprite smaller when it is further away, and bigger when it is closer, at the same screen size", () => {
    const near = computePixelGrid({ cssWidth: 1280, cssHeight: 720, dpr: 1.25, ...camera, depth: 10 });
    const far = computePixelGrid({ cssWidth: 1280, cssHeight: 720, dpr: 1.25, ...camera, depth: 20 });
    expect(far.spriteWorldWidth / near.spriteWorldWidth).toBeCloseTo(2, 6);
    expect(far.scale).toBe(near.scale);
  });

  it("keeps the sprite's frame close to its share of the window height on realistic windows", () => {
    // Whole-number scaling makes the sprite step between sizes, but it should never wander far from the target.
    for (let cssHeight = 700; cssHeight <= 2400; cssHeight += 25) {
      const g = computePixelGrid({ cssWidth: cssHeight * 1.78, cssHeight, dpr: 1, ...camera });
      const fraction = (48 * g.scale) / g.deviceHeight;
      expect(fraction, `height ${cssHeight}`).toBeGreaterThan(FRACTION * 0.75);
      expect(fraction, `height ${cssHeight}`).toBeLessThan(FRACTION * 1.25);
    }
  });

  it("is clearly smaller than the Phase 0 cat, which was judged too big", () => {
    for (let cssHeight = 700; cssHeight <= 2400; cssHeight += 25) {
      const g = computePixelGrid({ cssWidth: cssHeight * 1.78, cssHeight, dpr: 1, ...camera });
      const fraction = (48 * g.scale) / g.deviceHeight;
      expect(fraction / phase0Fraction(g.deviceHeight), `height ${cssHeight}`).toBeLessThanOrEqual(0.82);
    }
  });

  it("grows the cat when asked to", () => {
    const small = computePixelGrid({ cssWidth: 1920, cssHeight: 1080, dpr: 1, ...camera });
    const big = computePixelGrid({ cssWidth: 1920, cssHeight: 1080, dpr: 1, ...camera, spriteScreenFraction: 0.2 });
    expect(big.spriteWorldWidth).toBeGreaterThan(small.spriteWorldWidth);
  });
});

describe("isNarrowPortrait", () => {
  it("flags an upright phone", () => {
    expect(isNarrowPortrait(375, 812)).toBe(true);
  });

  it("does not flag a landscape phone, a tablet or a desktop", () => {
    expect(isNarrowPortrait(812, 375)).toBe(false);
    expect(isNarrowPortrait(820, 1180)).toBe(false);
    expect(isNarrowPortrait(1280, 720)).toBe(false);
  });
});
