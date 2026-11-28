// How far the cat must travel for one full step cycle, so that its planted feet stay put on screen.
//
// The sprite's paws are drawn as seen from VIEW_ELEVATION_DEG above level, but the street is seen from the
// game camera's steeper pitch, which squashes ground distances toward and away from the camera more. Moving
// sideways the two agree; moving toward or away from the camera the ground slides by less on screen than the
// drawn paws would travel, so the cycle has to cover a little less ground in that direction.
import { CAMERA, SPRITE_LEAN } from "../world/stage-constants";
import { VIEW_ELEVATION_DEG, directionHeading } from "../cat/clips";

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Share of its ground stride the sprite's feet cover on screen, per unit of forward heading toward the camera. */
export function footDepthScale(pitchDeg: number = CAMERA.pitch): number {
  const pitch = rad(pitchDeg);
  const tilt = pitch * SPRITE_LEAN;
  // A step of one sprite pixel along the ground toward the camera moves a drawn paw by sin(elevation) sprite pixels up
  // the sprite, and a sprite pixel counts cos(pitch - tilt) on screen.
  return Math.cos(pitch - tilt) * Math.sin(rad(VIEW_ELEVATION_DEG));
}

/** Ground distance per full cycle for a cat facing `direction` (0 to 7), as a multiple of the clip's own stride in sprite pixels. */
/** `pitchDeg` is the map's camera pitch (the market street's by default). */
export function strideFactor(direction: number, pitchDeg: number = CAMERA.pitch): number {
  const h = directionHeading(direction);
  const sx = Math.sin(h);
  const cz = Math.cos(h);
  const foot = Math.hypot(sx, cz * footDepthScale(pitchDeg));
  const ground = Math.hypot(sx, cz * Math.sin(rad(pitchDeg)));
  return foot / ground;
}
