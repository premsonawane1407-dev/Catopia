// A small readout of frame time, draw calls and graphics contexts. Off by default: turn it on in the pause
// menu, or open /play?perf=1.
import { useEffect, useState } from "react";
import { perfStore, type PerfSnapshot } from "./perf-store";

export function formatStats(s: PerfSnapshot): string {
  return [
    `${s.fps.toFixed(0)} fps · ${s.frameMsAvg.toFixed(1)} ms avg · ${s.frameMsP95.toFixed(1)} ms p95`,
    `tier ${s.tier || "-"} · buffer ${s.buffer || "-"}`,
    `${s.drawCalls} draw calls · ${s.triangles.toLocaleString("en-US")} triangles`,
    `${s.geometries} geometries · ${s.textures} textures · ${s.programs} programs`,
    `contexts: ${s.contextsActive} live (${s.contextsCreated} created, ${s.contextsReleased} released, ${s.contextsLost} lost)`,
  ].join("\n");
}

export function PerfOverlay() {
  const [text, setText] = useState(() => formatStats(perfStore.snapshot()));
  useEffect(() => {
    const id = window.setInterval(() => setText(formatStats(perfStore.snapshot())), 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <pre className="cg-stats" aria-hidden="true">
      {text}
    </pre>
  );
}
