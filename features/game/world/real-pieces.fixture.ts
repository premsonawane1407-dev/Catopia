// Test helper: loads the real packed town pieces from public/ the way the browser would.
import { readFileSync } from "node:fs";
import type { BufferGeometry } from "three";
import { parsePackedPieces, type PackedManifest } from "./town-pieces";

export function loadRealPieces(): Map<string, BufferGeometry> {
  const manifest = JSON.parse(readFileSync("public/models/town/pieces.json", "utf8")) as PackedManifest;
  const bin = readFileSync("public/models/town/pieces.bin");
  const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer;
  return parsePackedPieces(manifest, buffer);
}
