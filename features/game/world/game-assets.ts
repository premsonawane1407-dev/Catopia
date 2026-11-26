// Fetches everything the street needs in five requests (down from ~145 in the Phase 0 lab, where every
// model file carried its own copy of the same texture): the packed model pieces, one colour map and the
// cat sprite with its normal map.
import { NearestFilter, NoColorSpace, SRGBColorSpace, TextureLoader, type BufferGeometry, type Texture } from "three";
import { parsePackedPieces, type PackedManifest } from "./town-pieces";

export const ASSET_URLS = {
  manifest: "/models/town/pieces.json",
  bin: "/models/town/pieces.bin",
  colormap: "/models/town/colormap.png",
  catColor: "/sprites/cat/cat-idle.png",
  catNormal: "/sprites/cat/cat-idle-normal.png",
} as const;

export const ASSET_COUNT = Object.keys(ASSET_URLS).length;

export interface GameAssets {
  pieces: ReadonlyMap<string, BufferGeometry>;
  colormap: Texture;
  catColor: Texture;
  catNormal: Texture;
  /** Frees the geometry and textures. Call when the game is torn down. */
  dispose(): void;
}

async function fetchChecked(url: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  return response;
}

export async function loadGameAssets(onProgress?: (done: number, total: number) => void, signal?: AbortSignal): Promise<GameAssets> {
  let done = 0;
  const counted = <T>(promise: Promise<T>): Promise<T> =>
    promise.then((value) => {
      done += 1;
      onProgress?.(done, ASSET_COUNT);
      return value;
    });
  const textures = new TextureLoader();

  const [manifest, bin, colormap, catColor, catNormal] = await Promise.all([
    counted(fetchChecked(ASSET_URLS.manifest, signal).then((r) => r.json() as Promise<PackedManifest>)),
    counted(fetchChecked(ASSET_URLS.bin, signal).then((r) => r.arrayBuffer())),
    counted(textures.loadAsync(ASSET_URLS.colormap)),
    counted(textures.loadAsync(ASSET_URLS.catColor)),
    counted(textures.loadAsync(ASSET_URLS.catNormal)),
  ]);
  if (signal?.aborted) throw new DOMException("Loading was cancelled", "AbortError");

  // The packed texture coordinates keep glTF's convention (v runs downward), so the map must not be flipped.
  colormap.flipY = false;
  colormap.colorSpace = SRGBColorSpace;
  for (const sprite of [catColor, catNormal]) {
    sprite.magFilter = NearestFilter;
    sprite.minFilter = NearestFilter;
    sprite.generateMipmaps = false;
  }
  catColor.colorSpace = SRGBColorSpace;
  catNormal.colorSpace = NoColorSpace;

  const pieces = parsePackedPieces(manifest, bin);
  return {
    pieces,
    colormap,
    catColor,
    catNormal,
    dispose() {
      for (const geometry of pieces.values()) geometry.dispose();
      for (const texture of [colormap, catColor, catNormal]) texture.dispose();
    },
  };
}
