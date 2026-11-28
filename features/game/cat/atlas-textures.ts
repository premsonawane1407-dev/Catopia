// Turns the drawn sprite sheets into GPU textures and works out which part of the sheet a frame is.
import { DataTexture, NearestFilter, NoColorSpace, RGBAFormat, SRGBColorSpace, UnsignedByteType } from "three";
import type { CatAtlas } from "./atlas";
import { ATLAS_H, ATLAS_W, CAT_FRAME_H, CAT_FRAME_W, atlasCell } from "./clips";

/** Texture rows run bottom to top, the sheet's rows top to bottom, so the rows are turned over once here. */
function flipped(data: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(data.length);
  const row = ATLAS_W * 4;
  for (let y = 0; y < ATLAS_H; y++) out.set(data.subarray(y * row, (y + 1) * row), (ATLAS_H - 1 - y) * row);
  return out;
}

function makeTexture(data: Uint8Array, srgb: boolean): DataTexture {
  const t = new DataTexture(data, ATLAS_W, ATLAS_H, RGBAFormat, UnsignedByteType);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.flipY = false;
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export interface CatTextures {
  color: DataTexture;
  normal: DataTexture;
}

export function createCatTextures(atlas: CatAtlas): CatTextures {
  return { color: makeTexture(flipped(atlas.color), true), normal: makeTexture(flipped(atlas.normal), false) };
}

/** The window onto the sheet (scale and offset in texture coordinates) that shows one frame. */
export function frameWindow(index: number): { repeatX: number; repeatY: number; offsetX: number; offsetY: number } {
  const { col, row } = atlasCell(index);
  return {
    repeatX: CAT_FRAME_W / ATLAS_W,
    repeatY: CAT_FRAME_H / ATLAS_H,
    offsetX: (col * CAT_FRAME_W) / ATLAS_W,
    offsetY: 1 - ((row + 1) * CAT_FRAME_H) / ATLAS_H,
  };
}
