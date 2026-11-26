"use client";

// PHASE 0 LOOK TEST - throwaway. Background, fog and lights for each time of day.
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { PointLight } from "three";
import type { TierSpec, TimePreset } from "./presets";

interface LightingProps {
  preset: TimePreset;
  tier: TierSpec;
  shadows: boolean;
  lanterns: [number, number, number][];
}

export function Lighting({ preset, tier, shadows, lanterns }: LightingProps) {
  const lights = useRef<(PointLight | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lights.current.forEach((light, i) => {
      if (!light) return;
      // Slow, uneven flicker so each lantern feels like a real flame.
      const flicker = 0.86 + 0.14 * Math.sin(t * 7.3 + i * 2.1) * Math.sin(t * 3.1 + i * 0.7);
      light.intensity = preset.lanternIntensity * flicker;
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
        castShadow={shadows}
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
      {lanterns.slice(0, tier.pointLights).map((position, i) => (
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
