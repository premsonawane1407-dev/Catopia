"use client";

// PHASE 0 LOOK TEST - throwaway. A fixed tilted camera aimed at the cat, with an optional slow
// pan so motion can be judged. In the pixel variant the camera snaps to whole game pixels so
// textures and sprites do not shimmer while it moves.
import { useFrame } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";

interface CameraRigProps {
  fov: number;
  pitch: number;
  distance: number;
  sway: boolean;
  /** World units per game pixel at the focus plane; 0 disables snapping. */
  snapUnits: number;
  target: [number, number, number];
}

export function CameraRig({ fov, pitch, distance, sway, snapUnits, target }: CameraRigProps) {
  useFrame(({ camera, clock }) => {
    const cam = camera as PerspectiveCamera;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    const t = clock.elapsedTime;
    const p = (pitch * Math.PI) / 180;
    let tx = target[0] + (sway ? Math.sin(t * 0.33) * 1.8 : 0);
    let tz = target[2] + (sway ? Math.sin(t * 0.21 + 1) * 0.6 : 0);
    if (snapUnits > 0) {
      const stepZ = snapUnits / Math.sin(p);
      tx = Math.round(tx / snapUnits) * snapUnits;
      tz = Math.round(tz / stepZ) * stepZ;
    }
    cam.position.set(tx, target[1] + Math.sin(p) * distance, tz + Math.cos(p) * distance);
    cam.lookAt(tx, target[1], tz);
  });
  return null;
}
