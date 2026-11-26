// Soft light halos (lamp posts, the far end of the street, the big near lanterns) as one instanced mesh
// of camera-facing quads. The Phase 0 street used one sprite, and so one draw call, per halo.
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { makeRadialTexture } from "../render/soft-textures";
import type { TimePreset } from "../render/time-presets";
import { glowFlicker, glowIntensity } from "./glow-math";
import type { GlowSpec } from "./stage-data";

// Billboard each instance in view space: the quad's corners are offset from the instance centre along
// the camera's right and up axes, scaled by the instance's own size.
const BILLBOARD_VERTEX = /* glsl */ `
  float glowSize = length( instanceMatrix[ 0 ].xyz );
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  mvPosition.xy += transformed.xy * glowSize;
  gl_Position = projectionMatrix * mvPosition;
`;

export interface GlowBatchProps {
  glows: readonly GlowSpec[];
  preset: TimePreset;
  /** Let the halos shimmer like flames; otherwise they hold still. */
  motion: boolean;
}

export function GlowBatch({ glows, preset, motion }: GlowBatchProps) {
  const mesh = useRef<InstancedMesh>(null);
  const texture = useMemo(() => makeRadialTexture(128), []);
  const material = useMemo(() => {
    const m = new MeshBasicMaterial({ map: texture, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", BILLBOARD_VERTEX);
    };
    m.customProgramCacheKey = () => "glow-billboard-1";
    return m;
  }, [texture]);
  useEffect(
    () => () => {
      material.dispose();
      texture.dispose();
    },
    [material, texture],
  );

  const seeds = useMemo(() => glows.map((g) => g.position[0] * 1.7 + g.position[2] * 2.3), [glows]);
  const scratch = useMemo(() => ({ matrix: new Matrix4(), position: new Vector3(), scale: new Vector3(), rotation: new Quaternion(), color: new Color() }), []);

  const place = (seconds: number) => {
    const m = mesh.current;
    if (!m) return;
    glows.forEach((g, i) => {
      const size = g.size * (motion ? glowFlicker(seconds, seeds[i]) : 1);
      scratch.matrix.compose(scratch.position.set(...g.position), scratch.rotation, scratch.scale.set(size, size, 1));
      m.setMatrixAt(i, scratch.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    glows.forEach((g, i) => m.setColorAt(i, scratch.color.set(preset.lanternColor).multiplyScalar(glowIntensity(g.kind, preset.lanternIntensity))));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    place(0);
    // `place` only reads props that are already in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glows, preset.lanternColor, preset.lanternIntensity, motion, scratch]);

  useFrame(({ clock }) => {
    if (motion) place(clock.elapsedTime);
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, glows.length]} material={material} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}
