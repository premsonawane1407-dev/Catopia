// The whole street, assembled: ground, merged buildings and props, lit windows, lamp halos, the cat,
// drifting particles, lights and camera. Everything that depends on the time of day or the quality tier
// arrives as a prop, so the shell can change either while the game runs.
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Group } from "three";
import { useFrame } from "@react-three/fiber";
import { Lighting } from "../render/lighting";
import { waterUniforms } from "../render/water-material";
import { createSurfaceTextures } from "../render/surface-material";
import type { TierSpec } from "../quality/tiers";
import type { TimePreset } from "../render/time-presets";
import type { InputHub } from "../player/input-hub";
import type { Interactable } from "../player/interactions";
import { CatSprite, type CatVisual } from "./cat-sprite";
import { GreyboxOverlay } from "./greybox-overlay";
import { PlayerRig, type PlayerDebug } from "./player-rig";
import type { GameAssets } from "./game-assets";
import { GlowBatch } from "./glow-batch";
import { Particles } from "./particles";
import { SPRITE_LEAN, type Vec3 } from "./stage-constants";
import type { LoadedMap } from "./map/load-map";
import { Bunting, Ground, HangingSign, PropMeshes, Posters, StaticStreet } from "./street-props";
import { WindowLights } from "./window-lights";

/** The warm yellow of a firefly: the blue hour's window colour, whatever the hour. */
const FIREFLY_COLOR = "#ffc46e";

export interface StageSceneProps {
  /** The area to build and play in; everything in the scene comes from it. */
  map: LoadedMap;
  assets: GameAssets;
  preset: TimePreset;
  tier: TierSpec;
  /** Gentle ambient movement (flicker, sway, drifting particles, the cat's idle loop). */
  motion: boolean;
  /** World size of one sprite pixel and of one screen pixel at the cat's depth, from the pixel grid. */
  unitsPerPx: number;
  deviceUnit: number;
  hub: InputHub;
  visual: RefObject<CatVisual>;
  /** Mutated every frame to where the blur should stay sharp. */
  focus: Vec3;
  onPrompt: (prompt: Interactable | null) => void;
  onCaption: (text: string | null) => void;
  debugRef?: RefObject<PlayerDebug | null>;
  /** Draw the collision boxes and interaction circles. */
  greybox: boolean;
  /** How much of the step cycle's leftover is taken out of the cat's picture (0 to 1). */
  footLock: number;
  /** Rough on-screen size of a firefly in CSS pixels. */
  fireflySize: number;
}

export function StageScene({ map, assets, preset, tier, motion, unitsPerPx, deviceUnit, hub, visual, focus, onPrompt, onCaption, debugRef, greybox, footLock, fireflySize }: StageSceneProps) {
  const textures = useMemo(() => createSurfaceTextures(), []);
  const framing = useRef<Group>(null);
  useEffect(() => () => textures.dispose(), [textures]);
  // Every water surface ripples from this one clock (it stands still with reduced motion).
  useFrame(({ clock }) => {
    waterUniforms.uWaterTime.value = motion ? clock.elapsedTime : 0;
  });

  return (
    <>
      <Lighting preset={preset} tier={tier} lamps={map.lamps} motion={motion} shadowExtent={Math.max(11, map.camera.distance * 0.6)} />
      <Ground terrain={map.terrain} grid={map.terrainGrid} surfaces={textures} />
      <StaticStreet assets={assets} textures={textures} placements={map.worldPlacements} />
      <PropMeshes textures={textures} specs={map.worldProps} />
      <WindowLights windows={map.windows} preset={preset} motion={motion} />
      <GlowBatch glows={map.worldGlows} preset={preset} motion={motion} />
      {/* The big objects framing the bottom corners ride along with the camera, so they never end up in front of the cat. */}
      <group ref={framing}>
        <StaticStreet assets={assets} textures={textures} placements={map.framingPlacements} />
        <PropMeshes textures={textures} specs={map.framingProps} />
        <GlowBatch glows={map.framingGlows} preset={preset} motion={motion} />
      </group>
      <Bunting strings={map.bunting} motion={motion} />
      {map.sign && <HangingSign position={map.sign} motion={motion} />}
      {map.signs.map((s, i) => (
        <HangingSign key={i} position={s.position} kind={s.kind} motion={motion} />
      ))}
      <Posters posters={map.posters} />
      <Particles scale={tier.particleScale} fireflySize={fireflySize} fireflyColor={FIREFLY_COLOR} look={preset} motion={motion} />
      <CatSprite visual={visual} textures={assets.cat} unitsPerPx={unitsPerPx} lean={SPRITE_LEAN} pitchDeg={map.camera.pitch} look={preset} castShadow={tier.shadows} />
      <PlayerRig map={map} hub={hub} visual={visual} unitsPerPx={unitsPerPx} deviceUnit={deviceUnit} focus={focus} framing={framing} motion={motion} footLock={footLock} onPrompt={onPrompt} onCaption={onCaption} debugRef={debugRef} />
      {greybox && <GreyboxOverlay map={map} />}
    </>
  );
}
