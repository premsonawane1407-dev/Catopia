// The placeholder cat's idle animation: which of its five sprite frames to show at a given time.
// Frames 0-3 are the breathing and tail-sway loop (with an ear twitch); frame 4 is a blink.
// The real, generated cat arrives in Phase 2 and keeps this same "pick a frame from the clock" shape.

export const CAT_FRAMES = 5;
export const CAT_FRAME_FPS = 5;
export const CAT_BLINK_FRAME = 4;

export const CAT_IDLE_SEQUENCE: readonly number[] = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 4, 0];

/** The sprite frame to show `seconds` after the game started. */
export function catFrameAt(seconds: number): number {
  const step = Math.floor(Math.max(0, seconds) * CAT_FRAME_FPS);
  return CAT_IDLE_SEQUENCE[step % CAT_IDLE_SEQUENCE.length];
}

/** Seconds the whole idle loop takes before it repeats (and the cat blinks once). */
export const CAT_IDLE_LOOP_SECONDS = CAT_IDLE_SEQUENCE.length / CAT_FRAME_FPS;
