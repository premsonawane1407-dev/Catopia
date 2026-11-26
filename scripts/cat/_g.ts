import { buildColliders, INTERACTABLES, WALK_BOUNDS } from "../../features/game/world/greybox";
import { createPlayer, stepPlayer } from "../../features/game/player/player-sim";
const UPP = 0.0155;
const env = { unitsPerPx: UPP, motion: true, params: { walkSpeed: 44 * UPP, runSpeed: 105 * UPP, radius: 8 * UPP }, colliders: buildColliders(), bounds: WALK_BOUNDS, interactables: INTERACTABLES };
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(42);
const p = createPlayer(0, 0.6);
let move: any = null, next = 0, t = 0, still = 0, prev = { x: 0, z: 0 };
for (let i = 0; i < 60 * 300; i++) {
  t += 1 / 60;
  let target: any = null;
  if (t >= next) { const r = rand(); if (r < 0.15) move = null; else if (r < 0.2) { move = null; target = { x: -7.4 + rand() * 14.8, z: -1.5 + rand() * 4.6 }; } else { const a = rand() * Math.PI * 2; move = { x: Math.sin(a), z: Math.cos(a), gait: rand() < 0.4 ? "run" : "walk" }; } next = t + 0.4 + rand() * 2.2; }
  const o = stepPlayer(p, { dt: 1 / 60, move, target, interact: rand() < 0.002 }, env);
  const j = Math.hypot(o.x - prev.x, o.z - prev.z);
  if (move && o.mode !== "sit" && o.mode !== "sleep") { if (j < 0.0005) still += 1 / 60; else { if (still > 2) console.log("stuck", still.toFixed(2), "ended t", t.toFixed(1), "at", o.x.toFixed(3), o.z.toFixed(3), o.mode); still = 0; } } else { if (still > 2) console.log("stuck", still.toFixed(2), "ended t", t.toFixed(1), "at", o.x.toFixed(3), o.z.toFixed(3), o.mode, "move", JSON.stringify(move)); still = 0; }
  prev = o;
}
