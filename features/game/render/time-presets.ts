// Lighting and grading for each time of day. Dusk is the approved default look; golden hour and night
// are there for the day/night clock that arrives in Phase 3.

export type TimeOfDay = "golden" | "dusk" | "night";

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
    catGlow: 0.6,
    bloomIntensity: 1.3,
    bloomThreshold: 0.6,
    vignette: 0.7,
    saturation: 0.15,
    contrast: 0.1,
  },
};

export const DEFAULT_TIME: TimeOfDay = "dusk";

export function isTimeOfDay(value: string | null | undefined): value is TimeOfDay {
  return value === "golden" || value === "dusk" || value === "night";
}
