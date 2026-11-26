// Procedurally generated pixel-art textures (no image files), approved in the Phase 0 look test.
// The scenery gets these "detail" maps so flat Kenney colours read as brick, plaster, timber and
// roof tile, with a texel size close to one cat-sprite pixel (the HD-2D look: pixel-art surfaces
// under smooth lighting and blur).
import {
  CanvasTexture,
  DataTexture,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";
import { haloAlpha, poolAlpha } from "./window-light-shapes";

export const TILE_PX = 64;
/** World units per texel is 1 / TEXELS_PER_UNIT: about one cat-sprite pixel at the default camera. */
export const TEXELS_PER_UNIT = 42;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Setter = (x: number, y: number, r: number, g: number, b: number) => void;

function dataTexture(size: number, seed: number, srgb: boolean, paint: (set: Setter, rand: () => number) => void): DataTexture {
  const data = new Uint8ClampedArray(size * size * 4);
  // Drawn y-down; DataTexture rows start at the bottom, so flip while writing.
  const set: Setter = (x, y, r, g, b) => {
    const xx = ((Math.floor(x) % size) + size) % size;
    const yy = size - 1 - (((Math.floor(y) % size) + size) % size);
    const i = (yy * size + xx) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  paint(set, mulberry32(seed));
  const t = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Rows of staggered bricks. Detail maps are multipliers: mid-grey (about 128) leaves a surface unchanged. */
export function makeBrickDetail(seed = 5): DataTexture {
  return dataTexture(TILE_PX, seed, false, (set, rand) => {
    const bw = 16;
    const bh = 8;
    for (let row = 0; row < TILE_PX / bh; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = 0; col < TILE_PX / bw; col++) {
        const tone = 124 + Math.floor((rand() - 0.5) * 38);
        const warm = Math.floor((rand() - 0.5) * 14);
        for (let y = 0; y < bh; y++) {
          for (let x = 0; x < bw; x++) {
            let r = tone + warm + 8;
            let g = tone;
            let b = tone - warm - 10;
            if (y === bh - 1 || x === bw - 1) {
              r = g = b = 76;
            } else {
              if (y === 0) { r += 16; g += 16; b += 16; }
              if (y === bh - 2) { r -= 14; g -= 14; b -= 14; }
              if (x === 0) { r += 8; g += 8; b += 8; }
              if (rand() < 0.07) {
                const d = (rand() - 0.5) * 28;
                r += d; g += d; b += d;
              }
            }
            set(col * bw + off + x, row * bh + y, r, g, b);
          }
        }
      }
    }
  });
}

/** Irregular rectangular stone blocks, for plinths and stone work. */
export function makeStoneDetail(seed = 9): DataTexture {
  return dataTexture(TILE_PX, seed, false, (set, rand) => {
    const heights = [12, 14, 10, 16, 12];
    let y0 = 0;
    for (const h of heights) {
      const w1 = 16 + Math.floor(rand() * 10);
      const w2 = 16 + Math.floor(rand() * 10);
      const widths = [w1, w2, TILE_PX - w1 - w2];
      let x0 = Math.floor(rand() * 8);
      for (const w of widths) {
        const tone = 122 + Math.floor((rand() - 0.5) * 30);
        const cool = Math.floor((rand() - 0.5) * 10);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let r = tone;
            let g = tone;
            let b = tone + cool;
            if (y === h - 1 || x === w - 1) {
              r = g = b = 70;
            } else {
              if (y === 0 || x === 0) { r += 14; g += 14; b += 14; }
              if (y === h - 2 || x === w - 2) { r -= 14; g -= 14; b -= 14; }
              if (rand() < 0.1) {
                const d = (rand() - 0.5) * 22;
                r += d; g += d; b += d;
              }
            }
            set(x0 + x, y0 + y, r, g, b);
          }
        }
        x0 += w;
      }
      y0 += h;
    }
  });
}

/** Stucco: fine speckle, a few hairline cracks and faint weathering streaks. */
export function makePlasterDetail(seed = 3): DataTexture {
  return dataTexture(TILE_PX, seed, false, (set, rand) => {
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        let v = 128;
        if (rand() < 0.14) v += (rand() - 0.5) * 22;
        set(x, y, v + 2, v, v - 2);
      }
    }
    // Soft 2x2 blotches.
    for (let i = 0; i < 26; i++) {
      const bx = Math.floor(rand() * TILE_PX);
      const by = Math.floor(rand() * TILE_PX);
      const d = (rand() - 0.5) * 18;
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) set(bx + x, by + y, 128 + d, 128 + d, 128 + d);
    }
    // Hairline cracks.
    for (let c = 0; c < 3; c++) {
      let x = Math.floor(rand() * TILE_PX);
      let y = Math.floor(rand() * TILE_PX);
      const len = 5 + Math.floor(rand() * 9);
      for (let k = 0; k < len; k++) {
        set(x, y, 96, 94, 92);
        x += rand() < 0.5 ? 0 : rand() < 0.5 ? 1 : -1;
        y += 1;
      }
    }
    // Weathering streaks running down the wall.
    for (let s = 0; s < 6; s++) {
      const x = Math.floor(rand() * TILE_PX);
      const y0 = Math.floor(rand() * TILE_PX);
      const len = 8 + Math.floor(rand() * 18);
      for (let k = 0; k < len; k++) set(x, y0 + k, 112, 110, 108);
    }
  });
}

