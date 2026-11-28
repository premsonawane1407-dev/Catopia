// The cat's coat as settings: a colour, a pattern, a second colour for markings and an eye colour. The
// generator turns these into five-tone colour ramps (shadows lean violet, highlights lean warm yellow, as
// the pixel-art rules ask) and decides which ramp every point of the cat's surface uses.
import { clamp, fract, valueNoise } from "./vec";

export type CoatPattern = "solid" | "tabby" | "tuxedo" | "calico" | "pointed";

export interface CatCoat {
  id: string;
  /** What kind of cat it is, e.g. "Marmalade tabby". */
  label: string;
  /** The cat's name (owner decision, 2026-11-28). */
  name: string;
  pattern: CoatPattern;
  /** Main fur colour (the mid tone), as #rrggbb. */
  base: string;
  /** Stripe, patch or point colour (the mid tone). Chosen from `base` when left out. */
  mark?: string;
  /** Second patch colour for calico coats (the orange or ginger patches). */
  patch?: string;
  /** White or cream areas: chest, muzzle, paws, belly. */
  white?: string;
  /** Iris colour. */
  eyes: string;
  /** Moves the noise that shapes patches, so each seed is a different cat of the same pattern. */
  seed: number;
}

export type RGB = readonly [number, number, number];
/** Deep shadow, shade, base, light, highlight. */
export type Ramp = readonly [RGB, RGB, RGB, RGB, RGB];

export const COAT_PRESETS: readonly CatCoat[] = [
  { id: "marmalade", name: "Pumpkin", label: "Marmalade tabby", pattern: "tabby", base: "#e0833a", mark: "#b0522c", white: "#f6dcae", eyes: "#8fd35e", seed: 3 },
  { id: "storm", name: "Ash", label: "Storm-grey tabby", pattern: "tabby", base: "#8d95a8", mark: "#4f5870", white: "#e8e4ee", eyes: "#e8b840", seed: 5 },
  { id: "midnight", name: "Salem", label: "Midnight", pattern: "solid", base: "#3a3548", white: "#4a4458", eyes: "#e2c548", seed: 7 },
  { id: "tuxedo", name: "Oreo", label: "Tuxedo", pattern: "tuxedo", base: "#35303f", white: "#f4efe6", eyes: "#7fcf62", seed: 9 },
  { id: "patches", name: "Patches", label: "Patchwork calico", pattern: "calico", base: "#f1ece2", mark: "#38323f", patch: "#e08a3c", white: "#f1ece2", eyes: "#d8b84a", seed: 12 },
  { id: "biscuit", name: "Toffee", label: "Biscuit point", pattern: "pointed", base: "#efdcb9", mark: "#6e4c3e", white: "#f8ecd2", eyes: "#72b8ec", seed: 14 },
];

/** The coat the game starts with: the marmalade tabby, Pumpkin (owner decision, 2026-11-28). */
export const DEFAULT_COAT: CatCoat = COAT_PRESETS[0];

export function coatById(id: string | null | undefined): CatCoat {
  return COAT_PRESETS.find((c) => c.id === id) ?? DEFAULT_COAT;
}

// ---- colour helpers ----

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (c: RGB): string => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-9) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/** Moves a hue the short way round toward a target hue. */
function hueToward(h: number, target: number, amount: number): number {
  let d = ((target - h + 540) % 360) - 180;
  d *= clamp(amount, 0, 1);
  return (h + d + 360) % 360;
}

/**
 * Five tones from one mid colour. Shadows get darker, a little less saturated and lean toward violet;
 * highlights get lighter and lean toward warm yellow, so the ramp turns in hue rather than only in lightness.
 */
