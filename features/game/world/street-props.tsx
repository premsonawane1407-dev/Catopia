// The solid things in the street: the cobbled ground, the merged model pieces, code-built props, bunting,
// the hanging shop sign and wall notices.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { DoubleSide, type Group } from "three";
import { makeCobblePixel, makePosterTexture, makeSignTexture } from "../render/pixel-textures";
import { createSurfaceMaterial, type SurfaceTextures } from "../render/surface-material";
import type { GameAssets } from "./game-assets";
import { SIGN_BOARD_SIZE, buildBuntingGeometry, buildPropGeometries, buildSignChains } from "./props-geometry";
import type { Vec3 } from "./stage-constants";
import { BUNTING, POSTERS, type BuntingString } from "./stage-data";
import { batchPlacements, type Placement } from "./static-batch";

/** The cobbles: a pixel-art albedo tiled across a 40 x 40 unit plane (about 42 texels per world unit). */
export function Ground() {
  const map = useMemo(() => {
    const t = makeCobblePixel();
    t.repeat.set(13.1, 13.1);
    return t;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial map={map} color="#ffffff" roughness={0.85} metalness={0} />
    </mesh>
  );
}

/** Every Kenney model piece, merged into one mesh per surface. */
export function StaticStreet({ assets, textures, placements }: { assets: GameAssets; textures: SurfaceTextures; placements: readonly Placement[] }) {
  const batches = useMemo(() => batchPlacements(placements, assets.pieces), [placements, assets.pieces]);
  const materials = useMemo(
    () => batches.map((b) => createSurfaceMaterial({ profile: b.surface.profile, textures, tint: b.surface.tint, colormap: assets.colormap })),
    [batches, textures, assets.colormap],
  );
  useEffect(() => () => batches.forEach((b) => b.geometry.dispose()), [batches]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  return (
    <group>
      {batches.map((b, i) => (
        <mesh key={b.key} geometry={b.geometry} material={materials[i]} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Crates, barrels, produce and flower pots built in code: two draw calls for the lot. */
export function PropMeshes({ textures }: { textures: SurfaceTextures }) {
  const geometries = useMemo(() => buildPropGeometries(), []);
  const woodMaterial = useMemo(() => createSurfaceMaterial({ profile: "wood", textures, vertexColors: true }), [textures]);
  const plainMaterial = useMemo(() => createSurfaceMaterial({ profile: "none", textures, vertexColors: true }), [textures]);
  useEffect(() => () => [geometries.wood, geometries.plain].forEach((g) => g.dispose()), [geometries]);
  useEffect(() => () => [woodMaterial, plainMaterial].forEach((m) => m.dispose()), [woodMaterial, plainMaterial]);
  return (
    <group>
      <mesh geometry={geometries.wood} material={woodMaterial} castShadow receiveShadow />
      <mesh geometry={geometries.plain} material={plainMaterial} castShadow receiveShadow />
    </group>
  );
}

/** Strings of flags across the market. They breathe in a light breeze unless motion is reduced. */
export function Bunting({ strings = BUNTING, motion }: { strings?: readonly BuntingString[]; motion: boolean }) {
  const group = useRef<Group>(null);
  const geometry = useMemo(() => buildBuntingGeometry(strings), [strings]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = motion ? clock.elapsedTime : 0;
    g.rotation.z = Math.sin(t * 1.3) * 0.012;
    g.position.y = Math.sin(t * 0.9) * 0.012;
  });
  return (
    <group ref={group}>
      <mesh geometry={geometry} castShadow>
        <meshBasicMaterial vertexColors side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A paw-print shop sign swinging on its bracket. */
export function HangingSign({ position, motion }: { position: Vec3; motion: boolean }) {
  const swing = useRef<Group>(null);
  const map = useMemo(() => makeSignTexture(), []);
  const chains = useMemo(() => buildSignChains(), []);
  useEffect(() => () => map.dispose(), [map]);
  useEffect(() => () => chains.dispose(), [chains]);
  useFrame(({ clock }) => {
    if (swing.current) swing.current.rotation.z = motion ? Math.sin(clock.elapsedTime * 1.1) * 0.05 : 0;
  });
  return (
    <group position={position}>
      {/* The wall bracket reaches out to the left. */}
      <mesh position={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.025, 0.025]} />
        <meshStandardMaterial color="#3a2a22" roughness={0.7} />
      </mesh>
      <group ref={swing} position={[-0.3, 0, 0]}>
        <mesh geometry={chains}>
          <meshStandardMaterial vertexColors roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.18, 0]} castShadow>
          <boxGeometry args={SIGN_BOARD_SIZE} />
          <meshStandardMaterial map={map} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function Poster({ position, seed, rotationZ }: { position: Vec3; seed: number; rotationZ: number }) {
  const map = useMemo(() => makePosterTexture(seed), [seed]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={position} rotation-z={rotationZ}>
      <planeGeometry args={[0.13, 0.17]} />
      <meshStandardMaterial map={map} roughness={1} />
    </mesh>
  );
}

export function Posters() {
  return (
    <group>
      {POSTERS.map((p) => (
        <Poster key={p.seed} position={p.position} seed={p.seed} rotationZ={p.rotationZ} />
      ))}
    </group>
  );
}
