// Things that follow from how big the cat is drawn.
import { CAT_FOCUS_RATIO, CAT_POSITION, type Vec3 } from "./stage-constants";

/**
 * The point on the cat that the miniature blur keeps sharp. It sits at a fixed share of the sprite's
 * width above the cat's feet, so it stays on the cat's body whatever size the cat is drawn at.
 */
export function catFocusPoint(spriteWidth: number): Vec3 {
  return [CAT_POSITION[0], spriteWidth * CAT_FOCUS_RATIO, CAT_POSITION[2]];
}
