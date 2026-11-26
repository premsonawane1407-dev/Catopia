// Short, soft, tactile electronic sounds for the pause menu, made with the Web Audio API so the game
// ships no sound files. The brief: muted digital clicks, delicate synth blips, subtle airy textures, tiny
// mechanical ticks and smooth tonal transitions; crisp but not sharp, futuristic but not overly sci-fi,
// some depth from a very short reverb; no harsh beeps, loud impacts or ordinary mouse clicks.
//
// Every sound is a small recipe of layers (plain data), so the rules above can be tested without any
// audio hardware, and the same renderer runs in a live context and in an offline one (to measure them).

export type UiSoundName = "open" | "close" | "move" | "adjust" | "select" | "back" | "toggleOn" | "toggleOff";

export const UI_SOUND_NAMES: readonly UiSoundName[] = ["open", "close", "move", "adjust", "select", "back", "toggleOn", "toggleOff"];

export interface UiSoundOptions {
  /** Which row of a menu the sound is for (0 is the top row). It sets the pitch of "move". */
  step?: number;
  /** Which way a value changed. It sets whether "adjust" rises or falls. */
  direction?: 1 | -1;
}

/** A tiny burst of band-passed noise: the "mechanical tick". */
export interface TickLayer {
  kind: "tick";
  at: number;
  gain: number;
  freq: number;
  q: number;
  length: number;
}

/** A soft low sine that drops a little in pitch: the body of a press. */
export interface ThumpLayer {
  kind: "thump";
  at: number;
  gain: number;
  from: number;
  to: number;
  length: number;
}

/** A delicate, rounded note: a sine or triangle through a low-pass filter, with a faint octave above it. */
export interface BlipLayer {
  kind: "blip";
  at: number;
  gain: number;
  freq: number;
  wave: "sine" | "triangle";
  attack: number;
  decay: number;
  lowpass: number;
  /** Level of the octave above, relative to the note. */
  overtone: number;
}

/** A swell of filtered noise whose centre frequency slides: the airy texture. */
export interface AirLayer {
  kind: "air";
  at: number;
  gain: number;
  from: number;
  to: number;
  q: number;
  length: number;
}

export type UiLayer = TickLayer | ThumpLayer | BlipLayer | AirLayer;

export interface UiSoundRecipe {
  layers: UiLayer[];
  /** How much of the sound is also sent through the short reverb, 0 to 1. */
  reverb: number;
}

const semitones = (base: number, n: number) => base * 2 ** (n / 12);

/** A gentle major-pentatonic ladder, so moving down a menu climbs a small, pleasant scale. */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const ladder = (step: number) => semitones(440, SCALE[Math.max(0, Math.min(SCALE.length - 1, Math.round(step)))]);

const tick = (at: number, gain: number, freq: number, length = 0.011, q = 1.1): TickLayer => ({ kind: "tick", at, gain, freq, q, length });
const thump = (at: number, gain: number, from: number, to: number, length: number): ThumpLayer => ({ kind: "thump", at, gain, from, to, length });
const blip = (at: number, gain: number, freq: number, decay: number, extra: Partial<Pick<BlipLayer, "wave" | "attack" | "lowpass" | "overtone">> = {}): BlipLayer => ({
  kind: "blip",
  at,
  gain,
  freq,
  decay,
  wave: extra.wave ?? "triangle",
  attack: extra.attack ?? 0.003,
  lowpass: extra.lowpass ?? 2600,
  overtone: extra.overtone ?? 0.22,
});
const air = (at: number, gain: number, from: number, to: number, length: number, q = 0.8): AirLayer => ({ kind: "air", at, gain, from, to, q, length });

