import { describe, expect, it } from "vitest";
import { cameraPose, viewDepth } from "./camera-pose";
import { CAMERA, CAT_BODY_CENTER } from "./stage-constants";

describe("cameraPose", () => {
  it("stands the configured distance away from its target", () => {
    const { position, target } = cameraPose();
    expect(Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2])).toBeCloseTo(CAMERA.distance, 6);
  });

  it("looks down at the configured pitch from the +Z side, without drifting sideways", () => {
    const { position, target } = cameraPose();
    expect(position[0]).toBe(target[0]);
    expect(position[2]).toBeGreaterThan(target[2]);
    const pitch = Math.atan2(position[1] - target[1], position[2] - target[2]);
    expect(pitch).toBeCloseTo((CAMERA.pitch * Math.PI) / 180, 6);
  });

  it("follows a moved target", () => {
    const a = cameraPose([0, 1, 0]);
    const b = cameraPose([5, 1, -3]);
    expect(b.position[0] - a.position[0]).toBeCloseTo(5, 6);
    expect(b.position[2] - a.position[2]).toBeCloseTo(-3, 6);
    expect(b.position[1]).toBeCloseTo(a.position[1], 6);
  });

  it("looks straight down at a 90 degree pitch", () => {
    const { position, target } = cameraPose([0, 0, 0], 90, 10);
    expect(position[1]).toBeCloseTo(10, 6);
    expect(position[2]).toBeCloseTo(0, 6);
    expect(target).toEqual([0, 0, 0]);
  });
});

describe("viewDepth", () => {
  it("is the camera's distance for the point it looks at", () => {
    expect(viewDepth(CAMERA.target)).toBeCloseTo(CAMERA.distance, 6);
  });

  it("is the same for every point at the same depth, in the middle of the picture or off to the side", () => {
    const pose = cameraPose();
    // Slide the target sideways along the camera's right-hand axis (x): depth must not change.
    expect(viewDepth([CAMERA.target[0] + 5, CAMERA.target[1], CAMERA.target[2]], pose)).toBeCloseTo(CAMERA.distance, 6);
    expect(viewDepth([CAMERA.target[0] - 3, CAMERA.target[1], CAMERA.target[2]], pose)).toBeCloseTo(CAMERA.distance, 6);
  });

  it("grows by exactly one for every unit moved further along the viewing direction", () => {
    const pose = cameraPose();
    const forward = [pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]];
    const length = Math.hypot(...forward);
    const beyond: [number, number, number] = [pose.target[0] + forward[0] / length, pose.target[1] + forward[1] / length, pose.target[2] + forward[2] / length];
    expect(viewDepth(beyond, pose)).toBeCloseTo(CAMERA.distance + 1, 6);
  });

  it("puts the cat a little closer to the camera than the point the camera looks at", () => {
    // The camera aims behind the cat, so the cat is nearer: this is why it is sized by depth, not by the aim distance.
    const depth = viewDepth(CAT_BODY_CENTER);
    expect(depth).toBeLessThan(CAMERA.distance);
    expect(depth).toBeGreaterThan(CAMERA.distance - 2);
  });
});
