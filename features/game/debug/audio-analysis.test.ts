import { describe, expect, it } from "vitest";
import { AUDIBLE_FLOOR, analyseSamples, fft, spectralCentroid } from "./audio-analysis";

const RATE = 44100;
const sine = (freq: number, seconds: number, amplitude = 0.5) => Float32Array.from({ length: Math.round(RATE * seconds) }, (_, i) => amplitude * Math.sin((2 * Math.PI * freq * i) / RATE));

describe("fft", () => {
  it("finds a single tone in the right bin", () => {
    const n = 1024;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    // 64 whole cycles across the window land exactly in bin 64.
    for (let i = 0; i < n; i++) re[i] = Math.sin((2 * Math.PI * 64 * i) / n);
    fft(re, im);
    const magnitude = (k: number) => Math.hypot(re[k], im[k]);
    expect(magnitude(64)).toBeGreaterThan(n / 2 - 1);
    expect(magnitude(10)).toBeLessThan(1e-6);
  });

  it("refuses lengths that are not a power of two", () => {
    expect(() => fft(new Float64Array(12), new Float64Array(12))).toThrow(/power of two/);
  });
});

describe("spectralCentroid", () => {
  it("sits at the pitch of a pure tone", () => {
    expect(spectralCentroid(sine(1000, 0.3), RATE)).toBeGreaterThan(960);
    expect(spectralCentroid(sine(1000, 0.3), RATE)).toBeLessThan(1040);
  });

  it("is higher for a brighter sound", () => {
    expect(spectralCentroid(sine(4000, 0.3), RATE)).toBeGreaterThan(spectralCentroid(sine(500, 0.3), RATE) * 4);
  });

  it("is zero for silence", () => {
    expect(spectralCentroid(new Float32Array(2000), RATE)).toBe(0);
  });
});

describe("analyseSamples", () => {
  it("reports peak, level and length of a steady tone", () => {
    const r = analyseSamples(sine(440, 0.2, 0.25), RATE);
    expect(r.peak).toBeCloseTo(0.25, 2);
    expect(r.peakDb).toBeCloseTo(-12, 0);
    expect(r.rms).toBeCloseTo(0.25 / Math.SQRT2, 2);
    expect(r.audibleMs).toBeGreaterThan(195);
    expect(r.audibleMs).toBeLessThan(205);
    expect(r.clipped).toBe(false);
  });

  it("measures how long a fading sound stays audible", () => {
    // Amplitude falls by 60 dB over a second, so it drops under -50 dB after a bit less than that.
    const fade = Float32Array.from({ length: RATE }, (_, i) => 0.5 * 10 ** ((-60 * (i / RATE)) / 20) * Math.sin((2 * Math.PI * 300 * i) / RATE));
    const r = analyseSamples(fade, RATE);
    expect(r.audibleMs).toBeGreaterThan(700);
    expect(r.audibleMs).toBeLessThan(900);
  });

  it("flags a sound that reaches full scale", () => {
    expect(analyseSamples(sine(200, 0.1, 1), RATE).clipped).toBe(true);
  });

  it("calls an all-zero or inaudible sound silent", () => {
    const quiet = analyseSamples(new Float32Array(1000), RATE);
    expect(quiet).toMatchObject({ rms: 0, audibleMs: 0, centroidHz: 0, clipped: false });
    expect(analyseSamples(sine(440, 0.1, AUDIBLE_FLOOR / 2), RATE).audibleMs).toBe(0);
  });
});
