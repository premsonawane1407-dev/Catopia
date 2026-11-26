"use client";

// PHASE 0 LOOK TEST - throwaway lab page. Compares two looks side by side (one switch) and records
// real performance numbers. Dev only (the route 404s in production). Nothing in the real app imports this.
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebGLRenderer } from "three";
import { Cat } from "./cat";
import { CameraRig } from "./camera-rig";
import { Catalog } from "./catalog";
import { Lighting } from "./lighting";
import { Particles } from "./particles";
import { perfStore, resetPerf, summarize, type PerfSummary } from "./perf";
import { DEFAULT_STATE, TIERS, TIME_PRESETS, type LabState, type Tier, type TimeOfDay, type Variant, type View } from "./presets";
import { labUniforms } from "./materials";
import { PlainRender, PostStack } from "./stack";
import { LANTERNS, Street } from "./street";
import "./look-test.css";

interface LabApi {
  getState: () => LabState;
  setState: (patch: Partial<LabState>) => void;
  stats: () => PerfSummary;
  resetStats: () => void;
  bench: (seconds: number, sync?: boolean) => Promise<PerfSummary>;
  benchSync: (frames: number) => PerfSummary;
  benchAll: () => Promise<string>;
  capture: (name: string) => Promise<string>;
  captureCrop: (name: string, region: [number, number, number, number], zoom: number) => Promise<string>;
  record: (name: string, seconds: number) => Promise<string>;
  info: () => Record<string, unknown>;
}

declare global {
  interface Window {
    __lab?: LabApi;
  }
}

const CAT_POSITION: [number, number, number] = [0, 0, 0.6];
// The camera looks a little behind and above the cat so the houses fill the top of the frame.
const CAMERA_TARGET: [number, number, number] = [0, 0.9, -0.9];
const CAT_FRAME_PX = 48;

function stateFromQuery(): LabState {
  const q = new URLSearchParams(window.location.search);
  const s = { ...DEFAULT_STATE };
  const v = q.get("v");
  if (v === "pixel" || v === "hd") s.variant = v;
  const t = q.get("t");
  if (t === "golden" || t === "dusk" || t === "night") s.tod = t;
  const tier = q.get("tier");
  if (tier === "full" || tier === "light" || tier === "minimal") s.tier = tier;
  if (q.get("view") === "catalog") s.view = "catalog";
  const g = q.get("group");
  if (g === "walls" || g === "roofs" || g === "props") s.catalogGroup = g;
  const rows = Number(q.get("rows"));
  if ([180, 270, 360, 540].includes(rows)) s.rows = rows;
  if (q.get("ui") === "0") s.showUi = false;
  if (q.get("sway") === "1") s.sway = true;
  return s;
}

function PerfProbe({ syncRef }: { syncRef: React.RefObject<boolean> }) {
  const start = useRef(0);
  useFrame(({ gl }) => {
    gl.info.autoReset = false;
    gl.info.reset();
    start.current = performance.now();
  }, -1000);
  useFrame(({ gl }) => {
    if (syncRef.current) {
      // Force the GPU to finish so the measured cost includes real GPU work, not just queued commands.
      const ctx = gl.getContext();
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, new Uint8Array(4));
    }
    const now = performance.now();
    if (syncRef.current) perfStore.costs.push(now - start.current);
    if (perfStore.last) perfStore.intervals.push(now - perfStore.last);
    perfStore.last = now;
    if (perfStore.intervals.length > 900) perfStore.intervals.splice(0, perfStore.intervals.length - 900);
    if (perfStore.costs.length > 900) perfStore.costs.splice(0, perfStore.costs.length - 900);
    perfStore.drawCalls = gl.info.render.calls;
    perfStore.triangles = gl.info.render.triangles;
    perfStore.bufferSize = `${gl.domElement.width}x${gl.domElement.height}`;
  }, 1000);
  return null;
}

