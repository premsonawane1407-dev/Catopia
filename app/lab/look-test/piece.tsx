"use client";

// PHASE 0 LOOK TEST - throwaway. Loads one staged Kenney Fantasy Town Kit piece.
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { Mesh, Object3D } from "three";
import { stylizeMaterial, type DetailProfile } from "./materials";

export const PIECE_NAMES = [
  "wall", "wall-door", "wall-doorway-square", "wall-window-shutters", "wall-window-glass", "wall-window-small",
  "wall-corner", "wall-half", "wall-arch", "wall-wood", "wall-wood-door", "wall-wood-doorway-square",
  "wall-wood-window-shutters", "wall-wood-window-glass", "wall-wood-window-small", "wall-wood-corner",
  "wall-wood-half", "wall-wood-arch",
  "roof", "roof-corner", "roof-gable", "roof-gable-end", "roof-gable-top", "roof-window", "roof-point",
  "roof-left", "roof-right", "roof-high", "roof-high-gable", "roof-high-gable-end", "roof-high-gable-top",
  "roof-high-window",
  "chimney", "chimney-base", "chimney-top",
  "stall", "stall-red", "stall-green", "stall-bench", "stall-stool",
  "cart", "cart-high", "wheel",
  "lantern", "banner-red", "banner-green",
  "fence", "fence-gate", "fence-broken", "hedge",
  "road", "road-bend", "road-curb", "road-edge", "road-corner",
  "stairs-stone", "stairs-stone-handrail", "stairs-wood", "stairs-wood-handrail",
  "pillar-stone", "pillar-wood", "balcony-wall", "overhang", "planks", "poles",
  "tree", "tree-crooked", "tree-high",
  "rock-small", "rock-large", "rock-wide",
  "fountain-round",
] as const;

export type PieceName = (typeof PIECE_NAMES)[number];

export const pieceUrl = (name: string) => `/lab/assets/town/${name}.glb`;

for (const name of PIECE_NAMES) useGLTF.preload(pieceUrl(name));

/** Which pixel-art surface a piece gets, and an optional colour tint on top of the Kenney palette. */
function surfaceFor(name: string): { profile: DetailProfile; tint?: [number, number, number] } {
  if (name.startsWith("wall-wood")) return { profile: "woodwall" };
  if (name.startsWith("wall")) return { profile: "plaster" };
  // The stock red roof reads magenta under blue light; pull it toward terracotta.
  if (name.startsWith("roof-high")) return { profile: "roof", tint: [1.0, 0.74, 0.56] };
  if (name.startsWith("roof")) return { profile: "roof", tint: [0.82, 0.96, 0.9] };
  if (name.startsWith("chimney")) return { profile: "brick" };
  if (name.startsWith("stall") || name.startsWith("cart") || name.startsWith("fence") || name === "planks" || name === "poles" || name === "pillar-wood" || name.startsWith("stairs-wood") || name === "wheel") return { profile: "wood" };
  if (name === "pillar-stone" || name.startsWith("stairs-stone") || name.startsWith("fountain") || name.startsWith("rock")) return { profile: "stone" };
  return { profile: "none" };
}

interface PieceProps {
  name: PieceName;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number | [number, number, number];
  cast?: boolean;
}

export function Piece({ name, position = [0, 0, 0], rotationY = 0, scale = 1, cast = true }: PieceProps) {
  const { scene } = useGLTF(pieceUrl(name));
  const object = useMemo(() => {
    const { profile, tint } = surfaceFor(name);
    const clone = scene.clone(true);
    clone.traverse((o: Object3D) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m) => stylizeMaterial(m, profile, tint));
    });
    return clone;
  }, [scene, cast, name]);
  return <primitive object={object} position={position} rotation={[0, rotationY, 0]} scale={scale} />;
}