export function makeRamp(mid: string, pale = false): Ramp {
  const [h, s, l] = rgbToHsl(hexToRgb(mid));
  // Pale coats (white, cream) shade toward a cool grey-lilac rather than a pink.
  const tones = [
    { dl: -0.3, ds: pale ? 0.5 : 0.88, toward: 262, amount: pale ? 0.2 : 0.3 },
    { dl: -0.15, ds: pale ? 0.75 : 0.95, toward: 262, amount: pale ? 0.12 : 0.15 },
    { dl: 0, ds: 1, toward: h, amount: 0 },
    { dl: 0.1, ds: 0.95, toward: 52, amount: 0.12 },
    { dl: 0.19, ds: 0.8, toward: 52, amount: 0.22 },
  ];
  const out = tones.map(({ dl, ds, toward, amount }) => {
    const hh = hueToward(h, toward, amount);
    return hslToRgb(hh, clamp(s * ds, 0, 1), clamp(l + dl * (l > 0.7 ? 0.7 : 1), 0.04, 0.97));
  });
  return out as unknown as Ramp;
}

/** A stripe or patch colour for a coat that does not name one: the fur colour, deeper and a little redder or cooler. */
export function deriveMark(base: string): string {
  const [h, s, l] = rgbToHsl(hexToRgb(base));
  return rgbToHex(hslToRgb(h - 6, clamp(s * 1.05, 0, 1), clamp(l * 0.62, 0.06, 0.5)));
}

/** The darkest outline colour for a ramp: darker than every fill in it, as the pixel-art rules require. */
export function outlineOf(ramp: Ramp): RGB {
  const [h, s, l] = rgbToHsl(ramp[0]);
  return hslToRgb(h, clamp(s * 0.8, 0, 1), clamp(l * 0.55, 0.02, 0.25));
}

// ---- the palette a coat makes ----

export type Material = "base" | "mark" | "white" | "patch";

export interface CoatPalette {
  ramps: Record<Material, Ramp>;
  outline: Record<Material, RGB>;
  eye: { rim: RGB; light: RGB; dark: RGB; pupil: RGB; glint: RGB };
  nose: RGB;
  noseLight: RGB;
  mouth: RGB;
  earInner: RGB;
  earInnerDark: RGB;
  whisker: RGB;
}

export function buildPalette(coat: CatCoat): CoatPalette {
  const mark = coat.mark ?? deriveMark(coat.base);
  const white = coat.white ?? "#f4ecdc";
  const ramps: Record<Material, Ramp> = {
    base: makeRamp(coat.base),
    mark: makeRamp(mark),
    white: makeRamp(white, true),
    patch: makeRamp(coat.patch ?? coat.base),
  };
  const iris = makeRamp(coat.eyes);
  const darkFur = outlineOf(ramps.base);
  return {
    ramps,
    outline: { base: outlineOf(ramps.base), mark: outlineOf(ramps.mark), white: outlineOf(ramps.white), patch: outlineOf(ramps.patch) },
    eye: { rim: iris[0], light: iris[3], dark: iris[1], pupil: [30, 18, 36], glint: [255, 255, 255] },
    nose: [226, 128, 138],
    noseLight: [255, 182, 186],
    mouth: [darkFur[0] * 0.9, darkFur[1] * 0.6, darkFur[2] * 0.7],
    earInner: [236, 156, 152],
    earInnerDark: [196, 108, 120],
    whisker: [255, 246, 224],
  };
}

// ---- which material a point of the cat uses ----

export type PartKind = "chest" | "belly" | "haunch" | "head" | "muzzle" | "cheek" | "ear" | "leg" | "paw" | "tail";

/** What the pattern needs to know about a point on the cat. All positions are in the rest pose, so a stripe stays on the body as it moves. */
export interface SurfacePoint {
  part: PartKind;
  /** -1 right side of the cat, +1 left side, 0 on the middle line. */
  side: number;
  /** Along a limb or the tail: 0 at the body, 1 at the tip. */
  u: number;
  rx: number;
  ry: number;
  rz: number;
  /** The point's direction on the part's own unit sphere: x sideways, y up, z toward the front. */
  sx: number;
  sy: number;
  sz: number;
}

const isTorso = (p: PartKind) => p === "chest" || p === "belly" || p === "haunch";

