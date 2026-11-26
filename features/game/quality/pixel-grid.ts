// The cat is pixel art, so each of its pixels should cover a whole number of screen pixels or the sprite
// looks uneven. This works out that whole-number scale for the current window, and how wide (in world
// units) the sprite quad must be so that one sprite pixel covers exactly that many screen pixels.
//
// How big the cat looks is a design choice, so it is given as a share of the window height rather than
// as a pixel count: the scale is whatever whole number gets the sprite's frame closest to that share.

export interface PixelGridInput {
  cssWidth: number;
  cssHeight: number;
  /** Pixels of the drawing buffer per CSS pixel (the display's density, at most 2 for this game). */
  dpr: number;
  /** About how much of the window height the sprite's whole frame should cover, such as 0.115 for 11.5%. */
  spriteScreenFraction: number;
  fovDeg: number;
  /** How far the sprite is in front of the camera, measured along the direction the camera looks. */
  depth: number;
  /** Width of one sprite frame in sprite pixels. */
  spritePx: number;
}

export interface PixelGrid {
  /** Whole drawing-buffer pixels per sprite pixel. */
  scale: number;
  /** Sprite-pixel rows from the top of the screen to the bottom. */
  gameRows: number;
  /** World units covered by one sprite pixel at the sprite's depth. */
  unitsPerGamePx: number;
  /** World width of the sprite quad. */
  spriteWorldWidth: number;
  /** Height of the drawing buffer in pixels. */
  deviceHeight: number;
}

export function computePixelGrid({ cssHeight, dpr, spriteScreenFraction, fovDeg, depth, spritePx }: PixelGridInput): PixelGrid {
  const deviceHeight = Math.max(1, cssHeight * Math.max(dpr, 0.1));
  const idealScale = (deviceHeight * spriteScreenFraction) / Math.max(spritePx, 1);
  const scale = Math.max(1, Math.round(idealScale));
  const gameRows = deviceHeight / scale;
  // The world height that fills the screen at the sprite's own depth, so a sprite pixel is exactly `scale` screen pixels.
  const viewHeightUnits = 2 * depth * Math.tan((fovDeg * Math.PI) / 360);
  const unitsPerGamePx = viewHeightUnits / gameRows;
  return { scale, gameRows, unitsPerGamePx, spriteWorldWidth: spritePx * unitsPerGamePx, deviceHeight };
}

/** A tall, narrow window such as a phone held upright: the street would be a thin slice. */
export function isNarrowPortrait(cssWidth: number, cssHeight: number): boolean {
  return cssHeight > cssWidth && cssWidth < 700;
}
