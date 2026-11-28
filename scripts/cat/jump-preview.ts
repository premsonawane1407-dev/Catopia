// Builds the review material for the jump: every frame, looping previews of real simulated jumps (a plain jump, onto a
// platform and off again, up onto something tall, and a long leap across a gap), and a table of how high and how far each
// kind of jump goes at each speed. The previews are drawn from the game's own simulation (physics, platforms, landing),
// so what they show is what the game does, from the side with a fixed camera so the heights can be read.
// Usage: node scripts/run-ts.mjs scripts/cat/jump-preview.ts [outDir]     (default: docs/phase2/jump)
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CAT_FRAME_H, CAT_FRAME_W, CAT_ORIGIN_PX, RUN_SPEED_PX, WALK_SPEED_PX, directionHeading, frameIndex } from "../../features/game/cat/clips";
import { buildPalette, DEFAULT_COAT } from "../../features/game/cat/coat";
import { DEFAULT_LOOK } from "../../features/game/cat/model";
import { poseFor } from "../../features/game/cat/poses";
import { renderCat } from "../../features/game/cat/render";
import { KINDS, apexWorld, flightSeconds, type JumpKindId } from "../../features/game/player/air";
import type { Collider } from "../../features/game/player/colliders";
import { createPlayer, stepPlayer, type SimEnv, type SimInput } from "../../features/game/player/player-sim";
// @ts-expect-error plain JS helper
import { blit, canvas, encodeApng, encodePng, rect } from "../lib/png.mjs";

const outDir = process.argv[2] ?? "docs/phase2/jump";
mkdirSync(outDir, { recursive: true });
type Img = { width: number; height: number; data: Uint8ClampedArray };
const write = (name: string, c: Img) => writeFileSync(path.join(outDir, name), encodePng(c.width, c.height, c.data));
const UPP = 0.0155;
const palette = buildPalette(DEFAULT_COAT);
const draw = (frame: number, dir: number): Img => {
  const r = renderCat({ pose: poseFor("jump", frame, DEFAULT_LOOK), heading: directionHeading(dir), coat: DEFAULT_COAT, palette, look: DEFAULT_LOOK });
  return { width: r.width, height: r.height, data: r.rgba };
};
const BG: [number, number, number] = [58, 66, 94];

// ---- 1. every frame, from the side, the front and the back ----
{
  const z = 4;
  const rows = [2, 0, 4];
  const c: Img = canvas(CAT_FRAME_W * z * 10, CAT_FRAME_H * z * rows.length, BG);
  rows.forEach((d, r) => { for (let f = 0; f < 10; f++) blit(c, draw(f, d), 0, 0, CAT_FRAME_W, CAT_FRAME_H, f * CAT_FRAME_W * z, r * CAT_FRAME_H * z, z); });
  write("jump-frames.png", c);
}

// ---- 2. scenarios, run through the real simulation ----
const env = (colliders: Collider[]): SimEnv => ({
  unitsPerPx: UPP,
  motion: true,
  params: { walkSpeed: WALK_SPEED_PX * UPP, runSpeed: RUN_SPEED_PX * UPP, radius: 8 * UPP },
  colliders,
  bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 },
  interactables: [],
});
const base: SimInput = { dt: 1 / 60, move: null, target: null, interact: false };

interface Sample { x: number; lift: number; shadowY: number; frame: number; mode: string; kind: string | null; speed: number }
function simulate(colliders: Collider[], x0: number, script: (i: number) => Partial<SimInput>, steps: number): Sample[] {
  const p = createPlayer(x0, 0, 2);
  const e = env(colliders);
  const out: Sample[] = [];
  for (let i = 0; i < steps; i++) {
    const o = stepPlayer(p, { ...base, ...script(i) }, e);
    out.push({ x: o.x, lift: o.lift, shadowY: o.shadowY, frame: frameIndex(o.clip, o.direction, o.frame), mode: o.mode, kind: o.jumpKind, speed: o.speed });
  }
  return out;
}

