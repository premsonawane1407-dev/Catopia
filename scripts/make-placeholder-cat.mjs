// Generates the placeholder 48x48 pixel-art cat (5 frames: 4-frame idle
// plus a blink) as a PNG strip AND a matching normal-map strip, so the scene lights can shade the
// sprite like a real object. Follows the pixel-art-studio rules: silhouette first, hue-shifted
// 5-tone ramps lit from the top-left (no pillow shading), outline darker than any fill, few
// orphan pixels. Replaced by the real cat generator in Phase 2.
// Usage: node scripts/make-placeholder-cat.mjs public/sprites/cat/cat-idle.png public/sprites/cat/cat-idle-normal.png
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const W = 48;
const H = 48;
const FRAME_COUNT = 5;
const MIRROR = (x) => W - 1 - x;

// Shadows shift toward violet, lights toward yellow.
const FUR = ["#7b3033", "#b04a2c", "#d96f33", "#ee9a4d", "#f6c27a"]; // deep, shade, base, light, highlight
const CREAM = ["#9d7f7a", "#c9a68c", "#f1d9b0", "#fbe8c4", "#fff6e0"];
const C = {
  outFur: "#3b2430",
  outCream: "#4b2f38",
  eyeLight: "#9be26a",
  eyeDark: "#3f8f46",
  eyeRim: "#2a4a2c",
  pupil: "#241624",
  white: "#ffffff",
  nose: "#ee7b83",
  noseHi: "#ffb4b8",
  ear: "#e89a95",
  earDark: "#c9707a",
  mouth: "#5a2a34",
  whisker: "#fff6e0",
};

const hexToRgba = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
};

const L = (() => {
  const v = [-0.55, -0.65, 0.52];
  const m = Math.hypot(...v);
  return v.map((c) => c / m);
})();

function level(s) {
  if (s > 0.8) return 4;
  if (s > 0.55) return 3;
  if (s > 0.1) return 2;
  if (s > -0.3) return 1;
  return 0;
}

const ell = (cx, cy, rx, ry) => ({ kind: "ell", cx, cy, rx, ry });
const tri = (a, b, c) => ({ kind: "tri", a, b, c });
const normR = (s, x, y) => Math.hypot((x - s.cx) / s.rx, (y - s.cy) / s.ry);

