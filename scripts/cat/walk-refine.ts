// Builds the review material for the walk: the refined eight-frame sheet, individual frames, looping animations
// (with a ground that scrolls at exactly the walking speed), an original-versus-refined comparison, an interactive
// comparison page, and the foot-slide measurements at slow, normal and fast speed.
// Usage: node scripts/run-ts.mjs scripts/cat/walk-refine.ts [outDir]     (default: docs/phase2/walk)
// It needs docs/phase2/walk/original-sheet-marmalade.png: the sprite sheet as it was before the refinement.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ATLAS_W, CAT_FRAME_H, CAT_FRAME_W, CLIPS, DIRECTIONS, atlasCell, directionHeading, frameIndex } from "../../features/game/cat/clips";
import { buildPalette, DEFAULT_COAT } from "../../features/game/cat/coat";
import { poseFor } from "../../features/game/cat/poses";
import { renderCat } from "../../features/game/cat/render";
import { footDepthScale } from "../../features/game/player/stride";
import { measureSlide } from "../../features/game/player/slide-check";
// @ts-expect-error plain JS helper
import { blit, canvas, decodePng, encodeApng, encodePng, rect } from "../lib/png.mjs";

const outDir = process.argv[2] ?? "docs/phase2/walk";
mkdirSync(path.join(outDir, "frames"), { recursive: true });
type Img = { width: number; height: number; data: Uint8ClampedArray };
const N = CLIPS.walk.frames;
const STRIDE = CLIPS.walk.stridePx ?? 26;
const BG: [number, number, number] = [74, 84, 112];

const original: Img = decodePng(readFileSync(path.join(outDir, "original-sheet-marmalade.png")));
const palette = buildPalette(DEFAULT_COAT);

function frameFromSheet(sheet: Img, d: number, f: number): Img {
  const { col, row } = atlasCell(frameIndex("walk", d, f));
  const data = new Uint8ClampedArray(CAT_FRAME_W * CAT_FRAME_H * 4);
  for (let y = 0; y < CAT_FRAME_H; y++) {
    const src = ((row * CAT_FRAME_H + y) * sheet.width + col * CAT_FRAME_W) * 4;
    data.set(sheet.data.subarray(src, src + CAT_FRAME_W * 4), y * CAT_FRAME_W * 4);
  }
  return { width: CAT_FRAME_W, height: CAT_FRAME_H, data };
}
const refined = (d: number, f: number): Img => {
  const r = renderCat({ pose: poseFor("walk", f), heading: directionHeading(d), coat: DEFAULT_COAT, palette });
  return { width: r.width, height: r.height, data: r.rgba };
};

// 8 frames across, 8 directions down, 1 pixel per sprite pixel, transparent: the sprite sheet of the walk.
function strip(get: (d: number, f: number) => Img): Img {
  const data = new Uint8ClampedArray(CAT_FRAME_W * N * CAT_FRAME_H * 8 * 4);
  const sheet = { width: CAT_FRAME_W * N, height: CAT_FRAME_H * 8, data };
  for (let d = 0; d < 8; d++) {
    for (let f = 0; f < N; f++) {
      const img = get(d, f);
      for (let y = 0; y < CAT_FRAME_H; y++) data.set(img.data.subarray(y * CAT_FRAME_W * 4, (y + 1) * CAT_FRAME_W * 4), ((d * CAT_FRAME_H + y) * sheet.width + f * CAT_FRAME_W) * 4);
    }
  }
  return sheet;
}
const write = (name: string, img: Img) => writeFileSync(path.join(outDir, name), encodePng(img.width, img.height, img.data));
write("refined-walk-sheet.png", strip(refined));
write("original-walk-sheet.png", strip((d, f) => frameFromSheet(original, d, f)));

// Individual frames (transparent, 1:1) for the three views that matter most, and an enlarged preview of the side view.
for (const d of [2, 0, 4]) for (let f = 0; f < N; f++) write(`frames/walk-${DIRECTIONS[d]}-${f + 1}.png`, refined(d, f));
{
  const zoom = 6;
  const c: Img = canvas(CAT_FRAME_W * zoom * 4, CAT_FRAME_H * zoom * 2, BG);
  for (let f = 0; f < N; f++) blit(c, refined(2, f), 0, 0, CAT_FRAME_W, CAT_FRAME_H, (f % 4) * CAT_FRAME_W * zoom, Math.floor(f / 4) * CAT_FRAME_H * zoom, zoom);
  write("frames/preview-E.png", c);
}

