// Soft generated textures with no image files behind them.
import { CanvasTexture, SRGBColorSpace } from "three";

export type GradientStops = readonly (readonly [number, string])[];

const HALO: GradientStops = [
  [0, "rgba(255,255,255,1)"],
  [0.4, "rgba(255,255,255,0.45)"],
  [1, "rgba(255,255,255,0)"],
];

/** A soft radial gradient, white in the middle fading to nothing: light halos and blob shadows. */
export function makeRadialTexture(size = 128, stops: GradientStops = HALO): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("A 2D canvas is not available in this browser");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