export function recipeFor(name: UiSoundName, options: UiSoundOptions = {}): UiSoundRecipe {
  switch (name) {
    case "move":
      // Moving the highlight: a tick, a soft pulse and one small note, higher the lower the row.
      return { reverb: 0.16, layers: [tick(0, 0.11, 2300), thump(0, 0.1, 160, 100, 0.045), blip(0.003, 0.085, ladder(options.step ?? 0), 0.075, { lowpass: 2400 })] };
    case "adjust": {
      // Changing a value: two quick notes that step up or down, so you can hear which way it went.
      const up = (options.direction ?? 1) >= 0;
      const first = 523.25;
      const second = semitones(first, up ? 5 : -5);
      return { reverb: 0.18, layers: [tick(0, 0.1, 2000), thump(0, 0.08, 150, 105, 0.04), blip(0, 0.075, first, 0.05), blip(0.048, 0.085, second, 0.11)] };
    }
    case "select":
      // Pressing an item: a firmer tick and pulse, then a rising pair of notes with a breath of air and some tail.
      return {
        reverb: 0.3,
        layers: [tick(0, 0.12, 2400, 0.012, 1.2), thump(0, 0.13, 190, 105, 0.075), blip(0, 0.085, 587.33, 0.09), blip(0.065, 0.095, 880, 0.2, { lowpass: 3000, overtone: 0.25 }), air(0.02, 0.035, 2600, 4200, 0.14, 0.9)],
      };
    case "open":
      // The menu appears: air breathing down, a low soft pulse and one warm note.
      return { reverb: 0.32, layers: [air(0, 0.07, 3400, 900, 0.24), thump(0, 0.15, 125, 62, 0.14), tick(0, 0.09, 1800), blip(0.05, 0.06, 493.88, 0.22, { lowpass: 2200, overtone: 0.2 })] };
    case "close":
      // The menu goes away: air breathing up and a rising pair of notes.
      return { reverb: 0.28, layers: [air(0, 0.06, 900, 3600, 0.2), blip(0, 0.06, 659.25, 0.09), blip(0.06, 0.07, 987.77, 0.18), tick(0.06, 0.09, 2200)] };
    case "back":
      // Leaving or cancelling: a small falling pair of notes.
      return { reverb: 0.2, layers: [tick(0, 0.09, 1900), thump(0, 0.09, 140, 90, 0.05), blip(0, 0.07, 740, 0.06), blip(0.058, 0.07, 493.88, 0.15)] };
    case "toggleOn":
      return { reverb: 0.22, layers: [tick(0, 0.1, 2200), blip(0, 0.075, 587.33, 0.06), blip(0.052, 0.085, 880, 0.14), air(0, 0.025, 2800, 4000, 0.1, 0.9)] };
    case "toggleOff":
      return { reverb: 0.2, layers: [tick(0, 0.09, 1800), blip(0, 0.075, 880, 0.06), blip(0.052, 0.075, 587.33, 0.14)] };
  }
}

/** When a layer has gone quiet, in seconds after the sound starts. */
export function layerEnd(layer: UiLayer): number {
  switch (layer.kind) {
    case "blip":
      return layer.at + layer.attack + layer.decay;
    case "tick":
    case "thump":
    case "air":
      return layer.at + layer.length;
  }
}

export interface RecipeStats {
  /** When the last layer has gone quiet (the reverb tail comes after this). */
  end: number;
  /** All the layers' gains added up: an upper bound on how loud the dry sound can get. */
  gainSum: number;
  maxBlipFreq: number;
  maxBlipLowpass: number;
  maxTickLength: number;
  maxThumpFreq: number;
  maxAirGain: number;
}

