// The shapes of the light that comes out of a lit window, as plain maths so they can be tested: how
// bright the light is at each point of a soft glow around the window and of the pool it casts on the
// cobbles. The textures are drawn from these functions. Nothing here may end in a hard edge: a hard edge
// reads as a flat box stuck to the wall, which is what the first version looked like.

/** 0 below `edge0`, 1 above `edge1`, and a smooth S-curve in between. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * A soft halo around the window: brightest in the middle and fading smoothly to nothing before the quad's
 * edge in every direction. `u` runs left to right and `v` top to bottom, both from 0 to 1.
 */
export function haloAlpha(u: number, v: number): number {
  const r2 = (2 * u - 1) ** 2 + (2 * v - 1) ** 2;
  const falloff = Math.max(0, 1 - r2);
  // Squaring the falloff makes the slope zero at the edge, so there is no visible rim.
  return 0.9 * falloff * falloff;
}

/**
 * The pool of window light on the cobbles. `u` runs across the pool (0 to 1) and `v` runs away from the
 * wall (0 at the wall, 1 at the far end). Like a real cone of light it starts about as wide as the window,
 * widens and blurs as it travels, and fades with distance; the shadows of the window bars wash out with
 * distance too.
 */
export function poolAlpha(u: number, v: number): number {
  const d = Math.abs(u - 0.5);
  const half = 0.27 + 0.19 * v;
  const soft = 0.05 + 0.2 * v;
  const lateral = 1 - smoothstep(half - soft, half + soft, d);
  // Light grazes the cobbles right at the wall, so the pool fades in over a short run before it fades out.
  const depth = smoothstep(0, 0.12, v) * (1 - v) ** 1.5;
  const upright = 1 - 0.45 * (1 - v) * (1 - smoothstep(0.015 + 0.03 * v, 0.06 + 0.12 * v, d));
  const cross = 1 - 0.45 * (1 - smoothstep(0.02, 0.06 + 0.06 * v, Math.abs(v - 0.3)));
  return 0.8 * lateral * depth * upright * cross;
}
