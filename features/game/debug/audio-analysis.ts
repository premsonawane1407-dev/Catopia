// Numbers that describe a short sound, so "soft, short, not sharp" can be checked instead of guessed.
// Plain maths on a list of samples: no audio hardware is needed.

export interface SoundReport {
  /** The loudest sample, 0 to 1 (1 is the loudest a speaker can play). */
  peak: number;
  /** The same in decibels below full scale (0 is as loud as it gets, -20 is a tenth of that). */
  peakDb: number;
  /** Loudness over the audible part of the sound (root mean square), 0 to 1. */
  rms: number;
  /** Milliseconds from the first to the last moment the sound is louder than -50 dB. */
  audibleMs: number;
  /** The centre of the sound's spectrum in Hz: low is soft and dark, high is sharp and bright. */
  centroidHz: number;
  /** Whether any sample reached full scale, which would crackle. */
  clipped: boolean;
}

/** Below this a sound is treated as silent: -50 dB of full scale. */
export const AUDIBLE_FLOOR = 10 ** (-50 / 20);

/** In-place radix-2 fast Fourier transform. Both arrays must be the same power-of-two length. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n !== im.length || (n & (n - 1)) !== 0) throw new Error("fft needs equal arrays whose length is a power of two");
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < size / 2; k++) {
        const a = start + k;
        const b = a + size / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}

/** The power-weighted average frequency of the first `size` samples (Hann-windowed, zero-padded). */
export function spectralCentroid(samples: Float32Array | number[], sampleRate: number, size = 16384): number {
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const count = Math.min(size, samples.length);
  for (let i = 0; i < count; i++) re[i] = samples[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, count - 1)));
  fft(re, im);
  let weighted = 0;
  let total = 0;
  for (let k = 1; k < size / 2; k++) {
    const power = re[k] * re[k] + im[k] * im[k];
    weighted += power * ((k * sampleRate) / size);
    total += power;
  }
  return total > 0 ? weighted / total : 0;
}

export function analyseSamples(samples: Float32Array | number[], sampleRate: number): SoundReport {
  let peak = 0;
  let first = -1;
  let last = -1;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
    if (v > AUDIBLE_FLOOR) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return { peak, peakDb: peak > 0 ? 20 * Math.log10(peak) : -Infinity, rms: 0, audibleMs: 0, centroidHz: 0, clipped: false };
  let sum = 0;
  for (let i = first; i <= last; i++) sum += samples[i] * samples[i];
  return {
    peak,
    peakDb: 20 * Math.log10(peak),
    rms: Math.sqrt(sum / (last - first + 1)),
    audibleMs: ((last - first + 1) / sampleRate) * 1000,
    centroidHz: spectralCentroid(samples, sampleRate),
    clipped: peak >= 0.999,
  };
}
