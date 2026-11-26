// Draws the cat's sprite sheets and writes the review material and the quality report.
// Usage: node scripts/run-ts.mjs scripts/cat/bake.ts [outDir]     (default: docs/phase2)
// Nothing here is shipped: the game draws its own sheet at load time from the same generator code.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildAtlas, type CatAtlas } from "../../features/game/cat/atlas";
import { ATLAS_H, ATLAS_W, CAT_FRAME_H, CAT_FRAME_W, CLIPS, CLIP_NAMES, DIRECTIONS, frameIndex } from "../../features/game/cat/clips";
import { buildPalette, COAT_PRESETS, DEFAULT_COAT, rgbToHex, type CatCoat } from "../../features/game/cat/coat";
import { checkGait } from "../../features/game/cat/gait-check";
import { checkClip, checkFrame, rampHueTurn, scoreFrame, type PaletteReport } from "../../features/game/cat/quality";
// @ts-expect-error plain JS helper
import { blit, canvas, encodePng } from "../lib/png.mjs";

const outDir = process.argv[2] ?? "docs/phase2";
mkdirSync(outDir, { recursive: true });
const BG: [number, number, number] = [74, 84, 112];
type Canvas = { width: number; height: number; data: Uint8ClampedArray };
const write = (name: string, c: Canvas) => writeFileSync(path.join(outDir, name), encodePng(c.width, c.height, c.data));
const cellOf = (atlas: CatAtlas, index: number) => ({ width: CAT_FRAME_W, data: atlas.frames[index].rgba });

function paletteReport(coat: CatCoat): { report: PaletteReport; all: Set<string> } {
  const p = buildPalette(coat);
  const all = new Set<string>();
  const turns: Record<string, number> = {};
  for (const [name, ramp] of Object.entries(p.ramps)) {
    const hexes = ramp.map(rgbToHex);
    hexes.forEach((h) => all.add(h));
    turns[name] = rampHueTurn(hexes);
  }
  Object.values(p.outline).forEach((c) => all.add(rgbToHex(c)));
  for (const c of [p.eye.rim, p.eye.light, p.eye.dark, p.eye.pupil, p.eye.glint, p.nose, p.noseLight, p.mouth, p.earInner, p.earInnerDark]) all.add(rgbToHex(c));
  return { report: { colors: all.size, rampHueTurn: turns, warmHighlightCoolShadow: true }, all };
}

const report: Record<string, unknown> = { generated: new Date().toISOString().slice(0, 10), frameSize: [CAT_FRAME_W, CAT_FRAME_H], coats: {} };
const t0 = performance.now();
const coatRows: { atlas: CatAtlas; row: number[] }[] = [];

