// A very quiet bed of evening breeze, made from noise so it needs no audio file: looped brown noise
// through a low-pass filter whose cutoff drifts slowly. It is a placeholder that gives the bus something
// real to mute until the audio phase brings recorded ambience and music.

/** Starts the breeze on `output` and returns a function that stops it. */
export function startEveningAmbience(context: AudioContext, output: AudioNode): () => void {
  const seconds = 4;
  const fade = Math.floor(context.sampleRate * 0.5);
  const length = Math.floor(context.sampleRate * seconds);

  // Brown noise is a random walk: each sample drifts a little from the one before.
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const walk = new Float32Array(length + fade);
  let last = 0;
  for (let i = 0; i < walk.length; i++) {
    last = (last + 0.02 * (rand() * 2 - 1)) / 1.02;
    walk[i] = last * 3.5;
  }
  // Blend the start with the walk's continuation, so the loop joins without a click.
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = i < fade ? walk[i] * (i / fade) + walk[length + i] * (1 - i / fade) : walk[i];
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 480;
  filter.Q.value = 0.4;

  // A slow wobble in the cutoff, like gusts coming and going.
  const wobble = context.createOscillator();
  wobble.frequency.value = 0.07;
  const wobbleDepth = context.createGain();
  wobbleDepth.gain.value = 220;
  wobble.connect(wobbleDepth).connect(filter.frequency);

  const level = context.createGain();
  level.gain.value = 0.16;
  source.connect(filter).connect(level).connect(output);

  source.start();
  wobble.start();
  return () => {
    for (const node of [source, wobble]) {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
    }
    for (const node of [source, filter, wobble, wobbleDepth, level]) node.disconnect();
  };
}
