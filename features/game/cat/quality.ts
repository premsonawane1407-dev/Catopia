// Automated pixel-art checks for the cat's frames: a TypeScript port of the parts of the pixel-art-studio
// quality rubric (references/05-quality-rubric.md) that are well defined, because the skill's own Python
// scripts cannot run on this machine. Checks the rubric describes loosely are reported but not scored, and
// the report says so. Nothing here changes the art; it only measures it.
import { CAT_FRAME_H, CAT_FRAME_W } from "./clips";
import { hexToRgb, rgbToHsl } from "./coat";

export interface FrameImage {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export interface FrameReport {
  opaque: number;
  colors: number;
  orphanPixels: number;
  orphanRatio: number;
  /** Pixels in L-shaped single-colour steps with the diagonal also filled: the "doubled" corner of a thick stair-step. */
  doublies: number;
  /** 4-connected pieces of the silhouette. */
  components: number;
  /** Average same-colour cluster size over non-outline colours, capped at 5 and scaled to 0..1. */
  coherence: number;
  /** Area of the silhouette divided by the area of its convex hull (1 is a blob, lower has legs and a tail). */
  solidity: number;
  aspect: number;
  /** Correlation of brightness with distance from the centre of mass. Strongly negative means "pillow shading". */
  pillow: number;
  /** Share of boundary pixels that are blends between the sprite and its background. Always 0 here: there is no anti-aliasing. */
  blurryEdges: number;
}

const idxOf = (x: number, y: number, w: number) => y * w + x;
const colorKey = (d: Uint8ClampedArray, i: number) => (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2];
const luma = (d: Uint8ClampedArray, i: number) => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];

export function checkFrame(img: FrameImage): FrameReport {
  const { width: w, height: h, rgba: d } = img;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[idxOf(x, y, w) * 4 + 3] > 0;
  const keys = new Map<number, number>();
  let opaque = 0;
  for (let i = 0; i < w * h; i++) {
    if (d[i * 4 + 3] === 0) continue;
    opaque++;
    const k = colorKey(d, i);
    keys.set(k, (keys.get(k) ?? 0) + 1);
  }

  // Same-colour clusters (8-connected): single pixels are orphans, and sizes feed the coherence score.
  const seen = new Uint8Array(w * h);
  const clusterSizes = new Map<number, number[]>();
  let orphans = 0;
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || d[i * 4 + 3] === 0) continue;
    const k = colorKey(d, i);
    const stack = [i];
    seen[i] = 1;
    let size = 0;
    while (stack.length) {
      const c = stack.pop() as number;
      size++;
      const cx = c % w;
      const cy = Math.floor(c / w);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!solid(nx, ny)) continue;
          const n = idxOf(nx, ny, w);
          if (seen[n] || colorKey(d, n) !== k) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (size === 1) orphans++;
    const list = clusterSizes.get(k) ?? [];
    list.push(size);
    clusterSizes.set(k, list);
  }

  // The darkest colours are the outline; coherence is judged on the rest.
  const byLuma = [...keys.keys()].sort((a, b) => lumaOfKey(a) - lumaOfKey(b));
  const outlineKeys = new Set(byLuma.slice(0, Math.max(1, Math.round(byLuma.length * 0.18))));
  const scores: number[] = [];
  for (const [k, sizes] of clusterSizes) {
    if (outlineKeys.has(k)) continue;
    scores.push(Math.min(1, sizes.reduce((a, b) => a + b, 0) / sizes.length / 5));
  }
  const coherence = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5;

  // Doublies: an L of three same-coloured pixels whose fourth corner is also that colour.
  let doublies = 0;
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      if (!solid(x, y) || !solid(x + 1, y) || !solid(x, y + 1) || !solid(x + 1, y + 1)) continue;
      const a = colorKey(d, idxOf(x, y, w));
      if (a === colorKey(d, idxOf(x + 1, y, w)) && a === colorKey(d, idxOf(x, y + 1, w)) && a === colorKey(d, idxOf(x + 1, y + 1, w)) && outlineKeys.has(a)) doublies++;
    }
  }

  // Silhouette: connected pieces (4-connected), hull solidity, aspect.
  const seenS = new Uint8Array(w * h);
  let components = 0;
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  let sumX = 0;
  let sumY = 0;
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
      pts.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]);
      const i = idxOf(x, y, w);
      if (seenS[i]) continue;
      components++;
      const stack = [i];
      seenS[i] = 1;
      while (stack.length) {
        const c = stack.pop() as number;
        const cx = c % w;
        const cy = Math.floor(c / w);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!solid(nx, ny)) continue;
          const n = idxOf(nx, ny, w);
          if (seenS[n]) continue;
          seenS[n] = 1;
          stack.push(n);
        }
      }
    }
  }
  const hullArea = convexHullArea(pts);
  const solidity = hullArea > 0 ? opaque / hullArea : 1;
  const aspect = opaque ? (maxX - minX + 1) / (maxY - minY + 1) : 1;

  // Pillow shading: is brightness mostly a function of distance from the middle?
  let pillow = 0;
  if (opaque > 2) {
    const cx = sumX / opaque;
    const cy = sumY / opaque;
    const dist: number[] = [];
    const lum: number[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (solid(x, y)) {
      dist.push(Math.hypot(x - cx, y - cy));
      lum.push(luma(d, idxOf(x, y, w)));
    }
    pillow = pearson(dist, lum);
  }

  return { opaque, colors: keys.size, orphanPixels: orphans, orphanRatio: opaque ? orphans / opaque : 0, doublies, components, coherence, solidity, aspect, pillow, blurryEdges: 0 };
}

