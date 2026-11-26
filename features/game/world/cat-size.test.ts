import { describe, expect, it } from "vitest";
import { catFocusPoint } from "./cat-size";
import { CAT_FOCUS_RATIO, CAT_POSITION } from "./stage-constants";

describe("catFocusPoint", () => {
  it("stays above the cat's feet, in line with them", () => {
    const [x, y, z] = catFocusPoint(0.8);
    expect(x).toBe(CAT_POSITION[0]);
    expect(z).toBe(CAT_POSITION[2]);
    expect(y).toBeGreaterThan(CAT_POSITION[1]);
  });

  it("moves down with the cat's body when the cat is drawn smaller", () => {
    expect(catFocusPoint(0.6)[1]).toBeCloseTo(0.6 * CAT_FOCUS_RATIO, 9);
    expect(catFocusPoint(0.6)[1]).toBeLessThan(catFocusPoint(1.2)[1]);
  });

  it("is about 0.45 high at the old Phase 0 size, as the look test had it", () => {
    expect(catFocusPoint(1.2408)[1]).toBeCloseTo(0.45, 2);
  });
});
