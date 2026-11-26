// Reads the packed town pieces (scripts/build-town-pieces.mjs) into three.js geometry.
import { BufferAttribute, BufferGeometry } from "three";

export interface PackedPiece {
  vertexCount: number;
  indexCount: number;
  positionOffset: number;
  normalOffset: number;
  uvOffset: number;
  indexOffset: number;
  min: [number, number, number];
  max: [number, number, number];
}

export interface PackedManifest {
  version: number;
  pieces: Record<string, PackedPiece>;
}

/** Builds one BufferGeometry per piece from the shared binary buffer. */
export function parsePackedPieces(manifest: PackedManifest, bin: ArrayBuffer): Map<string, BufferGeometry> {
  if (manifest.version !== 1) throw new Error(`Unsupported packed pieces version ${manifest.version}`);
  const geometries = new Map<string, BufferGeometry>();
  for (const [name, p] of Object.entries(manifest.pieces)) {
    const end = Math.max(p.positionOffset + p.vertexCount * 12, p.normalOffset + p.vertexCount * 12, p.uvOffset + p.vertexCount * 8, p.indexOffset + p.indexCount * 2);
    if (end > bin.byteLength) throw new Error(`Packed piece "${name}" runs past the end of the data`);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(bin, p.positionOffset, p.vertexCount * 3), 3));
    g.setAttribute("normal", new BufferAttribute(new Float32Array(bin, p.normalOffset, p.vertexCount * 3), 3));
    g.setAttribute("uv", new BufferAttribute(new Float32Array(bin, p.uvOffset, p.vertexCount * 2), 2));
    g.setIndex(new BufferAttribute(new Uint16Array(bin, p.indexOffset, p.indexCount), 1));
    geometries.set(name, g);
  }
  return geometries;
}