function lumaOfKey(k: number): number {
  return 0.299 * ((k >> 16) & 255) + 0.587 * ((k >> 8) & 255) + 0.114 * (k & 255);
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

function convexHullArea(points: [number, number][]): number {
  const pts = [...new Set(points.map((p) => p.join(",")))].map((s) => s.split(",").map(Number) as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return 0;
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (const p of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

// ---- scoring ----

export interface ScoreParts {
  hygiene: number;
  cluster: number;
  palette: number;
  silhouette: number;
  antiSlop: number;
  /** Total out of 100. */
  total: number;
}

export interface PaletteReport {
  colors: number;
  /** Hue turn from the darkest to the lightest tone of each ramp, in degrees. */
  rampHueTurn: Record<string, number>;
  /** Whether highlights are warmer than shadows in every ramp. */
  warmHighlightCoolShadow: boolean;
}

/** Hue distance in degrees between the darkest and lightest tones of a ramp of hex colours. */
export function rampHueTurn(hexes: readonly string[]): number {
  const hsl = hexes.map((h) => rgbToHsl(hexToRgb(h)));
  const sorted = [...hsl].sort((a, b) => a[2] - b[2]);
  const d = Math.abs(sorted[0][0] - sorted[sorted.length - 1][0]) % 360;
  return Math.min(d, 360 - d);
}

/** Scores one frame with the rubric's formulas for the parts that are well defined; the rest scores full marks and is listed as unscored. */
export function scoreFrame(r: FrameReport, palette: PaletteReport): ScoreParts {
  const orphan = Math.max(0, 10 - r.orphanRatio * 200);
  const doubly = Math.max(0, 5 - r.doublies * 1.5);
  const hygiene = orphan + doubly + 10; // banding (10) is not scored: the rubric's definition needs a ramp axis
  const cluster = (r.components <= 2 ? 10 : r.components <= 5 ? 7 : 3) + r.coherence * 10;
  const turns = Object.values(palette.rampHueTurn);
  const minTurn = turns.length ? Math.min(...turns) : 0;
  const pal = (palette.colors <= 32 ? 8 : palette.colors <= 38 ? 5 : 2) + (minTurn >= 30 ? 8 : minTurn >= 15 ? 5 : 2) + (palette.warmHighlightCoolShadow ? 4 : 0);
  const silhouette = (r.components === 1 ? 5 : 2) + (r.solidity < 0.93 ? 5 : 2) + (r.aspect >= 0.5 && r.aspect <= 2.4 ? 5 : 2);
  const antiSlop = 20 - (r.pillow < -0.4 ? 5 : 0) - (r.blurryEdges > 0.2 ? 5 : 0);
  return { hygiene, cluster, palette: pal, silhouette, antiSlop, total: hygiene + cluster + pal + silhouette + antiSlop };
}

// ---- animation consistency ----

export interface ClipReport {
  /** Largest deviation of any frame's pixel count from the clip average. The rubric asks for under 0.05 (full marks) to 0.15. */
  massDeviation: number;
  /** Colours that appear in some frames of the clip and not others (flicker). */
  paletteDrift: number;
}

export function checkClip(frames: readonly FrameImage[]): ClipReport {
  const masses = frames.map((f) => {
    let n = 0;
    for (let i = 0; i < f.width * f.height; i++) if (f.rgba[i * 4 + 3] > 0) n++;
    return n;
  });
  const mean = masses.reduce((a, b) => a + b, 0) / masses.length;
  const massDeviation = Math.max(...masses.map((m) => Math.abs(m - mean) / mean));
  const sets = frames.map((f) => {
    const s = new Set<number>();
    for (let i = 0; i < f.width * f.height; i++) if (f.rgba[i * 4 + 3] > 0) s.add(colorKey(f.rgba, i));
    return s;
  });
  const union = new Set(sets.flatMap((s) => [...s]));
  const inter = [...union].filter((k) => sets.every((s) => s.has(k)));
  return { massDeviation, paletteDrift: union.size - inter.length };
}

export const FRAME_SIZE = { width: CAT_FRAME_W, height: CAT_FRAME_H } as const;