// Original above, refined below, for the side view and the two views along the camera's axis.
for (const d of [2, 0, 4]) {
  const zoom = 4;
  const c: Img = canvas(CAT_FRAME_W * zoom * N, CAT_FRAME_H * zoom * 2 + 6, BG);
  for (let f = 0; f < N; f++) {
    blit(c, frameFromSheet(original, d, f), 0, 0, CAT_FRAME_W, CAT_FRAME_H, f * CAT_FRAME_W * zoom, 0, zoom);
    blit(c, refined(d, f), 0, 0, CAT_FRAME_W, CAT_FRAME_H, f * CAT_FRAME_W * zoom, CAT_FRAME_H * zoom + 6, zoom);
  }
  rect(c, 0, CAT_FRAME_H * zoom, c.width, 6, [233, 197, 110]);
  write(`comparison-${DIRECTIONS[d]}.png`, c);
}

// Looping animations: the cat walks over a ground that scrolls by one body step per frame (the speed the game moves it).
function groundFrame(width: number, height: number, zoom: number, offX: number, offY: number): Img {
  const c: Img = canvas(width, height, [58, 66, 94]);
  const size = 12 * zoom;
  for (let y = -2; y < height / size + 2; y++) for (let x = -2; x < width / size + 2; x++) if ((x + y) % 2 === 0) rect(c, Math.round(x * size + (offX * zoom) % size), Math.round(y * size + (offY * zoom) % size), size, size, [72, 82, 114]);
  return c;
}
function loop(d: number, which: "refined" | "both"): Buffer {
  const zoom = 4;
  const panes = which === "both" ? 2 : 1;
  const w = CAT_FRAME_W * zoom * panes;
  const h = CAT_FRAME_H * zoom;
  const heading = directionHeading(d);
  const step = STRIDE / N;
  const frames: Uint8ClampedArray[] = [];
  for (let f = 0; f < N; f++) {
    const c: Img = canvas(w, h, BG);
    // The ground moves opposite to the walk, projected on the screen: sideways at full size, toward the camera foreshortened.
    const gx = -step * Math.sin(heading) * f;
    const gy = step * Math.cos(heading) * footDepthScale() * f;
    for (let p = 0; p < panes; p++) {
      const g = groundFrame(CAT_FRAME_W * zoom, h, zoom, gx, gy);
      blit(c, g, 0, 0, g.width, g.height, p * CAT_FRAME_W * zoom, 0, 1);
      const img = which === "both" && p === 0 ? frameFromSheet(original, d, f) : refined(d, f);
      blit(c, img, 0, 0, CAT_FRAME_W, CAT_FRAME_H, p * CAT_FRAME_W * zoom, 0, zoom);
    }
    frames.push(c.data);
  }
  return encodeApng(w, h, frames, 75);
}
for (const d of [2, 0, 4]) {
  writeFileSync(path.join(outDir, `loop-refined-${DIRECTIONS[d]}.apng`), loop(d, "refined"));
  writeFileSync(path.join(outDir, `loop-original-vs-refined-${DIRECTIONS[d]}.apng`), loop(d, "both"));
}

// Foot sliding, measured through the real step logic at slow, normal and fast speed.
const slide: Record<string, unknown> = {};
for (const share of [0.4, 1, 1.6]) {
  const row: Record<string, unknown> = {};
  for (let d = 0; d < 8; d++) {
    const r = measureSlide({ clip: "walk", direction: d, speedShare: share });
    row[DIRECTIONS[d]] = { maxStrayPx: +r.maxStray.toFixed(2), rmsStrayPx: +r.rmsStray.toFixed(2), stances: r.stances };
  }
  slide[`${share} x walking speed`] = row;
}
writeFileSync(
  path.join(outDir, "foot-slide-report.json"),
  JSON.stringify({ unit: "sprite pixels on the screen; stray = how far a planted paw wanders from the middle of its own stance", bodyStepPerFramePx: +(STRIDE / N).toFixed(2), halfStepPx: +(STRIDE / N / 2).toFixed(2), walk: slide }, null, 2),
);

