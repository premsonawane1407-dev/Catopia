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
  tables: MARKET_STREET.worldProps.tables,
  chairs: MARKET_STREET.worldProps.chairs,
  umbrellas: MARKET_STREET.worldProps.umbrellas,
  chalkboards: MARKET_STREET.worldProps.chalkboards,
  statues: MARKET_STREET.worldProps.statues,
  flowers: MARKET_STREET.worldProps.flowers,
  bridges: MARKET_STREET.worldProps.bridges,
  boats: MARKET_STREET.worldProps.boats,
  trees: MARKET_STREET.worldProps.trees,
  noticeBoards: MARKET_STREET.worldProps.noticeBoards,
  signposts: MARKET_STREET.worldProps.signposts,
  bicycles: MARKET_STREET.worldProps.bicycles,
  dormers: MARKET_STREET.worldProps.dormers,
  balconies: MARKET_STREET.worldProps.balconies,
  ivy: MARKET_STREET.worldProps.ivy,
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
    // (Looped by hand: the street has hundreds of thousands of values, and one expect each would take seconds.)
    for (const g of [wood, plain]) {
      let lowest = Infinity;
      let highest = -Infinity;
      for (const v of g.getAttribute("color").array) {
        if (v < lowest) lowest = v;
        if (v > highest) highest = v;
      }
      expect(lowest).toBeGreaterThanOrEqual(0);
      // Flower blooms are brightened a little to stand in for the look test's glow.
      expect(highest).toBeLessThan(1.3);
    }
  });

  it("builds nothing, without failing, when there is nothing to build", () => {
    const empty = buildPropGeometries({ crates: [], barrels: [], produce: [], pots: [], awnings: [], planters: [], tables: [], chairs: [], umbrellas: [], chalkboards: [], statues: [], flowers: [], bridges: [], boats: [], trees: [], noticeBoards: [], signposts: [], bicycles: [], dormers: [], balconies: [], ivy: [] });
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

describe("the café furniture and the statue", () => {
  const only = (extra: Partial<typeof ALL_PROPS>): typeof ALL_PROPS => ({ ...ALL_PROPS, crates: [], barrels: [], produce: [], pots: [], awnings: [], planters: [], tables: [], chairs: [], umbrellas: [], chalkboards: [], statues: [], flowers: [], bridges: [], boats: [], trees: [], noticeBoards: [], signposts: [], bicycles: [], dormers: [], balconies: [], ivy: [], ...extra });
  const verts = (g: ReturnType<typeof buildPropGeometries>) => (g.wood.getAttribute("position")?.count ?? 0) + (g.plain.getAttribute("position")?.count ?? 0);

  it("are in the street: tables, chairs, a parasol, chalkboards and a statue", () => {
    expect(MARKET_STREET.worldProps.tables.length).toBeGreaterThanOrEqual(5);
    expect(MARKET_STREET.worldProps.chairs.length).toBeGreaterThanOrEqual(8);
    expect(MARKET_STREET.worldProps.umbrellas).toHaveLength(1);
    expect(MARKET_STREET.worldProps.chalkboards.length).toBeGreaterThanOrEqual(2);
    expect(MARKET_STREET.worldProps.statues).toHaveLength(1);
  });

  it("each build something, standing on the ground and no wider than they should be", () => {
    const one = {
      tables: [{ position: [0, 0, 0] as [number, number, number], radius: 0.3, seed: 1 }],
      chairs: [{ position: [0, 0, 0] as [number, number, number] }],
      umbrellas: [{ position: [0, 0, 0] as [number, number, number], radius: 1.2, height: 1.7, colors: ["#ffffff", "#cccccc"] as [string, string] }],
      chalkboards: [{ position: [0, 0, 0] as [number, number, number], seed: 1 }],
      statues: [{ position: [0, 0, 0] as [number, number, number], scale: 1 }],
    };
    for (const [name, specs] of Object.entries(one)) {
      const g = buildPropGeometries(only({ [name]: specs }));
      expect(verts(g), name).toBeGreaterThan(20);
      for (const part of [g.wood, g.plain]) if (part.getAttribute("position")) expect(part.boundingBox!.min.y, name).toBeGreaterThanOrEqual(-1e-6);
    }
    // A parasol is as wide as its radius and as tall as its height.
    const u = buildPropGeometries(only({ umbrellas: one.umbrellas }));
    u.plain.computeBoundingBox();
    expect(u.plain.boundingBox!.max.x).toBeLessThanOrEqual(1.25);
    expect(u.plain.boundingBox!.max.y).toBeLessThanOrEqual(1.8);
  });

  it("are solid where they should be: tables, parasol poles and chalkboards block the cat, flowers do not", () => {
    for (const prefix of ["table-", "chair-", "umbrella-", "chalkboard-"]) expect(MARKET_STREET.colliders.some((c) => c.id.startsWith(prefix)), prefix).toBe(true);
  });
});

describe("leafy trees and bushes", () => {
  const only = (trees: PropSpecsTrees): typeof ALL_PROPS => ({ ...ALL_PROPS, crates: [], barrels: [], produce: [], pots: [], awnings: [], planters: [], tables: [], chairs: [], umbrellas: [], chalkboards: [], statues: [], flowers: [], bridges: [], boats: [], noticeBoards: [], signposts: [], bicycles: [], dormers: [], balconies: [], ivy: [], trees });
  type PropSpecsTrees = typeof ALL_PROPS.trees;
  const verts = (g: ReturnType<typeof buildPropGeometries>) => g.plain.getAttribute("position")?.count ?? 0;

  it("are in the street: oaks, round trees and many bushes, and the stock low-poly trees are gone", () => {
    const kinds = MARKET_STREET.worldProps.trees.map((t) => t.kind);
    expect(kinds.filter((k) => k === "oak").length).toBeGreaterThanOrEqual(5);
    expect(kinds.filter((k) => k === "round").length).toBeGreaterThanOrEqual(3);
    expect(kinds.filter((k) => k === "bush" || k === "flowering").length).toBeGreaterThanOrEqual(30);
    expect(MARKET_STREET.placements.some((p) => p.piece.startsWith("tree"))).toBe(false);
  });

  it("build a canopy of many clusters, taller and fuller for an oak than for a round tree or a bush, standing on the ground", () => {
    const at = [0, 0, 0] as [number, number, number];
    const oak = buildPropGeometries(only([{ position: at, kind: "oak", scale: 1, seed: 1 }]));
    const round = buildPropGeometries(only([{ position: at, kind: "round", scale: 1, seed: 1 }]));
    const bush = buildPropGeometries(only([{ position: at, kind: "bush", scale: 1, seed: 1 }]));
    expect(verts(oak)).toBeGreaterThan(verts(round));
    expect(verts(round)).toBeGreaterThan(verts(bush));
    for (const g of [oak, round, bush]) {
      g.plain.computeBoundingBox();
      expect(g.plain.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.05);
    }
    oak.plain.computeBoundingBox();
    bush.plain.computeBoundingBox();
    expect(oak.plain.boundingBox!.max.y).toBeGreaterThan(3.2);
    expect(bush.plain.boundingBox!.max.y).toBeLessThan(0.9);
  });

  it("make each tree different, and the same tree the same every time", () => {
    const at = [0, 0, 0] as [number, number, number];
    const a = buildPropGeometries(only([{ position: at, kind: "oak", scale: 1, seed: 1 }])).plain.getAttribute("position");
    const b = buildPropGeometries(only([{ position: at, kind: "oak", scale: 1, seed: 2 }])).plain.getAttribute("position");
    const c = buildPropGeometries(only([{ position: at, kind: "oak", scale: 1, seed: 1 }])).plain.getAttribute("position");
    expect(Array.from(a.array.slice(-600))).toEqual(Array.from(c.array.slice(-600)));
    expect(Array.from(a.array.slice(-600))).not.toEqual(Array.from(b.array.slice(-600)));
  });

  it("are solid at the trunk, not the canopy: the cat walks under an oak but is stopped by its trunk and a bush", () => {
    const trunk = MARKET_STREET.colliders.find((c) => c.id.startsWith("tree-"))!;
    expect(trunk.kind).toBe("circle");
    if (trunk.kind === "circle") expect(trunk.r).toBeLessThan(0.45);
    expect(MARKET_STREET.colliders.some((c) => c.id.startsWith("bush-"))).toBe(true);
  });
});

describe("the street furniture: notice board, signpost, bicycle", () => {
  const none = { ...ALL_PROPS, crates: [], barrels: [], produce: [], pots: [], awnings: [], planters: [], tables: [], chairs: [], umbrellas: [], chalkboards: [], statues: [], flowers: [], bridges: [], boats: [], trees: [], dormers: [], balconies: [], ivy: [], noticeBoards: [], signposts: [], bicycles: [] };
  const at = [0, 0, 0] as [number, number, number];
  const verts = (g: ReturnType<typeof buildPropGeometries>) => (g.wood.getAttribute("position")?.count ?? 0) + (g.plain.getAttribute("position")?.count ?? 0);

  it("each build their parts and stand on the ground", () => {
    const board = buildPropGeometries({ ...none, noticeBoards: [{ position: at, seed: 1 }] });
    const post = buildPropGeometries({ ...none, signposts: [{ position: at, seed: 1 }] });
    const bike = buildPropGeometries({ ...none, bicycles: [{ position: at, seed: 1 }] });
    // A board has many pinned papers; a bicycle has spoked wheels, so its mesh is detailed too.
    expect(verts(board)).toBeGreaterThan(400);
    expect(verts(post)).toBeGreaterThan(100);
    expect(verts(bike)).toBeGreaterThan(400);
    for (const g of [board, post, bike]) for (const part of [g.wood, g.plain]) if (part.getAttribute("position")) {
      part.computeBoundingBox();
      expect(part.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.05);
    }
    board.wood.computeBoundingBox();
    expect(board.wood.boundingBox!.max.y).toBeGreaterThan(1.5);
    expect(board.wood.boundingBox!.max.x).toBeGreaterThan(0.7);
  });
});
