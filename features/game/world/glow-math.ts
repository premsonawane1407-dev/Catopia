// How bright each kind of light halo is for a given time of day. The halos are additive sprites, so
// the numbers are multipliers on the lamp colour; the foreground ones are capped so the big near lanterns
// never wash out the corners at night.
import type { GlowSpec } from "./stage-data";

export function glowIntensity(kind: GlowSpec["kind"], lanternIntensity: number): number {
  const lamp = 0.35 + lanternIntensity * 0.09;
  switch (kind) {
    case "lamp":
      return lamp;
    case "far":
      return lamp * 0.55;
    case "foreground":
      return Math.min(lamp, 1) * 0.9;
  }
}

/** The slow, uneven shimmer of a flame: a size multiplier around 1. `seed` makes every lamp different. */
export function glowFlicker(seconds: number, seed: number): number {
  return 1 + 0.05 * Math.sin(seconds * 7.1 + seed) * Math.sin(seconds * 2.9 + seed * 0.6);
}

/** The shimmer of a lit room behind a window pane: a brightness multiplier around 1 (breathing, never blinking). */
export function windowFlicker(seconds: number, phase: number, amount = 0.1): number {
  return 1 - amount + amount * Math.sin(seconds * 1.4 + phase) * Math.sin(seconds * 0.37 + phase * 0.5 + 1);
}