/** Draws one scenario from the side: ground, platforms and gaps in world units, the cat in its simulated place. */
function film(name: string, samples: Sample[], platforms: { x0: number; x1: number; h: number }[], gaps: { x0: number; x1: number }[], view: { x0: number; x1: number; top: number }, every = 2): { frames: Uint8ClampedArray[]; w: number; h: number } {
  const z = 3;
  const px = (u: number) => u / UPP;
  const W = Math.ceil(px(view.x1 - view.x0)) + 20;
  const H = Math.ceil(view.top) + 28;
  const groundY = H - 16;
  const frames: Uint8ClampedArray[] = [];
  const cache = new Map<number, Img>();
  samples.forEach((s, i) => {
    if (i % every) return;
    const c: Img = canvas(W * z, H * z, BG);
    // ground
    rect(c, 0, groundY * z, W * z, 16 * z, [72, 82, 114]);
    for (let gx = 0; gx < W; gx += 24) rect(c, gx * z, groundY * z, 12 * z, 2 * z, [86, 98, 132]);
    for (const g of gaps) rect(c, Math.round((10 + px(g.x0 - view.x0)) * z), groundY * z, Math.round(px(g.x1 - g.x0) * z), 16 * z, [24, 28, 46]);
    for (const pl of platforms) {
      const x0 = Math.round((10 + px(pl.x0 - view.x0)) * z);
      const w = Math.round(px(pl.x1 - pl.x0) * z);
      const h = Math.round(px(pl.h) * z * 0.965);
      rect(c, x0, groundY * z - h, w, h, [150, 104, 72]);
      rect(c, x0, groundY * z - h, w, 3 * z, [196, 148, 104]);
    }
    // the shadow on whatever the cat is over
    const sx = Math.round((10 + px(s.x - view.x0)) * z);
    const shadowTop = groundY * z - Math.round(px(s.shadowY) * z * 0.965);
    const spread = 1 - 0.45 * Math.min(1, Math.max(0, px(s.lift - s.shadowY)) / 22);
    rect(c, sx - Math.round(13 * spread * z), shadowTop - z, Math.round(26 * spread * z), 2 * z, [30, 36, 60]);
    // the cat
    let sprite = cache.get(s.frame);
    if (!sprite) {
      // every frame index is a (clip, direction, frame) cell: redraw it from its own pose
      sprite = drawIndex(s.frame);
      cache.set(s.frame, sprite);
    }
    const ox = sx - CAT_ORIGIN_PX[0] * z;
    const oy = groundY * z - Math.round(px(s.lift) * z * 0.965) - CAT_ORIGIN_PX[1] * z;
    blit(c, sprite, 0, 0, CAT_FRAME_W, CAT_FRAME_H, ox, oy, z);
    frames.push(c.data);
  });
  void name;
  return { frames, w: W * z, h: H * z };
}

import { CLIP_NAMES, CLIPS, clipDirections } from "../../features/game/cat/clips";
const lookup = new Map<number, { clip: (typeof CLIP_NAMES)[number]; d: number; f: number }>();
for (const clip of CLIP_NAMES) for (let d = 0; d < clipDirections(clip); d++) for (let f = 0; f < CLIPS[clip].frames; f++) lookup.set(frameIndex(clip, d, f), { clip, d, f });
function drawIndex(index: number): Img {
  const l = lookup.get(index);
  if (!l) throw new Error(`no frame ${index}`);
  const r = renderCat({ pose: poseFor(l.clip, l.f, DEFAULT_LOOK), heading: directionHeading(l.d), coat: DEFAULT_COAT, palette, look: DEFAULT_LOOK });
  return { width: r.width, height: r.height, data: r.rgba };
}

const scenarios: Record<string, { samples: Sample[]; platforms: { x0: number; x1: number; h: number }[]; gaps: { x0: number; x1: number }[]; view: { x0: number; x1: number; top: number } }> = {};
const walkE = { move: { x: 1, z: 0, gait: "walk" as const } };
const runE = { move: { x: 1, z: 0, gait: "run" as const } };

// a. an ordinary jump, standing, then walking
scenarios["standard-jump"] = {
  samples: simulate([], 0, (i) => (i === 20 ? { jump: true } : i > 150 && i < 260 ? walkE : i === 200 ? { jump: true, ...walkE } : {}), 330),
  platforms: [],
  gaps: [],
  view: { x0: -0.3, x1: 2.4, top: 60 },
};
// b. onto a platform (a bench), across it and off the other side
const bench: Collider = { kind: "box", id: "bench", x: 1, z: 0, hx: 0.35, hz: 0.5, height: 0.24 };
scenarios["jump-onto-platform"] = {
  samples: simulate([bench], 0.1, (i) => (i < 30 ? walkE : i === 30 ? { jump: true, ...walkE } : i < 300 ? walkE : {}), 330),
  platforms: [{ x0: 0.65, x1: 1.35, h: 0.24 }],
  gaps: [],
  view: { x0: -0.1, x1: 2.6, top: 60 },
};
// c. up onto something tall (a stack of crates), then down
const stackLow: Collider = { kind: "circle", id: "c1", x: 1.05, z: 0, r: 0.25, height: 0.24 };
const stackHigh: Collider = { kind: "circle", id: "c2", x: 1.05, z: 0, r: 0.15, height: 0.46 };
scenarios["vertical-jump-onto-tall"] = {
  samples: simulate([stackLow, stackHigh], 0.1, (i) => (i < 20 ? walkE : i === 20 ? { jump: true, ...walkE } : i < 220 ? walkE : {}), 280),
  platforms: [{ x0: 0.8, x1: 1.3, h: 0.24 }, { x0: 0.9, x1: 1.2, h: 0.46 }],
  gaps: [],
  view: { x0: -0.1, x1: 2.4, top: 80 },
};
// d. a long leap across a gap
scenarios["long-leap-across-gap"] = {
  samples: simulate([], 0, (i) => (i < 70 ? runE : i === 70 ? { jump: true, ...runE } : i < 200 ? runE : {}), 220),
  platforms: [],
  gaps: [{ x0: 1.55, x1: 2.2 }],
  view: { x0: -0.1, x1: 3.5, top: 60 },
};
// e. a hop over something low
const kerb: Collider = { kind: "box", id: "kerb", x: 1, z: 0, hx: 0.12, hz: 0.5, height: 0.1 };
scenarios["small-hop-onto-kerb"] = {
  samples: simulate([kerb], 0.2, (i) => (i < 25 ? walkE : i === 25 ? { jump: true, ...walkE } : i < 160 ? walkE : {}), 200),
  platforms: [{ x0: 0.88, x1: 1.12, h: 0.1 }],
  gaps: [],
  view: { x0: -0.1, x1: 2.2, top: 50 },
};

