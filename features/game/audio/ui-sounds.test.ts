import { describe, expect, it, vi } from "vitest";
import {
  MIN_GAP_SECONDS,
  REVERB_SECONDS,
  UI_LEVEL,
  UI_SOUND_NAMES,
  createUiOutput,
  createUiPlayer,
  layerEnd,
  recipeFor,
  recipeStats,
  renderRecipe,
  type BlipLayer,
  type AirLayer,
  type UiSoundName,
} from "./ui-sounds";

/** A stand-in for the browser's audio context that records what is built and scheduled. */
function fakeContext() {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = [];
  const gains: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; gain: ReturnType<typeof param> }[] = [];
  const buffers: { length: number; channels: number }[] = [];
  const source = (extra: object = {}) => {
    const s = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null, ...extra };
    sources.push(s);
    return s;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    createGain: vi.fn(() => {
      const g = { connect: vi.fn(), disconnect: vi.fn(), gain: param() };
      gains.push(g);
      return g;
    }),
    createOscillator: vi.fn(() => source({ type: "sine", frequency: param() })),
    createBufferSource: vi.fn(() => source({ buffer: null, loop: false })),
    createBiquadFilter: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), type: "lowpass", frequency: param(), Q: param() })),
    createConvolver: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), buffer: null as unknown })),
    createBuffer: vi.fn((channels: number, length: number, rate: number) => {
      buffers.push({ length, channels });
      return { length, sampleRate: rate, numberOfChannels: channels, getChannelData: () => new Float32Array(length) };
    }),
  };
  return { ctx, sources, gains, buffers, context: ctx as unknown as BaseAudioContext };
}

const firstBlipFreqs = (name: UiSoundName, options = {}) => recipeFor(name, options).layers.filter((l): l is BlipLayer => l.kind === "blip").map((l) => l.freq);

describe("the brief: soft, short, tactile, never harsh", () => {
  it("has a recipe for every named sound, made only of the four soft layer kinds", () => {
    for (const name of UI_SOUND_NAMES) {
      const recipe = recipeFor(name);
      expect(recipe.layers.length, name).toBeGreaterThan(0);
      for (const layer of recipe.layers) expect(["tick", "thump", "blip", "air"], name).toContain(layer.kind);
    }
  });

  it("keeps every sound short, with only a very short reverb after it", () => {
    expect(REVERB_SECONDS).toBeLessThanOrEqual(0.35);
    for (const name of UI_SOUND_NAMES) {
      const { end } = recipeStats(recipeFor(name));
      expect(end, name).toBeLessThanOrEqual(0.3);
      expect(end + REVERB_SECONDS, name).toBeLessThanOrEqual(0.62);
      expect(recipeFor(name).reverb, name).toBeLessThanOrEqual(0.35);
    }
  });

  it("makes no harsh beeps: notes are low and rounded, never square or sawtooth", () => {
    for (const name of UI_SOUND_NAMES) {
      const stats = recipeStats(recipeFor(name));
      // Highest partial (the octave above the highest note) stays well below the shrill range.
      expect(stats.maxBlipFreq, name).toBeLessThanOrEqual(2300);
      expect(stats.maxBlipLowpass, name).toBeLessThanOrEqual(3500);
      for (const layer of recipeFor(name).layers) if (layer.kind === "blip") expect(["sine", "triangle"], name).toContain(layer.wave);
    }
  });

  it("makes no loud impacts: the pulses are low and soft and the whole sound adds up to a modest level", () => {
    for (const name of UI_SOUND_NAMES) {
      const stats = recipeStats(recipeFor(name));
      expect(stats.maxThumpFreq, name).toBeLessThanOrEqual(220);
      expect(stats.gainSum, name).toBeLessThanOrEqual(0.5);
      for (const layer of recipeFor(name).layers) expect(layer.gain, name).toBeLessThanOrEqual(0.16);
    }
  });

  it("keeps the ticks tiny and the air subtle", () => {
    for (const name of UI_SOUND_NAMES) {
      const stats = recipeStats(recipeFor(name));
      expect(stats.maxTickLength, name).toBeLessThanOrEqual(0.015);
      expect(stats.maxAirGain, name).toBeLessThanOrEqual(0.08);
    }
  });

  it("starts every layer at once or within a tenth of a second, so each sound reads as one gesture", () => {
    for (const name of UI_SOUND_NAMES) for (const layer of recipeFor(name).layers) expect(layer.at, name).toBeLessThanOrEqual(0.1);
  });
});

