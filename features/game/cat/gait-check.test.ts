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
