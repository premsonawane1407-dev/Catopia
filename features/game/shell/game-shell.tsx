"use client";

// The game shell: decides what is on screen (loading, "press to begin", playing, paused, or a friendly
// problem screen), owns the settings, the quality governor and the audio, and mounts the 3D canvas only
// while it is needed. The screen-by-screen rules live in shell-state.ts; this file wires them to the world.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createAudioBus } from "../audio/audio-bus";
import { benchFrames, frameFingerprint } from "../debug/bench";
import { perfStore } from "../debug/perf-store";
import { PerfOverlay } from "../debug/perf-overlay";
import { supportsWebGL } from "../capability/webgl";
import { createGovernor } from "../quality/auto-tier";
import { isNarrowPortrait } from "../quality/pixel-grid";
import { initialTier, type TierName } from "../quality/tiers";
import { GameCanvas } from "../render/game-canvas";
import { DEFAULT_TIME } from "../render/time-presets";
import { resolveMotion, type GameSettings } from "../settings/settings";
import { useGameSettings } from "../settings/use-game-settings";
import { loadGameAssets, type GameAssets } from "../world/game-assets";
import { PauseMenu } from "./pause-menu";
import { hasCanvas, initialShellState, loopRunning, shellReducer } from "./shell-state";
import { BeginScreen, COMMUNITY_HREF, LoadingScreen, PauseButton, ProblemScreen, RotateScreen } from "./screens";
import { usePrefersReducedMotion } from "./use-reduced-motion";
import { useViewport } from "./use-viewport";
import "./game.css";

/** A first guess at quality before any frame has been measured; the governor corrects it from there. */
function detectTier(): TierName {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return initialTier({ isTouch: window.matchMedia("(pointer: coarse)").matches, cores: nav.hardwareConcurrency ?? 0, memoryGb: nav.deviceMemory });
}

/** Development only: /play?webgl=off pretends the browser has no WebGL, to try the fallback screen. */
function forcedNoWebGL(): boolean {
  return process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("webgl") === "off";
}

/** How long "Leave the street" waits, so its little sound can be heard before the page changes. */
const LEAVE_DELAY_MS = 180;