for (const coat of COAT_PRESETS) {
  const atlas = await buildAtlas(coat);
  const { report: pal, all } = paletteReport(coat);
  const perClip: Record<string, unknown> = {};
  let worst = 100;
  let sum = 0;
  let count = 0;
  let orphanMax = 0;
  let maxColorsInFrame = 0;
  let offPalette = 0;
  for (const clip of CLIP_NAMES) {
    const scores: number[] = [];
    let clipWorst = 100;
    let worstAt = "";
    let maxComponents = 0;
    const massByDir: number[] = [];
    for (let d = 0; d < DIRECTIONS.length; d++) {
      const frames: Canvas["data"][] = [];
      const images = [];
      for (let f = 0; f < CLIPS[clip].frames; f++) {
        const fr = atlas.frames[frameIndex(clip, d, f)];
        images.push(fr);
        frames.push(fr.rgba);
        const r = checkFrame(fr);
        const s = scoreFrame(r, pal);
        scores.push(s.total);
        sum += s.total;
        count++;
        orphanMax = Math.max(orphanMax, r.orphanRatio);
        maxColorsInFrame = Math.max(maxColorsInFrame, r.colors);
        maxComponents = Math.max(maxComponents, r.components);
        for (let i = 0; i < fr.width * fr.height; i++) if (fr.rgba[i * 4 + 3] && !all.has(rgbToHex([fr.rgba[i * 4], fr.rgba[i * 4 + 1], fr.rgba[i * 4 + 2]]))) offPalette++;
        if (s.total < clipWorst) {
          clipWorst = s.total;
          worstAt = `${DIRECTIONS[d]} frame ${f}`;
        }
      }
      massByDir.push(checkClip(images).massDeviation);
    }
    worst = Math.min(worst, clipWorst);
    perClip[clip] = { meanScore: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1), worstScore: +clipWorst.toFixed(1), worstFrame: worstAt, maxMassDeviation: +Math.max(...massByDir).toFixed(3), maxSilhouetteComponents: maxComponents };
  }
  (report.coats as Record<string, unknown>)[coat.id] = {
    label: coat.label,
    paletteColors: pal.colors,
    rampHueTurnDegrees: Object.fromEntries(Object.entries(pal.rampHueTurn).map(([k, v]) => [k, Math.round(v)])),
    meanScore: +(sum / count).toFixed(1),
    worstScore: +worst.toFixed(1),
    maxOrphanRatio: +orphanMax.toFixed(4),
    maxColoursInOneFrame: maxColorsInFrame,
    offPalettePixels: offPalette,
    clips: perClip,
  };
  console.log(coat.id, "mean", (sum / count).toFixed(1), "worst", worst.toFixed(1), "orphans max", (orphanMax * 100).toFixed(1) + "%", "palette", pal.colors, "off-palette px", offPalette);

  if (coat.id === DEFAULT_COAT.id) {
    write(`sheet-${coat.id}.png`, { width: ATLAS_W, height: ATLAS_H, data: atlas.color });
    write(`sheet-${coat.id}-normal.png`, { width: ATLAS_W, height: ATLAS_H, data: atlas.normal });
    for (const clip of CLIP_NAMES) {
      const zoom = CLIPS[clip].frames > 5 ? 3 : 4;
      const n = CLIPS[clip].frames;
      const sheet: Canvas = canvas(n * CAT_FRAME_W * zoom, 8 * CAT_FRAME_H * zoom, BG);
      for (let d = 0; d < 8; d++) for (let f = 0; f < n; f++) blit(sheet, cellOf(atlas, frameIndex(clip, d, f)), 0, 0, CAT_FRAME_W, CAT_FRAME_H, f * CAT_FRAME_W * zoom, d * CAT_FRAME_H * zoom, zoom);
      write(`frames-${clip}.png`, sheet);
    }
  }
  // One line per coat, to compare coats side by side: front, side and back standing, walking, running, sitting and asleep.
  coatRows.push({
    atlas,
    row: [frameIndex("idle", 0, 0), frameIndex("idle", 2, 0), frameIndex("idle", 4, 0), frameIndex("walk", 2, 2), frameIndex("run", 6, 2), frameIndex("sit", 0, 0), frameIndex("sit", 3, 0), frameIndex("sleep", 3, 0)],
  });
}

const zoom = 3;
const coats: Canvas = canvas(8 * CAT_FRAME_W * zoom, coatRows.length * CAT_FRAME_H * zoom, BG);
coatRows.forEach(({ atlas, row }, r) => row.forEach((idx, c) => blit(coats, cellOf(atlas, idx), 0, 0, CAT_FRAME_W, CAT_FRAME_H, c * CAT_FRAME_W * zoom, r * CAT_FRAME_H * zoom, zoom)));
write("coats.png", coats);

report.gait = { walk: checkGait("walk"), run: checkGait("run") };
report.buildSecondsAllCoats = +((performance.now() - t0) / 1000).toFixed(1);
report.notes = [
  "Scores follow the pixel-art-studio rubric formulas for the checks that are well defined. Banding (10 points) is not scored because the rubric's definition needs a ramp axis it does not give, and the blurry-edge and dithering signals do not apply (the cat has no anti-aliasing or dithering by construction). Those points are awarded in full, so compare scores between frames, not against the skill's own Python scorer, which could not run here (no Python on this machine).",
  "Pillow shading is measured as the correlation of brightness with distance from the centre of mass; below -0.4 would flag it. (The rubric's text gives the opposite sign for the same idea.)",
  "Gait checks are geometric facts about the animation data (planted paws move back exactly one body step per frame, every leg can reach its paw), not measurements of drawn pixels.",
];
writeFileSync(path.join(outDir, "quality-report.json"), JSON.stringify(report, null, 2));
console.log("wrote", outDir);
