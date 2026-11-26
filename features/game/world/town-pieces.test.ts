import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PIECE_NAMES, surfaceFor, surfaceKey } from "./pieces";
import { parsePackedPieces, type PackedManifest } from "./town-pieces";

describe("surfaceFor", () => {
  it("gives timber walls planks and stone walls plaster", () => {
    expect(surfaceFor("wall-wood-door").profile).toBe("woodwall");
    expect(surfaceFor("wall-window-glass").profile).toBe("plaster");
  });

  it("tints the red roof toward terracotta and softens the teal one", () => {
    expect(surfaceFor("roof-high-gable").tint?.[0]).toBeGreaterThan(surfaceFor("roof-high-gable").tint?.[2] ?? 1);
    expect(surfaceFor("roof-gable").profile).toBe("roof");
    expect(surfaceKey("roof-gable")).not.toBe(surfaceKey("roof-high-gable"));
  });

  it("lets pieces with the same surface share a key, so they can be merged", () => {
    expect(surfaceKey("stall-red")).toBe(surfaceKey("fence"));
    expect(surfaceKey("lantern")).toBe(surfaceKey("tree"));
  });

  it("covers every piece name without throwing", () => {
    for (const name of PIECE_NAMES) expect(() => surfaceFor(name)).not.toThrow();
  });
});

describe("parsePackedPieces", () => {
  it("builds geometry from a tiny hand-made buffer", () => {
    // One triangle: 3 vertices, positions then normals then uvs then indices, each section 4-byte aligned.
    const buf = new ArrayBuffer(36 + 36 + 24 + 8);
    new Float32Array(buf, 0, 9).set([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    new Float32Array(buf, 36, 9).set([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    new Float32Array(buf, 72, 6).set([0, 0, 1, 0, 0, 1]);
    new Uint16Array(buf, 96, 3).set([0, 1, 2]);
    const manifest: PackedManifest = {
      version: 1,
      pieces: { tri: { vertexCount: 3, indexCount: 3, positionOffset: 0, normalOffset: 36, uvOffset: 72, indexOffset: 96, min: [0, 0, 0], max: [1, 1, 0] } },
    };
    const g = parsePackedPieces(manifest, buf).get("tri")!;
    expect(g.getAttribute("position").count).toBe(3);
    expect(g.getAttribute("uv").itemSize).toBe(2);
    expect(g.getIndex()!.count).toBe(3);
  });

  it("rejects a manifest that runs past the data, and unknown versions", () => {
    const manifest: PackedManifest = { version: 1, pieces: { bad: { vertexCount: 100, indexCount: 3, positionOffset: 0, normalOffset: 0, uvOffset: 0, indexOffset: 0, min: [0, 0, 0], max: [0, 0, 0] } } };
    expect(() => parsePackedPieces(manifest, new ArrayBuffer(16))).toThrow(/past the end/);
    expect(() => parsePackedPieces({ version: 2, pieces: {} }, new ArrayBuffer(0))).toThrow(/Unsupported/);
  });

  it("parses the real packed file that ships with the game", () => {
    const manifest = JSON.parse(readFileSync("public/models/town/pieces.json", "utf8")) as PackedManifest;
    const bin = readFileSync("public/models/town/pieces.bin");
    const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer;
    const geometries = parsePackedPieces(manifest, buffer);
    expect(geometries.size).toBe(PIECE_NAMES.length);
    for (const name of PIECE_NAMES) expect(geometries.has(name), name).toBe(true);
    const wall = geometries.get("wall")!;
    wall.computeBoundingBox();
    // A wall panel is a thin slab on the +X edge of its cell, one unit high.
    expect(wall.boundingBox!.min.x).toBeCloseTo(0.4, 2);
    expect(wall.boundingBox!.max.y).toBeCloseTo(1, 2);
  });
});
