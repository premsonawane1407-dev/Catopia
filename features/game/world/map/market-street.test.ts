// The market street, as the data file describes it and as the loader builds it.
import { describe, expect, it } from "vitest";
import { buildHouse } from "./build-house";
import { MapError, loadMap } from "./load-map";
import { mapSchema } from "./map-schema";
import { MARKET_STREET as M } from "./market-street";
import { heightAt } from "./terrain";
import street from "./maps/market-street.json";
import { CAMERA } from "../stage-constants";

const data = mapSchema.parse(street);
const HOUSES = data.houses;

describe("houses", () => {
  it("describe exactly one letter per column on every floor", () => {
    for (const house of HOUSES) for (const floor of house.floors) expect(floor).toHaveLength(house.cols);
  });

  it("put a corner post at both ends of every floor", () => {
    for (const house of HOUSES) for (const floor of house.floors) {
      expect(floor[0]).toBe("c");
      expect(floor[floor.length - 1]).toBe("c");
    }
  });

  it("turn each facade into a wall, roof and (when asked) chimney", () => {
    const house = HOUSES[0];
    const { placements } = buildHouse(house);
    const roofs = placements.filter((p) => p.piece === house.roof);
    expect(roofs).toHaveLength(house.cols);
    expect(placements.filter((p) => p.piece === "chimney")).toHaveLength(1);
    for (const roof of roofs) expect(roof.position[1]).toBe(house.floors.length);
  });
});

describe("windows", () => {
  it("match the window letters in the facades, one for one", () => {
    const letters = HOUSES.flatMap((h) => h.floors.flatMap((f) => [...f])).filter((k) => "abs".includes(k));
    expect(M.windows).toHaveLength(letters.length);
  });

  it("each sit on a window wall piece in the front row", () => {
    const wallFor: Record<string, string[]> = {
      a: ["wall-window-shutters", "wall-wood-window-shutters"],
      b: ["wall-window-glass", "wall-wood-window-glass"],
      s: ["wall-window-small", "wall-wood-window-small"],
    };
    for (const w of M.windows) {
      const wall = M.placements.find((p) => p.position[0] === w.x && p.position[1] === (w.base ?? 0) + w.level && p.position[2] === w.z - 0.5);
      expect(wall, `window at x=${w.x} level=${w.level}`).toBeDefined();
      expect(wallFor[w.key]).toContain(wall!.piece);
    }
  });

  it("never share a spot", () => {
    const spots = new Set(M.windows.map((w) => `${w.x},${w.level},${w.z}`));
    expect(spots.size).toBe(M.windows.length);
  });

  it("has the watching cat in exactly the window the map names", () => {
    const cats = M.windows.filter((w) => w.cat);
    expect(cats).toHaveLength(1);
    expect(cats[0]).toMatchObject({ x: data.watcher!.x, level: data.watcher!.level, key: data.watcher!.key });
  });
});

describe("street furniture", () => {
  it("puts a lamp post under every lamp head", () => {
    for (const head of M.lamps) {
      const post = M.placements.find((p) => p.piece === "lantern" && p.position[0] === head[0] && p.position[2] === head[2]);
      expect(post, `lamp at ${head}`).toBeDefined();
    }
  });

  it("gives every lamp a halo", () => {
    expect(M.glows.filter((g) => g.kind === "lamp")).toHaveLength(M.lamps.length);
  });

  it("stays on the ground", () => {
    const [w, d] = M.terrain.size;
    for (const p of M.placements) {
      expect(Math.abs(p.position[0])).toBeLessThan(w / 2);
      expect(Math.abs(p.position[2])).toBeLessThan(d / 2);
    }
  });
});

