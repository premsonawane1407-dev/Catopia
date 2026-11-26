// Frame-time and renderer statistics for the stats overlay and for verification. Plain data and maths,
// so the percentiles and the ring buffer can be tested without a GPU.

/** The value below which `p` (0-1) of the samples fall. Returns 0 for no samples. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

export interface RendererStats {
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  /** Size of the drawing buffer, such as "1600x900". */
  buffer: string;
}

export interface PerfSnapshot extends RendererStats {
  /** Frames recorded since the store was created or reset. */
  frames: number;
  fps: number;
  frameMsAvg: number;
  frameMsP95: number;
  frameMsMax: number;
  tier: string;
  /** Graphics contexts created, released on purpose (the game was left) and lost unexpectedly since the page loaded. */
  contextsCreated: number;
  contextsReleased: number;
  contextsLost: number;
  /** Contexts still alive: created minus released minus lost. Should be 1 while playing and 0 after leaving. */
  contextsActive: number;
}

const EMPTY_RENDERER: RendererStats = { drawCalls: 0, triangles: 0, geometries: 0, textures: 0, programs: 0, buffer: "" };

export function createPerfStore(capacity = 180) {
  let samples: number[] = [];
  let frames = 0;
  let renderer: RendererStats = EMPTY_RENDERER;
  let tier = "";
  let contextsCreated = 0;
  let contextsReleased = 0;
  let contextsLost = 0;

  return {
    /** Records one frame's duration. Absurd values (a tab coming back to life) are ignored. */
    pushFrame(ms: number) {
      if (!(ms > 0) || ms > 1000) return;
      frames += 1;
      samples.push(ms);
      if (samples.length > capacity) samples = samples.slice(samples.length - capacity);
    },
    setRenderer(stats: RendererStats) {
      renderer = stats;
    },
    setTier(name: string) {
      tier = name;
    },
    contextCreated() {
      contextsCreated += 1;
    },
    contextReleased() {
      contextsReleased += 1;
    },
    contextLost() {
      contextsLost += 1;
    },
    reset() {
      samples = [];
      frames = 0;
    },
    snapshot(): PerfSnapshot {
      const sum = samples.reduce((a, b) => a + b, 0);
      const avg = samples.length ? sum / samples.length : 0;
      return {
        ...renderer,
        frames,
        fps: avg > 0 ? 1000 / avg : 0,
        frameMsAvg: avg,
        frameMsP95: percentile(samples, 0.95),
        frameMsMax: samples.length ? Math.max(...samples) : 0,
        tier,
        contextsCreated,
        contextsReleased,
        contextsLost,
        contextsActive: contextsCreated - contextsReleased - contextsLost,
      };
    },
  };
}

export type PerfStore = ReturnType<typeof createPerfStore>;

/** One shared store for the running game. */
export const perfStore: PerfStore = createPerfStore();
