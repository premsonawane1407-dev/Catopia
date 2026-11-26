/* eslint-disable react-hooks/immutability -- postprocessing effects are configured in place by design */

// The post-processing stack that turns a lit 3D scene into the "miniature" look: a blur that follows the
// cat, bloom on bright lights, a colour grade, Khronos Neutral tone mapping and a vignette. Cheaper
// quality tiers drop pieces of it; the lowest renders the scene directly.
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo } from "react";
import { HalfFloatType, NeutralToneMapping, NoToneMapping, UnsignedByteType, Vector3 } from "three";
import type { TierSpec } from "../quality/tiers";
import type { Vec3 } from "../world/stage-constants";
import { LOOK } from "./look";
import type { TimePreset } from "./time-presets";
import { TiltBokehEffect } from "./tilt-bokeh-effect";

/** Renders the scene directly, with the same tone mapping the post stack would have used. */
export function PlainRender() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = NeutralToneMapping;
    return () => {
      gl.toneMapping = NoToneMapping;
    };
  }, [gl]);
  useFrame(({ gl: renderer, scene, camera }) => {
    renderer.render(scene, camera);
  }, 1);
  return null;
}

/** The miniature blur: sharp around the cat (wherever it is on screen), strongly blurred above and below. */
function TiltBokeh({ target, samples }: { target: Vec3; samples: number }) {
  const camera = useThree((s) => s.camera);
  const effect = useMemo(() => new TiltBokehEffect(), []);
  const point = useMemo(() => new Vector3(), []);

  useFrame(() => {
    camera.updateMatrixWorld();
    point.set(target[0], target[1], target[2]).project(camera);
    effect.setFocusY((point.y + 1) / 2);
  }, 0.5);

  useEffect(() => {
    effect.setOptions({ ...LOOK.blur, samples });
  }, [effect, samples]);

  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}

export interface PostStackProps {
  tier: TierSpec;
  preset: TimePreset;
  /** The point on the cat that the blur keeps sharp. */
  focus: Vec3;
}

export function PostStack({ tier, preset, focus }: PostStackProps) {
  return (
    <EffectComposer multisampling={tier.msaa} frameBufferType={tier.frameBuffer === "byte" ? UnsignedByteType : HalfFloatType}>
      {tier.blur && <TiltBokeh target={focus} samples={tier.blurSamples} />}
      {tier.bloom && <Bloom intensity={preset.bloomIntensity} luminanceThreshold={preset.bloomThreshold} luminanceSmoothing={LOOK.bloom.smoothing} mipmapBlur radius={LOOK.bloom.radius} />}
      <HueSaturation saturation={preset.saturation} />
      <BrightnessContrast contrast={preset.contrast} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {tier.smaa && <SMAA />}
      <Vignette offset={LOOK.vignetteOffset} darkness={preset.vignette} />
    </EffectComposer>
  );
}
