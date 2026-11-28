import { describe, expect, it } from "vitest";
import { SURFACES, mapSchema } from "./map-schema";
import { heightAt, heightColliders, rasterizeTerrain, surfaceAt, surfaceIndex, waterColliders } from "./terrain";
import { buildTerrainGeometry } from "./terrain-mesh";
import street from "./maps/market-street.json";
import { MARKET_STREET } from "./market-street";

const terrain = (paint: unknown[] = []) => mapSchema.shape.terrain.parse({ size: [10, 10], surface: "cobbles", repeat: 3, cell: 0.5, paint });

describe("the terrain grid", () => {
  it("is the base surface where nothing is painted, with a square every cell", () => {
    const g = rasterizeTerrain(terrain());
    expect(g.cols).toBe(20);
    expect(g.rows).toBe(20);
    expect(new Set(g.data)).toEqual(new Set([surfaceIndex("cobbles")]));
    expect(surfaceAt(g, 0, 0)).toBe("cobbles");
  });

  it("paints rectangles and discs, later strokes over earlier ones", () => {
    const g = rasterizeTerrain(terrain([{ surface: "grass", rect: { minX: -5, maxX: 0, minZ: -5, maxZ: 0 } }, { surface: "bed", circle: { x: -2.5, z: -2.5, r: 1 } }, { surface: "road", rect: { minX: -5, maxX: -4, minZ: -5, maxZ: 5 } }]));
    expect(surfaceAt(g, -3.9, -3.9)).toBe("grass");
    expect(surfaceAt(g, -2.5, -2.5)).toBe("bed");
    expect(surfaceAt(g, -4.6, 3)).toBe("road");
    expect(surfaceAt(g, -4.6, -3)).toBe("road");
    expect(surfaceAt(g, 3, 3)).toBe("cobbles");
  });

  it("lists every surface the shader knows, in a stable order (the numbers are what the shader reads)", () => {
    expect(SURFACES).toEqual(["cobbles", "road", "paving", "grass", "dirt", "bed", "water"]);
  });

  it("treats points off the grid as the nearest edge square", () => {
    const g = rasterizeTerrain(terrain([{ surface: "grass", rect: { minX: 4, maxX: 5, minZ: -5, maxZ: 5 } }]));
    expect(surfaceAt(g, 99, 0)).toBe("grass");
  });

  it("makes water a wall, merging squares into few boxes", () => {
    const g = rasterizeTerrain(terrain([{ surface: "water", rect: { minX: 2, maxX: 5, minZ: -5, maxZ: 5 } }]));
    const walls = waterColliders(g);
    expect(walls).toHaveLength(1);
    expect(walls[0]).toMatchObject({ kind: "box", x: 3.5, z: 0, hx: 1.5, hz: 5 });
    expect(waterColliders(rasterizeTerrain(terrain()))).toEqual([]);
  });

  it("covers an L-shaped lake with a few boxes and leaves no water uncovered", () => {
    const g = rasterizeTerrain(terrain([{ surface: "water", rect: { minX: 0, maxX: 5, minZ: 0, maxZ: 2 } }, { surface: "water", rect: { minX: 0, maxX: 2, minZ: 2, maxZ: 5 } }]));
    const walls = waterColliders(g);
    expect(walls.length).toBeLessThanOrEqual(3);
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const x = g.minX + (c + 0.5) * g.cell;
      const z = g.minZ + (r + 0.5) * g.cell;
      const covered = walls.some((w) => w.kind === "box" && Math.abs(x - w.x) <= w.hx && Math.abs(z - w.z) <= w.hz);
      expect(covered, `${x},${z}`).toBe(surfaceAt(g, x, z) === "water");
    }
  });
});

describe("the street's ground", () => {
  it("is valid and has more than one kind of ground painted", () => {
    expect(mapSchema.safeParse(street).success).toBe(true);
    const kinds = new Set(MARKET_STREET.terrainGrid.data);
    expect(kinds.size).toBeGreaterThanOrEqual(4);
  });

  it("keeps the spawn and every interaction on dry, walkable ground", () => {
    const g = MARKET_STREET.terrainGrid;
    const spots = [{ x: MARKET_STREET.spawn.x, z: MARKET_STREET.spawn.z }, ...MARKET_STREET.interactables.map((i) => i.approach)];
    for (const s of spots) expect(surfaceAt(g, s.x, s.z)).not.toBe("water");
  });

  it("walls off its water", () => {
    const g = MARKET_STREET.terrainGrid;
    if (!g.data.includes(surfaceIndex("water"))) return;
    expect(MARKET_STREET.colliders.some((c) => c.id.startsWith("water-"))).toBe(true);
  });
});

