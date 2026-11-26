/* eslint-disable react-hooks/immutability -- three.js textures and objects are mutated by design (UV offsets, refs, useFrame) */

// A pixel-art cat standing in the 3D scene as an upright sprite. It carries a generated normal map, so
// lamps and moonlight shade it like a real object, and it casts a shadow shaped like the cat rather than
// like its rectangle. This is the Phase 0 placeholder; the real, generated cat arrives in Phase 2.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type Ref } from "react";
import { DoubleSide, MeshDepthMaterial, RGBADepthPacking, type Group, type Texture } from "three";
import { LOOK } from "../render/look";
import { makeRadialTexture } from "../render/soft-textures";
import { CAT_FRAMES, catFrameAt } from "./cat-animation";
import type { Vec3 } from "./stage-constants";

export interface CatSpriteProps {
  ref?: Ref<Group>;
  /** Where the cat's feet are. */
  position: Vec3;
  /** World width of one sprite frame: chosen so one sprite pixel equals one game pixel. */
  width: number;
  /** 0 = upright plane, 1 = plane tilted to face the camera exactly. */
  lean: number;
  pitchDeg: number;
  /** How much of the sprite's own colour is added back so it never disappears into the dark. */
  glow: number;
  color: Texture;
  normal: Texture;
  /** Play the idle loop; otherwise hold the resting frame. */
  animate: boolean;
  castShadow: boolean;
}

export function CatSprite({ ref, position, width, lean, pitchDeg, glow, color, normal, animate, castShadow }: CatSpriteProps) {
  const { sheet, normalSheet, depthMaterial } = useMemo(() => {
    // Clones share the loaded image but have their own UV window onto the sprite strip.
    const c = color.clone();
    const n = normal.clone();
    for (const t of [c, n]) {
      t.repeat.set(1 / CAT_FRAMES, 1);
      t.needsUpdate = true;
    }
    const d = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: c, alphaTest: 0.5, side: DoubleSide });
    return { sheet: c, normalSheet: n, depthMaterial: d };
  }, [color, normal]);
  const blob = useMemo(
    () =>
      makeRadialTexture(64, [
        [0, "rgba(255,255,255,0.9)"],
        [0.55, "rgba(255,255,255,0.5)"],
        [1, "rgba(255,255,255,0)"],
      ]),
    [],
  );

  useEffect(
    () => () => {
      sheet.dispose();
      normalSheet.dispose();
      depthMaterial.dispose();
    },
    [sheet, normalSheet, depthMaterial],
  );
  useEffect(() => () => blob.dispose(), [blob]);

  useFrame(({ clock }) => {
    const frame = animate ? catFrameAt(clock.elapsedTime) : 0;
    sheet.offset.x = frame / CAT_FRAMES;
    normalSheet.offset.x = frame / CAT_FRAMES;
  });

  const tilt = -((pitchDeg * Math.PI) / 180) * lean;
  return (
    <group ref={ref} position={position}>
      {/* A soft contact shadow, so the cat sits on the cobbles even where real shadows are off. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.006} renderOrder={2}>
        <planeGeometry args={[width * 0.8, width * 0.4]} />
        <meshBasicMaterial map={blob} transparent opacity={0.35} depthWrite={false} color="#120c24" toneMapped={false} />
      </mesh>
      <group rotation-x={tilt}>
        <mesh position-y={width / 2 - width * 0.03} castShadow={castShadow} receiveShadow customDepthMaterial={depthMaterial}>
          <planeGeometry args={[width, width]} />
          <meshStandardMaterial
            map={sheet}
            normalMap={normalSheet}
            normalScale={[LOOK.catNormalScale, LOOK.catNormalScale]}
            alphaTest={0.5}
            roughness={1}
            metalness={0}
            emissive="#ffffff"
            emissiveMap={sheet}
            emissiveIntensity={glow}
            side={DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
