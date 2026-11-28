// Draws every frame of every clip in every direction and packs them into one colour sheet and one normal
// sheet. The game builds this once when it loads (a coat is only settings, so there are no image files to
// fetch), and the review scripts build the same sheets to look at and to check.
import { ATLAS_COLS, ATLAS_H, ATLAS_W, CAT_FRAME_H, CAT_FRAME_W, CLIPS, CLIP_NAMES, TOTAL_FRAMES, atlasCell, clipDirections, directionHeading, frameIndex, type ClipName } from "./clips";
import { buildPalette, type CatCoat } from "./coat";
import type { CatLook } from "./model";
import { poseFor } from "./poses";
import { renderCat, type RenderedFrame } from "./render";

export interface CatAtlas {
  width: number;
  height: number;
  /** RGBA colour sheet. */
  color: Uint8ClampedArray;
  /** RGBA normal-map sheet. */
  normal: Uint8ClampedArray;
  /** Every frame as drawn, in sheet order, kept for checks and review sheets. */
  frames: RenderedFrame[];
}

export function copyFrameInto(atlas: { color: Uint8ClampedArray; normal: Uint8ClampedArray }, frame: RenderedFrame, index: number): void {
  const { col, row } = atlasCell(index);
  for (let y = 0; y < CAT_FRAME_H; y++) {
    const src = y * CAT_FRAME_W * 4;
    const dst = ((row * CAT_FRAME_H + y) * ATLAS_W + col * CAT_FRAME_W) * 4;
    atlas.color.set(frame.rgba.subarray(src, src + CAT_FRAME_W * 4), dst);
    atlas.normal.set(frame.normal.subarray(src, src + CAT_FRAME_W * 4), dst);
  }
}

/** Every (clip, direction, frame) in sheet order. */
export function frameList(): { clip: ClipName; direction: number; frame: number; index: number }[] {
  const list: { clip: ClipName; direction: number; frame: number; index: number }[] = [];
  for (const clip of CLIP_NAMES) for (let direction = 0; direction < clipDirections(clip); direction++) for (let frame = 0; frame < CLIPS[clip].frames; frame++) list.push({ clip, direction, frame, index: frameIndex(clip, direction, frame) });
  return list;
}

export function emptyAtlas(): CatAtlas {
  const normal = new Uint8ClampedArray(ATLAS_W * ATLAS_H * 4);
  for (let i = 0; i < ATLAS_W * ATLAS_H; i++) normal.set([128, 128, 255, 0], i * 4);
  return { width: ATLAS_W, height: ATLAS_H, color: new Uint8ClampedArray(ATLAS_W * ATLAS_H * 4), normal, frames: new Array<RenderedFrame>(TOTAL_FRAMES) };
}

/**
 * Builds the whole sheet. `onProgress` is called after every `chunk` frames and may return a promise (to let the
 * page breathe between pieces), so a long build never freezes the loading screen.
 */
export async function buildAtlas(coat: CatCoat, onProgress?: (done: number, total: number) => void | Promise<void>, chunk = 12, look: CatLook = "original"): Promise<CatAtlas> {
  const palette = buildPalette(coat);
  const atlas = emptyAtlas();
  const list = frameList();
  let done = 0;
  for (const item of list) {
    const frame = renderCat({ pose: poseFor(item.clip, item.frame, look), heading: directionHeading(item.direction), coat, palette, look });
    atlas.frames[item.index] = frame;
    copyFrameInto(atlas, frame, item.index);
    done++;
    if (onProgress && done % chunk === 0) await onProgress(done, list.length);
  }
  await onProgress?.(list.length, list.length);
  return atlas;
}

export { ATLAS_COLS };