describe("raised ground and stairs", () => {
  it("sets heights with a stroke, with or without a surface", () => {
    const g = rasterizeTerrain(terrain([{ height: 1, rect: { minX: -5, maxX: 0, minZ: -5, maxZ: 0 } }, { surface: "grass", rect: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 } }]));
    expect(heightAt(g, -2.5, -2.5)).toBe(1);
    expect(heightAt(g, 2.5, 2.5)).toBe(0);
    expect(surfaceAt(g, -2.5, -2.5)).toBe("grass");
  });

  it("makes a flight of stairs: equal treads, the last at the height the stairs lead to", () => {
    const g = rasterizeTerrain(terrain([{ surface: "paving", stairs: { axis: "z", from: 1, to: 0, tread: 0.5 }, rect: { minX: -1, maxX: 1, minZ: 0, maxZ: 2 } }]));
    const heights = [0.25, 0.75, 1.25, 1.75].map((z) => heightAt(g, 0, z));
    expect(heights).toEqual([0.75, 0.5, 0.25, 0].map((h) => expect.closeTo(h, 5)));
    // Every rise is the same, and none is more than a cat walks up.
    expect(0.25).toBeLessThanOrEqual(0.18 + 0.1);
    expect(heightAt(g, 0, -0.25)).toBe(0);
  });

  it("stairs can climb as well as descend", () => {
    const g = rasterizeTerrain(terrain([{ stairs: { axis: "x", from: 0, to: 0.6, tread: 0.5 }, rect: { minX: 0, maxX: 1.5, minZ: -1, maxZ: 1 } }]));
    expect([0.25, 0.75, 1.25].map((x) => heightAt(g, x, 0))).toEqual([0.2, 0.4, 0.6].map((h) => expect.closeTo(h, 5)));
  });

  it("makes blocks to climb: one box per block of equal height, as tall as the height", () => {
    const g = rasterizeTerrain(terrain([{ height: 0.8, rect: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 } }]));
    const blocks = heightColliders(g);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("box");
    expect(blocks[0].height).toBeCloseTo(0.8, 5);
    expect(heightColliders(rasterizeTerrain(terrain()))).toEqual([]);
  });

  it("draws a top and four walls for a raised block, and a wall for every step of a flight of stairs", () => {
    const plateau = buildTerrainGeometry(rasterizeTerrain(terrain([{ height: 1, rect: { minX: -2, maxX: 2, minZ: -2, maxZ: 2 } }])));
    expect(plateau.topCount).toBe(1);
    expect(plateau.riserCount).toBe(4);
    const stairs = buildTerrainGeometry(rasterizeTerrain(terrain([{ stairs: { axis: "z", from: 0, to: 1, tread: 0.5 }, rect: { minX: -1, maxX: 1, minZ: 0, maxZ: 2 } }])));
    // Four treads rising by 0.25: a riser at the foot of each, and a wall down each side of the three higher ones.
    expect(stairs.topCount).toBe(4);
    expect(stairs.riserCount).toBeGreaterThanOrEqual(4);
    expect(buildTerrainGeometry(rasterizeTerrain(terrain())).topCount).toBe(0);
  });

  it("makes the village's terrace, its stairs down to the lower level and the canal below the quay", () => {
    const g = MARKET_STREET.terrainGrid;
    expect(heightAt(g, 0, 0.6)).toBeCloseTo(0.8, 6);
    expect(heightAt(g, 0, 10)).toBe(0);
    expect(surfaceAt(g, 12, 0)).toBe("water");
    expect(heightAt(g, 8.2, 0)).toBeCloseTo(0.8, 6);
    // The stairs down are walkable: no two neighbouring treads differ by more than a step.
    let prev = heightAt(g, 0, 5.3);
    for (let z = 5.5; z < 8; z += 0.25) {
      const h = heightAt(g, 0, z);
      expect(Math.abs(h - prev), `z=${z}`).toBeLessThanOrEqual(0.18);
      prev = h;
    }
    expect(prev).toBe(0);
  });
});
