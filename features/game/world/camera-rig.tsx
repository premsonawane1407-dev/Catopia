/* eslint-disable react-hooks/immutability -- the three.js camera is positioned in place by design */

// A fixed tilted camera aimed just behind and above the cat, so houses fill the top of the frame.
// Phase 2 will move the target to follow the cat; the pose maths already takes a target.
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import type { PerspectiveCamera } from "three";
import { cameraPose } from "./camera-pose";
import { CAMERA } from "./stage-constants";

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const { position, target } = cameraPose();
    cam.fov = CAMERA.fov;
    cam.updateProjectionMatrix();
    cam.position.set(...position);
    cam.lookAt(...target);
  }, [camera]);
  return null;
}