export function recipeStats(recipe: UiSoundRecipe): RecipeStats {
  const stats: RecipeStats = { end: 0, gainSum: 0, maxBlipFreq: 0, maxBlipLowpass: 0, maxTickLength: 0, maxThumpFreq: 0, maxAirGain: 0 };
  for (const layer of recipe.layers) {
    stats.end = Math.max(stats.end, layerEnd(layer));
    stats.gainSum += layer.gain;
    if (layer.kind === "blip") {
      stats.maxBlipFreq = Math.max(stats.maxBlipFreq, layer.freq * (layer.overtone > 0 ? 2 : 1));
      stats.maxBlipLowpass = Math.max(stats.maxBlipLowpass, layer.lowpass);
    } else if (layer.kind === "tick") stats.maxTickLength = Math.max(stats.maxTickLength, layer.length);
    else if (layer.kind === "thump") stats.maxThumpFreq = Math.max(stats.maxThumpFreq, layer.from, layer.to);
    else stats.maxAirGain = Math.max(stats.maxAirGain, layer.gain);
  }
  return stats;
}

// ---------------------------------------------------------------------------------------------
// Rendering with the Web Audio API (works in a live context and in an OfflineAudioContext).

/** Length of the reverb's tail in seconds: very short, for a little depth without washing the sound out. */
export const REVERB_SECONDS = 0.28;

/**
 * How loud the menu sounds are mixed overall. The recipes are written quiet and relative to each other, so
 * their layers stay soft; this sets the level the player hears. 2 is 6 dB: with it the loudest sound peaks
 * near -15 dB of full scale at the default volume, which is audible on small speakers and still gentle.
 */
export const UI_LEVEL = 2;

/** Where a sound's dry signal and its reverb send go. */
export interface UiOutput {
  dry: AudioNode;
  reverb: AudioNode;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Half a second of white noise, made the same way every time, shared by every tick and air layer. */
function noiseFor(context: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(context);
  if (!buffer) {
    buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.5), context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 20240607;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    noiseBuffers.set(context, buffer);
  }
  return buffer;
}

/** A short, dark, decaying burst of noise: a small room rather than a hall. */
function makeImpulse(context: BaseAudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * REVERB_SECONDS);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let seed = 7919 + channel * 104729;
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed / 4294967296) * 2 - 1;
      // A one-pole low-pass keeps the tail soft and dark; the cubed falloff makes it die away quickly.
      smooth += (noise - smooth) * 0.45;
      data[i] = smooth * (1 - i / length) ** 3.5;
    }
  }
  return buffer;
}

/** Builds the reverb chain once and connects its output to `destination`. */
export function createUiOutput(context: BaseAudioContext, destination: AudioNode): UiOutput {
  const out = context.createGain();
  out.gain.value = UI_LEVEL;
  out.connect(destination);
  const dry = context.createGain();
  dry.connect(out);
  const convolver = context.createConvolver();
  convolver.buffer = makeImpulse(context);
  const wet = context.createGain();
  wet.gain.value = 0.9;
  convolver.connect(wet);
  wet.connect(out);
  return { dry, reverb: convolver };
}

