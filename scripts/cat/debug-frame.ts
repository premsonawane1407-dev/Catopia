// Draws the cat's neutral pose from chosen headings into one enlarged picture, for looking at while building.
// Usage: node scripts/run-ts.mjs scripts/cat/debug-frame.ts out.png [zoom] [headings like 0,2,1]
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { buildPalette, coatById } from "../../features/game/cat/coat";
import { CAT_FRAME_H, CAT_FRAME_W, directionHeading } from "../../features/game/cat/clips";
import { REST_POSE } from "../../features/game/cat/model";
import { renderCat } from "../../features/game/cat/render";
// @ts-expect-error plain JS helper
import { blit, canvas, encodePng } from "../lib/png.mjs";

const out = process.argv[2] ?? "debug-rest.png";
const zoom = Number(process.argv[3] ?? 4);
const dirs = (process.argv[4] ?? "0,1,2,3,4,5,6,7").split(",").map(Number);
const coat = coatById(process.argv[5]);
const palette = buildPalette(coat);
const cols = Math.min(4, dirs.length);
const rows = Math.ceil(dirs.length / cols);
const sheet = canvas(CAT_FRAME_W * zoom * cols, CAT_FRAME_H * zoom * rows, [74, 84, 112]);
dirs.forEach((d, i) => {
  const f = renderCat({ pose: REST_POSE, heading: directionHeading(d), coat, palette });
  blit(sheet, { width: f.width, data: f.rgba }, 0, 0, f.width, f.height, (i % cols) * CAT_FRAME_W * zoom, Math.floor(i / cols) * CAT_FRAME_H * zoom, zoom);
});
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, encodePng(sheet.width, sheet.height, sheet.data));
console.log("wrote", out);
