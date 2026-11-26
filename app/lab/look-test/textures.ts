// PHASE 0 LOOK TEST - throwaway. Procedurally generated textures (no image files needed).
import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  LinearFilter,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Tileable cobblestones: jittered-grid Voronoi cells with bevel shading from a top-left light. */
export function makeCobbleTexture(size = 512, cells = 12, seed = 11): CanvasTexture {
  const rand = mulberry32(seed);
  const cellPx = size / cells;
  const points: { x: number; y: number; id: number }[] = [];
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      points.push({ x: (cx + 0.2 + rand() * 0.6) * cellPx, y: (cy + 0.2 + rand() * 0.6) * cellPx, id: cy * cells + cx });
    }
  }
  // Warm greys and browns, with the shadows leaning cooler.
  const stones = ["#8c7e78", "#7b6f6b", "#9b8b80", "#6f6561", "#a39587", "#857770", "#94847a"].map(hexToRgb);
  const mortar = hexToRgb("#2d2830");
  const stoneBase = stones.map(() => 1);
  void stoneBase;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const wrap = (v: number) => ((v % size) + size) % size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / cellPx);
      const cy = Math.floor(y / cellPx);
      let f1 = 1e9;
      let f2 = 1e9;
      let best = points[0];
      let bdx = 0;
      let bdy = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const gx = (cx + ox + cells) % cells;
          const gy = (cy + oy + cells) % cells;
          const p = points[gy * cells + gx];
          // Shift the point by whole tiles so distances wrap correctly.
          const px = p.x + (cx + ox - gx) * cellPx;
          const py = p.y + (cy + oy - gy) * cellPx;
          const dx = x - px;
          const dy = y - py;
          const d = Math.hypot(dx, dy);
          if (d < f1) {
            f2 = f1;
            f1 = d;
            best = p;
            bdx = dx;
            bdy = dy;
          } else if (d < f2) {
            f2 = d;
          }
        }
      }
      const edge = f2 - f1;
      const o = (y * size + x) * 4;
      if (edge < 2.4) {
        img.data[o] = mortar[0];
        img.data[o + 1] = mortar[1];
        img.data[o + 2] = mortar[2];
      } else {
        const base = stones[(best.id * 7 + 3) % stones.length];
        // Top-left light: pixels on the upper-left of a stone are lighter, lower-right darker.
        const lit = -(bdx + bdy) / (cellPx * 1.1);
        const bevel = Math.min(1, (edge - 2.4) / 6);
        const noise = (rand() - 0.5) * 0.07;
        const k = (0.84 + 0.2 * lit) * (0.8 + 0.2 * bevel) + noise;
        // Cool the shadows, warm the lights a touch.
        img.data[o] = Math.max(0, Math.min(255, base[0] * k * (k > 1 ? 1.03 : 0.95)));
        img.data[o + 1] = Math.max(0, Math.min(255, base[1] * k));
        img.data[o + 2] = Math.max(0, Math.min(255, base[2] * k * (k > 1 ? 0.97 : 1.06)));
      }
      img.data[o + 3] = 255;
    }
  }
  void wrap;
  ctx.putImageData(img, 0, 0);

  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Vertical wooden planks with a little grain, for crates. */
export function makePlankTexture(size = 64, seed = 3): CanvasTexture {
  const rand = mulberry32(seed);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const plankW = size / 4;
  const tones = ["#a8703f", "#b4784a", "#9a6538", "#ad7444"];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = tones[i];
    ctx.fillRect(i * plankW, 0, plankW, size);
    ctx.fillStyle = "#6b4226";
    ctx.fillRect(i * plankW, 0, 1, size);
    for (let g = 0; g < 7; g++) {
      ctx.fillStyle = `rgba(80,45,20,${0.15 + rand() * 0.2})`;
      ctx.fillRect(i * plankW + 2 + Math.floor(rand() * (plankW - 4)), Math.floor(rand() * size), 1, 4 + Math.floor(rand() * 10));
    }
  }
  // Cross braces.
  ctx.fillStyle = "#7d4d28";
  ctx.fillRect(0, 2, size, 5);
  ctx.fillRect(0, size - 7, size, 5);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Soft radial gradient, white in the middle fading to nothing: halos, blob shadows, light blobs. */
export function makeRadialTexture(size = 128, stops: [number, string][] = [[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]]): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Soft rounded window glow: bright in the middle, falling off at the edges. */
export function makeWindowGlowTexture(size = 64): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.65, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** A tall soft beam for fake light shafts. */
export function makeShaftTexture(w = 64, h = 256): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const gx = ctx.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, "rgba(255,255,255,0)");
  gx.addColorStop(0.5, "rgba(255,255,255,1)");
  gx.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-in";
  const gy = ctx.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, "rgba(255,255,255,0.9)");
  gy.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, w, h);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
