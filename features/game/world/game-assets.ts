// Fetches everything the street needs in three requests (down from ~145 in the Phase 0 lab, where every
// model file carried its own copy of the same texture): the packed model pieces and one colour map. The cat
// is not a file: its sprite sheets are drawn in the browser from its coat settings while the loading screen shows.
import { SRGBColorSpace, TextureLoader, type BufferGeometry, type Texture } from "three";
import { buildAtlas } from "../cat/atlas";
import { createCatTextures, type CatTextures } from "../cat/atlas-textures";
import { DEFAULT_COAT, type CatCoat } from "../cat/coat";
import { DEFAULT_LOOK, type CatLook } from "../cat/model";
import { parsePackedPieces, type PackedManifest } from "./town-pieces";

export const ASSET_URLS = {
  manifest: "/models/town/pieces.json",
  bin: "/models/town/pieces.bin",
  colormap: "/models/town/colormap.png",
} as const;

/** Three files, plus drawing the cat. */
export const ASSET_COUNT = Object.keys(ASSET_URLS).length + 1;

export interface GameAssets {
  pieces: ReadonlyMap<string, BufferGeometry>;
  colormap: Texture;
  cat: CatTextures;
  /** Milliseconds it took to draw the cat's sprite sheets, for the performance notes. */
  catBuildMs: number;
  /** Frees the geometry and textures. Call when the game is torn down. */
  dispose(): void;
}

async function fetchChecked(url: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  return response;
}

export async function loadGameAssets(onProgress?: (done: number, total: number) => void, signal?: AbortSignal, coat: CatCoat = DEFAULT_COAT, look: CatLook = DEFAULT_LOOK): Promise<GameAssets> {
  let done = 0;
  const counted = <T>(promise: Promise<T>): Promise<T> =>
    promise.then((value) => {
      done += 1;
      onProgress?.(done, ASSET_COUNT);
      return value;
    });
  const textures = new TextureLoader();

  const catStart = performance.now();
  const drawCat = buildAtlas(coat, async (drawn, total) => {
    onProgress?.(done + drawn / total, ASSET_COUNT);
    // Let the page breathe between pieces so the loading bar keeps moving.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (signal?.aborted) throw new DOMException("Loading was cancelled", "AbortError");
  }, 12, look).then((atlas) => {
    done += 1;
    onProgress?.(done, ASSET_COUNT);
    return atlas;
  });

  const [manifest, bin, colormap, atlas] = await Promise.all([
    counted(fetchChecked(ASSET_URLS.manifest, signal).then((r) => r.json() as Promise<PackedManifest>)),
    counted(fetchChecked(ASSET_URLS.bin, signal).then((r) => r.arrayBuffer())),
    counted(textures.loadAsync(ASSET_URLS.colormap)),
    drawCat,
  ]);
  const catBuildMs = performance.now() - catStart;
  if (signal?.aborted) throw new DOMException("Loading was cancelled", "AbortError");

  // The packed texture coordinates keep glTF's convention (v runs downward), so the map must not be flipped.
  colormap.flipY = false;
  colormap.colorSpace = SRGBColorSpace;
  const cat = createCatTextures(atlas);

  const pieces = parsePackedPieces(manifest, bin);
  return {
    pieces,
    colormap,
    cat,
    catBuildMs,
    dispose() {
      for (const geometry of pieces.values()) geometry.dispose();
      for (const texture of [colormap, cat.color, cat.normal]) texture.dispose();
    },
  };
}
