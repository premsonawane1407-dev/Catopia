// The numbers behind the approved Phase 0 look ("B": a smooth lit world with pixel-art surfaces and a
// pixel-art cat). Change them here, not inside components, and re-check the look when you do.

export const LOOK = {
  /**
   * The miniature blur, by depth: sharp at the cat's distance, then more blurred the farther a thing is from it along the view
   * direction (distances are world units).
   */
  blur: {
    /** How far behind the cat's distance things stay sharp, and how long the ramp to full blur is. */
    sharpFar: 2.6,
    featherFar: 4.5,
    /** The same for things nearer than the cat (roof tops, lamp heads). */
    sharpNear: 1.6,
    featherNear: 3.0,
    /** Strongest blur radius in pixels at 1080 rows. */
    maxRadius: 24,
    /** How strongly bright lights melt into round bokeh orbs. */
    boost: 1.3,
  },
  bloom: { smoothing: 0.2, radius: 0.7 },
  vignetteOffset: 0.25,
  /** How strongly the cat's normal map shades it under lamp light. */
  catNormalScale: 0.85,
} as const;