function inTri(t, x, y) {
  const s = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const p = [x, y];
  const d1 = s(p, t.a, t.b);
  const d2 = s(p, t.b, t.c);
  const d3 = s(p, t.c, t.a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/** Unit normal of an ellipse "dome" at a point: x right, y DOWN (image space), z toward the viewer. */
function ellNormal(s, x, y) {
  const nx = (x - s.cx) / s.rx;
  const ny = (y - s.cy) / s.ry;
  const nz = Math.sqrt(Math.max(0.06, 1 - nx * nx - ny * ny));
  const m = Math.hypot(nx, ny, nz);
  return [nx / m, ny / m, nz / m];
}
const shadeOf = (n) => n[0] * L[0] + n[1] * L[1] + n[2] * L[2];

const bezier = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

// Frame 4 is the blink; frame 3 twitches the left ear.
const FRAME_CONFIG = [
  { sway: 0.0, headDy: 0, earDy: 0, blink: false },
  { sway: 1.3, headDy: 0, earDy: 0, blink: false },
  { sway: 2.4, headDy: 1, earDy: 0, blink: false },
  { sway: 1.0, headDy: 1, earDy: 1, blink: false },
  { sway: 0.5, headDy: 0, earDy: 0, blink: true },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderFrame(cfg, frameIndex) {
  const rand = mulberry32(1234 + frameIndex * 0 + 7); // same fur texture in every frame, so frames stay stable
  const px = Array.from({ length: H }, () => Array(W).fill(null)); // { ramp, lvl, n } | { color, n }
  const hy = cfg.headDy;

  // ---- tail (behind everything) ----
  const sway = cfg.sway;
  const p0 = [35.3, 43.0];
  const p1 = [45.0, 42.5];
  const p2 = [45.5 - sway * 0.3, 29 + sway * 0.45];
  const p3 = [41.0 - sway * 1.35, 21.3 + sway * 0.6];
  const tailBest = new Map();
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const [cx, cy] = bezier(p0, p1, p2, p3, t);
    const r = 2.9 - 1.3 * t;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const dx = (x + 0.5 - cx) / r;
        const dy = (y + 0.5 - cy) / r;
        const d = Math.hypot(dx, dy);
        if (d > 1) continue;
        const key = y * W + x;
        const prev = tailBest.get(key);
        if (!prev || d < prev.d) tailBest.set(key, { d, dx, dy, t });
      }
    }
  }
  for (const [key, v] of tailBest) {
    const x = key % W;
    const y = Math.floor(key / W);
    const nz = Math.sqrt(Math.max(0.06, 1 - v.dx * v.dx - v.dy * v.dy));
    const m = Math.hypot(v.dx, v.dy, nz);
    const n = [v.dx / m, v.dy / m, nz / m];
    let lvl = level(shadeOf(n));
    const ring = (v.t > 0.18 && v.t < 0.27) || (v.t > 0.4 && v.t < 0.49) || (v.t > 0.62 && v.t < 0.71) || (v.t > 0.84 && v.t < 0.92);
    if (ring) lvl = Math.max(0, lvl - 2);
    if (v.t > 0.95) lvl = 0;
    px[y][x] = { ramp: FUR, lvl, n };
  }

  // ---- body, head and friends ----
  const parts = [
    { z: 1, shape: ell(24, 28.8, 9.3, 9.6), ramp: FUR },
    { z: 1, shape: ell(24, 36.9, 14, 9.5), ramp: FUR },
    { z: 2, shape: ell(17.9, 43.0, 4.7, 3.0), ramp: CREAM },
    { z: 2, shape: ell(30.1, 43.0, 4.7, 3.0), ramp: CREAM },
    { z: 3, shape: ell(24, 17.4 + hy, 13.5, 10.5), ramp: FUR },
    { z: 3, shape: ell(24, 20.1 + hy, 14.4, 7.5), ramp: FUR },
    { z: 3, shape: ell(10.2, 23.2 + hy, 3.2, 2.3), ramp: FUR },
    { z: 3, shape: ell(37.8, 23.2 + hy, 3.2, 2.3), ramp: FUR },
    { z: 3, shape: tri([11.1, 14.7 + hy + cfg.earDy], [11.7, 2.1 + hy + cfg.earDy], [20.7, 9.3 + hy]), ramp: FUR, ear: "L" },
    { z: 3, shape: tri([36.9, 14.7 + hy], [36.3, 2.1 + hy], [27.3, 9.3 + hy]), ramp: FUR, ear: "R" },
  ];
  const chest = ell(24, 33, 5.3, 8.4);
  const muzzle = ell(24, 21.8 + hy, 6, 4);
  const innerEarL = tri([13.4, 12.9 + hy + cfg.earDy], [13.7, 5.85 + hy + cfg.earDy], [18, 10 + hy]);
  const innerEarR = tri([34.6, 12.9 + hy], [34.3, 5.85 + hy], [30, 10 + hy]);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = x + 0.5;
      const sy = y + 0.5;
      let best = null;
      for (const part of parts) {
        let depth;
        if (part.shape.kind === "ell") {
          const r = normR(part.shape, sx, sy);
          if (r > 1) continue;
          depth = r;
        } else {
          if (!inTri(part.shape, sx, sy)) continue;
          depth = 0.5;
        }
        if (!best || part.z > best.part.z || (part.z === best.part.z && depth < best.depth)) best = { part, depth };
      }
      if (!best) continue;
      const { part } = best;
      let ramp = part.ramp;
      let lvl;
      let n;
      if (part.shape.kind === "ell") {
        n = ellNormal(part.shape, sx, sy);
        lvl = level(shadeOf(n));
      } else {
        const left = part.ear === "L";
        n = left ? [-0.35, -0.1, 0.93] : [0.35, -0.1, 0.93];
        lvl = left ? 3 : 2;
        if (inTri(left ? innerEarL : innerEarR, sx, sy)) {
          px[y][x] = { color: left ? C.ear : C.earDark, n: [0, 0, 1] };
          continue;
        }
      }
      if (part.z === 1 && normR(chest, sx, sy) <= 1) {
        ramp = CREAM;
        n = ellNormal(chest, sx, sy);
        lvl = level(shadeOf(n));
      }
      if (part.z === 3 && part.shape.kind === "ell" && normR(muzzle, sx, sy) <= 1) {
        ramp = CREAM;
        n = ellNormal(muzzle, sx, sy);
        lvl = level(shadeOf(n));
      }
      px[y][x] = { ramp, lvl, n };
    }
  }

  // The head casts a short shadow onto the chest below it.
  for (let x = 0; x < W; x++) {
    let last = -1;
    for (let y = 0; y < H; y++) {
      const sx = x + 0.5;
      const sy = y + 0.5;
      if (normR(parts[4].shape, sx, sy) <= 1 || normR(parts[5].shape, sx, sy) <= 1) last = y;
    }
    if (last < 0) continue;
    for (let dy = 1; dy <= 3; dy++) {
      const cell = px[last + dy]?.[x];
      if (cell && cell.ramp && !cell.color && last + dy < 34) cell.lvl = Math.max(0, Math.min(cell.lvl, dy === 1 ? 0 : dy === 2 ? 1 : 2));
    }
  }

  // Fur strands: short vertical 2px streaks that break up flat tones.
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * (H - 2));
    const up = rand() < 0.5;
    for (let k = 0; k < 2; k++) {
      const cell = px[y + k]?.[x];
      if (cell && cell.ramp === FUR) cell.lvl = Math.max(0, Math.min(4, cell.lvl + (up ? 1 : -1)));
    }
  }

  // ---- stripes on fur only ----
  const stripe = (x, y, drop = 2) => {
    const cell = px[y]?.[x];
    if (cell && cell.ramp === FUR) cell.lvl = Math.max(0, cell.lvl - drop);
  };
  const stripeBoth = (x, y, drop) => {
    stripe(x, y, drop);
    stripe(MIRROR(x), y, drop);
  };
  for (let y = 4; y <= 9; y++) {
    stripe(23, y + hy);
    stripe(24, y + hy);
  }
  for (let y = 6; y <= 10; y++) {
    stripeBoth(18, y + hy);
    stripeBoth(19, y + hy);
  }
  for (let y = 9; y <= 12; y++) {
    stripeBoth(14, y + hy);
    stripeBoth(15, y + hy);
  }
  for (const [y, x0, x1] of [[19, 9, 12], [21, 9, 12], [24, 10, 12]]) for (let x = x0; x <= x1; x++) stripeBoth(x, y + hy);
  for (const [y, x0, x1] of [[30, 10, 13], [34, 10, 15], [38, 10, 14], [42, 11, 14]]) for (let x = x0; x <= x1; x++) stripeBoth(x, y);

  // ---- face ----
  const set = (x, y, color, n = [0, 0, 1]) => {
    if (y >= 0 && y < H && x >= 0 && x < W && px[y][x]) px[y][x] = { color, n: px[y][x].n ?? n };
  };
  const eyeRows = {
    left: [
      [C.eyeRim, C.eyeLight, C.eyeLight, C.eyeRim],
      [C.white, C.eyeLight, C.pupil, C.eyeLight],
      [C.eyeLight, C.eyeLight, C.pupil, C.eyeLight],
      [C.eyeDark, C.eyeDark, C.eyeDark, C.eyeDark],
    ],
    right: [
      [C.eyeRim, C.eyeLight, C.eyeLight, C.eyeRim],
      [C.white, C.pupil, C.eyeLight, C.eyeLight],
      [C.eyeLight, C.pupil, C.eyeLight, C.eyeLight],
      [C.eyeDark, C.eyeDark, C.eyeDark, C.eyeDark],
    ],
  };
  if (!cfg.blink) {
    eyeRows.left.forEach((row, j) => row.forEach((color, i) => set(15 + i, 15 + hy + j, color)));
    eyeRows.right.forEach((row, j) => row.forEach((color, i) => set(29 + i, 15 + hy + j, color)));
  } else {
    // Closed eyes: fur over the eye, one dark lid line.
    for (const x0 of [15, 29]) {
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (px[15 + hy + j]?.[x0 + i]) px[15 + hy + j][x0 + i] = { ramp: FUR, lvl: 2, n: px[15 + hy + j][x0 + i].n };
      for (let i = 0; i < 4; i++) set(x0 + i, 17 + hy, C.outFur);
    }
  }
  // Nose, philtrum and a small "w" smile.
  for (const x of [22, 23, 24, 25]) set(x, 20 + hy, C.nose);
  set(22, 20 + hy, C.noseHi);
  set(23, 21 + hy, C.nose);
  set(24, 21 + hy, C.nose);
  set(23, 22 + hy, C.mouth);
  set(24, 22 + hy, C.mouth);
  for (const x of [21, 22, 25, 26]) set(x, 23 + hy, C.mouth);
  set(20, 22 + hy, C.mouth);
  set(27, 22 + hy, C.mouth);
  // Toe lines on the paws.
  for (const x of [16, 19, 28, 31]) set(x, 44, CREAM[1]);

  // ---- resolve to colours (and normals), then add the outline ----
  const colors = Array.from({ length: H }, () => Array(W).fill(null));
  const normals = Array.from({ length: H }, () => Array(W).fill(null));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = px[y][x];
      if (!cell) continue;
      colors[y][x] = cell.color ?? cell.ramp[cell.lvl];
      normals[y][x] = cell.n ?? [0, 0, 1];
    }
  }
  const out = colors.map((row) => row.slice());
  const outNormals = normals.map((row) => row.slice());
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (colors[y][x]) continue;
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      let ox = 0;
      let oy = 0;
      let creamNeighbour = false;
      let touching = false;
      for (const [dx, dy] of dirs) {
        const c = colors[y + dy]?.[x + dx];
        if (c) {
          touching = true;
          ox -= dx;
          oy -= dy;
          if (CREAM.includes(c)) creamNeighbour = true;
        }
      }
      if (!touching) continue;
      out[y][x] = creamNeighbour ? C.outCream : C.outFur;
      const m = Math.hypot(ox, oy, 0.35);
      outNormals[y][x] = [ox / m, oy / m, 0.35 / m];
    }
  }

  // Whiskers go on top, after the outline, so they stay light.
  const whiskers = [[13, 19], [12, 19], [11, 18], [10, 18], [9, 17], [8, 17], [13, 21], [12, 21], [11, 21], [10, 21], [9, 21], [8, 21], [13, 23], [12, 23], [11, 24], [10, 24], [9, 25], [8, 25]];
  for (const [x, y] of whiskers) {
    for (const xx of [x, MIRROR(x)]) {
      out[y + hy][xx] = C.whisker;
      outNormals[y + hy][xx] = [0, 0, 1];
    }
  }
  return { colors: out, normals: outNormals };
}