/** Stripes across the torso, tail rings, leg bands, the forehead "M" and cheek lines of a tabby. */
function tabbyMark(p: SurfacePoint, seed: number): boolean {
  if (isTorso(p.part)) {
    if (p.sy < -0.25) return false;
    const wobble = (valueNoise(p.rx * 0.22, p.ry * 0.22, p.rz * 0.3, seed) - 0.5) * 1.1;
    const spine = p.sy > 0.82 && Math.abs(p.sx) < 0.3;
    const stripe = fract((p.rz + wobble * 2 + 40) / 4.3) < 0.36 && p.sy > -0.2;
    return spine || stripe;
  }
  if (p.part === "head") {
    if (p.sz < 0.05) {
      // The back of the head carries the stripe that continues the spine.
      return p.sy > 0.45 && Math.abs(p.sx) < 0.12;
    }
    const forehead = p.sy > 0.5 && p.sz > 0.15 && (Math.abs(p.sx) < 0.07 || Math.abs(Math.abs(p.sx) - 0.3) < 0.07);
    const cheek = Math.abs(p.sx) > 0.72 && p.sz > 0.05 && (Math.abs(p.sy) < 0.1 || Math.abs(p.sy + 0.32) < 0.08);
    return forehead || cheek;
  }
  if (p.part === "leg") return (p.u > 0.3 && p.u < 0.44) || (p.u > 0.62 && p.u < 0.74);
  if (p.part === "tail") return p.u > 0.94 || fract(p.u * 4.2 + 0.1) < 0.3;
  return false;
}

export function materialAt(coat: CatCoat, p: SurfacePoint): Material {
  switch (coat.pattern) {
    case "solid":
      return "base";
    case "tabby": {
      if (p.part === "paw" || p.part === "muzzle" || p.part === "cheek") return "white";
      if (p.part === "chest" && p.sz > 0.35 && p.sy < 0.45) return "white";
      if ((p.part === "belly" || p.part === "haunch") && p.sy < -0.55) return "white";
      return tabbyMark(p, coat.seed) ? "mark" : "base";
    }
    case "tuxedo": {
      if (p.part === "paw" || p.part === "muzzle" || p.part === "cheek") return "white";
      if (p.part === "chest" && p.sz > 0.1 && p.sy < 0.6) return "white";
      if (p.part === "belly" && p.sy < -0.3) return "white";
      if (p.part === "haunch" && p.sy < -0.7) return "white";
      if (p.part === "leg" && p.u > 0.62) return "white";
      if (p.part === "head" && p.sz > 0.55 && Math.abs(p.sx) < 0.34 && p.sy < 0.55 && p.sy > -0.6) return "white";
      if (p.part === "tail" && p.u > 0.95) return "white";
      return "base";
    }
    case "calico": {
      if (p.part === "paw" || p.part === "muzzle" || p.part === "cheek") return "white";
      if ((p.part === "belly" || p.part === "chest") && p.sy < -0.2) return "white";
      const n = valueNoise(p.rx * 0.12 + p.side * 0.2, p.ry * 0.14, p.rz * 0.12, coat.seed) * 0.75 + valueNoise(p.rx * 0.3, p.ry * 0.3, p.rz * 0.3, coat.seed + 9) * 0.25;
      if (p.part === "ear") return n < 0.5 ? "mark" : "patch";
      if (n < 0.34) return "mark";
      if (n < 0.62) return "patch";
      return "white";
    }
    case "pointed": {
      if (p.part === "ear" || p.part === "muzzle" || p.part === "cheek" || p.part === "paw") return "mark";
      if (p.part === "head" && p.sz > 0.35 && Math.abs(p.sx) < 0.55 && p.sy < 0.2) return "mark";
      if (p.part === "leg") return p.u > 0.45 ? "mark" : "base";
      if (p.part === "tail") return p.u > 0.2 ? "mark" : "base";
      return "base";
    }
  }
}
