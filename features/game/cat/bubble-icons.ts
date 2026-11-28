// The little pictures that float above the cat while it emotes or sleeps, drawn as pixel art from the bitmaps below
// (no image files). Each is 11 by 11 pixels; "o" is the dark outline, "F" the fill and "h" a highlight.
import type { BubbleIcon } from "./clips";

export const ICON_ORDER: readonly BubbleIcon[] = ["note", "heart", "question", "exclaim", "zzz", "sparkle"];
export const ICON_SIZE = 11;
/** Each icon sits in a square cell of this many pixels in the sheet, so there is a pixel of room all round. */
export const ICON_CELL = 13;

const BITMAPS: Record<BubbleIcon, { rows: string[]; fill: string; highlight: string; outline: string }> = {
  heart: {
    rows: ["..ooo.ooo..", ".oFFFoFFFo.", "oFhFFFFFFFo", "oFhFFFFFFFo", "oFFFFFFFFFo", ".oFFFFFFFo.", "..oFFFFFo..", "...oFFFo...", "....oFo....", ".....o.....", "..........."],
    fill: "#ee6b8b",
    highlight: "#ffc2d1",
    outline: "#6a1f3a",
  },
  note: {
    rows: ["......oo...", "......oFo..", "......oFFo.", "......oFo..", "......oFo..", "......oFo..", "..ooo.oFo..", ".oFFFooFo..", ".oFhFFoo...", ".oFFFo.....", "..ooo......"],
    fill: "#fff2d6",
    highlight: "#ffffff",
    outline: "#3a2a4a",
  },
  question: {
    rows: ["...ooooo...", "..oFFFFFo..", ".oFFooFFFo.", ".oFo.oFFFo.", ".ooo.oFFo..", ".....oFo...", "....oFFo...", "....oFo....", "....ooo....", "....oFo....", "....ooo...."],
    fill: "#ffe08a",
    highlight: "#fff6c8",
    outline: "#4a3410",
  },
  exclaim: {
    rows: ["....ooo....", "...oFFFo...", "...oFFFo...", "...oFhFo...", "...oFFFo...", "...oFFFo...", "....oFo....", "....ooo....", "....oFo....", "....oFo....", "....ooo...."],
    fill: "#ffcf4d",
    highlight: "#fff1a8",
    outline: "#5a3a08",
  },
  zzz: {
    rows: ["...........", ".ooooooo...", ".oFFFFFo...", ".ooooFFo...", "....oFo....", "...oFFo....", "..oFFooooo.", "..oFFFFFFo.", "..ooooooo..", "...........", "..........."],
    fill: "#cfd8ff",
    highlight: "#ffffff",
    outline: "#2c3470",
  },
  sparkle: {
    rows: [".....o.....", "....oFo....", "....oFo....", "...oFhFo...", "oooFFhFFooo", "oFFFhhhFFFo", "oooFFhFFooo", "...oFhFo...", "....oFo....", "....oFo....", ".....o....."],
    fill: "#ffe58a",
    highlight: "#ffffff",
    outline: "#7a5a10",
  },
};

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** One RGBA sheet with every icon in a row, ICON_CELL pixels square each. */
export function makeIconSheet(): { width: number; height: number; data: Uint8ClampedArray } {
  const width = ICON_CELL * ICON_ORDER.length;
  const height = ICON_CELL;
  const data = new Uint8ClampedArray(width * height * 4);
  ICON_ORDER.forEach((name, i) => {
    const { rows, fill, highlight, outline } = BITMAPS[name];
    const colours: Record<string, [number, number, number]> = { F: rgb(fill), h: rgb(highlight), o: rgb(outline) };
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const c = colours[ch];
        if (!c) return;
        const o = (((y + 1) * width) + i * ICON_CELL + x + 1) * 4;
        data[o] = c[0];
        data[o + 1] = c[1];
        data[o + 2] = c[2];
        data[o + 3] = 255;
      });
    });
  });
  return { width, height, data };
}

/** Every bitmap's rows, for checking they are all the same size. */
export const ICON_ROWS: Record<BubbleIcon, readonly string[]> = Object.fromEntries(ICON_ORDER.map((n) => [n, BITMAPS[n].rows])) as unknown as Record<BubbleIcon, readonly string[]>;
