// Measures planted-paw drift from what the real game drew: reads the per-frame record the running game posted
// (sprite position, sheet frame, cat position) and works out, for every stance, how far each planted paw strayed
// on the screen. Usage: node scripts/run-ts.mjs scripts/cat/ingame-analysis.ts <folder with series-*.json>
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { frameList } from "../../features/game/cat/atlas";
import { directionHeading } from "../../features/game/cat/clips";
import { LEG_NAMES, type LegName } from "../../features/game/cat/model";
import { poseFor } from "../../features/game/cat/poses";
import { CAMERA } from "../../features/game/world/stage-constants";
import { pawOnScreen } from "../../features/game/player/slide-check";

const dir = path.resolve(process.argv[2] ?? ".");
const byIndex = new Map(frameList().map((f) => [f.index, f]));
const sinP = Math.sin((CAMERA.pitch * Math.PI) / 180);
const report: Record<string, unknown> = {};
for (const file of readdirSync(dir).filter((f) => f.startsWith("series-") && f.endsWith(".json")).sort()) {
  const rows: number[][] = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  const stance: Record<LegName, { x: number; y: number }[] | null> = { FL: null, FR: null, HL: null, HR: null };
  const strays: number[] = [];
  let body = 0;
  const flush = (leg: LegName) => {
    const list = stance[leg];
    if (list && list.length >= 6) {
      const mx = list.reduce((a, p) => a + p.x, 0) / list.length;
      const my = list.reduce((a, p) => a + p.y, 0) / list.length;
      for (const p of list) strays.push(Math.hypot(p.x - mx, p.y - my));
    }
    stance[leg] = null;
  };
  let used = 0;
  for (const [, sheet, sx, sz, cx, cz, , , upp] of rows) {
    const f = byIndex.get(sheet);
    if (!f || (f.clip !== "walk" && f.clip !== "run")) continue;
    used++;
    const pose = poseFor(f.clip, f.frame);
    body = Math.max(body, Math.hypot((sx - cx) / upp, ((sz - cz) * sinP) / upp));
    for (const leg of LEG_NAMES) {
      const p = pawOnScreen(pose, f.direction, leg);
      if (p.planted) (stance[leg] ??= []).push({ x: sx / upp + p.x, y: (sz * sinP) / upp + p.y });
      else flush(leg);
    }
  }
  for (const leg of LEG_NAMES) flush(leg);
  const max = strays.length ? Math.max(...strays) : 0;
  const rms = strays.length ? Math.sqrt(strays.reduce((a, v) => a + v * v, 0) / strays.length) : 0;
  report[file.replace("series-", "").replace(".json", "")] = { samples: used, pawMaxStrayPx: +max.toFixed(2), pawRmsStrayPx: +rms.toFixed(2), pictureOffFromTruePathPx: +body.toFixed(2) };
}
console.log(JSON.stringify(report, null, 2));
writeFileSync(path.join(dir, "ingame-measurements.json"), JSON.stringify({ note: "Measured from the frames the running game drew (dev server, Chromium, 1600x900 buffer): sprite position and sheet frame per rendered frame, planted paws grouped into stances. Units: sprite pixels on the screen (a sprite pixel is 2 screen pixels here).", ...report }, null, 2));
void directionHeading;