// An interactive page: both versions side by side at slow, normal and fast speed.
writeFileSync(
  path.join(outDir, "walk-compare.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Catopia walk: original and refined</title>
<style>body{margin:0;background:#1b2138;color:#fffdf5;font:15px/1.45 system-ui,sans-serif}main{max-width:1000px;margin:0 auto;padding:20px 16px 40px}h1{font-size:1.25rem;margin:0 0 4px}p{color:#aab3cf;margin:0 0 12px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}button{font:inherit;background:#262e4c;color:#fffdf5;border:1px solid #3c4770;border-radius:8px;padding:6px 12px;cursor:pointer}button[aria-pressed=true]{background:#e9c56e;color:#2a2418;border-color:#e9c56e}
.stage{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}figure{margin:0;text-align:center}canvas{image-rendering:pixelated;border-radius:8px;max-width:100%}figcaption{color:#aab3cf;margin-top:4px}</style></head><body><main>
<h1>Walk: original and refined</h1><p>The ground scrolls by exactly one body step per frame, the speed the game moves the cat at that gait, so a planted paw should stay on one cobble. Slow, normal and fast change how quickly the cycle plays, which is what the game does when the cat walks at different speeds.</p>
<div class="row" id="speed"></div><div class="row" id="dirs"></div><div class="row"><button id="play" aria-pressed="true">Pause</button><button id="prev">Step back</button><button id="next">Step forward</button><span id="info"></span></div>
<div class="stage"><figure><canvas id="a"></canvas><figcaption>Original</figcaption></figure><figure><canvas id="b"></canvas><figcaption>Refined</figcaption></figure></div>
<script>
const FW=${CAT_FRAME_W},FH=${CAT_FRAME_H},N=${N},STRIDE=${STRIDE},DEPTH=${footDepthScale()},Z=4;
const sheets={a:Object.assign(new Image(),{src:"original-walk-sheet.png"}),b:Object.assign(new Image(),{src:"refined-walk-sheet.png"})};
const speeds=[["Slow",5],["Normal",13],["Fast",24]];let fps=13,dir=2,frame=0,play=true,acc=0,last=0,gx=0,gy=0;
const $=id=>document.getElementById(id);
speeds.forEach(([n,v])=>{const b=document.createElement("button");b.textContent=n+" ("+v+" frames a second)";b.setAttribute("aria-pressed",String(v===fps));b.onclick=()=>{fps=v;[...$("speed").children].forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed","true")};$("speed").append(b)});
${JSON.stringify([...DIRECTIONS])}.forEach((n,i)=>{const b=document.createElement("button");b.textContent=n;b.setAttribute("aria-pressed",String(i===dir));b.onclick=()=>{dir=i;gx=gy=0;[...$("dirs").children].forEach((x,j)=>x.setAttribute("aria-pressed",String(j===i)))};$("dirs").append(b)});
function draw(id){const c=$(id),g=c.getContext("2d");c.width=FW*Z;c.height=FH*Z;g.imageSmoothingEnabled=false;g.fillStyle="#3a425e";g.fillRect(0,0,c.width,c.height);const s=12*Z;g.fillStyle="#485272";
for(let y=-2;y<c.height/s+2;y++)for(let x=-2;x<c.width/s+2;x++)if((x+y)%2===0)g.fillRect(Math.round(x*s+(gx*Z)%s),Math.round(y*s+(gy*Z)%s),s,s);
g.drawImage(sheets[id],frame*FW,dir*FH,FW,FH,0,0,c.width,c.height)}
function tick(t){if(play){acc+=(t-last)/1000*fps;while(acc>=1){acc-=1;advance(1)}}last=t;draw("a");draw("b");requestAnimationFrame(tick)}
function advance(n){frame=(frame+n+N)%N;const h=dir*Math.PI/4,st=STRIDE/N*n;gx-=st*Math.sin(h);gy+=st*Math.cos(h)*DEPTH;$("info").textContent="frame "+(frame+1)+" of "+N}
$("play").onclick=()=>{play=!play;$("play").textContent=play?"Pause":"Play";$("play").setAttribute("aria-pressed",String(play))};$("prev").onclick=()=>{play=false;advance(-1)};$("next").onclick=()=>{play=false;advance(1)};
requestAnimationFrame(tick);
</script></main></body></html>`,
);
void ATLAS_W;
console.log("wrote", outDir);
