"use client";
/* eslint-disable react-hooks/immutability -- three.js scene objects are mutated by design (refs, useFrame); throwaway Phase 0 lab code */

// PHASE 0 LOOK TEST - throwaway. A placeholder pixel-art cat standing in the 3D scene as a
// camera-facing sprite. It carries a generated normal map, so lamps and moonlight shade it like a
// real object, and it casts a sprite-shaped shadow. The real, generated cat arrives in Phase 2.
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useMemo, type Ref } from "react";
import { DoubleSide, MeshDepthMaterial, NearestFilter, NoColorSpace, RGBADepthPacking, SRGBColorSpace, type Group } from "three";
import { makeRadialTexture } from "./textures";

const FRAMES = 5;
const FRAME_FPS = 5;
// Breathing and tail sway, an ear twitch, and a blink (frame 4) every few seconds.
const SEQUENCE = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 4, 0];

interface CatProps {
  ref?: Ref<Group>;
  position: [number, number, number];
  /** World width of one sprite frame: chosen so one sprite pixel equals one game pixel. */
  width: number;
  /** 0 = upright plane, 1 = plane tilted to face the camera exactly. */
  lean: number;
  pitchDeg: number;
  tint: string;
  /** Light the sprite with the scene lights (normal map) instead of a flat tint. */
  lit: boolean;
  /** How much of the sprite's own colour is added back so it never disappears into the dark. */
  glow: number;
}

export function Cat({ ref, position, width, lean, pitchDeg, tint, lit, glow }: CatProps) {
  const [colorBase, normalBase] = useTexture(["/lab/assets/cat/cat-idle.png", "/lab/assets/cat/cat-idle-normal.png"]);
  const { sheet, normalSheet, depthMaterial } = useMemo(() => {
    const c = colorBase.clone();
    c.colorSpace = SRGBColorSpace;
    const n = normalBase.clone();
    n.colorSpace = NoColorSpace;
    for (const t of [c, n]) {
      t.magFilter = NearestFilter;
      t.minFilter = NearestFilter;
      t.generateMipmaps = false;
      t.repeat.set(1 / FRAMES, 1);
      t.needsUpdate = true;
    }
    // Shadows follow the cat's silhouette, not its rectangle.
    const d = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: c, alphaTest: 0.5, side: DoubleSide });
    return { sheet: c, normalSheet: n, depthMaterial: d };
  }, [colorBase, normalBase]);
  const blob = useMemo(() => makeRadialTexture(64, [[0, "rgba(255,255,255,0.9)"], [0.55, "rgba(255,255,255,0.5)"], [1, "rgba(255,255,255,0)"]]), []);

  useFrame(({ clock }) => {
    const frame = SEQUENCE[Math.floor(clock.elapsedTime * FRAME_FPS) % SEQUENCE.length];
    sheet.offset.x = frame / FRAMES;
    normalSheet.offset.x = frame / FRAMES;
  });

  const tilt = -((pitchDeg * Math.PI) / 180) * lean;
  return (
    <group ref={ref} position={position} userData={{ noOutline: true }}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.006} renderOrder={2}>
        <planeGeometry args={[width * 0.8, width * 0.4]} />
        <meshBasicMaterial map={blob} transparent opacity={lit ? 0.35 : 0.6} depthWrite={false} color="#120c24" toneMapped={false} />
      </mesh>
      <group rotation-x={tilt}>
        <mesh position-y={width / 2 - width * 0.03} castShadow={lit} receiveShadow={lit} customDepthMaterial={depthMaterial}>
          <planeGeometry args={[width, width]} />
          {lit ? (
            <meshStandardMaterial map={sheet} normalMap={normalSheet} normalScale={[0.85, 0.85]} alphaTest={0.5} roughness={1} metalness={0} emissive="#ffffff" emissiveMap={sheet} emissiveIntensity={glow} side={DoubleSide} />
          ) : (
            <meshBasicMaterial map={sheet} transparent alphaTest={0.5} color={tint} side={DoubleSide} toneMapped={false} />
          )}
        </mesh>
      </group>
    </group>
  );
}