// ---- PNG encoding (no dependencies) ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---- build the sheets ----
const frames = FRAME_CONFIG.map((cfg, i) => renderFrame(cfg, i));
const sheetW = W * FRAME_COUNT;
const color = Buffer.alloc(sheetW * H * 4);
const normal = Buffer.alloc(sheetW * H * 4);
const used = new Set();
frames.forEach((frame, f) => {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const hex = frame.colors[y][x];
      const o = (y * sheetW + f * W + x) * 4;
      if (!hex) {
        // Transparent pixels keep a flat normal so texture filtering never invents odd directions.
        normal[o] = 128;
        normal[o + 1] = 128;
        normal[o + 2] = 255;
        normal[o + 3] = 0;
        continue;
      }
      used.add(hex);
      const [r, g, b] = hexToRgba(hex);
      color[o] = r;
      color[o + 1] = g;
      color[o + 2] = b;
      color[o + 3] = 255;
      const n = frame.normals[y][x] ?? [0, 0, 1];
      // OpenGL convention: +Y is up, but our image y runs down, so flip it.
      normal[o] = Math.round((n[0] * 0.5 + 0.5) * 255);
      normal[o + 1] = Math.round((-n[1] * 0.5 + 0.5) * 255);
      normal[o + 2] = Math.round((n[2] * 0.5 + 0.5) * 255);
      normal[o + 3] = 255;
    }
  }
});

