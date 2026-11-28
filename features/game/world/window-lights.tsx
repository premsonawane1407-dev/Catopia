/* eslint-disable react-hooks/immutability -- shader uniforms and three.js materials are updated in place by design */

// Lit windows: panes with mullions, curtains and silhouettes, a soft halo around each pane and a pool of
// warm light on the cobbles in front of the ground-floor ones. About twenty windows draw in five calls
// (three pane atlases, one halo mesh and one pool mesh). Each window breathes with its own phase, computed
// on the GPU, and its halo and pool breathe with it.
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { AdditiveBlending, MeshBasicMaterial, type Texture } from "three";
import { makeGroundSpillTexture, makePaneAtlas, makeWindowHaloTexture } from "../render/pixel-textures";
import type { TimePreset } from "../render/time-presets";
import type { WindowKey, WindowSpec } from "./map/build-house";
import { CAT_CELL, PANE_CELLS, buildWindowGeometries } from "./window-geometry";

const KINDS: readonly WindowKey[] = ["a", "b", "s"];

/** How much a window's brightness varies (a slow breathing, a little different in every room). */
const FLICKER_AMOUNT = 0.1;

/**
 * How strong the window light is, as a share of the window colour times the time of day's window glow.
 * These are kept low enough that the light stays a warm orange: pushed higher, the picture's tone mapping
 * turns it into a flat pale yellow with no gradient left in it.
 */
const HALO_GAIN = 0.38;
const POOL_GAIN = 0.8;

interface FlickerUniforms {
  uTime: { value: number };
  uFlicker: { value: number };
  uBase: { value: number };
}

/** A basic material whose brightness breathes per window (from the `aPhase` attribute), optionally added to what is behind it. */
function createFlickerMaterial(map: Texture, uniforms: FlickerUniforms, additive: boolean): MeshBasicMaterial {
  const material = new MeshBasicMaterial(additive ? { map, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false } : { map, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPhase;\nuniform float uTime;\nuniform float uFlicker;\nuniform float uBase;\nvarying float vLevel;")
      .replace(
        "#include <begin_vertex>",
        // The same two slow sine waves as the look test, one phase per window.
        "#include <begin_vertex>\nvLevel = uBase * (1.0 - uFlicker + uFlicker * sin(uTime * 1.4 + aPhase) * sin(uTime * 0.37 + aPhase * 0.5 + 1.0));",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vLevel;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= vLevel;");
  };
  material.customProgramCacheKey = () => "window-flicker-1";
  return material;
}

export interface WindowLightsProps {
  windows: readonly WindowSpec[];
  preset: TimePreset;
  motion: boolean;
}

export function WindowLights({ windows, preset, motion }: WindowLightsProps) {
  const geometries = useMemo(() => buildWindowGeometries(windows), [windows]);
  const atlases = useMemo(
    () => ({ a: makePaneAtlas("a", PANE_CELLS, CAT_CELL), b: makePaneAtlas("b", PANE_CELLS), s: makePaneAtlas("s", PANE_CELLS) }) satisfies Record<WindowKey, Texture>,
    [],
  );
  const lightTextures = useMemo(() => ({ halo: makeWindowHaloTexture(), pool: makeGroundSpillTexture() }), []);
  // Panes are brighter than plain white at dusk (so bloom picks them up); their light is not scaled up with them.
  const paneUniforms = useMemo<FlickerUniforms>(() => ({ uTime: { value: 0 }, uFlicker: { value: 0 }, uBase: { value: 1 } }), []);
  const lightUniforms = useMemo<FlickerUniforms>(() => ({ uTime: paneUniforms.uTime, uFlicker: paneUniforms.uFlicker, uBase: { value: 1 } }), [paneUniforms]);
  const paneMaterials = useMemo(
    () => ({ a: createFlickerMaterial(atlases.a, paneUniforms, false), b: createFlickerMaterial(atlases.b, paneUniforms, false), s: createFlickerMaterial(atlases.s, paneUniforms, false) }) satisfies Record<WindowKey, MeshBasicMaterial>,
    [atlases, paneUniforms],
  );
  const haloMaterial = useMemo(() => createFlickerMaterial(lightTextures.halo, lightUniforms, true), [lightTextures, lightUniforms]);
  const poolMaterial = useMemo(() => createFlickerMaterial(lightTextures.pool, lightUniforms, true), [lightTextures, lightUniforms]);

  useEffect(
    () => () => {
      for (const g of [...Object.values(geometries.panes), geometries.halo, geometries.groundSpill]) g.dispose();
    },
    [geometries],
  );
  useEffect(
    () => () => {
      for (const t of [...Object.values(atlases), lightTextures.halo, lightTextures.pool]) t.dispose();
      for (const m of [...Object.values(paneMaterials), haloMaterial, poolMaterial]) m.dispose();
    },
    [atlases, lightTextures, paneMaterials, haloMaterial, poolMaterial],
  );

  // The panes, halos and light pools follow the live look as the day goes by: how lit the windows are is set every frame.
  const applyLook = useCallback(() => {
    paneUniforms.uBase.value = 1 + 0.45 * preset.windowGlow;
    haloMaterial.color.set(preset.windowColor).multiplyScalar(HALO_GAIN * preset.windowGlow);
    poolMaterial.color.set(preset.windowColor).multiplyScalar(POOL_GAIN * preset.windowGlow);
  }, [paneUniforms, haloMaterial, poolMaterial, preset]);

  useLayoutEffect(() => {
    applyLook();
    paneUniforms.uFlicker.value = motion ? FLICKER_AMOUNT : 0;
    if (!motion) paneUniforms.uTime.value = 0;
  }, [paneUniforms, applyLook, motion]);

  useFrame(({ clock }) => {
    applyLook();
    if (motion) paneUniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <mesh geometry={geometries.halo} material={haloMaterial} />
      {KINDS.map((kind) => {
        const geometry = geometries.panes[kind];
        return geometry ? <mesh key={kind} geometry={geometry} material={paneMaterials[kind]} /> : null;
      })}
      <mesh geometry={geometries.groundSpill} material={poolMaterial} />
    </group>
  );
}
