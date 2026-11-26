// Background, fog and lights for a time of day: a hemisphere fill, the sun or moon (the only light that
// casts shadows) and, as far as the quality tier allows, real point lights in the lamp posts.
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { PointLight } from "three";
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
}

/** Slow, uneven flicker so each lamp feels like a real flame. A multiplier around 1. */
export function lampFlicker(seconds: number, index: number): number {
  return 0.86 + 0.14 * Math.sin(seconds * 7.3 + index * 2.1) * Math.sin(seconds * 3.1 + index * 0.7);
}

export function Lighting({ preset, tier, lamps, motion }: LightingProps) {
  const lights = useRef<(PointLight | null)[]>([]);

  useFrame(({ clock }) => {
    lights.current.forEach((light, i) => {
      if (light) light.intensity = preset.lanternIntensity * (motion ? lampFlicker(clock.elapsedTime, i) : 1);
    });
  });

  return (
    <>
      <color attach="background" args={[preset.background]} />
      <fogExp2 attach="fog" args={[preset.fogColor, preset.fogDensity]} />
      <hemisphereLight args={[preset.hemiSky, preset.hemiGround, preset.hemiIntensity]} />
      <directionalLight
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        position={preset.sunPosition}
        castShadow={tier.shadows}
        shadow-mapSize-width={tier.shadowMapSize}
        shadow-mapSize-height={tier.shadowMapSize}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={1}
        shadow-camera-far={40}
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
