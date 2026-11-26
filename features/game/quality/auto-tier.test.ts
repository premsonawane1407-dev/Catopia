import { describe, expect, it } from "vitest";
import { createGovernor, type Governor } from "./auto-tier";
import { TIERS, cheaperTier, initialTier, richerTier } from "./tiers";

/** Feeds `count` frames of `ms` each and returns every tier change that happened. */
function feed(governor: Governor, ms: number, count: number) {
  const changes: string[] = [];
  for (let i = 0; i < count; i++) {
    const changed = governor.push(ms);
    if (changed) changes.push(changed);
  }
  return changes;
}

const WINDOW = 90;

describe("tiers", () => {
  it("orders tiers from richest to cheapest", () => {
    expect(cheaperTier("full")).toBe("light");
    expect(cheaperTier("light")).toBe("minimal");
    expect(cheaperTier("minimal")).toBeNull();
    expect(richerTier("minimal")).toBe("light");
    expect(richerTier("full")).toBeNull();
  });

  it("gets cheaper in render scale and shadow quality as it steps down", () => {
    expect(TIERS.full.renderScale).toBeGreaterThan(TIERS.light.renderScale);
    expect(TIERS.light.renderScale).toBeGreaterThan(TIERS.minimal.renderScale);
    expect(TIERS.full.shadowMapSize).toBeGreaterThan(TIERS.light.shadowMapSize);
    expect(TIERS.minimal.post).toBe(false);
  });

  it("makes a sensible first guess", () => {
    expect(initialTier({ isTouch: false, cores: 8 })).toBe("full");
    expect(initialTier({ isTouch: false, cores: 2 })).toBe("light");
    expect(initialTier({ isTouch: true, cores: 8, memoryGb: 8 })).toBe("light");
    expect(initialTier({ isTouch: true, cores: 4, memoryGb: 2 })).toBe("minimal");
  });
});

describe("governor stepping down", () => {
  it("steps down after two slow windows in a row", () => {
    const g = createGovernor("full");
    expect(feed(g, 30, WINDOW)).toEqual([]);
    expect(feed(g, 30, WINDOW)).toEqual(["light"]);
    expect(g.tier()).toBe("light");
  });

  it("does not step down for a single slow window", () => {
    const g = createGovernor("full");
    expect(feed(g, 30, WINDOW)).toEqual([]);
    expect(feed(g, 16, WINDOW)).toEqual([]);
    expect(feed(g, 30, WINDOW)).toEqual([]);
    expect(g.tier()).toBe("full");
  });

  it("keeps stepping down to the cheapest tier and then stays there", () => {
    const g = createGovernor("full");
    expect(feed(g, 40, WINDOW * 6)).toEqual(["light", "minimal"]);
    expect(g.tier()).toBe("minimal");
  });

  it("ignores very long frames such as a tab switch", () => {
    const g = createGovernor("full");
    for (let i = 0; i < 10; i++) expect(g.push(5000)).toBeNull();
    expect(feed(g, 16, WINDOW * 3)).toEqual([]);
    expect(g.tier()).toBe("full");
  });
});

describe("governor stepping up on trial", () => {
  const comfortableWindows = Math.ceil(20000 / (WINDOW * 16));

  it("tries a richer tier after a long comfortable stretch", () => {
    const g = createGovernor("light");
    expect(feed(g, 16, WINDOW * comfortableWindows)).toEqual(["full"]);
  });

  it("keeps the richer tier when the trial goes well", () => {
    const g = createGovernor("light");
    feed(g, 16, WINDOW * comfortableWindows);
    expect(feed(g, 16, WINDOW * 4)).toEqual([]);
    expect(g.tier()).toBe("full");
  });

  it("goes back, and never retries that tier, when the trial is too slow", () => {
    const g = createGovernor("light");
    feed(g, 16, WINDOW * comfortableWindows);
    expect(feed(g, 40, WINDOW)).toEqual(["light"]);
    expect(feed(g, 16, WINDOW * comfortableWindows * 3)).toEqual([]);
    expect(g.tier()).toBe("light");
  });

  it("does not step up when frames are only so-so", () => {
    const g = createGovernor("light");
    expect(feed(g, 20, WINDOW * 60)).toEqual([]);
  });

  it("stops changing after the cap, so it can never oscillate forever", () => {
    const g = createGovernor("full", { maxChanges: 1 });
    expect(feed(g, 40, WINDOW * 2)).toEqual(["light"]);
    expect(feed(g, 40, WINDOW * 10)).toEqual([]);
    expect(g.tier()).toBe("light");
  });
});

describe("governor setTier", () => {
  it("jumps to the given tier and forgets earlier evidence", () => {
    const g = createGovernor("full");
    feed(g, 30, WINDOW);
    g.setTier("minimal");
    expect(g.tier()).toBe("minimal");
    expect(feed(g, 16, WINDOW)).toEqual([]);
  });
});
