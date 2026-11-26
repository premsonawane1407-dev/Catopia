// Where the camera stands. Phase 1 has a fixed camera; Phase 2 will move `target` to follow the cat.
import { CAMERA, type Vec3 } from "./stage-constants";

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

/** A camera `distance` away from `target`, looking down at `pitchDeg` degrees from straight ahead, from the +Z side. */
export function cameraPose(target: Vec3 = CAMERA.target, pitchDeg: number = CAMERA.pitch, distance: number = CAMERA.distance): CameraPose {
  const pitch = (pitchDeg * Math.PI) / 180;
  return {
    target,
    position: [target[0], target[1] + Math.sin(pitch) * distance, target[2] + Math.cos(pitch) * distance],
  };
}

/**
 * How far `point` is in front of the camera, measured along the direction the camera looks rather than
 * in a straight line. This is the distance that decides how big something looks on screen: everything
 * at the same depth has the same size per pixel, whether it is in the middle of the picture or at its edge.
 */
export function viewDepth(point: Vec3, pose: CameraPose = cameraPose()): number {
  const forward: Vec3 = [pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]];
  const length = Math.hypot(...forward);
  const offset: Vec3 = [point[0] - pose.position[0], point[1] - pose.position[1], point[2] - pose.position[2]];
  return (offset[0] * forward[0] + offset[1] * forward[1] + offset[2] * forward[2]) / length;
}
