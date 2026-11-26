// The whole street, assembled: ground, merged buildings and props, lit windows, lamp halos, the cat,
// drifting particles, lights and camera. Everything that depends on the time of day or the quality tier
// arrives as a prop, so the shell can change either while the game runs.
import { useEffect, useMemo } from "react";
import { Lighting } from "../render/lighting";
import { createSurfaceTextures } from "../render/surface-material";
import type { TierSpec } from "../quality/tiers";
import type { TimePreset } from "../render/time-presets";
import { CameraRig } from "./camera-rig";
import { CatSprite } from "./cat-sprite";
import type { GameAssets } from "./game-assets";
import { GlowBatch } from "./glow-batch";
import { Particles } from "./particles";
import { CAMERA, CAT_POSITION, SPRITE_LEAN } from "./stage-constants";
import { GLOWS, LAMP_HEADS, SIGN_POSITION, STAGE_PLACEMENTS, WINDOWS } from "./stage-data";
import { Bunting, Ground, HangingSign, PropMeshes, Posters, StaticStreet } from "./street-props";
import { WindowLights } from "./window-lights";

export interface StageSceneProps {
  assets: GameAssets;
  preset: TimePreset;
  tier: TierSpec;
  /** Gentle ambient movement (flicker, sway, drifting particles, the cat's idle loop). */
  motion: boolean;
  /** World width of the cat sprite, from the pixel grid. */
  catWidth: number;
  /** Rough on-screen size of a firefly in CSS pixels. */
  fireflySize: number;
}

export function StageScene({ assets, preset, tier, motion, catWidth, fireflySize }: StageSceneProps) {
  const textures = useMemo(() => createSurfaceTextures(), []);
  useEffect(() => () => textures.dispose(), [textures]);

  return (
    <>
      <Lighting preset={preset} tier={tier} lamps={LAMP_HEADS} motion={motion} />
      <Ground />
      <StaticStreet assets={assets} textures={textures} placements={STAGE_PLACEMENTS} />
      <PropMeshes textures={textures} />
      <WindowLights windows={WINDOWS} preset={preset} motion={motion} />
      <GlowBatch glows={GLOWS} preset={preset} motion={motion} />
      <Bunting motion={motion} />
      <HangingSign position={SIGN_POSITION} motion={motion} />
      <Posters />
      <Particles scale={tier.particleScale} fireflySize={fireflySize} fireflyColor={preset.windowColor} motion={motion} />
      <CatSprite
        position={CAT_POSITION}
        width={catWidth}
        lean={SPRITE_LEAN}
        pitchDeg={CAMERA.pitch}
        glow={preset.catGlow}
        color={assets.catColor}
        normal={assets.catNormal}
        animate={motion}
        castShadow={tier.shadows}
      />
      <CameraRig />
    </>
  );
}
