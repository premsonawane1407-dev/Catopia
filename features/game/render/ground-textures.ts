// The pixel-art tiles for the ground surfaces other than the cobbles (which are in pixel-textures.ts): the paved
// road, flagstone paving, grass, bare earth and the flower bed. Each is a 128-texel tile drawn in code, seamless,
// as a lit albedo (the colour is what shows), and laid at the same density as the cobbles (42 texels a unit).
import type { DataTexture } from "three";
import { dataTexture, type Setter } from "./pixel-textures";

const SIZE = 128;
type RGB = readonly [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const put = (set: Setter, x: number, y: number, c: RGB) => set(x, y, c[0], c[1], c[2]);

/** A paved road: small cool-grey setts laid in running bond, bevelled, with dark joints. */
export function makeRoadTexture(seed = 31): DataTexture {
  return dataTexture(SIZE, seed, true, (set, rand) => {
    const palette: RGB[] = [[112, 114, 122], [102, 105, 114], [122, 123, 128], [96, 100, 110], [118, 116, 118]];
    const joint: RGB = [58, 58, 66];
    const bw = 16;
    const bh = 10;
    const rows = Math.ceil(SIZE / bh);
    for (let row = 0; row < rows; row++) {
      const offset = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < SIZE / bw + 1; col++) {
        const base = palette[Math.floor(rand() * palette.length)];
        const k = 0.92 + rand() * 0.16;
        for (let y = 0; y < bh; y++) {
          for (let x = 0; x < bw; x++) {
            const px = col * bw + offset + x;
            const py = row * bh + y;
            if (py >= SIZE) continue;
            let c: RGB;
            if (x === 0 || y === 0) c = joint;
            else if (x === 1 || y === 1) c = shade(base, k * 1.14);
            else if (x === bw - 1 || y === bh - 1) c = shade(base, k * 0.82);
            else c = shade(base, k * (0.97 + rand() * 0.06));
            put(set, (px + SIZE) % SIZE, py, c);
          }
        }
      }
    }
  });
}

/** Flagstone paving: big warm stones of uneven size with thin joints, a few cracks and a little moss. */
export function makePavingTexture(seed = 33): DataTexture {
  return dataTexture(SIZE, seed, true, (set, rand) => {
    const palette: RGB[] = [[186, 170, 146], [176, 160, 138], [196, 180, 156], [170, 154, 134], [182, 168, 150]];
    const joint: RGB = [96, 86, 76];
    // A jittered 4 x 4 grid of seeds: each pixel belongs to its nearest seed, joints where two are close.
    const n = 4;
    const cell = SIZE / n;
    const pts = Array.from({ length: n * n }, (_, i) => ({ x: ((i % n) + 0.25 + rand() * 0.5) * cell, y: (Math.floor(i / n) + 0.25 + rand() * 0.5) * cell, tone: palette[Math.floor(rand() * palette.length)], k: 0.94 + rand() * 0.12, moss: rand() < 0.18 }));
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        let f1 = 1e9;
        let f2 = 1e9;
        let best = pts[0];
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const cx = Math.floor(x / cell) + ox;
            const cy = Math.floor(y / cell) + oy;
            const p = pts[(((cy % n) + n) % n) * n + (((cx % n) + n) % n)];
            const dx = x + 0.5 - (p.x + (cx - (((cx % n) + n) % n)) * cell);
            const dy = y + 0.5 - (p.y + (cy - (((cy % n) + n) % n)) * cell);
            const d = Math.hypot(dx, dy);
            if (d < f1) { f2 = f1; f1 = d; best = p; } else if (d < f2) f2 = d;
          }
        }
        const edge = f2 - f1;
        if (edge < 1.2) { put(set, x, y, joint); continue; }
        let c = shade(best.tone, best.k * (edge < 2.4 ? 0.86 : 0.97 + rand() * 0.06));
        if (best.moss && (x * 5 + y * 11) % 7 < 2) c = mix(c, [110, 138, 84], 0.5);
        put(set, x, y, c);
      }
    }
  });
}

/** Grass: layers of green with short light blades and an odd tiny flower. */
export function makeGrassTexture(seed = 35): DataTexture {
  return dataTexture(SIZE, seed, true, (set, rand) => {
    const tones: RGB[] = [[74, 128, 62], [66, 117, 56], [82, 138, 68], [60, 108, 52]];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        // Soft blotches of tone from a coarse random field, so the lawn is not flat.
        const t = tones[((x >> 4) * 7 + (y >> 4) * 13 + ((x * 3 + y * 5) % 9 < 3 ? 1 : 0)) % tones.length];
        put(set, x, y, shade(t, 0.94 + rand() * 0.12));
      }
    }
    // Blades: two-pixel vertical strokes, light on top.
    for (let i = 0; i < 420; i++) {
      const x = Math.floor(rand() * SIZE);
      const y = Math.floor(rand() * SIZE);
      const dark = rand() < 0.4;
      put(set, x, y, dark ? [48, 92, 44] : [128, 180, 90]);
      put(set, x, y + 1, dark ? [40, 80, 38] : [96, 150, 72]);
    }
    const flowers: RGB[] = [[244, 240, 224], [248, 214, 72], [240, 120, 150], [170, 130, 224]];
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rand() * SIZE);
      const y = Math.floor(rand() * SIZE);
      put(set, x, y, flowers[Math.floor(rand() * flowers.length)]);
    }
  });
}

/** Bare earth: dry brown with pebbles, ruts and the odd stalk. */
export function makeDirtTexture(seed = 37): DataTexture {
  return dataTexture(SIZE, seed, true, (set, rand) => {
    const tones: RGB[] = [[138, 106, 76], [126, 96, 68], [148, 116, 84], [118, 90, 64]];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const t = tones[((x >> 3) * 5 + (y >> 3) * 11) % tones.length];
        put(set, x, y, shade(t, 0.93 + rand() * 0.14));
      }
    }
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rand() * SIZE);
      const y = Math.floor(rand() * SIZE);
      const c: RGB = rand() < 0.5 ? [170, 150, 124] : [90, 68, 50];
      put(set, x, y, c);
      if (rand() < 0.5) put(set, x + 1, y, shade(c, 0.85));
    }
  });
}

/** A flower bed: dark soil under dense leaves and blooms in a cottage-garden mix. */
export function makeBedTexture(seed = 39): DataTexture {
  return dataTexture(SIZE, seed, true, (set, rand) => {
    const soil: RGB = [70, 52, 40];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) put(set, x, y, shade(soil, 0.9 + rand() * 0.2));
    const leaves: RGB[] = [[58, 114, 52], [74, 134, 62], [44, 96, 46], [96, 150, 72]];
    for (let i = 0; i < 560; i++) {
      const cx = Math.floor(rand() * SIZE);
      const cy = Math.floor(rand() * SIZE);
      const c = leaves[Math.floor(rand() * leaves.length)];
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) put(set, cx + dx, cy + dy, shade(c, 0.9 + rand() * 0.2));
    }
    const blooms: RGB[] = [[240, 96, 130], [248, 214, 72], [246, 242, 226], [168, 112, 224], [255, 150, 60], [230, 70, 70]];
    for (let i = 0; i < 300; i++) {
      const cx = Math.floor(rand() * SIZE);
      const cy = Math.floor(rand() * SIZE);
      const c = blooms[Math.floor(rand() * blooms.length)];
      put(set, cx, cy, mix(c, [255, 255, 255], 0.12));
      if (rand() < 0.6) put(set, cx + 1, cy, shade(c, 0.9));
      if (rand() < 0.3) put(set, cx, cy + 1, shade(c, 0.82));
    }
  });
}
