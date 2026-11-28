import { describe, expect, it } from "vitest";
import { CAMERA } from "../world/stage-constants";
import { strideFactor } from "./stride";

describe("the step cycle's length follows the map's camera pitch", () => {
  it("is the street's pitch when none is given", () => {
    for (let d = 0; d < 8; d++) expect(strideFactor(d)).toBe(strideFactor(d, CAMERA.pitch));
  });

  it("does not depend on the pitch when walking sideways (directions 2 and 6)", () => {
    for (const d of [2, 6]) expect(strideFactor(d, 50)).toBeCloseTo(strideFactor(d, 20), 9);
  });

  it("changes toward and away from the camera when the camera is steeper or flatter", () => {
    for (const d of [0, 4]) {
      expect(strideFactor(d, 50)).not.toBeCloseTo(strideFactor(d, 20), 3);
      expect(strideFactor(d, 50)).toBeGreaterThan(0);
    }
  });
});
