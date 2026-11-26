import { describe, expect, it } from "vitest";
import { ATLAS_COLS, ATLAS_ROWS, CLIPS, CLIP_NAMES, DIRECTION_COUNT, TOTAL_FRAMES, atlasCell, directionFromVector, directionHeading, frameIndex } from "./clips";

describe("sprite sheet layout", () => {
  it("numbers every frame of every clip and direction exactly once", () => {
    const seen = new Set<number>();
    for (const clip of CLIP_NAMES) for (let d = 0; d < DIRECTION_COUNT; d++) for (let f = 0; f < CLIPS[clip].frames; f++) seen.add(frameIndex(clip, d, f));
    expect(seen.size).toBe(TOTAL_FRAMES);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(TOTAL_FRAMES - 1);
  });

  it("keeps out-of-range frames and directions inside their own clip", () => {
    expect(frameIndex("walk", 0, 99)).toBe(frameIndex("walk", 0, CLIPS.walk.frames - 1));
    expect(frameIndex("walk", 8, 0)).toBe(frameIndex("walk", 0, 0));
    expect(frameIndex("walk", -1, 0)).toBe(frameIndex("walk", 7, 0));
  });

  it("fits every frame in the sheet", () => {
    const last = atlasCell(TOTAL_FRAMES - 1);
    expect(last.col).toBeLessThan(ATLAS_COLS);
    expect(last.row).toBe(ATLAS_ROWS - 1);
  });
});

describe("directions", () => {
  it("faces the camera for a push toward it and away for a push away", () => {
    expect(directionFromVector(0, 1)).toBe(0);
    expect(directionFromVector(0, -1)).toBe(4);
  });
  it("faces screen right for +x and screen left for -x", () => {
    expect(directionFromVector(1, 0)).toBe(2);
    expect(directionFromVector(-1, 0)).toBe(6);
  });
  it("picks the diagonals", () => {
    expect(directionFromVector(1, 1)).toBe(1);
    expect(directionFromVector(1, -1)).toBe(3);
    expect(directionFromVector(-1, -1)).toBe(5);
    expect(directionFromVector(-1, 1)).toBe(7);
  });
  it("keeps the fallback when there is no push", () => {
    expect(directionFromVector(0, 0, 5)).toBe(5);
  });
  it("turns a quarter turn per two directions", () => {
    expect(directionHeading(2)).toBeCloseTo(Math.PI / 2);
  });
});
