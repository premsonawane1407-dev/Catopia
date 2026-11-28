// Numbers shared by the camera, the cat and the blur. Approved in the Phase 0 look test.

export type Vec3 = [number, number, number];

/** A fixed tilted perspective camera: narrow field of view gives the miniature feel. */
export const CAMERA = {
  fov: 28,
  pitch: 34,
  distance: 14,
  /** What the camera looks at: a little behind and above the cat, so houses fill the top of the frame. */
  target: [0, 0.9, -0.9] as Vec3,
} as const;

/** Where the cat sits (its feet). */
export const CAT_POSITION: Vec3 = [0, 0, 0.6];
/** A point in the middle of the cat's body: its depth from the camera decides how big the cat looks. */
export const CAT_BODY_CENTER: Vec3 = [0, 0.33, 0.6];

/**
 * The height, in sprite pixels, that sets how big a sprite pixel is: the window-height share below is for a frame
 * this tall. (The real frames are 72 x 60, but the pixel size stays what Phase 1 approved.)
 */
export const CAT_FRAME_PX = 48;
/**
 * About how much of the window height the cat's picture covers. The cat itself fills most of its frame,
 * so it looks a little smaller than this. Phase 0 had the frame at 16 to 20% of the height, which was
 * too big, so it was cut to about 11.5% on 2026-11-25. Raise this number to make the cat bigger.
 */
export const CAT_SCREEN_FRACTION = 0.115;
/** How far up the cat's body the blur's sharp band is centred, as a share of the sprite's width. */
export const CAT_FOCUS_RATIO = 0.36;
/** 0 = upright sprite plane, 1 = plane tilted to face the camera exactly. */
export const SPRITE_LEAN = 0.55;
