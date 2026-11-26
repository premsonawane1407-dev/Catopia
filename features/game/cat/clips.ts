// What the cat can do and how its sprite sheet is laid out. This is only data: both the generator that
// draws the sheet and the game that plays it read these numbers, so they cannot drift apart.

/** The eight ways the cat can face, clockwise from "toward the camera" (screen down). */
export const DIRECTIONS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const DIRECTION_COUNT = DIRECTIONS.length;

export type ClipName = "idle" | "walk" | "run" | "sitDown" | "sit" | "lieDown" | "sleep";

export interface ClipSpec {
  /** Number of drawn frames per direction. */
  frames: number;
  /** Frames per second when the clip plays by time (everything except walk and run). */
  fps: number;
  loop: boolean;
  /** How far the cat travels, in sprite pixels, during one full loop. Only walk and run, which play by distance. */
  stridePx?: number;
}

export const CLIP_NAMES: readonly ClipName[] = ["idle", "walk", "run", "sitDown", "sit", "lieDown", "sleep"];

export const CLIPS: Record<ClipName, ClipSpec> = {
  // Four breathing frames plus a blink (frame 4).
  idle: { frames: 5, fps: 5, loop: true },
  walk: { frames: 8, fps: 0, loop: true, stridePx: 26 },
  run: { frames: 8, fps: 0, loop: true, stridePx: 50 },
  // Standing to sitting, one way. Played backwards, it is standing up.
  sitDown: { frames: 3, fps: 9, loop: false },
  sit: { frames: 5, fps: 4, loop: true },
  // Sitting to curled up asleep, one way. Played backwards, it is waking.
  lieDown: { frames: 3, fps: 6, loop: false },
  sleep: { frames: 4, fps: 2, loop: true },
};

/** Frame order of the blinking idle and sit loops: breathing frames 0 to 3 and back, a blink now and then (frame 4). */
export const BLINK_SEQUENCE: readonly number[] = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 4, 0];

/** How far above level the cat is drawn from, in degrees. The game camera looks down at 34, and the flat sprite is tilted back toward it, so a slightly lower view looks right. */
export const VIEW_ELEVATION_DEG = 28;

/** Size of one sprite frame in pixels. Big enough that no pose or direction is cut off (measured: the widest, the gallop, reaches 34 px left and 33 right of the origin; the tallest, sitting with ears up, 42 above; the lowest, a front paw, 11 below). */
export const CAT_FRAME_W = 72;
export const CAT_FRAME_H = 60;
/** Where the cat's feet-centre (the point under its body on the ground) sits in a frame, in pixels from the top-left. */
export const CAT_ORIGIN_PX: readonly [number, number] = [36, 46];
/** Frames per row of the sprite sheet. */
export const ATLAS_COLS = 16;

/** Pixels per second the cat covers at each gait. These set the game's speeds, so the feet match the ground. */
export const WALK_SPEED_PX = 44;
export const RUN_SPEED_PX = 105;

/** How the sheet's frames are numbered: clips in order, and within a clip each direction in turn. */
const OFFSETS: Record<ClipName, number> = (() => {
  const out = {} as Record<ClipName, number>;
  let next = 0;
  for (const name of CLIP_NAMES) {
    out[name] = next;
    next += CLIPS[name].frames * DIRECTION_COUNT;
  }
  return out;
})();

export const TOTAL_FRAMES = CLIP_NAMES.reduce((sum, name) => sum + CLIPS[name].frames * DIRECTION_COUNT, 0);

/** Position in the sheet's frame list of one frame of one clip facing one way. */
export function frameIndex(clip: ClipName, direction: number, frame: number): number {
  const spec = CLIPS[clip];
  const d = ((Math.round(direction) % DIRECTION_COUNT) + DIRECTION_COUNT) % DIRECTION_COUNT;
  const f = Math.min(spec.frames - 1, Math.max(0, Math.floor(frame)));
  return OFFSETS[clip] + d * spec.frames + f;
}

/** Cell (column, row) of a frame in the sheet. */
export function atlasCell(index: number): { col: number; row: number } {
  return { col: index % ATLAS_COLS, row: Math.floor(index / ATLAS_COLS) };
}

export const ATLAS_ROWS = Math.ceil(TOTAL_FRAMES / ATLAS_COLS);
export const ATLAS_W = ATLAS_COLS * CAT_FRAME_W;
export const ATLAS_H = ATLAS_ROWS * CAT_FRAME_H;

/** The heading in radians (0 faces the camera, a quarter turn faces screen right) of a direction index. */
export const directionHeading = (direction: number): number => (direction * Math.PI) / 4;

/**
 * The direction index nearest to a movement vector on the ground, where +x is screen right and +z is
 * toward the camera (screen down). Returns `fallback` when the vector is too small to mean anything.
 */
export function directionFromVector(x: number, z: number, fallback = 0): number {
  if (Math.hypot(x, z) < 1e-6) return fallback;
  const heading = Math.atan2(x, z);
  const index = Math.round(heading / (Math.PI / 4));
  return ((index % DIRECTION_COUNT) + DIRECTION_COUNT) % DIRECTION_COUNT;
}
