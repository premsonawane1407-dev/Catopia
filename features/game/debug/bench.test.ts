import { describe, expect, it } from "vitest";
import { benchFrames, fingerprintPixels, frameFingerprint, setBenchTarget, summarizeCosts } from "./bench";

describe("fingerprintPixels", () => {
  it("is the same for the same picture and different when a pixel changes", () => {
    const a = new Uint8Array(1000).map((_, i) => i % 251);
    const b = a.slice();
    expect(fingerprintPixels(a)).toBe(fingerprintPixels(b));
    b[500] = (b[500] + 1) % 256;
    expect(fingerprintPixels(a)).not.toBe(fingerprintPixels(b));
  });
});

describe("frameFingerprint", () => {
  it("refuses to run when no game is mounted", () => {
    setBenchTarget(null);
    expect(() => frameFingerprint()).toThrow(/not running/);
  });

  it("draws a frame, then fingerprints exactly the pixels the renderer holds", () => {
    let drawn = 0;
    const shade = { value: 10 };
    const context = {
      RGBA: 1,
      UNSIGNED_BYTE: 2,
      readPixels: (_x: number, _y: number, w: number, h: number, _f: number, _t: number, out: Uint8Array) => out.fill(shade.value, 0, w * h * 4),
    };
    const gl = { getContext: () => context, domElement: { width: 4, height: 4 } };
    setBenchTarget({ gl: gl as never, advance: () => void (drawn += 1) });
    const first = frameFingerprint();
    expect(drawn).toBe(1);
    expect(frameFingerprint()).toBe(first);
    shade.value = 200;
    expect(frameFingerprint()).not.toBe(first);
    setBenchTarget(null);
  });
});

describe("summarizeCosts", () => {
  it("reports the middle, the slow tail and the worst frame", () => {
    const costs = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(summarizeCosts(costs)).toEqual({ frames: 100, p50: 50, p95: 95, p99: 99, max: 100 });
  });

  it("copes with no frames at all", () => {
    expect(summarizeCosts([])).toEqual({ frames: 0, p50: 0, p95: 0, p99: 0, max: 0 });
  });
});

describe("benchFrames", () => {
  it("refuses to run when no game is mounted", () => {
    setBenchTarget(null);
    expect(() => benchFrames(5)).toThrow(/not running/);
  });

  it("draws a warm-up and then the requested number of timed frames, waiting for the GPU after each", () => {
    let advanced = 0;
    let reads = 0;
    const context = { RGBA: 1, UNSIGNED_BYTE: 2, readPixels: () => void (reads += 1) };
    const gl = { getContext: () => context, info: { render: { calls: 56, triangles: 43000 } }, domElement: { width: 800, height: 450 } };
    setBenchTarget({ gl: gl as never, advance: () => void (advanced += 1) });
    const result = benchFrames(30);
    expect(advanced).toBe(20 + 30);
    expect(reads).toBe(30);
    expect(result).toMatchObject({ frames: 30, drawCalls: 56, triangles: 43000, buffer: "800x450" });
    setBenchTarget(null);
  });
});
