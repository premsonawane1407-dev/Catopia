import { Vector3, type BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { surfaceKey } from "./pieces";
import { loadRealPieces } from "./real-pieces.fixture";
import { STAGE_PLACEMENTS } from "./stage-data";
import { batchPlacements, placementMatrix, triangleCountOf, type Placement } from "./static-batch";

const pieces = loadRealPieces();

describe("placementMatrix", () => {
  it("scales first, then turns, then moves", () => {
    const m = placementMatrix({ position: [1, 2, 3], rotationY: Math.PI / 2, scale: [2, 1, 1] });
    // One unit along +X is scaled to 2, turned a quarter about Y onto -Z, then moved by (1, 2, 3).
    const p = new Vector3(1, 0, 0).applyMatrix4(m);
    expect(p.x).toBeCloseTo(1, 5);
    expect(p.y).toBeCloseTo(2, 5);
    expect(p.z).toBeCloseTo(1, 5);
  });

  it("treats a single number as a uniform scale", () => {
    const p = new Vector3(1, 1, 1).applyMatrix4(placementMatrix({ position: [0, 0, 0], scale: 0.5 }));
    expect([p.x, p.y, p.z]).toEqual([0.5, 0.5, 0.5]);
  });
});

describe("batchPlacements", () => {
  it("makes one batch per surface, however many pieces share it", () => {
    const placements: Placement[] = [
      { piece: "wall", position: [0, 0, 0] },
      { piece: "wall-door", position: [1, 0, 0] },
      { piece: "wall-wood", position: [2, 0, 0] },
      { piece: "lantern", position: [3, 0, 0] },
      { piece: "tree", position: [4, 0, 0] },
    ];
    const batches = batchPlacements(placements, pieces);
    expect(batches.map((b) => b.key).sort()).toEqual(["none", "plaster", "woodwall"]);
    expect(batches.find((b) => b.key === "plaster")?.pieceCount).toBe(2);
    expect(batches.find((b) => b.key === "none")?.pieceCount).toBe(2);
  });

  it("bakes each placement's transform into the vertices", () => {
    const wall = pieces.get("wall")!;
    wall.computeBoundingBox();
    const own = wall.boundingBox!.clone();
    const [batch] = batchPlacements([{ piece: "wall", position: [3, 0, 5], rotationY: -Math.PI / 2 }], pieces);
    batch.geometry.computeBoundingBox();
    const box = batch.geometry.boundingBox!;
    // A quarter turn by -90 degrees sends the panel's local +X edge to world +Z (x' = -z, z' = x).
    expect(box.min.z).toBeCloseTo(5 + own.min.x, 3);
    expect(box.max.z).toBeCloseTo(5 + own.max.x, 3);
    expect(box.min.x).toBeCloseTo(3 - own.max.z, 3);
    expect(box.max.x).toBeCloseTo(3 - own.min.z, 3);
    expect(box.max.y).toBeCloseTo(own.max.y, 3);
  });

  it("leaves the loaded pieces untouched so they can be placed again", () => {
    const before = Array.from(pieces.get("roof-gable")!.getAttribute("position").array);
    batchPlacements([{ piece: "roof-gable", position: [9, 9, 9], rotationY: 1, scale: [2, 3, 4] }], pieces);
    expect(Array.from(pieces.get("roof-gable")!.getAttribute("position").array)).toEqual(before);
  });

  it("keeps normals unit length under a non-uniform scale", () => {
    const [batch] = batchPlacements([{ piece: "roof-gable", position: [0, 0, 0], rotationY: 0.7, scale: [1, 1.35, 2] }], pieces);
    const n = batch.geometry.getAttribute("normal");
    let worst = 0;
    for (let i = 0; i < n.count; i++) worst = Math.max(worst, Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1));
    expect(worst).toBeLessThan(1e-3);
  });

  it("keeps the attributes the surface material needs", () => {
    const [batch] = batchPlacements([{ piece: "wall", position: [0, 0, 0] }, { piece: "wall-door", position: [1, 0, 0] }], pieces);
    for (const name of ["position", "normal", "uv"]) expect(batch.geometry.getAttribute(name), name).toBeDefined();
    expect(batch.geometry.index).not.toBeNull();
    expect(batch.geometry.boundingSphere).not.toBeNull();
  });

  it("says which piece is missing instead of failing quietly", () => {
    const partial = new Map<string, BufferGeometry>([["wall", pieces.get("wall")!]]);
    expect(() => batchPlacements([{ piece: "lantern", position: [0, 0, 0] }], partial)).toThrow(/"lantern"/);
  });

  it("turns the whole street into a handful of meshes without losing a triangle", () => {
    const batches = batchPlacements(STAGE_PLACEMENTS, pieces);
    const surfaces = new Set(STAGE_PLACEMENTS.map((p) => surfaceKey(p.piece)));
    expect(batches).toHaveLength(surfaces.size);
    expect(batches.length).toBeLessThanOrEqual(10);

    const expected = STAGE_PLACEMENTS.reduce((sum, p) => sum + triangleCountOf(pieces.get(p.piece)!), 0);
    expect(batches.reduce((sum, b) => sum + b.triangleCount, 0)).toBe(expected);
    expect(batches.reduce((sum, b) => sum + b.pieceCount, 0)).toBe(STAGE_PLACEMENTS.length);
  });
});
