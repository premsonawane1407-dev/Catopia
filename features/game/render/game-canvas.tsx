/* eslint-disable react-hooks/immutability -- the renderer's statistics and flags are configured in place by design */

// The 3D canvas: renderer settings that follow the quality tier, the stage scene, the post-processing
// stack (or a plain render at the lowest tier) and the hooks the shell needs: per-frame timing for the
// quality governor, "first frames drawn" so the loading screen can lift, and graphics-context loss.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { setBenchTarget } from "../debug/bench";
import { perfStore } from "../debug/perf-store";
import { TIERS, type TierName } from "../quality/tiers";
import { computePixelGrid } from "../quality/pixel-grid";
import { viewDepth } from "../world/camera-pose";
import { catFocusPoint } from "../world/cat-size";
import type { GameAssets } from "../world/game-assets";
import { CAMERA, CAT_BODY_CENTER, CAT_FRAME_PX, CAT_SCREEN_FRACTION } from "../world/stage-constants";
import { StageScene } from "../world/stage-scene";
import { PlainRender, PostStack } from "./post-stack";
import { TIME_PRESETS, type TimeOfDay } from "./time-presets";

export interface Viewport {
  /** CSS pixels. */
  width: number;
  height: number;
  /** Device pixel ratio of the display. */
  dpr: number;
}

export interface GameCanvasProps {
  assets: GameAssets;
  tier: TierName;
  time: TimeOfDay;
  /** Ambient movement on (true) or reduced (false). */
  motion: boolean;
  /** A paused game stops animating (and drawing, apart from redraws after a change) to save battery. */
  paused: boolean;
  viewport: Viewport;
  /** Called every frame with its duration in milliseconds. */
  onFrame?: (ms: number) => void;
  /** Called once, after the first few frames have been drawn (shaders compiled, textures uploaded). */
  onFirstFrames?: () => void;
  /** Called when the browser takes the graphics context away. */
  onContextLost?: () => void;
}

/** Frames to draw before saying the scene is ready: the first ones include shader compiles and uploads. */
const WARMUP_FRAMES = 4;

/** How far the cat is from the camera along the viewing direction; this is what sets its size per pixel. */
const CAT_DEPTH = viewDepth(CAT_BODY_CENTER);

/** Reports each frame's duration, counts frames and collects renderer statistics for the stats overlay. */
function FrameReporter({ tierName, onFrame, onFirstFrames }: { tierName: TierName; onFrame?: (ms: number) => void; onFirstFrames?: () => void }) {
  const gl = useThree((s) => s.gl);
  const advance = useThree((s) => s.advance);
  const callbacks = useRef({ onFrame, onFirstFrames });
  const frames = useRef(0);
  useEffect(() => {
    callbacks.current = { onFrame, onFirstFrames };
  });

  // Lets verification draw frames on demand and time them (see debug/bench.ts).
  useEffect(() => {
    setBenchTarget({ gl, advance });
    return () => setBenchTarget(null);
  }, [gl, advance]);

  // Draw calls are summed over every pass of a frame (scene, shadow, post effects), not just the last one.
  useFrame(() => {
    gl.info.autoReset = false;
    gl.info.reset();
  }, -1000);

  useFrame((_, delta) => {
    const ms = delta * 1000;
    frames.current += 1;
    perfStore.pushFrame(ms);
    perfStore.setTier(tierName);
    if (frames.current % 15 === 0) {
      const { render, memory, programs } = gl.info;
      perfStore.setRenderer({
        drawCalls: render.calls,
        triangles: render.triangles,
        geometries: memory.geometries,
        textures: memory.textures,
        programs: programs?.length ?? 0,
        buffer: `${gl.domElement.width}x${gl.domElement.height}`,
      });
    }
    // The first frames include shader compilation and texture uploads: keep them out of the timing.
    if (frames.current > WARMUP_FRAMES) callbacks.current.onFrame?.(ms);
    if (frames.current === WARMUP_FRAMES) callbacks.current.onFirstFrames?.();
  }, 1000);
  return null;
}

export function GameCanvas({ assets, tier, time, motion, paused, viewport, onFrame, onFirstFrames, onContextLost }: GameCanvasProps) {
  const spec = TIERS[tier];
  const preset = TIME_PRESETS[time];
  const handlers = useRef({ onContextLost });
  useEffect(() => {
    handlers.current = { onContextLost };
  });

  // The cat's frame covers about CAT_SCREEN_FRACTION of the window height, in whole drawing-buffer pixels per
  // sprite pixel (at the full-quality density, which is capped at 2), so its pixels stay even. The sprite quad
  // is sized to match, and the blur's sharp band follows the cat's body at whatever size that turns out to be.
  const grid = useMemo(
    () =>
      computePixelGrid({
        cssWidth: viewport.width,
        cssHeight: viewport.height,
        dpr: Math.min(viewport.dpr, 2),
        spriteScreenFraction: CAT_SCREEN_FRACTION,
        fovDeg: CAMERA.fov,
        depth: CAT_DEPTH,
        spritePx: CAT_FRAME_PX,
      }),
    [viewport.width, viewport.height, viewport.dpr],
  );
  const focus = useMemo(() => catFocusPoint(grid.spriteWorldWidth), [grid.spriteWorldWidth]);

  return (
    <Canvas
      // A paused game stops animating, but still redraws when something changes (turning the phone, a new
      // quality setting) so the picture behind the pause card is never blank.
      frameloop={paused ? "demand" : "always"}
      dpr={Math.min(viewport.dpr, 2) * spec.renderScale}
      // "percentage" is the filtered shadow map; three.js removed the old "soft" type and warns if it is asked for.
      shadows={spec.shadows ? "percentage" : false}
      flat
      camera={{ fov: CAMERA.fov, near: 0.1, far: 120, position: [0, 9, 12] }}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        perfStore.contextCreated();
        const canvas = gl.domElement;
        canvas.addEventListener("webglcontextlost", (event) => {
          // Tearing the canvas down on purpose also "loses" its context; only a loss while it is on screen matters.
          if (!canvas.isConnected) {
            perfStore.contextReleased();
            return;
          }
          event.preventDefault();
          perfStore.contextLost();
          handlers.current.onContextLost?.();
        });
      }}
    >
      <StageScene assets={assets} preset={preset} tier={spec} motion={motion} catWidth={grid.spriteWorldWidth} fireflySize={5} />
      {spec.post ? <PostStack tier={spec} preset={preset} focus={focus} /> : <PlainRender />}
      <FrameReporter tierName={tier} onFrame={onFrame} onFirstFrames={onFirstFrames} />
    </Canvas>
  );
}
