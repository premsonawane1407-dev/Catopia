// PHASE 0 LOOK TEST - throwaway. Frame-time sampling used to record real numbers.

export interface PerfSummary {
  frames: number;
  seconds: number;
  fpsAvg: number;
  intervalMs: { p50: number; p95: number; p99: number; max: number };
  costMs: { p50: number; p95: number; p99: number; max: number };
  drawCalls: number;
  triangles: number;
  bufferSize: string;
  cssSize: string;
  devicePixelRatio: number;
  gpu: string;
  visibility: string;
  hasFocus: boolean;
}

export const perfStore = {
  intervals: [] as number[],
  costs: [] as number[],
  drawCalls: 0,
  triangles: 0,
  bufferSize: "",
  gpu: "unknown",
  last: 0,
};

export function resetPerf() {
  perfStore.intervals = [];
  perfStore.costs = [];
  perfStore.last = 0;
}

function pct(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function stat(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const r = (v: number) => Math.round(v * 100) / 100;
  return { p50: r(pct(s, 50)), p95: r(pct(s, 95)), p99: r(pct(s, 99)), max: r(s[s.length - 1] ?? 0) };
}

export function summarize(): PerfSummary {
  const total = perfStore.intervals.reduce((a, b) => a + b, 0);
  const frames = perfStore.intervals.length;
  return {
    frames,
    seconds: Math.round(total) / 1000,
    fpsAvg: frames > 0 ? Math.round((frames / (total / 1000)) * 10) / 10 : 0,
    intervalMs: stat(perfStore.intervals),
    costMs: stat(perfStore.costs),
    drawCalls: perfStore.drawCalls,
    triangles: perfStore.triangles,
    bufferSize: perfStore.bufferSize,
    cssSize: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    gpu: perfStore.gpu,
    visibility: document.visibilityState,
    hasFocus: document.hasFocus(),
  };
}
