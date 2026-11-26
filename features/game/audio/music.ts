// The game's background music: one track streamed from a file, looped, and fed into the game's own sound
// path, so pausing the game ducks and muffles it and the Sound switch silences it.
//
// The file is streamed with an <audio> element instead of being decoded into memory: six minutes of
// stereo sound decoded is about 140 MB, while the streamed file is 5.8 MB and starts playing at once.

export interface MusicTrack {
  /** Where the file is served from (a path under public/). */
  src: string;
  /** How much of the file's own level reaches the game's sound path: the file is mastered far louder than a background bed should be. */
  level: number;
}

/**
 * "Beyond the Vale", the opening piece (6:03) of a longer ambient recording. It begins and ends in silence,
 * so playing it round and round joins without a click or a fade. Where it came from, and the terms it was
 * published under, are recorded in docs/ASSET_LICENSES.md; it was cut with scripts/cut-game-music.mjs.
 */
export const BEYOND_THE_VALE: MusicTrack = {
  src: "/audio/background-score-1-beyond-the-vale.mp3",
  level: 0.45,
};

export type MusicState = "playing" | "paused" | "blocked" | "failed";

export interface MusicStats {
  state: MusicState;
  /** Where the track is, in seconds, and how long it is (0 until the browser knows). */
  position: number;
  duration: number;
}

export interface MusicPlayer {
  /** Starts the music, or continues it after a pause. */
  play(): void;
  pause(): void;
  stats(): MusicStats;
  /** Jumps to a time. For verification: to hear the join of the loop without waiting six minutes. */
  seek(seconds: number): void;
  /** Stops for good and lets go of the file and the audio nodes. */
  stop(): void;
}

export interface MusicOptions {
  track?: MusicTrack;
  /** Makes the audio element. Injectable for tests. */
  createElement?: () => HTMLAudioElement;
}

/** Starts the music on `output` and returns the controls for it. Call it from the click that unlocked the audio. */
export function startMusic(context: AudioContext, output: AudioNode, { track = BEYOND_THE_VALE, createElement = () => new Audio() }: MusicOptions = {}): MusicPlayer {
  const element = createElement();
  element.preload = "auto";
  element.loop = true;
  element.src = track.src;

  const source = context.createMediaElementSource(element);
  const level = context.createGain();
  level.gain.value = track.level;
  source.connect(level);
  level.connect(output);

  let failed = false;
  let blocked = false;
  element.addEventListener("error", () => {
    failed = true;
  });
  element.addEventListener("playing", () => {
    blocked = false;
  });

  const play = () => {
    // A browser may refuse to start sound before the player has interacted with the page. That is not
    // worth shouting about: the next play() (the tab coming back, say) tries again.
    void element.play().catch(() => {
      blocked = true;
    });
  };
  play();

  const finite = (value: number) => (Number.isFinite(value) ? value : 0);
  return {
    play,
    pause: () => element.pause(),
    stats: () => ({
      state: failed ? "failed" : element.paused ? (blocked ? "blocked" : "paused") : "playing",
      position: finite(element.currentTime),
      duration: finite(element.duration),
    }),
    seek: (seconds) => {
      element.currentTime = seconds;
    },
    stop: () => {
      element.pause();
      // Dropping the source also stops the download.
      element.removeAttribute("src");
      element.load();
      source.disconnect();
      level.disconnect();
    },
  };
}