/** Vertical planks with gaps, grain, knots and nail heads. */
export function makeWoodDetail(seed = 7): DataTexture {
  return dataTexture(TILE_PX, seed, false, (set, rand) => {
    const pw = 8;
    for (let p = 0; p < TILE_PX / pw; p++) {
      const tone = 128 + Math.floor((rand() - 0.5) * 30);
      const warm = Math.floor((rand() - 0.5) * 12);
      for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < pw; x++) {
          let r = tone + warm + 8;
          let g = tone;
          let b = tone - warm - 12;
          if (x === 0) { r = g = b = 78; }
          else if (x === 1) { r += 10; g += 10; b += 10; }
          else if (x === pw - 1) { r -= 10; g -= 10; b -= 10; }
          set(p * pw + x, y, r, g, b);
        }
      }
      // Grain streaks.
      for (let g = 0; g < 7; g++) {
        const gx = p * pw + 2 + Math.floor(rand() * (pw - 3));
        const gy = Math.floor(rand() * TILE_PX);
        const len = 4 + Math.floor(rand() * 14);
        for (let k = 0; k < len; k++) set(gx, gy + k, tone - 18 + warm + 8, tone - 18, tone - 30 - warm);
      }
      // A knot on some planks.
      if (rand() < 0.45) {
        const kx = p * pw + 3 + Math.floor(rand() * 3);
        const ky = 6 + Math.floor(rand() * (TILE_PX - 12));
        for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) set(kx + x, ky + y, tone - 38, tone - 44, tone - 56);
        set(kx, ky, tone - 56, tone - 62, tone - 74);
      }
      // Nail heads at the top and bottom.
      set(p * pw + 3, 3, 64, 62, 66);
      set(p * pw + 4, 3, 64, 62, 66);
      set(p * pw + 3, TILE_PX - 4, 64, 62, 66);
      set(p * pw + 4, TILE_PX - 4, 64, 62, 66);
    }
  });
}

/** Staggered rows of scalloped roof tiles with the odd moss patch. */
export function makeRoofDetail(seed = 11): DataTexture {
  return dataTexture(TILE_PX, seed, false, (set, rand) => {
    const tw = 8;
    const th = 8;
    for (let row = 0; row < TILE_PX / th; row++) {
      const off = (row % 2) * (tw / 2);
      for (let col = 0; col < TILE_PX / tw; col++) {
        const tone = 128 + Math.floor((rand() - 0.5) * 34);
        const moss = rand() < 0.07;
        for (let y = 0; y < th; y++) {
          for (let x = 0; x < tw; x++) {
            let r = tone;
            let g = tone;
            let b = tone;
            if (moss) { r -= 14; g += 8; b -= 16; }
            if (y === 0) { r += 18; g += 18; b += 18; }
            else if (y === th - 2) { r -= 16; g -= 16; b -= 16; }
            else if (y === th - 1) { r -= 46; g -= 46; b -= 46; }
            // Scalloped lower corners.
            if (y >= th - 2 && (x === 0 || x === tw - 1)) { r -= 14; g -= 14; b -= 14; }
            if (x === tw - 1) { r -= 18; g -= 18; b -= 18; }
            if (rand() < 0.05) { const d = (rand() - 0.5) * 20; r += d; g += d; b += d; }
            set(col * tw + off + x, row * th + y, r, g, b);
          }
        }
      }
    }
  });
}