const summary: Record<string, unknown> = {};
for (const [name, sc] of Object.entries(scenarios)) {
  const { frames, w, h } = film(name, sc.samples, sc.platforms, sc.gaps, sc.view);
  writeFileSync(path.join(outDir, `${name}.apng`), encodeApng(w, h, frames, 33));
  // A contact sheet of the moments that matter: the frames where the drawn frame changes.
  const picks: number[] = [];
  let last = -1;
  sc.samples.forEach((s, i) => { if (s.mode === "jump" && s.frame !== last) { picks.push(i); last = s.frame; } });
  const z = 3;
  const f0 = film(name, picks.map((i) => sc.samples[i]), sc.platforms, sc.gaps, sc.view, 1);
  const cols = Math.min(5, picks.length);
  const rows = Math.ceil(picks.length / cols);
  const sheet: Img = canvas(f0.w * cols, f0.h * rows, BG);
  f0.frames.forEach((data, k) => blit(sheet, { width: f0.w, height: f0.h, data }, 0, 0, f0.w, f0.h, (k % cols) * f0.w, Math.floor(k / cols) * f0.h, 1));
  void z;
  write(`${name}-moments.png`, sheet);
  const lifts = sc.samples.map((s) => s.lift);
  summary[name] = {
    peakHeightWorld: +Math.max(...lifts).toFixed(3),
    peakHeightPx: +(Math.max(...lifts) / UPP).toFixed(1),
    jumpKinds: [...new Set(sc.samples.map((s) => s.kind).filter(Boolean))],
    framesShown: [...new Set(sc.samples.filter((s) => s.mode === "jump").map((s) => s.frame))].length,
  };
}

// ---- 3. how high and how far each kind goes, at each speed ----
const table: Record<string, Record<string, unknown>> = {};
for (const id of ["hop", "standard", "vertical", "long"] as JumpKindId[]) {
  const row: Record<string, unknown> = { heightPx: KINDS[id].heightPx, heightWorld: +apexWorld(KINDS[id], UPP).toFixed(3), flightSeconds: +flightSeconds(KINDS[id]).toFixed(2) };
  for (const [label, gait] of [["standing", null], ["walking", "walk"], ["running", "run"]] as const) {
    const p = createPlayer(0, 0, 2);
    const e = env([]);
    const move = gait ? { x: 1, z: 0, gait } : null;
    for (let i = 0; i < 60; i++) stepPlayer(p, { ...base, move }, e);
    // Force the kind by choosing it directly: start the jump through the air module the same way the game does.
    p.anim.air.kind = id;
    const x0 = p.motion.x;
    stepPlayer(p, { ...base, move, jump: true }, e);
    p.anim.air.kind = id; // the press chose a kind from the situation; use the one being tabulated
    let top = 0;
    let airTime = 0;
    let impact = 0;
    for (let i = 0; i < 240; i++) {
      const o = stepPlayer(p, { ...base, move: gait && i < 2 ? move : null }, e);
      top = Math.max(top, o.lift);
      if (o.airborne) airTime += 1 / 60;
      impact = Math.max(impact, p.anim.air.impact);
      if (o.mode !== "jump" && i > 10) break;
    }
    row[label] = { distanceWorld: +(p.motion.x - x0).toFixed(2), peakWorld: +top.toFixed(3), airSeconds: +airTime.toFixed(2), landingImpact: +impact.toFixed(2) };
  }
  table[id] = row;
}
writeFileSync(path.join(outDir, "jump-measurements.json"), JSON.stringify({ note: "From the game's own simulation. Heights and distances in world units (one sprite pixel is 0.0155). A jump from standing, walking and running.", scenarios: summary, kinds: table }, null, 2));
console.log(JSON.stringify(summary, null, 1));
console.log(JSON.stringify(table, null, 1));
