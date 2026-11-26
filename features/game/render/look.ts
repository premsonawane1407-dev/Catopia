// The numbers behind the approved Phase 0 look ("B": a smooth lit world with pixel-art surfaces and a
// pixel-art cat). Change them here, not inside components, and re-check the look when you do.

export const LOOK = {
  /** The miniature blur: sharp around the cat, strongly blurred above and below. */
  blur: {
    /** Sharp band above and below the cat, as a fraction of the screen height. */
    focusUp: 0.26,
    focusDown: 0.14,
    /** Length of the ramp from sharp to fully blurred (below the cat it is 60% of this). */
    feather: 0.3,
    /** Strongest blur radius in pixels at 1080 rows. */
    maxRadius: 30,
    /** How strongly bright lights melt into round bokeh orbs. */
    boost: 1.6,
  },
  bloom: { smoothing: 0.2, radius: 0.7 },
  vignetteOffset: 0.25,
  /** How strongly the cat's normal map shades it under lamp light. */
  catNormalScale: 0.85,
} as const;