function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; text: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="lab-row">
      <label>{label}</label>
      <div className="lab-seg">
        {options.map((o) => (
          <button key={String(o.v)} className={o.v === value ? "on" : ""} onClick={() => onChange(o.v)}>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="lab-row lab-slider">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span>{value}</span>
    </div>
  );
}

export default function LookTest() {
  const [state, setState] = useState<LabState>(stateFromQuery);
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }));
  const [toast, setToast] = useState("");
  const [stats, setStats] = useState<PerfSummary | null>(null);
  const glRef = useRef<WebGLRenderer | null>(null);
  const syncRef = useRef(false);
  const advanceRef = useRef<((t: number) => void) | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const preset = TIME_PRESETS[state.tod];
  const tier = TIERS[state.tier];
  const pixel = state.variant === "pixel";

  // Whole device pixels per game pixel, so the pixel grid is perfectly even.
  const scale = Math.max(1, Math.round((viewport.h * viewport.dpr) / state.rows));
  const gameRows = (viewport.h * viewport.dpr) / scale;
  const unitsPerGamePx = (2 * state.distance * Math.tan((state.fov * Math.PI) / 360)) / gameRows;
  const catWidth = CAT_FRAME_PX * unitsPerGamePx;
  const canvasDpr = pixel ? viewport.dpr / scale : Math.min(viewport.dpr, 2) * tier.renderScale;
  const cssPerGamePx = scale / viewport.dpr;

  useEffect(() => {
    labUniforms.strength.value = state.textures ? 1 : 0;
  }, [state.textures]);

  const patch = useCallback((p: Partial<LabState>) => setState((s) => ({ ...s, ...p })), []);

  const saveBlob = useCallback(async (name: string, blob: Blob) => {
    const res = await fetch(`/lab/api/save?name=${encodeURIComponent(name)}`, { method: "POST", body: blob });
    const json = (await res.json()) as { saved?: string; error?: string };
    return json.saved ?? json.error ?? "unknown error";
  }, []);

  const upscaledCanvas = useCallback(() => {
    const gl = glRef.current;
    if (!gl) throw new Error("renderer not ready");
    const src = gl.domElement;
    const out = document.createElement("canvas");
    out.width = Math.round(window.innerWidth * window.devicePixelRatio);
    out.height = Math.round(window.innerHeight * window.devicePixelRatio);
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = stateRef.current.variant !== "pixel";
    ctx.drawImage(src, 0, 0, out.width, out.height);
    return out;
  }, []);

  /** Renders fresh frames synchronously, so captures work even when the page is hidden and animation frames are throttled. */
  const renderNow = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 120));
    const advance = advanceRef.current;
    if (advance) for (let i = 0; i < 3; i++) advance(performance.now());
  }, []);

  useEffect(() => {
    const api: LabApi = {
      getState: () => stateRef.current,
      setState: (p) => setState((s) => ({ ...s, ...p })),
      stats: () => summarize(),
      resetStats: () => resetPerf(),
      bench: async (seconds, sync = true) => {
        resetPerf();
        syncRef.current = sync;
        await new Promise((r) => setTimeout(r, seconds * 1000));
        syncRef.current = false;
        return summarize();
      },
      benchSync: (frames) => {
        // Runs frames back to back in one task, so it works even when the page is hidden and
        // requestAnimationFrame is throttled. Measures real CPU + GPU cost per frame.
        const advance = advanceRef.current;
        if (!advance) throw new Error("renderer not ready");
        for (let i = 0; i < 20; i++) advance(performance.now());
        resetPerf();
        syncRef.current = true;
        for (let i = 0; i < frames; i++) advance(performance.now());
        syncRef.current = false;
        return summarize();
      },
      benchAll: async () => {
        const results: unknown[] = [];
        for (const variant of ["pixel", "hd"] as const) {
          for (const tier of ["full", "light", "minimal"] as const) {
            setState((s) => ({ ...s, variant, tier, tod: "dusk", rows: 270, view: "scene", sway: true }));
            await new Promise((r) => setTimeout(r, 3500));
            resetPerf();
            syncRef.current = false;
            await new Promise((r) => setTimeout(r, 6000));
            const fps = summarize();
            resetPerf();
            syncRef.current = true;
            await new Promise((r) => setTimeout(r, 3000));
            syncRef.current = false;
            const cost = summarize();
            results.push({ variant, tier, fpsAvg: fps.fpsAvg, intervalMs: fps.intervalMs, costMs: cost.costMs, drawCalls: cost.drawCalls, triangles: cost.triangles, bufferSize: cost.bufferSize, cssSize: cost.cssSize, devicePixelRatio: cost.devicePixelRatio, gpu: cost.gpu, visibility: fps.visibility, hasFocus: fps.hasFocus, frames: fps.frames });
          }
        }
        const name = `bench-all-${Date.now()}.json`;
        return saveBlob(name, new Blob([JSON.stringify(results, null, 2)], { type: "application/json" }));
      },
      capture: async (name) => {
        await renderNow();
        const canvas = upscaledCanvas();
        const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));
        return saveBlob(name, blob);
      },
      captureCrop: async (name, [x, y, w, h], zoom) => {
        await renderNow();
        const full = upscaledCanvas();
        const dpr = window.devicePixelRatio;
        const out = document.createElement("canvas");
        out.width = Math.round(w * dpr * zoom);
        out.height = Math.round(h * dpr * zoom);
        const ctx = out.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(full, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, out.width, out.height);
        const blob = await new Promise<Blob>((r) => out.toBlob((b) => r(b!), "image/png"));
        return saveBlob(name, blob);
      },
      record: async (name, seconds) => {
        const out = upscaledCanvas();
        const ctx = out.getContext("2d")!;
        const smooth = stateRef.current.variant !== "pixel";
        const stream = out.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm", videoBitsPerSecond: 8_000_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        const done = new Promise<void>((r) => (recorder.onstop = () => r()));
        let running = true;
        const draw = () => {
          if (!running || !glRef.current) return;
          ctx.imageSmoothingEnabled = smooth;
          ctx.drawImage(glRef.current.domElement, 0, 0, out.width, out.height);
          requestAnimationFrame(draw);
        };
        draw();
        recorder.start();
        await new Promise((r) => setTimeout(r, seconds * 1000));
        running = false;
        recorder.stop();
        await done;
        return saveBlob(name, new Blob(chunks, { type: "video/webm" }));
      },
      info: () => ({ scale, gameRows, unitsPerGamePx, catWidth, canvasDpr, cssPerGamePx, viewport }),
    };
    window.__lab = api;
    return () => {
      delete window.__lab;
    };
  }, [saveBlob, upscaledCanvas, renderNow, scale, gameRows, unitsPerGamePx, catWidth, canvasDpr, cssPerGamePx, viewport]);

  useEffect(() => {
    const id = setInterval(() => setStats(summarize()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "h") patch({ showUi: !stateRef.current.showUi });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [patch]);

  const shadowsOn = state.shadows && tier.shadows;
  const snapUnits = pixel ? unitsPerGamePx : 0;
  const fireflySize = pixel ? 3 * cssPerGamePx : 5;
  const post = tier.post && state.view === "scene";

  const toastTimer = useRef<number | undefined>(undefined);
  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 4000);
  }, []);

  const lanterns = useMemo(() => LANTERNS, []);

  return (
    <div className="lab-root">
      <div className="lab-canvas">
        <Canvas
          dpr={canvasDpr}
          shadows={shadowsOn ? "soft" : false}
          camera={{ fov: state.fov, near: 0.1, far: 120, position: [0, 9, 12] }}
          gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
          style={{ imageRendering: pixel ? "pixelated" : "auto" }}
          onCreated={({ gl, advance }) => {
            glRef.current = gl;
            advanceRef.current = (t) => advance(t);
            const dbg = gl.getContext().getExtension("WEBGL_debug_renderer_info");
            perfStore.gpu = dbg ? String(gl.getContext().getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "unknown";
          }}
        >
          <Suspense fallback={null}>
            {state.view === "catalog" ? (
              <>
                <color attach="background" args={["#2a2833"]} />
                <hemisphereLight args={["#ffffff", "#666677", 1.1]} />
                <directionalLight position={[8, 14, 10]} intensity={2.2} />
                <Catalog group={state.catalogGroup} />
              </>
            ) : (
              <>
                <Lighting preset={preset} tier={tier} shadows={shadowsOn} lanterns={lanterns} />
                <Street preset={preset} pixelGround={state.textures} windowDetail={state.windowDetail} foreground={state.foreground} />
                {state.particles && <Particles scale={tier.particleScale} fireflySize={fireflySize} fireflyColor={preset.windowColor} leaves />}
                <Cat position={CAT_POSITION} width={catWidth} lean={state.lean} pitchDeg={state.pitch} tint={preset.catTint} lit={state.catLit} glow={preset.catGlow} />
                <CameraRig fov={state.fov} pitch={state.pitch} distance={state.distance} sway={state.sway} snapUnits={snapUnits} target={CAMERA_TARGET} />
              </>
            )}
          </Suspense>
          {post ? <PostStack state={state} preset={preset} tier={tier} /> : <PlainRender />}
          <PerfProbe syncRef={syncRef} />
        </Canvas>
      </div>

      {state.showUi && (
        <div className="lab-panel">
          <h1>Phase 0 look test</h1>
          <small>Dev only. Press H to hide this panel.</small>
          <Seg<Variant> label="Look" value={state.variant} onChange={(variant) => patch({ variant })} options={[{ v: "pixel", text: "A · Pixelated 3D" }, { v: "hd", text: "B · HD world + pixel cat" }]} />
          <Seg<View> label="View" value={state.view} onChange={(view) => patch({ view })} options={[{ v: "scene", text: "Street" }, { v: "catalog", text: "Piece catalog" }]} />
          <Seg<"walls" | "roofs" | "props"> label="Catalog group" value={state.catalogGroup} onChange={(catalogGroup) => patch({ catalogGroup })} options={[{ v: "walls", text: "Walls" }, { v: "roofs", text: "Roofs" }, { v: "props", text: "Props" }]} />
          <Seg<TimeOfDay> label="Time" value={state.tod} onChange={(tod) => patch({ tod })} options={(Object.keys(TIME_PRESETS) as TimeOfDay[]).map((v) => ({ v, text: TIME_PRESETS[v].label }))} />
          <Seg<Tier> label="Quality tier" value={state.tier} onChange={(t) => patch({ tier: t })} options={(Object.keys(TIERS) as Tier[]).map((v) => ({ v, text: TIERS[v].label }))} />
          <Seg<number> label="Pixel rows" value={state.rows} onChange={(rows) => patch({ rows })} options={[180, 270, 360, 540].map((v) => ({ v, text: String(v) }))} />
          <div className="lab-row lab-checks">
            {(
              [
                ["tilt", "Tilt-shift"],
                ["bloom", "Bloom"],
                ["outline", "Outlines (A)"],
                ["vignette", "Vignette"],
                ["grain", "Grain"],
                ["colorDepth", "Posterize"],
                ["particles", "Particles"],
                ["shadows", "Shadows"],
                ["sway", "Camera sway"],
                ["textures", "Pixel textures"],
                ["windowDetail", "Lit windows"],
                ["foreground", "Foreground"],
                ["catLit", "Cat lighting"],
              ] as const
            ).map(([key, text]) => (
              <label key={key}>
                <input type="checkbox" checked={state[key]} onChange={(e) => patch({ [key]: e.target.checked })} />
                {text}
              </label>
            ))}
          </div>
          <Slider label="Sharp above" value={state.tiltUp} min={0.03} max={0.5} step={0.01} onChange={(tiltUp) => patch({ tiltUp })} />
          <Slider label="Sharp below" value={state.tiltDown} min={0.02} max={0.4} step={0.01} onChange={(tiltDown) => patch({ tiltDown })} />
          <Slider label="Blur ramp" value={state.tiltFeather} min={0.05} max={0.7} step={0.01} onChange={(tiltFeather) => patch({ tiltFeather })} />
          <Slider label="Blur radius" value={state.blurRadius} min={0} max={90} step={1} onChange={(blurRadius) => patch({ blurRadius })} />
          <Slider label="Bokeh orbs" value={state.bokeh} min={0} max={4} step={0.1} onChange={(bokeh) => patch({ bokeh })} />
          <Slider label="Camera FOV" value={state.fov} min={14} max={45} step={1} onChange={(fov) => patch({ fov })} />
          <Slider label="Camera pitch" value={state.pitch} min={20} max={60} step={1} onChange={(pitch) => patch({ pitch })} />
          <Slider label="Distance" value={state.distance} min={8} max={26} step={0.5} onChange={(distance) => patch({ distance })} />
          <Slider label="Cat lean" value={state.lean} min={0} max={1} step={0.05} onChange={(lean) => patch({ lean })} />
          <div className="lab-row" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="lab-btn" onClick={async () => flash("Saved " + (await window.__lab!.capture(`${state.variant}-${state.tod}-${state.tier}-r${state.rows}.png`)))}>Save still</button>
            <button className="lab-btn" onClick={async () => { flash("Recording 8s…"); flash("Saved " + (await window.__lab!.record(`${state.variant}-${state.tod}-sway.webm`, 8))); }}>Record 8s</button>
            <button className="lab-btn" onClick={async () => { flash("Benchmarking all 6 looks (about 80 s). Keep this tab visible."); flash("Saved " + (await window.__lab!.benchAll())); }}>Bench all</button>
            <button className="lab-btn" onClick={async () => { flash("Benchmarking 10s…"); const r = await window.__lab!.bench(10); flash(`Bench: ${r.fpsAvg} fps, cost p95 ${r.costMs.p95} ms`); }}>Bench 10s</button>
            <button className="lab-btn" onClick={async () => { flash("Benchmarking all 6 looks (about 75 s). Keep this tab visible."); flash("Saved " + (await window.__lab!.benchAll())); }}>Bench all</button>
          </div>
          <div className="lab-stats">
            {stats
              ? `fps ${stats.fpsAvg} · interval p95 ${stats.intervalMs.p95} ms\ncost p95 ${stats.costMs.p95} ms (bench only)\ndraw calls ${stats.drawCalls} · tris ${stats.triangles.toLocaleString()}\nbuffer ${stats.bufferSize} · css ${stats.cssSize} @${stats.devicePixelRatio}\n1 game px = ${scale} device px (${Math.round(gameRows)} rows)\ngpu ${stats.gpu}`
              : "measuring…"}
          </div>
        </div>
      )}
      {toast && <div className="lab-toast">{toast}</div>}
    </div>
  );
}
