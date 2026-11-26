import { describe, expect, it } from "vitest";
import { createPerfStore, percentile } from "./perf-store";

describe("percentile", () => {
  it("returns 0 for no samples", () => {
    expect(percentile([], 0.95)).toBe(0);
  });

  it("picks the sample that p of the others fall under", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(values, 0.5)).toBe(50);
    expect(percentile(values, 0.95)).toBe(95);
    expect(percentile(values, 1)).toBe(100);
  });

  it("does not depend on the order of the samples or change them", () => {
    const values = [30, 10, 20];
    expect(percentile(values, 0.5)).toBe(20);
    expect(values).toEqual([30, 10, 20]);
  });
});

describe("createPerfStore", () => {
  it("reports frame rate from the average frame time", () => {
    const store = createPerfStore();
    for (let i = 0; i < 10; i++) store.pushFrame(20);
    const s = store.snapshot();
    expect(s.frames).toBe(10);
    expect(s.frameMsAvg).toBeCloseTo(20, 6);
    expect(s.fps).toBeCloseTo(50, 6);
    expect(s.frameMsMax).toBe(20);
  });

  it("keeps only the most recent frames", () => {
    const store = createPerfStore(5);
    for (const ms of [100, 100, 10, 10, 10, 10, 10]) store.pushFrame(ms);
    expect(store.snapshot().frameMsAvg).toBeCloseTo(10, 6);
    expect(store.snapshot().frames).toBe(7);
  });

  it("ignores zero, negative, non-numeric and absurdly long frames", () => {
    const store = createPerfStore();
    for (const ms of [0, -5, Number.NaN, 5000]) store.pushFrame(ms);
    expect(store.snapshot().frames).toBe(0);
    expect(store.snapshot().fps).toBe(0);
  });

  it("counts graphics contexts and remembers renderer figures and the tier", () => {
    const store = createPerfStore();
    store.contextCreated();
    store.contextCreated();
    store.contextLost();
    store.setTier("full");
    store.setRenderer({ drawCalls: 31, triangles: 20000, geometries: 20, textures: 12, programs: 9, buffer: "800x450" });
    const s = store.snapshot();
    expect([s.contextsCreated, s.contextsLost, s.tier, s.drawCalls, s.buffer]).toEqual([2, 1, "full", 31, "800x450"]);
  });

  it("works out how many contexts are still alive", () => {
    const store = createPerfStore();
    for (let i = 0; i < 10; i++) {
      store.contextCreated();
      store.contextReleased();
    }
    expect(store.snapshot().contextsActive).toBe(0);
    store.contextCreated();
    expect(store.snapshot().contextsActive).toBe(1);
    store.contextLost();
    expect(store.snapshot().contextsActive).toBe(0);
    expect(store.snapshot().contextsReleased).toBe(10);
  });

  it("starts the frame statistics again on reset but keeps the context counts", () => {
    const store = createPerfStore();
    store.pushFrame(16);
    store.contextCreated();
    store.reset();
    const s = store.snapshot();
    expect(s.frames).toBe(0);
    expect(s.contextsCreated).toBe(1);
  });
});
