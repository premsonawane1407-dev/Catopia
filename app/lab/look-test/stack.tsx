"use client";
/* eslint-disable react-hooks/immutability -- three.js scene objects are mutated by design (refs, useFrame); throwaway Phase 0 lab code */

// PHASE 0 LOOK TEST - throwaway. The post-processing stack, built from toggles so each effect's
// contribution can be judged on its own.
import { useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  BrightnessContrast,
  ColorDepth,
  EffectComposer,
  EffectComposerContext,
  HueSaturation,
  Noise,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useContext, useEffect, useMemo } from "react";
import { HalfFloatType, UnsignedByteType, Vector3, type Object3D } from "three";
import { OutlineEffect } from "./outline-effect";
import { TiltBokehEffect } from "./tilt-bokeh-effect";
import type { LabState, TierSpec, TimePreset } from "./presets";

/** Renders the scene directly when the post-processing stack is off. */
export function PlainRender() {
  useFrame(({ gl, scene, camera }) => {
    gl.render(scene, camera);
  }, 1);
  return null;
}

function Outlines() {
  const { normalPass } = useContext(EffectComposerContext);
  const scene = useThree((s) => s.scene);
  const effect = useMemo(() => new OutlineEffect(), []);

  useEffect(() => {
    if (!normalPass) return;
    effect.setNormalBuffer(normalPass.texture);
    // Anything tagged userData.noOutline (the cat, glows, particles, window light) is kept out of the
    // normal pass: it is either self-lit, translucent, or already carries its own painted outline.
    const original = normalPass.render.bind(normalPass);
    normalPass.render = (...args: Parameters<typeof original>) => {
      const hidden: Object3D[] = [];
      scene.traverse((o) => {
        if (o.userData.noOutline && o.visible) {
          o.visible = false;
          hidden.push(o);
        }
      });
      original(...args);
      for (const o of hidden) o.visible = true;
    };
    return () => {
      normalPass.render = original;
      effect.setNormalBuffer(null);
    };
  }, [effect, normalPass, scene]);

  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}

/** The miniature blur: sharp around the cat (wherever it is on screen), strongly blurred above and below. */
function TiltBokeh({ up, down, feather, radius, boost, samples, target }: { up: number; down: number; feather: number; radius: number; boost: number; samples: number; target: [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  const effect = useMemo(() => new TiltBokehEffect(), []);
  const point = useMemo(() => new Vector3(), []);

  useFrame(() => {
    camera.updateMatrixWorld();
    point.set(target[0], target[1], target[2]).project(camera);
    effect.setFocusY((point.y + 1) / 2);
  }, 0.5);

  useEffect(() => {
    effect.setOptions({ focusUp: up, focusDown: down, feather, maxRadius: radius, boost, samples });
  }, [effect, up, down, feather, radius, boost, samples]);

  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}

const CAT_FOCUS: [number, number, number] = [0, 0.45, 0.6];

interface PostStackProps {
  state: LabState;
  preset: TimePreset;
  tier: TierSpec;
}

export function PostStack({ state, preset, tier }: PostStackProps) {
  const pixel = state.variant === "pixel";
  const outlineOn = pixel && state.outline && tier.outline;

  return (
    <EffectComposer multisampling={pixel ? 0 : tier.msaa} enableNormalPass={outlineOn} frameBufferType={tier.fb === "byte" ? UnsignedByteType : HalfFloatType}>
      {outlineOn && <Outlines />}
      {state.tilt && tier.tilt && <TiltBokeh up={state.tiltUp} down={state.tiltDown} feather={state.tiltFeather} radius={state.blurRadius} boost={state.bokeh} samples={tier.blurSamples} target={CAT_FOCUS} />}
      {state.bloom && tier.bloom && (
        <Bloom intensity={preset.bloomIntensity} luminanceThreshold={preset.bloomThreshold} luminanceSmoothing={0.2} mipmapBlur radius={0.7} />
      )}
      <HueSaturation saturation={preset.saturation} />
      <BrightnessContrast contrast={preset.contrast} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {!pixel && tier.smaa && <SMAA />}
      {state.colorDepth && <ColorDepth bits={5} />}
      {state.vignette && <Vignette offset={0.25} darkness={preset.vignette} />}
      {state.grain && tier.grain && <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.14} />}
    </EffectComposer>
  );
}
