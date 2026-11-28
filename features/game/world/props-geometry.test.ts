import { describe, expect, it } from "vitest";
import { buildBuntingGeometry, buildPropGeometries, buildSignChains, lcg } from "./props-geometry";
import { MARKET_STREET } from "./map/market-street";

const BUNTING = MARKET_STREET.bunting;
/** Every prop of the street, the framing ones too. */
const ALL_PROPS = {
  crates: [...MARKET_STREET.worldProps.crates, ...MARKET_STREET.framingProps.crates],
  barrels: [...MARKET_STREET.worldProps.barrels, ...MARKET_STREET.framingProps.barrels],
  produce: MARKET_STREET.worldProps.produce,
  pots: [...MARKET_STREET.worldProps.pots, ...MARKET_STREET.framingProps.pots],
  awnings: [...MARKET_STREET.worldProps.awnings, ...MARKET_STREET.framingProps.awnings],
  planters: MARKET_STREET.worldProps.planters,
};

describe("lcg", () => {
  it("repeats for the same start and stays between 0 and 1", () => {
    const a = lcg(42);
    const b = lcg(42);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("gives different sequences for different starts", () => {
    expect(lcg(1)()).not.toBe(lcg(2)());
  });
});

describe("buildPropGeometries", () => {
  const { wood, plain } = buildPropGeometries(ALL_PROPS);

  it("gives every vertex a position, normal, texture coordinate and colour", () => {
    for (const g of [wood, plain]) {
      const count = g.getAttribute("position").count;
      expect(count).toBeGreaterThan(0);
      for (const name of ["normal", "uv", "color"]) expect(g.getAttribute(name).count, name).toBe(count);
    }
  });

  it("keeps wooden things and everything else apart", () => {
    // Crates and barrels are few and chunky; the fruit, blooms and leaves make the plain mesh bigger.
    expect(wood.getAttribute("position").count).toBeLessThan(plain.getAttribute("position").count);
  });

  it("stands everything on the ground, nothing underneath it", () => {
    for (const g of [wood, plain]) expect(g.boundingBox!.min.y).toBeGreaterThanOrEqual(-1e-6);
  });

  it("builds the same props every time", () => {
    const again = buildPropGeometries(ALL_PROPS);
    expect(Array.from(again.plain.getAttribute("position").array)).toEqual(Array.from(plain.getAttribute("position").array));
    expect(Array.from(again.plain.getAttribute("color").array)).toEqual(Array.from(plain.getAttribute("color").array));
  });

  it("keeps colours in a usable range", () => {
    for (const g of [wood, plain]) {
      for (const v of g.getAttribute("color").array) {
        expect(v).toBeGreaterThanOrEqual(0);
        // Flower blooms are brightened a little to stand in for the look test's glow.
        expect(v).toBeLessThan(1.3);
      }
    }
  });

  it("builds nothing, without failing, when there is nothing to build", () => {
    const empty = buildPropGeometries({ crates: [], barrels: [], produce: [], pots: [], awnings: [], planters: [] });
    expect(empty.wood.getAttribute("position")).toBeUndefined();
    expect(empty.plain.getAttribute("position")).toBeUndefined();
  });
});

describe("buildBuntingGeometry", () => {
  const g = buildBuntingGeometry(BUNTING);

  it("makes one triangle per flag", () => {
    const flags = BUNTING.reduce((sum, s) => sum + s.flags, 0);
    expect(g.getAttribute("position").count).toBe(flags * 3);
    expect(g.getAttribute("color").count).toBe(flags * 3);
  });

  it("hangs lower in the middle of a string than at its ends", () => {
    const one = buildBuntingGeometry([{ from: [0, 2, 0], to: [4, 2, 0], sag: 0.4, flags: 9, size: 0.1 }]);
    const pos = one.getAttribute("position");
    // Flag 0 is near one end, flag 4 is in the middle; the third vertex of each triangle is its tip.
    const tipY = (flag: number) => pos.getY(flag * 3 + 2);
    expect(tipY(4)).toBeLessThan(tipY(0));
    expect(tipY(4)).toBeLessThan(tipY(8));
  });
});

describe("buildSignChains", () => {
  it("makes two thin chains", () => {
    const g = buildSignChains();
    expect(g.getAttribute("position").count).toBe(2 * 36);
  });
});