describe("what each sound says", () => {
  it("climbs a gentle scale as the highlight moves down a menu, and stops climbing at the top of the ladder", () => {
    const pitches = [0, 1, 2, 3, 4, 5, 6, 7].map((step) => firstBlipFreqs("move", { step })[0]);
    for (let i = 1; i < pitches.length; i++) expect(pitches[i]).toBeGreaterThan(pitches[i - 1]);
    expect(firstBlipFreqs("move", { step: 40 })[0]).toBe(pitches[7]);
    expect(firstBlipFreqs("move", { step: -3 })[0]).toBe(pitches[0]);
  });

  it("steps up when a value goes up and down when it goes down", () => {
    const up = firstBlipFreqs("adjust", { direction: 1 });
    const down = firstBlipFreqs("adjust", { direction: -1 });
    expect(up[1]).toBeGreaterThan(up[0]);
    expect(down[1]).toBeLessThan(down[0]);
  });

  it("rises for on and falls for off, and falls for back", () => {
    const on = firstBlipFreqs("toggleOn");
    const off = firstBlipFreqs("toggleOff");
    const back = firstBlipFreqs("back");
    expect(on[1]).toBeGreaterThan(on[0]);
    expect(off[1]).toBeLessThan(off[0]);
    expect(back[1]).toBeLessThan(back[0]);
  });

  it("breathes air down when the menu opens and up when it closes", () => {
    const sweep = (name: UiSoundName) => recipeFor(name).layers.find((l): l is AirLayer => l.kind === "air")!;
    expect(sweep("open").to).toBeLessThan(sweep("open").from);
    expect(sweep("close").to).toBeGreaterThan(sweep("close").from);
  });

  it("gives pressing an item the most body and tail of the small sounds", () => {
    expect(recipeFor("select").reverb).toBeGreaterThan(recipeFor("move").reverb);
    expect(recipeStats(recipeFor("select")).gainSum).toBeGreaterThan(recipeStats(recipeFor("move")).gainSum);
  });

  it("reports when each layer is done", () => {
    expect(layerEnd({ kind: "tick", at: 0.01, gain: 0.1, freq: 2000, q: 1, length: 0.01 })).toBeCloseTo(0.02, 9);
    expect(layerEnd({ kind: "blip", at: 0.05, gain: 0.1, freq: 500, wave: "sine", attack: 0.003, decay: 0.1, lowpass: 2000, overtone: 0 })).toBeCloseTo(0.153, 9);
  });
});

describe("rendering", () => {
  it("builds a reverb whose tail is as long as promised", () => {
    const { context, buffers } = fakeContext();
    const out = { connect: vi.fn() } as unknown as AudioNode;
    createUiOutput(context, out);
    // Two channels, REVERB_SECONDS long at the context's sample rate.
    expect(buffers).toContainEqual({ channels: 2, length: Math.floor(8000 * REVERB_SECONDS) });
  });

  it("mixes the menu sounds at a level that is audible but gentle", () => {
    const { context, gains } = fakeContext();
    createUiOutput(context, { connect: vi.fn() } as unknown as AudioNode);
    // The first gain it makes is the menu bus's output level.
    expect(gains[0].gain.value).toBe(UI_LEVEL);
    expect(UI_LEVEL).toBeGreaterThan(1);
    expect(UI_LEVEL).toBeLessThanOrEqual(3);
  });

  it("starts and stops every sound source, stopping each after it starts", () => {
    const { context, sources } = fakeContext();
    const output = createUiOutput(context, { connect: vi.fn() } as unknown as AudioNode);
    sources.length = 0;
    const recipe = recipeFor("select");
    renderRecipe(context, output, recipe, 1);
    // One source per layer, plus the octave oscillator of each blip that has an overtone.
    const octaves = recipe.layers.filter((l) => l.kind === "blip" && l.overtone > 0).length;
    expect(sources).toHaveLength(recipe.layers.length + octaves);
    for (const s of sources) {
      expect(s.start).toHaveBeenCalledTimes(1);
      expect(s.stop).toHaveBeenCalledTimes(1);
      const started = s.start.mock.calls[0][0] as number;
      const stopped = s.stop.mock.calls[0][0] as number;
      expect(started).toBeGreaterThanOrEqual(1);
      expect(stopped).toBeGreaterThan(started);
    }
  });

  it("lets go of a sound's nodes once all of its sources have ended", () => {
    const { context, sources, gains } = fakeContext();
    const output = createUiOutput(context, { connect: vi.fn() } as unknown as AudioNode);
    const before = gains.length;
    sources.length = 0;
    renderRecipe(context, output, recipeFor("toggleOff"), 0);
    const mix = gains[before];
    expect(mix.disconnect).not.toHaveBeenCalled();
    for (const s of sources) s.onended?.();
    expect(mix.disconnect).toHaveBeenCalled();
  });

  it("plays at the right moment and does not let the same sound pile up when a key is held", () => {
    const { ctx, context, sources } = fakeContext();
    const play = createUiPlayer(context, { connect: vi.fn() } as unknown as AudioNode);
    sources.length = 0;
    ctx.currentTime = 10;
    play("move", { step: 1 });
    const afterFirst = sources.length;
    expect(afterFirst).toBeGreaterThan(0);
    // Scheduled a few milliseconds ahead, never in the past.
    expect(sources[0].start.mock.calls[0][0]).toBeGreaterThan(10);

    ctx.currentTime = 10 + MIN_GAP_SECONDS.move / 2;
    play("move", { step: 2 });
    expect(sources).toHaveLength(afterFirst);

    ctx.currentTime = 10 + MIN_GAP_SECONDS.move + 0.001;
    play("move", { step: 2 });
    expect(sources.length).toBeGreaterThan(afterFirst);
  });

  it("lets different sounds play together", () => {
    const { ctx, context, sources } = fakeContext();
    const play = createUiPlayer(context, { connect: vi.fn() } as unknown as AudioNode);
    sources.length = 0;
    ctx.currentTime = 5;
    play("move");
    const afterMove = sources.length;
    play("select");
    expect(sources.length).toBeGreaterThan(afterMove);
  });
});
