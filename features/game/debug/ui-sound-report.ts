// Renders each menu sound offline, through the same reverb the game uses, at the game's default master
// volume, and measures it (see audio-analysis.ts). Browser only: it needs OfflineAudioContext. It is
// loaded on demand, from window.__catopia.reportUiSounds, so it never weighs on the game.
import { DEFAULT_VOLUME } from "../audio/audio-bus";
import { UI_SOUND_NAMES, createUiOutput, recipeFor, renderRecipe, type UiSoundName } from "../audio/ui-sounds";
import { analyseSamples, type SoundReport } from "./audio-analysis";

const SAMPLE_RATE = 44100;
const SECONDS = 0.9;

export async function reportUiSounds(): Promise<Record<UiSoundName, SoundReport>> {
  const report = {} as Record<UiSoundName, SoundReport>;
  for (const name of UI_SOUND_NAMES) {
    const context = new OfflineAudioContext(2, Math.round(SAMPLE_RATE * SECONDS), SAMPLE_RATE);
    const master = context.createGain();
    master.gain.value = DEFAULT_VOLUME;
    master.connect(context.destination);
    renderRecipe(context, createUiOutput(context, master), recipeFor(name, { step: 3, direction: 1 }), 0.01);
    const buffer = await context.startRendering();
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const mono = Float32Array.from(left, (value, i) => (value + right[i]) / 2);
    report[name] = analyseSamples(mono, SAMPLE_RATE);
  }
  return report;
}