describe("what the street's data says", () => {
  it("is labelled a sample (it is an invented street)", () => {
    expect(M.sample).toBe(true);
  });

  it("has the camera preset the look test approved, read from the data", () => {
    expect({ fov: M.camera.fov, pitch: M.camera.pitch, distance: M.camera.distance, target: M.camera.target }).toEqual(CAMERA);
  });

  it("makes the solid things of the village: every house, the fountain, lamp posts, fences, counters, trees, the canal's wall and the blocks of raised ground", () => {
    const ids = M.colliders.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The far houses are out of reach and left out; the near ones are solid and as tall as a wall.
    const houses = M.colliders.filter((c) => c.id.startsWith("house-"));
    expect(houses.length).toBeGreaterThanOrEqual(6);
    for (const h of houses) expect(h.height).toBeGreaterThan(heightAt(M.terrainGrid, h.x, h.z) + 3);
    expect(M.colliders.filter((c) => c.id.startsWith("lamp-"))).toHaveLength(M.lamps.length);
    expect(M.colliders.some((c) => c.id.startsWith("fountain-round@"))).toBe(true);
    expect(M.colliders.some((c) => c.id.startsWith("water-"))).toBe(true);
    expect(M.colliders.some((c) => c.id.startsWith("ground-"))).toBe(true);
    // The park bench is 0.26 high and stands on the plaza terrace.
    const bench = M.colliders.find((c) => c.id === "stall-bench@-7.4,-1.2");
    expect(bench?.height).toBeCloseTo(heightAt(M.terrainGrid, -6.2, -2) + 0.26, 6);
  });

  it("builds houses in different roof colours", () => {
    const variants = new Set(M.placements.map((p) => p.variant).filter(Boolean));
    expect(variants.has("terracotta")).toBe(true);
    expect(variants.has("slate")).toBe(true);
  });

  it("gives every interaction an approach spot and a facing", () => {
    for (const i of M.interactables) {
      expect(i.approach).toBeDefined();
      expect(i.facing).toBeGreaterThanOrEqual(0);
    }
    expect(M.interactables.map((i) => i.id)).toEqual(["fountain", "bench", "flowers", "notice", "terrace"]);
  });
});

