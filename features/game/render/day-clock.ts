// The day/night clock. The game keeps an hour of the day (0 to 24); the look of the street at that hour is a blend of
// the key moments in time-presets.ts (night, dawn, day, golden hour, blue hour, night again). This file is plain
// maths: the scene applies the result every frame (day-cycle.tsx).
import { TIME_PRESETS, type TimeOfDay, type TimePreset } from "./time-presets";

/** What the clock is told to do: run by itself, or hold at one of the key moments. */
export type TimeSetting = "auto" | TimeOfDay;

/** Real seconds one full day takes while the clock runs by itself. */
export const DAY_SECONDS = 480;
/** The hour the game opens at: the blue hour, the look approved in Phase 0. */
export const START_HOUR = 19.5;

interface Keyframe {
  hour: number;
  time: TimeOfDay;
}

/**
 * The key moments, in order through the day. Night holds from 22:00 to 04:30 (two keyframes with one look), then
 * dawn comes up, the day holds from 11:00 to 14:00, and the light goes golden and blue again.
 */
export const KEYFRAMES: readonly Keyframe[] = [
  { hour: 4.5, time: "night" },
  { hour: 6.5, time: "dawn" },
  { hour: 11, time: "day" },
  { hour: 14, time: "day" },
  { hour: 17.5, time: "golden" },
  { hour: 19.5, time: "dusk" },
  { hour: 22, time: "night" },
];

/** The hour each fixed setting holds at. */
export const HOUR_OF: Record<TimeOfDay, number> = { dawn: 6.5, day: 12.5, golden: 17.5, dusk: 19.5, night: 0 };

/** Hours 0 up to (not including) 24, whatever is given. */
export const wrapHour = (hour: number): number => ((hour % 24) + 24) % 24;

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mixColor = (a: string, b: string, t: number) => {
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex([lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]);
};

const COLOR_KEYS = ["background", "fogColor", "hemiSky", "hemiGround", "sunColor", "lanternColor", "windowColor"] as const;
const NUMBER_KEYS = ["fogDensity", "hemiIntensity", "sunIntensity", "lanternIntensity", "windowGlow", "catGlow", "bloomIntensity", "bloomThreshold", "vignette", "saturation", "contrast", "fireflies"] as const;

/** A look part of the way (t, 0 to 1) from `a` to `b`. Colours and numbers blend straight; the label is the nearer one's. */
export function blendPresets(a: TimePreset, b: TimePreset, t: number): TimePreset {
  const out = { ...a, label: t < 0.5 ? a.label : b.label } as TimePreset;
  for (const k of COLOR_KEYS) out[k] = mixColor(a[k], b[k], t);
  for (const k of NUMBER_KEYS) out[k] = lerp(a[k], b[k], t);
  out.sunPosition = [lerp(a.sunPosition[0], b.sunPosition[0], t), lerp(a.sunPosition[1], b.sunPosition[1], t), lerp(a.sunPosition[2], b.sunPosition[2], t)];
  return out;
}

/** The look of the street at `hour`: the two key moments around it, eased between. */
export function presetAtHour(hour: number): TimePreset {
  const h = wrapHour(hour);
  // Between the last keyframe and the first of the next day (22:00 to 04:30) it is all night.
  const first = KEYFRAMES[0];
  const last = KEYFRAMES[KEYFRAMES.length - 1];
  if (h >= last.hour || h < first.hour) return blendPresets(TIME_PRESETS[last.time], TIME_PRESETS[first.time], 0);
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (h >= a.hour && h < b.hour) return blendPresets(TIME_PRESETS[a.time], TIME_PRESETS[b.time], smooth((h - a.hour) / (b.hour - a.hour)));
  }
  return TIME_PRESETS[last.time];
}

export interface DayClock {
  /** 0 up to 24. */
  hour: number;
}

export function createClock(hour: number = START_HOUR): DayClock {
  return { hour: wrapHour(hour) };
}

/** Shortest signed distance in hours from `from` round to `to` (between -12 and 12). */
export function hoursBetween(from: number, to: number): number {
  const d = wrapHour(to - from);
  return d > 12 ? d - 24 : d;
}

/** How quickly the clock eases to a fixed moment: the time constant, in seconds. */
export const EASE_SECONDS = 0.7;

/**
 * Moves the clock on by `dt` seconds. Running by itself it advances 24 hours every `DAY_SECONDS`. Told to hold at
 * a moment it eases there by the shorter way round, so choosing a time is a short transition and never a cut.
 */
export function stepClock(clock: DayClock, dt: number, setting: TimeSetting): void {
  if (setting === "auto") {
    clock.hour = wrapHour(clock.hour + (dt * 24) / DAY_SECONDS);
    return;
  }
  const delta = hoursBetween(clock.hour, HOUR_OF[setting]);
  if (Math.abs(delta) < 0.002) {
    clock.hour = HOUR_OF[setting];
    return;
  }
  clock.hour = wrapHour(clock.hour + delta * (1 - Math.exp(-dt / EASE_SECONDS)));
}

/** The name of the part of the day, for announcing it: "Dawn", "Day", "Golden hour", "Blue hour" or "Night". */
export function phaseName(hour: number): string {
  const h = wrapHour(hour);
  if (h >= 22 || h < 4.5) return TIME_PRESETS.night.label;
  if (h < 8.5) return TIME_PRESETS.dawn.label;
  if (h < 16) return TIME_PRESETS.day.label;
  if (h < 18.5) return TIME_PRESETS.golden.label;
  return TIME_PRESETS.dusk.label;
}