/** Pixel-art cobblestones as a lit albedo (not a multiplier): warm, mossy, bevelled stones. */
export function makeCobblePixel(seed = 21): DataTexture {
  const size = 128;
  const cells = 16;
  const cellPx = size / cells;
  return dataTexture(size, seed, true, (set, rand) => {
    const pts: { x: number; y: number; id: number }[] = [];
    for (let cy = 0; cy < cells; cy++) for (let cx = 0; cx < cells; cx++) pts.push({ x: (cx + 0.2 + rand() * 0.6) * cellPx, y: (cy + 0.2 + rand() * 0.6) * cellPx, id: cy * cells + cx });
    const palette = [[141, 127, 116], [154, 139, 125], [125, 112, 104], [162, 147, 131], [134, 121, 111], [148, 134, 122], [176, 159, 140]];
    const mortar = [76, 67, 62];
    const mossy = pts.map(() => rand() < 0.07);
    const tint = pts.map(() => 0.9 + rand() * 0.2);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cx = Math.floor(x / cellPx);
        const cy = Math.floor(y / cellPx);
        let f1 = 1e9;
        let f2 = 1e9;
        let best = pts[0];
        let bdx = 0;
        let bdy = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const gx = (cx + ox + cells) % cells;
            const gy = (cy + oy + cells) % cells;
            const p = pts[gy * cells + gx];
            const dx = x + 0.5 - (p.x + (cx + ox - gx) * cellPx);
            const dy = y + 0.5 - (p.y + (cy + oy - gy) * cellPx);
            const d = Math.hypot(dx, dy);
            if (d < f1) { f2 = f1; f1 = d; best = p; bdx = dx; bdy = dy; }
            else if (d < f2) f2 = d;
          }
        }
        const edge = f2 - f1;
        if (edge < 1.3) { set(x, y, mortar[0], mortar[1], mortar[2]); continue; }
        const base = palette[(best.id * 5 + 2) % palette.length];
        // Top-left bevel highlight, bottom-right shadow.
        const lit = -(bdx + bdy) / (cellPx * 0.9);
        let k = tint[best.id] * (0.9 + 0.12 * lit);
        if (edge < 2.4) k *= lit > 0 ? 1.12 : 0.8;
        let r = base[0] * k;
        let g = base[1] * k;
        let b = base[2] * k;
        if (mossy[best.id] && ((x * 7 + y * 13) % 5 < 3)) { r *= 0.82; g *= 1.0; b *= 0.74; }
        if (rand() < 0.05) { const d = 1 + (rand() - 0.5) * 0.16; r *= d; g *= d; b *= d; }
        set(x, y, r, g, b);
      }
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Windows: a lit pane with mullions, curtains and a silhouette, plus soft light spill textures.

function canvasTexture(canvas: HTMLCanvasElement, nearest = true): CanvasTexture {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  if (nearest) {
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.generateMipmaps = false;
  }
  t.needsUpdate = true;
  return t;
}

export type PaneKind = "a" | "b" | "s" | "d";

/** Width and height of one pane cell in the atlas, in texels. Narrow panes only use the left 16. */
export const PANE_CELL = { w: 24, h: 24 } as const;
export const paneUsesNarrowCell = (kind: PaneKind) => kind === "s" || kind === "d";

/** Draws one lit window pane at the context's origin. Warm and bright; the material multiplies it to HDR for bloom. */
function drawPane(ctx: CanvasRenderingContext2D, kind: PaneKind, seed: number, withCat: boolean) {
  const rand = mulberry32(seed * 977 + 13);
  const narrow = paneUsesNarrowCell(kind);
  const w = narrow ? 16 : 24;
  const h = 24;

  // Warm interior: brightest low in the room (a lamp or fire), deeper orange at the edges.
  const g = ctx.createRadialGradient(w * 0.5, h * 0.72, 1, w * 0.5, h * 0.62, Math.max(w, h) * 0.78);
  g.addColorStop(0, "#fff0b8");
  g.addColorStop(0.42, "#ffc15c");
  g.addColorStop(1, "#c85a22");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Curtains on one or both sides, with a lighter fold line.
  const curtain = rand();
  const drape = (x0: number, wd: number) => {
    ctx.fillStyle = "rgba(150,50,38,0.9)";
    ctx.fillRect(x0, 0, wd, h);
    ctx.fillStyle = "rgba(210,100,70,0.8)";
    ctx.fillRect(x0 + Math.max(1, Math.floor(wd / 2)), 0, 1, h);
  };
  if (curtain < 0.45) drape(0, Math.max(3, Math.floor(w * 0.18)));
  else if (curtain < 0.8) drape(w - Math.max(3, Math.floor(w * 0.18)), Math.max(3, Math.floor(w * 0.18)));
  else {
    drape(0, 3);
    drape(w - 3, 3);
  }

  // A hanging lamp or a plant silhouette.
  ctx.fillStyle = "#5a2e1c";
  if (rand() < 0.5) {
    ctx.fillRect(Math.floor(w / 2) - 1, 0, 1, 4);
    ctx.fillRect(Math.floor(w / 2) - 2, 4, 4, 2);
  } else {
    ctx.fillRect(Math.floor(w * 0.62), h - 7, 4, 7);
    ctx.fillRect(Math.floor(w * 0.62) - 1, h - 9, 2, 3);
    ctx.fillRect(Math.floor(w * 0.62) + 3, h - 10, 2, 4);
  }

  // A cat watching the street, for one window.
  if (withCat) {
    ctx.fillStyle = "#3a1c14";
    const cx = Math.floor(w * 0.5);
    const cy = h - 7;
    ctx.fillRect(cx - 3, cy, 7, 6);
    ctx.fillRect(cx - 2, cy - 3, 5, 4);
    ctx.fillRect(cx - 2, cy - 5, 1, 2);
    ctx.fillRect(cx + 2, cy - 5, 1, 2);
    ctx.fillRect(cx + 4, cy + 2, 3, 2);
    ctx.fillRect(cx + 6, cy, 1, 3);
  }

  // Mullions.
  ctx.fillStyle = "#3f2214";
  if (kind === "a") {
    ctx.fillRect(Math.floor(w / 3) - 1, 0, 1, h);
    ctx.fillRect(Math.floor((w * 2) / 3), 0, 1, h);
    ctx.fillRect(0, Math.floor(h * 0.48), w, 1);
  } else if (kind === "b") {
    ctx.fillRect(Math.floor(w / 2) - 1, 0, 2, h);
    ctx.fillRect(0, Math.floor(h * 0.46), w, 2);
  } else if (kind === "s") {
    ctx.fillRect(Math.floor(w / 2) - 1, 0, 1, h);
    ctx.fillRect(0, Math.floor(h * 0.4), w, 1);
  } else {
    // Arched door window: a single vertical bar.
    ctx.fillRect(Math.floor(w / 2) - 1, 0, 1, h);
  }

  // A thin darker frame so the pane reads against the wall.
  ctx.fillStyle = "#5d2f18";
  ctx.fillRect(0, 0, w, 1);
  ctx.fillRect(0, h - 1, w, 1);
  ctx.fillRect(0, 0, 1, h);
  ctx.fillRect(w - 1, 0, 1, h);
}

