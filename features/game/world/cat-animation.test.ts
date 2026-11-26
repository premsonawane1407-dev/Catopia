import { describe, expect, it } from "vitest";
import { CAT_BLINK_FRAME, CAT_FRAMES, CAT_IDLE_LOOP_SECONDS, CAT_IDLE_SEQUENCE, catFrameAt } from "./cat-animation";

describe("catFrameAt", () => {
  it("only ever picks a frame that exists in the sprite sheet", () => {
    for (let t = 0; t < 40; t += 0.05) {
      const f = catFrameAt(t);
      expect(Number.isInteger(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(CAT_FRAMES);
    }
  });

  it("starts on the resting frame and repeats exactly every loop", () => {
    expect(catFrameAt(0)).toBe(0);
    for (const t of [0.1, 1.3, 2.9]) expect(catFrameAt(t + CAT_IDLE_LOOP_SECONDS)).toBe(catFrameAt(t));
  });

  it("blinks once per loop, not constantly", () => {
    expect(CAT_IDLE_SEQUENCE.filter((f) => f === CAT_BLINK_FRAME)).toHaveLength(1);
  });

  it("holds each frame for 1/5 of a second", () => {
    expect(catFrameAt(0.19)).toBe(CAT_IDLE_SEQUENCE[0]);
    expect(catFrameAt(0.21)).toBe(CAT_IDLE_SEQUENCE[1]);
  });

  it("does not misbehave for a negative clock", () => {
    expect(catFrameAt(-3)).toBe(CAT_IDLE_SEQUENCE[0]);
  });
});