/** A quick rise to `peak`, then an exponential fall to silence. */
function envelope(param: AudioParam, at: number, peak: number, attack: number, decay: number): void {
  param.setValueAtTime(0.0001, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

type Source = AudioScheduledSourceNode;

function renderLayer(context: BaseAudioContext, mix: AudioNode, layer: UiLayer, start: number, onEnd: () => void): void {
  const sources: Source[] = [];
  const nodes: AudioNode[] = [];
  const finish = () => {
    for (const node of nodes) node.disconnect();
    onEnd();
  };
  const gain = context.createGain();
  nodes.push(gain);
  gain.connect(mix);
  let stopAt = start;

  if (layer.kind === "tick") {
    const noise = context.createBufferSource();
    noise.buffer = noiseFor(context);
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = layer.freq;
    filter.Q.value = layer.q;
    noise.connect(filter);
    filter.connect(gain);
    nodes.push(noise, filter);
    envelope(gain.gain, start, layer.gain, 0.0006, layer.length);
    noise.start(start, 0.05);
    sources.push(noise);
    stopAt = start + layer.length + 0.02;
  } else if (layer.kind === "thump") {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(layer.from, start);
    osc.frequency.exponentialRampToValueAtTime(layer.to, start + layer.length);
    osc.connect(gain);
    nodes.push(osc);
    envelope(gain.gain, start, layer.gain, 0.002, layer.length);
    osc.start(start);
    sources.push(osc);
    stopAt = start + layer.length + 0.02;
  } else if (layer.kind === "blip") {
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = layer.lowpass;
    lowpass.Q.value = 0.5;
    lowpass.connect(gain);
    nodes.push(lowpass);
    const note = context.createOscillator();
    note.type = layer.wave;
    // A hair of pitch settling at the very start makes the note feel plucked rather than switched on.
    note.frequency.setValueAtTime(layer.freq * 1.018, start);
    note.frequency.exponentialRampToValueAtTime(layer.freq, start + 0.02);
    note.connect(lowpass);
    nodes.push(note);
    note.start(start);
    sources.push(note);
    if (layer.overtone > 0) {
      const octave = context.createOscillator();
      octave.type = "sine";
      octave.frequency.value = layer.freq * 2;
      const octaveGain = context.createGain();
      octaveGain.gain.value = layer.overtone;
      octave.connect(octaveGain);
      octaveGain.connect(lowpass);
      nodes.push(octave, octaveGain);
      octave.start(start);
      sources.push(octave);
    }
    envelope(gain.gain, start, layer.gain, layer.attack, layer.decay);
    stopAt = start + layer.attack + layer.decay + 0.02;
  } else {
    const noise = context.createBufferSource();
    noise.buffer = noiseFor(context);
    noise.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = layer.q;
    filter.frequency.setValueAtTime(layer.from, start);
    filter.frequency.exponentialRampToValueAtTime(layer.to, start + layer.length);
    noise.connect(filter);
    filter.connect(gain);
    nodes.push(noise, filter);
    // A swell that opens quickly and then fades, so the air is felt more than heard.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(layer.gain, start + layer.length * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + layer.length);
    noise.start(start, 0.1);
    sources.push(noise);
    stopAt = start + layer.length + 0.02;
  }

  for (const source of sources) source.stop(stopAt);
  // Free the layer's nodes once its last source has finished.
  let remaining = sources.length;
  for (const source of sources) {
    source.onended = () => {
      remaining -= 1;
      if (remaining === 0) finish();
    };
  }
}

/** Schedules every layer of a recipe to start at `at` (in the context's own time). */
export function renderRecipe(context: BaseAudioContext, output: UiOutput, recipe: UiSoundRecipe, at: number): void {
  const mix = context.createGain();
  mix.connect(output.dry);
  const send = context.createGain();
  send.gain.value = recipe.reverb;
  mix.connect(send);
  send.connect(output.reverb);
  let remaining = recipe.layers.length;
  const onEnd = () => {
    remaining -= 1;
    if (remaining === 0) {
      mix.disconnect();
      send.disconnect();
    }
  };
  for (const layer of recipe.layers) renderLayer(context, mix, layer, at + layer.at, onEnd);
}

/** How soon the same sound may repeat. Holding an arrow key must read as a ripple of ticks, not a buzz. */
export const MIN_GAP_SECONDS: Record<UiSoundName, number> = {
  open: 0.1,
  close: 0.1,
  move: 0.045,
  adjust: 0.06,
  select: 0.1,
  back: 0.1,
  toggleOn: 0.08,
  toggleOff: 0.08,
};

export type UiPlayer = (name: UiSoundName, options?: UiSoundOptions) => void;

/** Builds the reverb and returns a function that plays a named sound on `destination`. */
export function createUiPlayer(context: BaseAudioContext, destination: AudioNode): UiPlayer {
  const output = createUiOutput(context, destination);
  const lastAt = new Map<UiSoundName, number>();
  return (name, options) => {
    const now = context.currentTime;
    const last = lastAt.get(name);
    if (last !== undefined && now - last < MIN_GAP_SECONDS[name]) return;
    lastAt.set(name, now);
    renderRecipe(context, output, recipeFor(name, options), now + 0.005);
  };
}