export default function GameShell() {
  const router = useRouter();
  const [shell, dispatch] = useReducer(shellReducer, initialShellState);
  const [settings, updateSettings] = useGameSettings();
  const viewport = useViewport();
  const systemReduced = usePrefersReducedMotion();
  const motion = resolveMotion(settings.motion, systemReduced) === "full";

  const [assets, setAssets] = useState<GameAssets | null>(null);
  const [progress, setProgress] = useState(0);
  const [bus] = useState(() => createAudioBus());
  const [autoTier, setAutoTier] = useState<TierName>(detectTier);
  const [governor] = useState(() => createGovernor(autoTier));
  const [rotateDismissed, setRotateDismissed] = useState(false);
  const [perfRequested] = useState(() => new URLSearchParams(window.location.search).has("perf"));
  const leaveTimer = useRef<number | undefined>(undefined);

  const tier = settings.quality === "auto" ? autoTier : settings.quality;
  const phase = shell.phase;

  // Can this browser run the game at all?
  useEffect(() => {
    dispatch(!forcedNoWebGL() && supportsWebGL() ? { type: "supported" } : { type: "unsupported" });
  }, []);

  // Fetch the world once. A retry after a lost context reuses what is already loaded.
  useEffect(() => {
    if (phase !== "loading" || assets) return;
    const controller = new AbortController();
    loadGameAssets((done, total) => setProgress(done / total), controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) loaded.dispose();
        else setAssets(loaded);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        dispatch({ type: "error", message: error instanceof Error ? error.message : "The game files could not be loaded." });
      });
    return () => controller.abort();
  }, [phase, shell.attempt, assets]);
  useEffect(() => () => assets?.dispose(), [assets]);

  // Keep the page still behind the game: no scrolling, no pull-to-refresh.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("cg-locked");
    return () => root.classList.remove("cg-locked");
  }, []);

  // Sound: unlocked by the "Begin" click and muted by the setting. While the game is paused its own sound
  // goes quiet and muffled, but the audio keeps running so the menu can make its sounds.
  useEffect(() => {
    bus.setMuted(settings.muted);
  }, [bus, settings.muted]);
  useEffect(() => {
    bus.setPaused(phase === "paused");
  }, [bus, phase]);
  useEffect(
    () => () => {
      window.clearTimeout(leaveTimer.current);
      void bus.dispose();
    },
    [bus],
  );

  // Turning sound on or off: the change happens first when turning on (so the little sound is heard) and a
  // moment later when turning off (the bus waits), so either way the player hears what they did.
  const setSound = useCallback(
    (on: boolean) => {
      bus.setMuted(!on);
      bus.playUi(on ? "toggleOn" : "toggleOff");
      updateSettings({ muted: !on });
    },
    [bus, updateSettings],
  );

  const pauseGame = useCallback(() => {
    bus.playUi("open");
    dispatch({ type: "pause" });
  }, [bus]);

  const resumeGame = useCallback(() => {
    bus.playUi("close");
    dispatch({ type: "resume" });
  }, [bus]);

  const leaveGame = useCallback(() => {
    bus.playUi("back");
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => router.push(COMMUNITY_HREF), LEAVE_DELAY_MS);
  }, [bus, router]);

  /** A row of the pause menu changed a setting: make the right sound and apply it. */
  const changeSetting = useCallback(
    (patch: Partial<GameSettings>, direction: 1 | -1) => {
      if (patch.muted !== undefined) {
        setSound(!patch.muted);
        return;
      }
      if (patch.showStats !== undefined) bus.playUi(patch.showStats ? "toggleOn" : "toggleOff");
      else bus.playUi("adjust", { direction });
      updateSettings(patch);
    },
    [bus, setSound, updateSettings],
  );

  // Escape pauses and resumes; M mutes. A hidden tab pauses by itself, so it does not draw for nobody, and
  // its audio stops with it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A held key repeats; that must not pause and resume the game, or flip the sound, again and again.
      if (event.repeat) return;
      if (event.key === "Escape") {
        if (phase === "playing") pauseGame();
        else if (phase === "paused") resumeGame();
      } else if ((event.key === "m" || event.key === "M") && (phase === "playing" || phase === "paused")) {
        setSound(settings.muted);
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (phase === "playing") dispatch({ type: "pause" });
        void bus.suspend();
      } else {
        void bus.resume();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase, bus, settings.muted, pauseGame, resumeGame, setSound]);

  // Quality: the governor watches frame times and changes the tier unless the player picked one.
  useEffect(() => {
    if (settings.quality === "auto") governor.setTier(governor.tier());
  }, [governor, settings.quality]);
  const handleFrame = useCallback(
    (ms: number) => {
      if (settings.quality !== "auto") return;
      const next = governor.push(ms);
      if (next) setAutoTier(next);
    },
    [governor, settings.quality],
  );

  // A way for verification (and curious developers) to read the numbers without the overlay. It stays
  // after the game is left, so the context counters can be read across enter/leave cycles.
  const showStats = settings.showStats || perfRequested;
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && !showStats) return;
    Object.assign(window, {
      __catopia: {
        perf: () => perfStore.snapshot(),
        bench: benchFrames,
        fingerprint: frameFingerprint,
        audio: () => ({
          state: bus.state(),
          muted: bus.isMuted(),
          paused: bus.isPaused(),
          volume: bus.volume(),
          gain: (bus.output() as GainNode | null)?.gain.value ?? null,
          ui: bus.uiStats(),
          music: bus.musicStats(),
        }),
        /** The master output, so a check can listen to what the speakers would get (an analyser can be joined to it). */
        master: () => bus.output(),
        /** Jumps the music to a time, to hear the join of the loop without waiting six minutes. */
        musicSeek: (seconds: number) => bus.seekMusic(seconds),
        /** Measures the menu sounds offline (peak, loudness, length, brightness). Loaded only when asked for. */
        reportUiSounds: () => import("../debug/ui-sound-report").then((m) => m.reportUiSounds()),
        /** Feeds a frame duration to the quality governor, the same way the render loop does. */
        feedFrame: handleFrame,
      },
    });
  }, [bus, showStats, handleFrame]);

  const begin = useCallback(() => {
    // Creating and resuming the audio context has to happen inside this click.
    void bus.unlock().then(() => bus.playUi("select"));
    dispatch({ type: "start" });
  }, [bus]);

  const showRotate = isNarrowPortrait(viewport.width, viewport.height) && !rotateDismissed && (phase === "ready" || phase === "playing");

  return (
    <main className="cg-root" data-phase={phase} data-tier={tier} data-motion={motion ? "full" : "reduced"} aria-label="Catopia game">
      <div className="cg-stage">
        {assets && hasCanvas(phase) && (
          <GameCanvas
            key={shell.attempt}
            assets={assets}
            tier={tier}
            time={DEFAULT_TIME}
            motion={motion}
            paused={!loopRunning(phase)}
            viewport={viewport}
            onFrame={handleFrame}
            onFirstFrames={() => dispatch({ type: "loaded" })}
            onContextLost={() => dispatch({ type: "contextLost" })}
          />
        )}
      </div>

      {(phase === "checking" || phase === "loading") && <LoadingScreen progress={assets ? 1 : progress} />}
      {phase === "unsupported" && <ProblemScreen kind="unsupported" />}
      {phase === "error" && <ProblemScreen kind="error" detail={shell.message} onRetry={() => dispatch({ type: "retry" })} />}
      {phase === "lost" && <ProblemScreen kind="lost" onRetry={() => dispatch({ type: "retry" })} />}
      {showRotate && <RotateScreen onDismiss={() => setRotateDismissed(true)} />}
      {phase === "ready" && !showRotate && <BeginScreen onBegin={begin} />}
      {phase === "playing" && !showRotate && <PauseButton onPause={pauseGame} />}
      {phase === "paused" && <PauseMenu settings={settings} onChange={changeSetting} onMove={(step) => bus.playUi("move", { step })} onResume={resumeGame} onLeave={leaveGame} />}
      {showStats && hasCanvas(phase) && <PerfOverlay />}
    </main>
  );
}
