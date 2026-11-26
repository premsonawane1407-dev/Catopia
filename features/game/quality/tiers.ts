// Quality tiers. Phase 0 measured that only a lower render resolution and cheaper anti-aliasing make
// a tier meaningfully faster, so tiers change those first and effects second.

export type TierName = "full" | "light" | "minimal";

/** From richest to cheapest. */
export const TIER_ORDER: readonly TierName[] = ["full", "light", "minimal"];

export interface TierSpec {
  label: string;
  /** Run the post-processing stack at all (blur, bloom, grade, vignette). */
  post: boolean;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  /** The miniature bokeh blur. */
  blur: boolean;
  /** Most taps the blur may use. */
  blurSamples: number;
  /** Multisample anti-aliasing samples inside the post stack. */
  msaa: number;
  /** Cheap post-process anti-aliasing, used when MSAA is off. */
  smaa: boolean;
  /** Post-processing buffer precision: half-float keeps bright highlights, 8-bit is cheaper. */
  frameBuffer: "half" | "byte";
  /** Multiplier on the render resolution. */
  renderScale: number;
  /** Real point lights (lamps). Glow sprites stay regardless. */
  pointLights: number;
  /** Multiplier on how many fireflies and leaves there are. */
  particleScale: number;
}

export const TIERS: Record<TierName, TierSpec> = {
  full: { label: "Full", post: true, shadows: true, shadowMapSize: 2048, bloom: true, blur: true, blurSamples: 56, msaa: 4, smaa: false, frameBuffer: "half", renderScale: 1, pointLights: 4, particleScale: 1 },
  light: { label: "Light", post: true, shadows: true, shadowMapSize: 1024, bloom: true, blur: true, blurSamples: 24, msaa: 0, smaa: true, frameBuffer: "byte", renderScale: 0.75, pointLights: 2, particleScale: 0.5 },
  minimal: { label: "Minimal", post: false, shadows: false, shadowMapSize: 512, bloom: false, blur: false, blurSamples: 16, msaa: 0, smaa: false, frameBuffer: "half", renderScale: 0.6, pointLights: 0, particleScale: 0.25 },
};

/** The next cheaper tier, or null if already at the cheapest. */
export function cheaperTier(tier: TierName): TierName | null {
  const i = TIER_ORDER.indexOf(tier);
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
}

/** The next richer tier, or null if already at the richest. */
export function richerTier(tier: TierName): TierName | null {
  const i = TIER_ORDER.indexOf(tier);
  return i > 0 ? TIER_ORDER[i - 1] : null;
}

export interface DeviceHints {
  isTouch: boolean;
  /** navigator.hardwareConcurrency, or 0 if unknown. */
  cores: number;
  /** navigator.deviceMemory in GB, when the browser reports it. */
  memoryGb?: number;
}

/**
 * A first guess before any frame has been measured. The automatic governor then corrects it, so this
 * only needs to avoid the worst first impression: a phone struggling at Full, or a desktop at Minimal.
 */
export function initialTier({ isTouch, cores, memoryGb }: DeviceHints): TierName {
  if (isTouch) return cores >= 6 && (memoryGb ?? 4) >= 4 ? "light" : "minimal";
  return cores >= 4 || cores === 0 ? "full" : "light";
}
