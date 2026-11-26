// Measures what one frame costs, in milliseconds of CPU plus GPU time, by drawing frames back to back and
// forcing the GPU to finish each one. This is different from frames per second: it does not depend on
// requestAnimationFrame (which browsers throttle in hidden or unfocused tabs) and so can be read anywhere.
// Used only for verification, through window.__catopia.bench in development or with /play?perf=1.
import type { WebGLRenderer } from "three";
import { percentile } from "./perf-store";

export interface BenchTarget {
  gl: WebGLRenderer;
  /** react-three-fiber's `advance`: draws one frame now. */
  advance: (timestamp: number) => void;
}

export interface CostSummary {
  frames: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

export function summarizeCosts(costs: readonly number[]): CostSummary {
  return {
    frames: costs.length,
    p50: percentile(costs, 0.5),
    p95: percentile(costs, 0.95),
    p99: percentile(costs, 0.99),
    max: costs.length ? Math.max(...costs) : 0,
  };
}

export interface BenchResult extends CostSummary {
  drawCalls: number;
  triangles: number;
  buffer: string;
}

let target: BenchTarget | null = null;

export function setBenchTarget(next: BenchTarget | null): void {
  target = next;
}

/** A number that changes when the picture changes (FNV-1a over every 5th byte of the pixels). */
export function fingerprintPixels(pixels: Uint8Array): number {
  let hash = 2166136261;
  for (let i = 0; i < pixels.length; i += 5) {
    hash ^= pixels[i];
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Draws one frame and fingerprints the picture. Two calls a moment apart give the same number only if
 * nothing on screen moved, which is how reduced motion is checked without trusting a screenshot.
 */
export function frameFingerprint(): number {
  if (!target) throw new Error("The game is not running, so there is no picture to fingerprint");
  const { gl, advance } = target;
  advance(performance.now());
  const context = gl.getContext();
  const { width, height } = gl.domElement;
  const pixels = new Uint8Array(width * height * 4);
  context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels);
  return fingerprintPixels(pixels);
}

export function benchFrames(frames = 150): BenchResult {
  if (!target) throw new Error("The game is not running, so there is nothing to measure");
  const { gl, advance } = target;
  const context = gl.getContext();
  const pixel = new Uint8Array(4);
  // The first frames include shader compilation and texture uploads.
  for (let i = 0; i < 20; i++) advance(performance.now());
  const costs: number[] = [];
  for (let i = 0; i < frames; i++) {
    const start = performance.now();
    advance(start);
    context.readPixels(0, 0, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel);
    costs.push(performance.now() - start);
  }
  return { ...summarizeCosts(costs), drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles, buffer: `${gl.domElement.width}x${gl.domElement.height}` };
}