describe("loading a map that is not right", () => {
  const clone = () => structuredClone(street) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const problemsOf = (raw: unknown): string[] => {
    try {
      loadMap(raw);
    } catch (e) {
      expect(e).toBeInstanceOf(MapError);
      return (e as MapError).problems as string[];
    }
    return [];
  };

  it("accepts the street as it is", () => {
    expect(problemsOf(clone())).toEqual([]);
  });

  it("names a field of the wrong kind", () => {
    const m = clone();
    m.camera.fov = "wide";
    expect(problemsOf(m).join("\n")).toMatch(/camera\.fov/);
  });

  it("rejects a field it does not know, so a misspelling cannot pass silently", () => {
    const m = clone();
    m.camra = {};
    expect(problemsOf(m).length).toBeGreaterThan(0);
  });

  it("rejects an unknown model piece and a house row of the wrong length", () => {
    const m = clone();
    m.pieces[0].piece = "castle";
    m.houses[0].floors[0] = "cab";
    const text = problemsOf(m).join("\n");
    expect(text).toMatch(/pieces\.0\.piece/);
    expect(text).toMatch(/one letter per column/);
  });

  it("rejects a spawn point inside a wall", () => {
    const m = clone();
    m.spawn = { x: -3.5, z: -7, direction: 0 };
    expect(problemsOf(m).join("\n")).toMatch(/spawn point is inside/);
  });

  it("rejects a spawn point outside the walkable area", () => {
    const m = clone();
    m.spawn = { x: 30, z: 0, direction: 0 };
    expect(problemsOf(m).join("\n")).toMatch(/outside the walkable area/);
  });

  it("rejects an interaction that cannot be reached, a repeated id and a look with no text", () => {
    const m = clone();
    m.interactables[0].approach = { x: -3.5, z: -7 };
    m.interactables[1].id = "fountain";
    delete m.interactables[2].text;
    const text = problemsOf(m).join("\n");
    expect(text).toMatch(/spot for "fountain" is inside/);
    expect(text).toMatch(/two interactions are called "fountain"/);
    expect(text).toMatch(/"flowers" looks at something but has no text/);
  });

  it("rejects a watcher in a window that does not exist, and a piece off the terrain", () => {
    const m = clone();
    m.watcher = { x: 99, level: 0, key: "a" };
    m.pieces[1].position = [99, 0, 0];
    const text = problemsOf(m).join("\n");
    expect(text).toMatch(/watcher's window does not exist/);
    expect(text).toMatch(/off the terrain/);
  });

  it("reports every problem at once and says which map it was", () => {
    const m = clone();
    m.spawn = { x: 30, z: 0, direction: 9 };
    m.houses[0].floors[0] = "x";
    try {
      loadMap(m);
      throw new Error("should have failed");
    } catch (e) {
      expect(e).toBeInstanceOf(MapError);
      expect((e as MapError).mapId).toBe("market-street");
      expect((e as MapError).message).toContain("not valid");
      expect((e as MapError).problems.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("rides framing objects with the camera: they are split from the street, never solid and never lifted", () => {
    const m = clone();
    m.pieces.push({ piece: "hedge", position: [1, 0, 6], scale: 3.2, layer: "framing" }, { piece: "lantern", position: [2, 0, 6], scale: 2.3, layer: "framing" });
    m.props.crates.push({ position: [3, 0, 6], rotationY: 0, size: 0.7, layer: "framing" });
    m.glows.push({ position: [2, 3.3, 6], size: 2.7, kind: "foreground" });
    const g = loadMap(m);
    expect(g.framingPlacements).toHaveLength(2);
    expect(g.framingPlacements.length + g.worldPlacements.length).toBe(g.placements.length);
    expect(g.framingPlacements.every((p) => p.position[1] === 0)).toBe(true);
    expect(g.framingGlows).toHaveLength(1);
    expect(g.framingGlows[0].position[1]).toBe(3.3);
    expect(g.framingProps.crates).toHaveLength(1);
    expect(g.colliders.some((c) => c.id.startsWith("hedge@1,6") || c.id.startsWith("lantern@2,6"))).toBe(false);
    expect(g.colliders.some((c) => c.id === "crate-" + (m.props.crates.length - 1))).toBe(false);
  });

  it("can have a second, different map: nothing about the street is in code", () => {
    const m = clone();
    m.id = "garden";
    m.houses = [];
    m.pieces = [{ piece: "tree", position: [3, 0, 0] }];
    m.lamps = [];
    m.glows = [];
    m.props = { crates: [], barrels: [], produce: [], pots: [] };
    m.bunting = [];
    m.posters = [];
    delete m.sign;
    delete m.watcher;
    m.interactables = [];
    m.terrain.paint = [];
    const g = loadMap(m);
    expect(g.id).toBe("garden");
    expect(g.colliders.map((c) => c.id)).toEqual(["tree@3,0"]);
    expect(g.windows).toEqual([]);
    expect(g.sign).toBeNull();
  });
});

describe("the bridge, the boat and the round terrace", () => {
  it("has a stone bridge whose roadway is walked a step at a time, between solid parapets", () => {
    expect(M.worldProps.bridges).toHaveLength(1);
    const deck = M.colliders.filter((c) => c.id.startsWith("bridge-0-deck-")).sort((a, b) => a.x - b.x);
    expect(deck.length).toBeGreaterThan(10);
    for (let i = 1; i < deck.length; i++) expect(Math.abs((deck[i].height ?? 0) - (deck[i - 1].height ?? 0))).toBeLessThanOrEqual(0.18);
    // The roadway starts within a step of the quay and rises to a hump in the middle.
    expect(Math.abs((deck[0].height ?? 0) - heightAt(M.terrainGrid, 12.4, 1.2))).toBeLessThanOrEqual(0.18);
    expect(Math.max(...deck.map((c) => c.height ?? 0))).toBeGreaterThan((deck[0].height ?? 0) + 0.2);
    expect(M.colliders.filter((c) => c.id.startsWith("bridge-0-parapet-"))).toHaveLength(2);
  });

  it("leaves the water under the bridge's roadway open to the cat and the rest of the canal a wall", () => {
    const water = M.colliders.filter((c) => c.id.startsWith("water-"));
    const covers = (x: number, z: number) => water.some((w) => w.kind === "box" && Math.abs(x - w.x) <= w.hx && Math.abs(z - w.z) <= w.hz);
    expect(covers(15.25, 1.2)).toBe(false);
    expect(covers(15.25, 4)).toBe(true);
    expect(covers(15.25, -3)).toBe(true);
  });

  it("floats a rowing boat on the water", () => {
    expect(M.worldProps.boats).toHaveLength(1);
    expect(M.worldProps.boats[0].position[1]).toBe(0);
  });

  it("puts the fountain at the centre of the map, with the buildings a long way off and flowers all round it", () => {
    const fountain = M.placements.find((p) => p.piece === "fountain-round")!;
    expect([fountain.position[0], fountain.position[2]]).toEqual([0, 0]);
    // The nearest wall of any house is farther than the flower ring plus a wide apron of cobbles.
    for (const c of M.colliders.filter((x) => x.id.startsWith("house-"))) {
      if (c.kind !== "box") continue;
      const dx = Math.max(0, Math.abs(c.x) - c.hx);
      const dz = Math.max(0, Math.abs(c.z) - c.hz);
      expect(Math.hypot(dx, dz), c.id).toBeGreaterThan(5);
    }
    expect(M.worldProps.flowers.filter((f) => Math.hypot(f.position[0], f.position[2]) < 3.2).length).toBeGreaterThanOrEqual(18);
  });

  it("is round: the terrace is an oval, so its corners fall away and its rim is edged by walls", () => {
    for (const [x, z] of [[13.5, -9], [-13.5, -9], [13.5, 11], [-13.5, 11]]) expect(heightAt(M.terrainGrid, x, z), `${x},${z}`).toBe(0);
    expect(heightAt(M.terrainGrid, 0, 0)).toBeCloseTo(0.8, 6);
    expect(heightAt(M.terrainGrid, 12.6, 1.4)).toBeCloseTo(0.8, 6);
  });

  it("has taller lamps than before, with the light at the top of the post", () => {
    for (const l of M.lamps) expect(l[1]).toBeGreaterThan(1.9);
    const post = M.placements.find((p) => p.piece === "lantern" && Math.abs(p.position[0] - M.lamps[0][0]) < 1e-6)!;
    expect(post.scale).toBeGreaterThanOrEqual(1.3);
  });
});

describe("what makes each house its own", () => {
  it("gives the houses dormers on their roofs, balconies, ivy with roses and shop signs", () => {
    expect(M.worldProps.dormers.length).toBeGreaterThanOrEqual(8);
    expect(M.worldProps.balconies.length).toBeGreaterThanOrEqual(2);
    expect(M.worldProps.ivy.length).toBeGreaterThanOrEqual(8);
    expect(M.signs.map((s) => s.kind)).toContain("cup");
  });

  it("puts each dormer on its roof's slope, above the floor of the house, in the roof's colour", () => {
    for (const d of M.worldProps.dormers) {
      const base = heightAt(M.terrainGrid, d.position[0], d.position[2]);
      expect(d.position[1], `dormer at ${d.position}`).toBeGreaterThan(base + 1.0);
      expect(d.roof).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(M.worldProps.dormers.map((d) => d.roof)).size).toBeGreaterThanOrEqual(2);
  });

  it("makes houses differ: not every house has the same details", () => {
    const sig = data.houses.map((h) => JSON.stringify([h.dormers ?? [], h.balcony ?? null, (h.ivy ?? []).map((v) => v.col)]));
    expect(new Set(sig).size).toBeGreaterThanOrEqual(5);
  });

  it("accepts a house with a balcony, ivy and dormers and refuses a bad one", () => {
    const m = structuredClone(street) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    m.houses[0].balcony = { floor: 9, from: 0, to: 1 };
    expect(mapSchema.safeParse(m).success).toBe(false);
    m.houses[0].balcony = { floor: 1, from: 0, to: 1 };
    m.houses[0].dormers = [0, 3];
    expect(mapSchema.safeParse(m).success).toBe(true);
  });
});

describe("the notice board, the signpost and the bicycle", () => {
  it("are in the street, solid, and the notice board has its interaction", () => {
    expect(M.worldProps.noticeBoards).toHaveLength(1);
    expect(M.worldProps.signposts).toHaveLength(1);
    expect(M.worldProps.bicycles).toHaveLength(1);
    for (const prefix of ["notice-board-", "signpost-", "bicycle-"]) expect(M.colliders.some((c) => c.id.startsWith(prefix)), prefix).toBe(true);
    const notice = M.interactables.find((i) => i.id === "notice")!;
    const board = M.worldProps.noticeBoards[0];
    // The prompt is in front of the board and its spot is clear.
    expect(Math.hypot(notice.x - board.position[0], notice.z - board.position[2])).toBeLessThan(0.5);
    expect(notice.approach.z).toBeGreaterThan(board.position[2] + 0.5);
  });

  it("have flowers along the top of the notice board and a potted plant beside it", () => {
    const board = M.worldProps.noticeBoards[0];
    const base = heightAt(M.terrainGrid, board.position[0], board.position[2]);
    expect(M.worldProps.flowers.some((f) => Math.abs(f.position[0] - board.position[0]) < 0.6 && f.position[1] > base + 1.4)).toBe(true);
    expect(M.worldProps.pots.some((p) => Math.hypot(p.position[0] - board.position[0], p.position[2] - board.position[2]) < 1.5)).toBe(true);
  });
});