/**
 * A row of window-pane variants for one window kind, so every pane of that kind can be drawn in a
 * single call. Variant `variants - 1` can be given a cat silhouette.
 */
export function makePaneAtlas(kind: PaneKind, variants: number, catVariant?: number): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = PANE_CELL.w * variants;
  c.height = PANE_CELL.h;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < variants; i++) {
    ctx.save();
    ctx.translate(i * PANE_CELL.w, 0);
    drawPane(ctx, kind, i + 1, i === catVariant);
    ctx.restore();
  }
  return canvasTexture(c, true);
}

function alphaTexture(w: number, h: number, alpha: (u: number, v: number) => number): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, alpha((x + 0.5) / w, (y + 0.5) / h))));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(c, false);
}

/** A soft warm halo around a lit window that melts away before the quad's edge, so it never shows a box outline. */
export function makeWindowHaloTexture(): CanvasTexture {
  return alphaTexture(64, 64, haloAlpha);
}

/** A pool of window light on the cobbles that widens, blurs and fades as it travels away from the wall. */
export function makeGroundSpillTexture(): CanvasTexture {
  return alphaTexture(96, 96, poolAlpha);
}

/** A paw-print shop sign. */
export function makeSignTexture(): CanvasTexture {
  const w = 48;
  const h = 32;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2f5d4a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e9d8a8";
  ctx.fillRect(1, 1, w - 2, 2);
  ctx.fillRect(1, h - 3, w - 2, 2);
  ctx.fillRect(1, 1, 2, h - 2);
  ctx.fillRect(w - 3, 1, 2, h - 2);
  ctx.fillStyle = "#f4e6b8";
  // Pad and four toes.
  ctx.fillRect(18, 17, 12, 8);
  ctx.fillRect(16, 19, 2, 4);
  ctx.fillRect(30, 19, 2, 4);
  for (const [x, y] of [[13, 12], [19, 8], [27, 8], [33, 12]]) ctx.fillRect(x, y, 3, 4);
  return canvasTexture(c, true);
}

/** A small paper notice pinned to a wall. */
export function makePosterTexture(seed: number): CanvasTexture {
  const rand = mulberry32(seed * 313 + 5);
  const w = 24;
  const h = 32;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#e8dcc0";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#cdbf9c";
  ctx.fillRect(0, h - 3, w, 3);
  const inks = ["#b0412c", "#2f5d4a", "#3a3a5a"];
  ctx.fillStyle = inks[Math.floor(rand() * inks.length)];
  ctx.fillRect(3, 3, w - 6, 4);
  ctx.fillStyle = "#5a5040";
  for (let y = 10; y < h - 6; y += 3) ctx.fillRect(3, y, 6 + Math.floor(rand() * (w - 10)), 1);
  ctx.fillStyle = "#c9a03a";
  ctx.fillRect(w - 8, h - 12, 5, 5);
  return canvasTexture(c, true);
}
