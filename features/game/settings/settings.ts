// Player preferences. Kept as plain data plus validation, so loading a stale or tampered value
// from storage can never put the game into an impossible state.

import { COAT_PRESETS } from "../cat/coat";
import type { TimeSetting } from "../render/day-clock";

export type QualitySetting = "auto" | "full" | "light" | "minimal";
export type MotionSetting = "system" | "full" | "reduced";

export interface GameSettings {
  muted: boolean;
  quality: QualitySetting;
  motion: MotionSetting;
  /** The time of day: "auto" lets the day pass, anything else holds the street at that moment. */
  time: TimeSetting;
  /** Which cat you play: the id of one of the coats (Pumpkin, Ash, Salem, Oreo, Patches, Toffee). */
  cat: string;
  /** Show the frame-time and draw-call overlay. */
  showStats: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  quality: "auto",
  motion: "system",
  time: "auto",
  cat: "marmalade",
  showStats: false,
};

export const SETTINGS_KEY = "catopia.game.settings.v1";

const QUALITY: readonly QualitySetting[] = ["auto", "full", "light", "minimal"];
const MOTION: readonly MotionSetting[] = ["system", "full", "reduced"];
const TIME: readonly TimeSetting[] = ["auto", "dawn", "day", "golden", "dusk", "night"];

/** Reads settings from stored JSON, falling back to the default for anything missing or invalid. */
export function parseSettings(raw: string | null | undefined): GameSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (typeof data !== "object" || data === null) return { ...DEFAULT_SETTINGS };
  const d = data as Record<string, unknown>;
  return {
    muted: typeof d.muted === "boolean" ? d.muted : DEFAULT_SETTINGS.muted,
    quality: QUALITY.includes(d.quality as QualitySetting) ? (d.quality as QualitySetting) : DEFAULT_SETTINGS.quality,
    motion: MOTION.includes(d.motion as MotionSetting) ? (d.motion as MotionSetting) : DEFAULT_SETTINGS.motion,
    time: TIME.includes(d.time as TimeSetting) ? (d.time as TimeSetting) : DEFAULT_SETTINGS.time,
    cat: typeof d.cat === "string" && COAT_PRESETS.some((c) => c.id === d.cat) ? d.cat : DEFAULT_SETTINGS.cat,
    showStats: typeof d.showStats === "boolean" ? d.showStats : DEFAULT_SETTINGS.showStats,
  };
}

export function serializeSettings(settings: GameSettings): string {
  return JSON.stringify(settings);
}

/** The motion setting the game should actually follow. "system" defers to the operating system. */
export function resolveMotion(setting: MotionSetting, systemPrefersReduced: boolean): "full" | "reduced" {
  if (setting === "system") return systemPrefersReduced ? "reduced" : "full";
  return setting;
}
