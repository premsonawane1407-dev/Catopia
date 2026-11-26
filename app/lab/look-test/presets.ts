// PHASE 0 LOOK TEST - throwaway. Presets for the time of day and the quality tiers.

export type Variant = "pixel" | "hd";
export type TimeOfDay = "golden" | "dusk" | "night";
export type Tier = "full" | "light" | "minimal";
export type View = "scene" | "catalog";

export interface TimePreset {
  label: string;
  background: string;
  fogColor: string;
  fogDensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  lanternColor: string;
  lanternIntensity: number;
  windowColor: string;
  windowGlow: number;
  catTint: string;
  /** Own-colour light added to the lit cat so it stays readable. */
  catGlow: number;
  bloomIntensity: number;
  bloomThreshold: number;
  vignette: number;
  saturation: number;
  contrast: number;
}

export const TIME_PRESETS: Record<TimeOfDay, TimePreset> = {
  golden: {
    label: "Golden hour",
    background: "#d9b98c",
    fogColor: "#d9b98c",
    fogDensity: 0.02,
    hemiSky: "#cfd8f0",
    hemiGround: "#a9835f",
    hemiIntensity: 0.9,
    sunColor: "#ffc57a",
    sunIntensity: 3.4,
    sunPosition: [-7, 6, 5],
    lanternColor: "#ffb45e",
    lanternIntensity: 2.5,
    windowColor: "#ffd08a",
    windowGlow: 0.35,
    catTint: "#e6d6c0",
    catGlow: 0.2,
    bloomIntensity: 0.55,
    bloomThreshold: 0.85,
    vignette: 0.45,
    saturation: 0.06,
    contrast: 0.05,
  },
  dusk: {
    label: "Blue hour",
    background: "#4f5f86",
    fogColor: "#4f5f86",
    fogDensity: 0.03,
    hemiSky: "#8497cf",
    hemiGround: "#5a4a52",
    hemiIntensity: 0.85,
    sunColor: "#9fb2ff",
    sunIntensity: 1.3,
    sunPosition: [-6, 7, 6],
    lanternColor: "#ffb45e",
    lanternIntensity: 9,
    windowColor: "#ffc46e",
    windowGlow: 2.2,
    catTint: "#b4bddf",
    catGlow: 0.5,
    bloomIntensity: 1.0,
    bloomThreshold: 0.7,
    vignette: 0.6,
    saturation: 0.12,
    contrast: 0.08,
  },
  night: {
    label: "Night",
    background: "#171c3a",
    fogColor: "#171c3a",
    fogDensity: 0.045,
    hemiSky: "#3a4b8c",
    hemiGround: "#1b1a2c",
    hemiIntensity: 0.65,
    sunColor: "#8aa2ff",
    sunIntensity: 0.9,
    sunPosition: [5, 8, 4],
    lanternColor: "#ffaa55",
    lanternIntensity: 14,
    windowColor: "#ffb85e",
    windowGlow: 3.2,
    catTint: "#8b96c8",
    catGlow: 0.6,
    bloomIntensity: 1.3,
    bloomThreshold: 0.6,
    vignette: 0.7,
    saturation: 0.15,
    contrast: 0.1,
  },
};

export interface TierSpec {
  label: string;
  /** Run the post-processing stack at all. */
  post: boolean;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  tilt: boolean;
  /** Outlines only apply to the pixel variant. */
  outline: boolean;
  grain: boolean;
  particleScale: number;
  pointLights: number;
  /** Multiplier on the render resolution (look B). */
  renderScale: number;
  /** Most taps the blur may use. */
  blurSamples: number;
  /** Multisample anti-aliasing samples for look B. */
  msaa: number;
  /** Cheap post-process anti-aliasing, used when MSAA is off. */
  smaa: boolean;
  /** Post-processing buffer precision: half-float keeps bright highlights, 8-bit is cheaper. */
  fb: "half" | "byte";
}

export const TIERS: Record<Tier, TierSpec> = {
  full: { label: "Full", post: true, shadows: true, shadowMapSize: 2048, bloom: true, tilt: true, outline: true, grain: true, particleScale: 1, pointLights: 4, renderScale: 1, blurSamples: 56, msaa: 4, smaa: false, fb: "half" },
  light: { label: "Light", post: true, shadows: true, shadowMapSize: 1024, bloom: true, tilt: true, outline: false, grain: false, particleScale: 0.5, pointLights: 2, renderScale: 0.75, blurSamples: 24, msaa: 0, smaa: true, fb: "byte" },
  minimal: { label: "Minimal", post: false, shadows: false, shadowMapSize: 512, bloom: false, tilt: false, outline: false, grain: false, particleScale: 0.25, pointLights: 0, renderScale: 0.6, blurSamples: 16, msaa: 0, smaa: false, fb: "half" },
};

export interface LabState {
  variant: Variant;
  tod: TimeOfDay;
  tier: Tier;
  view: View;
  catalogGroup: "walls" | "roofs" | "props";
  /** Target number of game-pixel rows on screen (the real value is rounded to a whole device-pixel scale). */
  rows: number;
  tilt: boolean;
  /** How far above the cat the picture stays sharp, as a fraction of the screen height. */
  tiltUp: number;
  /** How far below the cat the picture stays sharp. */
  tiltDown: number;
  /** Length of the ramp from sharp to fully blurred, as a fraction of the screen. */
  tiltFeather: number;
  /** Strongest blur radius in pixels at 1080 rows. */
  blurRadius: number;
  /** How strongly bright lights turn into round bokeh orbs. */
  bokeh: number;
  textures: boolean;
  windowDetail: boolean;
  foreground: boolean;
  catLit: boolean;
  bloom: boolean;
  outline: boolean;
  vignette: boolean;
  grain: boolean;
  colorDepth: boolean;
  particles: boolean;
  shadows: boolean;
  sway: boolean;
  fov: number;
  pitch: number;
  distance: number;
  lean: number;
  showUi: boolean;
}

export const DEFAULT_STATE: LabState = {
  variant: "hd",
  tod: "dusk",
  tier: "full",
  view: "scene",
  catalogGroup: "walls",
  rows: 270,
  tilt: true,
  tiltUp: 0.26,
  tiltDown: 0.14,
  tiltFeather: 0.3,
  blurRadius: 30,
  bokeh: 1.6,
  textures: true,
  windowDetail: true,
  foreground: true,
  catLit: true,
  bloom: true,
  outline: true,
  vignette: true,
  grain: false,
  colorDepth: false,
  particles: true,
  shadows: true,
  sway: false,
  fov: 28,
  pitch: 34,
  distance: 14,
  lean: 0.55,
  showUi: true,
};
