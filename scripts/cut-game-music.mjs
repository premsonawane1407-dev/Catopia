// Cuts a whole-frame excerpt out of an MP3 file without re-encoding it, so the sound is exactly what the
// source had. It turns a long recording into a web-sized piece for the game's background music.
//
//   node scripts/cut-game-music.mjs --source <long.mp3> --out <excerpt.mp3> --start <seconds> --end <seconds>
//
// Times count from the first sound frame. The excerpt carries no tags and no Xing/Info frame, so a player
// works its length out from the constant bitrate. Only MP3 (MPEG audio Layer III) is supported.
// Cutting inside the music can leave the first frame or two (about 50 ms) garbled, because an MP3 frame
// may borrow data from the one before it; start at a silent moment, or at 0, to avoid that.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** Reads an MPEG audio frame header at `at`, or returns null when there is none (or it is not Layer III). */
function readHeader(data, at) {
  if (at + 4 > data.length || data[at] !== 0xff || (data[at + 1] & 0xe0) !== 0xe0) return null;
  const versionBits = (data[at + 1] >> 3) & 3;
  const layerBits = (data[at + 1] >> 1) & 3; // 1 is Layer III
  const bitrateIndex = data[at + 2] >> 4;
  const rateIndex = (data[at + 2] >> 2) & 3;
  if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const mpeg1 = versionBits === 3;
  const bitrate = BITRATES[mpeg1 ? 1 : 2][bitrateIndex];
  const sampleRate = SAMPLE_RATES[versionBits][rateIndex];
  const padding = (data[at + 2] >> 1) & 1;
  return {
    bitrate,
    sampleRate,
    mpeg1,
    mono: data[at + 3] >> 6 === 3,
    samplesPerFrame: mpeg1 ? 1152 : 576,
    bytes: Math.floor(((mpeg1 ? 144000 : 72000) * bitrate) / sampleRate) + padding,
  };
}

function argument(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at > 1 ? process.argv[at + 1] : undefined;
}

const source = argument("source");
const out = argument("out");
const start = Number(argument("start") ?? 0);
const end = Number(argument("end"));
if (!source || !out || !(start >= 0) || !(end > start)) {
  console.error("usage: node scripts/cut-game-music.mjs --source <long.mp3> --out <excerpt.mp3> --start <seconds> --end <seconds>");
  process.exit(1);
}

const data = readFileSync(source);

// Skip the ID3v2 tag, then find the first frame: a header that is followed by another one a frame later.
let at = 0;
if (data.toString("latin1", 0, 3) === "ID3") {
  at = 10 + (((data[6] & 0x7f) << 21) | ((data[7] & 0x7f) << 14) | ((data[8] & 0x7f) << 7) | (data[9] & 0x7f));
}
let first = -1;
for (let i = at; i < Math.min(data.length - 4, at + 262144); i++) {
  const header = readHeader(data, i);
  const next = header && readHeader(data, i + header.bytes);
  if (header && next && next.sampleRate === header.sampleRate) {
    first = i;
    break;
  }
}
if (first < 0) throw new Error(`${source}: no MP3 frames found`);

// Walk every frame. An ID3v1 tag (128 bytes at the very end) is not sound.
const limit = data.length - (data.toString("latin1", data.length - 128, data.length - 125) === "TAG" ? 128 : 0);
const frames = [];
let format = null;
let pos = first;
while (pos + 4 <= limit) {
  const header = readHeader(data, pos);
  if (!header || pos + header.bytes > limit) break;
  format ??= header;
  frames.push(pos);
  pos += header.bytes;
}
if (limit - pos > 4096) console.warn(`warning: the frames stop ${limit - pos} bytes before the end of the file; the rest was ignored`);

// The first frame may only be a Xing/Info header, which carries no sound.
const sideInfo = format.mpeg1 ? (format.mono ? 17 : 32) : format.mono ? 9 : 17;
const marker = data.toString("latin1", first + 4 + sideInfo, first + 8 + sideInfo);
const sound = marker === "Xing" || marker === "Info" ? frames.slice(1) : frames;

const secondsPerFrame = format.samplesPerFrame / format.sampleRate;
const startFrame = Math.round(start / secondsPerFrame);
const endFrame = Math.min(sound.length, Math.round(end / secondsPerFrame));
if (endFrame <= startFrame) throw new Error("the excerpt would be empty: check --start and --end against the length of the recording");

const from = sound[startFrame];
const to = endFrame < sound.length ? sound[endFrame] : pos;
const excerpt = data.subarray(from, to);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, excerpt);

// Check what was written: every byte belongs to a whole frame, and there are as many as were asked for.
let checked = 0;
let count = 0;
while (checked < excerpt.length) {
  const header = readHeader(excerpt, checked);
  if (!header) break;
  checked += header.bytes;
  count++;
}
if (checked !== excerpt.length || count !== endFrame - startFrame) throw new Error("the excerpt is not made of whole frames");

console.log(
  JSON.stringify(
    {
      source: path.basename(source),
      out,
      format: `${format.mpeg1 ? "MPEG-1" : "MPEG-2"} Layer III, ${format.sampleRate} Hz, ${format.mono ? "mono" : "stereo"}, ${format.bitrate} kbps`,
      sourceSeconds: Math.round(sound.length * secondsPerFrame * 10) / 10,
      excerpt: {
        startSeconds: +(startFrame * secondsPerFrame).toFixed(3),
        endSeconds: +(endFrame * secondsPerFrame).toFixed(3),
        frames: count,
        bytes: excerpt.length,
        megabytes: +(excerpt.length / 1048576).toFixed(2),
        sha256: createHash("sha256").update(excerpt).digest("hex"),
      },
    },
    null,
    2,
  ),
);
if (startFrame > 0) console.warn("note: the excerpt starts inside the music, so its first frame or two may sound garbled. Start at a silent moment to avoid that.");
