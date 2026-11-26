// The game's one audio output. Browsers refuse to play sound until the player has interacted with the
// page, so the context is created and resumed from the "press to begin" click.
//
//   ambience -> world filter -> world gain -+
//                                           +-> master (mute and volume) -> speakers
//   menu sounds -> menu reverb -------------+
//
// Mute is real: it silences the master. Pausing the game does not stop the audio context, because the
// pause menu makes its own sounds; it quiets and muffles the game's own sound (the world) instead.
import { startEveningAmbience } from "./ambience";
import { createUiPlayer, type UiPlayer, type UiSoundName, type UiSoundOptions } from "./ui-sounds";

export type AudioState = "idle" | "running" | "suspended" | "unsupported";

export const DEFAULT_VOLUME = 0.6;

/** How loud the game's own sound stays while the game is paused, and how dark it gets. */
export const PAUSED_WORLD_LEVEL = 0.3;
export const PAUSED_WORLD_CUTOFF_HZ = 700;
const OPEN_CUTOFF_HZ = 20000;

/** A mute waits this long, so the little sound that announces it can be heard. Unmuting is immediate. */
export const MUTE_DELAY_SECONDS = 0.22;

export interface AudioBusOptions {
  /** Creates the audio context, or returns null when the browser has none. Injectable for tests. */
  createContext?: () => AudioContext | null;
  /** Starts looping background sound on the given output and returns a function that stops it. */
  startAmbience?: (context: AudioContext, output: AudioNode) => () => void;
  /** Builds the player for the menu's sounds. Injectable for tests. */
  createUiPlayer?: (context: AudioContext, destination: AudioNode) => UiPlayer;
}

export interface AudioBus {
  /** Creates (once) and resumes the audio context. Call it from a click or key press. */
  unlock(): Promise<AudioState>;
  state(): AudioState;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** Master volume, 0 to 1. */
  setVolume(volume: number): void;
  volume(): number;
  /** Quiet and muffle the game's own sound while the pause menu is open. The menu's sounds are not touched. */
  setPaused(paused: boolean): void;
  isPaused(): boolean;
  /** Plays one of the menu sounds. Does nothing until the audio is unlocked, or while the context is suspended. */
  playUi(name: UiSoundName, options?: UiSoundOptions): void;
  /** How many menu sounds have been asked for, and the latest one (for checking the menu is wired up). */
  uiStats(): { requested: number; last: UiSoundName | null };
  /** Stop all audio processing (a hidden tab) and start it again. */
  suspend(): Promise<void>;
  resume(): Promise<void>;
  /** The master output other sounds connect to, once unlocked. */
  output(): AudioNode | null;
  dispose(): Promise<void>;
}

function defaultCreateContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  try {
    return new AudioContext({ latencyHint: "playback" });
  } catch {
    return null;
  }
}

export function createAudioBus({ createContext = defaultCreateContext, startAmbience = startEveningAmbience, createUiPlayer: makeUiPlayer = createUiPlayer }: AudioBusOptions = {}): AudioBus {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let worldGain: GainNode | null = null;
  let worldFilter: BiquadFilterNode | null = null;
  let uiPlayer: UiPlayer | null = null;
  let stopAmbience: (() => void) | null = null;
  let unsupported = false;
  let muted = false;
  let paused = false;
  let volume = DEFAULT_VOLUME;
  let uiRequested = 0;
  let uiLast: UiSoundName | null = null;

  const applyGain = () => {
    if (!context || !master) return;
    const now = context.currentTime;
    // Forget any mute that was still waiting, then ramp (never jump) to the right level so nothing clicks.
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(muted ? 0 : volume, muted ? now + MUTE_DELAY_SECONDS : now, 0.03);
  };

  const applyPaused = () => {
    if (!context || !worldGain || !worldFilter) return;
    const now = context.currentTime;
    worldGain.gain.cancelScheduledValues(now);
    worldFilter.frequency.cancelScheduledValues(now);
    worldGain.gain.setTargetAtTime(paused ? PAUSED_WORLD_LEVEL : 1, now, 0.12);
    worldFilter.frequency.setTargetAtTime(paused ? PAUSED_WORLD_CUTOFF_HZ : OPEN_CUTOFF_HZ, now, 0.12);
  };

  const state = (): AudioState => {
    if (unsupported) return "unsupported";
    if (!context) return "idle";
    return context.state === "running" ? "running" : "suspended";
  };

  return {
    async unlock() {
      if (unsupported) return "unsupported";
      if (!context) {
        const created = createContext();
        if (!created) {
          unsupported = true;
          return "unsupported";
        }
        context = created;
        master = created.createGain();
        master.gain.value = 0;
        master.connect(created.destination);
        worldGain = created.createGain();
        worldGain.connect(master);
        worldFilter = created.createBiquadFilter();
        worldFilter.type = "lowpass";
        worldFilter.frequency.value = OPEN_CUTOFF_HZ;
        worldFilter.Q.value = 0.5;
        worldFilter.connect(worldGain);
        stopAmbience = startAmbience(created, worldFilter);
        uiPlayer = makeUiPlayer(created, master);
        applyGain();
        applyPaused();
      }
      if (context.state === "suspended") await context.resume();
      return state();
    },
    state,
    setMuted(next) {
      muted = next;
      applyGain();
    },
    isMuted: () => muted,
    setVolume(next) {
      volume = Math.min(1, Math.max(0, Number.isFinite(next) ? next : DEFAULT_VOLUME));
      applyGain();
    },
    volume: () => volume,
    setPaused(next) {
      paused = next;
      applyPaused();
    },
    isPaused: () => paused,
    playUi(name, options) {
      if (!context || !uiPlayer || context.state !== "running") return;
      uiRequested += 1;
      uiLast = name;
      uiPlayer(name, options);
    },
    uiStats: () => ({ requested: uiRequested, last: uiLast }),
    async suspend() {
      if (context && context.state === "running") await context.suspend();
    },
    async resume() {
      if (context && context.state === "suspended") await context.resume();
    },
    output: () => master,
    async dispose() {
      stopAmbience?.();
      stopAmbience = null;
      uiPlayer = null;
      worldFilter?.disconnect();
      worldGain?.disconnect();
      master?.disconnect();
      worldFilter = null;
      worldGain = null;
      master = null;
      const closing = context;
      context = null;
      if (closing && closing.state !== "closed") await closing.close();
    },
  };
}
