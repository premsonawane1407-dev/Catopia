/* eslint-disable react-hooks/immutability -- the scene's lights, fog and background are updated in place every frame as the day moves on */

// Background, fog and lights for the time of day: a hemisphere fill, the sun or moon (the only light that
// casts shadows) and, as far as the quality tier allows, real point lights in the lamp posts. `preset` is the live
// look the day clock rewrites every frame (day-cycle.tsx), so everything here is applied in the frame loop.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, FogExp2, type DirectionalLight, type HemisphereLight, type PointLight } from "three";
import type { Vec3 } from "../world/stage-constants";
import type { TierSpec } from "../quality/tiers";
import type { TimePreset } from "./time-presets";

export interface LightingProps {
  preset: TimePreset;
  tier: TierSpec;
  /** Positions of the lamp flames; the first `tier.pointLights` of them get a real light. */
  lamps: readonly Vec3[];
  /** Let the flames flicker; otherwise they burn steadily. */
  motion: boolean;
  /** Half the width of the ground that casts and receives sun shadows, in world units (a wider view needs more). */
  shadowExtent?: number;
}

/** Slow, uneven flicker so each lamp feels like a real flame. A multiplier around 1. */
export function lampFlicker(seconds: number, index: number): number {
  return 0.86 + 0.14 * Math.sin(seconds * 7.3 + index * 2.1) * Math.sin(seconds * 3.1 + index * 0.7);
}

export function Lighting({ preset, tier, lamps, motion, shadowExtent = 11 }: LightingProps) {
  const lights = useRef<(PointLight | null)[]>([]);
  const hemi = useRef<HemisphereLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const background = useRef<Color>(null);
  const fog = useMemo(() => new FogExp2(preset.fogColor, preset.fogDensity), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    background.current?.set(preset.background);
    fog.color.set(preset.fogColor);
    fog.density = preset.fogDensity;
    if (hemi.current) {
      hemi.current.color.set(preset.hemiSky);
      hemi.current.groundColor.set(preset.hemiGround);
      hemi.current.intensity = preset.hemiIntensity;
    }
    if (sun.current) {
      sun.current.color.set(preset.sunColor);
      sun.current.intensity = preset.sunIntensity;
      sun.current.position.set(...preset.sunPosition);
    }
    lights.current.forEach((light, i) => {
      if (!light) return;
      light.color.set(preset.lanternColor);
      light.intensity = preset.lanternIntensity * (motion ? lampFlicker(clock.elapsedTime, i) : 1);
    });
  }, -10);

  return (
    <>
      <color ref={background} attach="background" args={[preset.background]} />
      <primitive object={fog} attach="fog" />
      <hemisphereLight ref={hemi} args={[preset.hemiSky, preset.hemiGround, preset.hemiIntensity]} />
      <directionalLight
        ref={sun}
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        position={preset.sunPosition}
        castShadow={tier.shadows}
        shadow-mapSize-width={tier.shadowMapSize}
        shadow-mapSize-height={tier.shadowMapSize}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={1}
        shadow-camera-far={shadowExtent * 4}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
      />
      {lamps.slice(0, tier.pointLights).map((position, i) => (
        <pointLight
          key={i}
          ref={(light) => {
            lights.current[i] = light;
          }}
          color={preset.lanternColor}
          intensity={preset.lanternIntensity}
          distance={8}
          decay={2}
          position={position}
        />
      ))}
    </>
  );
}
