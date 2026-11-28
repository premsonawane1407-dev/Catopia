// Draws the sitting cat in the original and the refined look side by side (the front view enlarged, the five sit frames, and
// the other directions as a sanity check), so the refinement can be judged before it replaces anything.
// Usage: node scripts/run-ts.mjs scripts/cat/sit-compare.ts <outDir> [zoom] [coat]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CAT_FRAME_H, CAT_FRAME_W, CLIPS, directionHeading } from "../../features/game/cat/clips";
import { buildPalette, coatById } from "../../features/game/cat/coat";
import type { CatLook } from "../../features/game/cat/model";
import { poseFor } from "../../features/game/cat/poses";
import { renderCat } from "../../features/game/cat/render";
// @ts-expect-error plain JS helper
import { blit, canvas, encodePng, rect } from "../lib/png.mjs";

const outDir = process.argv[2] ?? "docs/phase2/sit-refine";
const zoom = Number(process.argv[3] ?? 8);
const coat = coatById(process.argv[4]);
const palette = buildPalette(coat);
mkdirSync(outDir, { recursive: true });
const BG: [number, number, number] = [74, 84, 112];
const draw = (clip: "sit" | "idle" | "walk" | "sitDown" | "lieDown" | "sleep", frame: number, dir: number, look: CatLook) => {
  const r = renderCat({ pose: poseFor(clip, frame, look), heading: directionHeading(dir), coat, palette, look });
  return { width: r.width, height: r.height, data: r.rgba };
};
const write = (name: string, c: { width: number; height: number; data: Uint8ClampedArray }) => writeFileSync(path.join(outDir, name), encodePng(c.width, c.height, c.data));

// 1. The front view, original left and refined right, large.
{
  const c = canvas(CAT_FRAME_W * zoom * 2 + 8, CAT_FRAME_H * zoom, BG);
  blit(c, draw("sit", 0, 0, "original"), 0, 0, CAT_FRAME_W, CAT_FRAME_H, 0, 0, zoom);
  blit(c, draw("sit", 0, 0, "refined"), 0, 0, CAT_FRAME_W, CAT_FRAME_H, CAT_FRAME_W * zoom + 8, 0, zoom);
  rect(c, CAT_FRAME_W * zoom, 0, 8, c.height, [233, 197, 110]);
  write("front-original-vs-refined.png", c);
}
// 2. All five sit frames, original on top, refined below.
{
  const z = 4;
  const n = CLIPS.sit.frames;
  const c = canvas(CAT_FRAME_W * z * n, CAT_FRAME_H * z * 2 + 6, BG);
  for (let f = 0; f < n; f++) {
    blit(c, draw("sit", f, 0, "original"), 0, 0, CAT_FRAME_W, CAT_FRAME_H, f * CAT_FRAME_W * z, 0, z);
    blit(c, draw("sit", f, 0, "refined"), 0, 0, CAT_FRAME_W, CAT_FRAME_H, f * CAT_FRAME_W * z, CAT_FRAME_H * z + 6, z);
  }
  rect(c, 0, CAT_FRAME_H * z, c.width, 6, [233, 197, 110]);
  write("sit-frames-original-vs-refined.png", c);
}
// 3. The same cat from every side, sitting, original above, refined below.
{
  const z = 3;
  const c = canvas(CAT_FRAME_W * z * 8, CAT_FRAME_H * z * 2 + 6, BG);
  for (let d = 0; d < 8; d++) {
    blit(c, draw("sit", 0, d, "original"), 0, 0, CAT_FRAME_W, CAT_FRAME_H, d * CAT_FRAME_W * z, 0, z);
    blit(c, draw("sit", 0, d, "refined"), 0, 0, CAT_FRAME_W, CAT_FRAME_H, d * CAT_FRAME_W * z, CAT_FRAME_H * z + 6, z);
  }
  rect(c, 0, CAT_FRAME_H * z, c.width, 6, [233, 197, 110]);
  write("sit-all-directions-original-vs-refined.png", c);
}
// 4. The face in the other poses (the refined face applies to every clip, so the cat stays one character).
{
  const z = 5;
  const shots: ["idle" | "walk" | "sit", number, number][] = [["idle", 0, 0], ["walk", 2, 0], ["idle", 0, 1], ["walk", 2, 2], ["idle", 0, 2]];
  const c = canvas(CAT_FRAME_W * z * shots.length, CAT_FRAME_H * z * 2 + 6, BG);
  shots.forEach(([clip, f, d], i) => {
    blit(c, draw(clip, f, d, "original"), 0, 0, CAT_FRAME_W, CAT_FRAME_H, i * CAT_FRAME_W * z, 0, z);
    blit(c, draw(clip, f, d, "refined"), 0, 0, CAT_FRAME_W, CAT_FRAME_H, i * CAT_FRAME_W * z, CAT_FRAME_H * z + 6, z);
  });
  rect(c, 0, CAT_FRAME_H * z, c.width, 6, [233, 197, 110]);
  write("other-poses-original-vs-refined.png", c);
}
console.log("wrote", outDir);