// Self-check (a stand-in for pixel-art-studio's quality_check.py, which needs Python):
let filled = 0;
let orphans = 0;
frames.forEach((frame) => {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = frame.colors[y][x];
      if (!c) continue;
      filled++;
      let same = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && frame.colors[y + dy]?.[x + dx] === c) same++;
      if (same === 0) orphans++;
    }
  }
});
console.log(`palette colours used: ${used.size}`);
console.log(`filled pixels (all frames): ${filled}, orphan pixels: ${orphans} (${((orphans / filled) * 100).toFixed(1)}%)`);

const [colorPath, normalPath, previewPath] = process.argv.slice(2);
if (!colorPath || !normalPath) throw new Error("Usage: node make-cat-sprite.mjs <color.png> <normal.png> [preview.png]");
for (const p of [colorPath, normalPath]) mkdirSync(path.dirname(p), { recursive: true });
writeFileSync(colorPath, encodePng(sheetW, H, color));
writeFileSync(normalPath, encodePng(sheetW, H, normal));
console.log("wrote", colorPath, "and", normalPath);

if (previewPath) {
  const S = 6;
  const bg = [74, 84, 112];
  const pw = sheetW * S;
  const ph = H * S * 2;
  const big = Buffer.alloc(pw * ph * 4);
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const second = y >= H * S;
      const src = second ? normal : color;
      const sy = Math.floor((second ? y - H * S : y) / S);
      const so = (sy * sheetW + Math.floor(x / S)) * 4;
      const o = (y * pw + x) * 4;
      const a = src[so + 3] / 255;
      big[o] = src[so] * a + bg[0] * (1 - a);
      big[o + 1] = src[so + 1] * a + bg[1] * (1 - a);
      big[o + 2] = src[so + 2] * a + bg[2] * (1 - a);
      big[o + 3] = 255;
    }
  }
  mkdirSync(path.dirname(previewPath), { recursive: true });
  writeFileSync(previewPath, encodePng(pw, ph, big));
  console.log("wrote", previewPath);
}
