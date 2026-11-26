// Frame strips of chosen clips from one or more headings, enlarged, for looking at while building.
// Usage: node scripts/run-ts.mjs scripts/cat/debug-clips.ts out.png zoom dir[,dir] clip[,clip] [coat]
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { buildPalette, coatById } from "../../features/game/cat/coat";
import { CAT_FRAME_H, CAT_FRAME_W, CLIPS, directionHeading, type ClipName } from "../../features/game/cat/clips";
import { poseFor } from "../../features/game/cat/poses";
import { renderCat } from "../../features/game/cat/render";
// @ts-expect-error plain JS helper
import { blit, canvas, encodePng } from "../lib/png.mjs";

const [out, zoomArg, dirArg, clipArg, coatArg] = process.argv.slice(2);
const zoom = Number(zoomArg ?? 3);
const dirs = (dirArg ?? "2").split(",").map(Number);
const clips = (clipArg ?? "walk").split(",") as ClipName[];
const coat = coatById(coatArg);
const palette = buildPalette(coat);
const rows: { clip: ClipName; dir: number }[] = clips.flatMap((clip) => dirs.map((dir) => ({ clip, dir })));
const maxFrames = Math.max(...rows.map((r) => CLIPS[r.clip].frames));
const cell = CAT_FRAME_W * zoom;
const sheet = canvas(cell * Math.min(maxFrames, 8), CAT_FRAME_H * zoom * rows.length * Math.ceil(maxFrames / 8), [74, 84, 112]);
let y = 0;
for (const row of rows) {
  const n = CLIPS[row.clip].frames;
  for (let f = 0; f < n; f++) {
    const r = renderCat({ pose: poseFor(row.clip, f), heading: directionHeading(row.dir), coat, palette });
    blit(sheet, { width: r.width, data: r.rgba }, 0, 0, r.width, r.height, (f % 8) * cell, y + Math.floor(f / 8) * CAT_FRAME_H * zoom, zoom);
  }
  y += CAT_FRAME_H * zoom * Math.ceil(n / 8);
}
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, encodePng(sheet.width, sheet.height, sheet.data));
console.log("wrote", out);
