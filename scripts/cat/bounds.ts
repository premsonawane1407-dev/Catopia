// Prints how close each clip's drawing comes to the edges of its frame (a frame that touches an edge is cut off).
// Usage: node scripts/run-ts.mjs scripts/cat/bounds.ts
import { CAT_FRAME_H, CAT_FRAME_W, CLIPS, CLIP_NAMES, DIRECTIONS, clipDirections, directionHeading } from "../../features/game/cat/clips";
import { DEFAULT_LOOK } from "../../features/game/cat/model";
import { DEFAULT_COAT } from "../../features/game/cat/coat";
import { poseFor } from "../../features/game/cat/poses";
import { renderCat } from "../../features/game/cat/render";

for (const clip of CLIP_NAMES) {
  let minX = 99, maxX = -1, minY = 99, maxY = -1;
  const worst: string[] = [];
  for (let d = 0; d < clipDirections(clip); d++) {
    for (let f = 0; f < CLIPS[clip].frames; f++) {
      const r = renderCat({ pose: poseFor(clip, f, DEFAULT_LOOK), heading: directionHeading(d), coat: DEFAULT_COAT, look: DEFAULT_LOOK });
      for (let y = 0; y < CAT_FRAME_H; y++) for (let x = 0; x < CAT_FRAME_W; x++) {
        if (!r.rgba[(y * CAT_FRAME_W + x) * 4 + 3]) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x === 0 || y === 0 || x === CAT_FRAME_W - 1 || y === CAT_FRAME_H - 1) worst.push(`${DIRECTIONS[d]}${f}`);
      }
    }
  }
  console.log(clip.padEnd(8), `x ${minX}..${maxX} of ${CAT_FRAME_W - 1}`, `y ${minY}..${maxY} of ${CAT_FRAME_H - 1}`, worst.length ? "TOUCHES: " + [...new Set(worst)].slice(0, 10).join(",") : "");
}
