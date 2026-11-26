"use client";

// PHASE 0 LOOK TEST - throwaway. The invented market-street corner (a labelled placeholder, not
// the real campus), assembled from Kenney Fantasy Town Kit pieces plus code-built props.
// Pieces sit on a 1-unit grid with the wall panel on the local +X edge of a cell.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { AdditiveBlending, MeshBasicMaterial, type Group, type Sprite, type SpriteMaterial } from "three";
import { useFrame } from "@react-three/fiber";
import { Piece, type PieceName } from "./piece";
import { makeCobblePixel, makeGroundSpillTexture, makePaneTexture, makeWallSpillTexture, type PaneKind } from "./pixel-textures";
import type { TimePreset } from "./presets";
import { Barrel, Bunting, Crate, FlowerPot, HangingSign, Poster, ProduceCrate } from "./props";
import { makeRadialTexture, makeWindowGlowTexture } from "./textures";

const HALF_PI = Math.PI / 2;

export const LANTERNS: [number, number, number][] = [
  [2.0, 1.15, -0.2],
  [-2.3, 1.15, -0.1],
  [4.6, 1.15, 1.9],
  [-4.6, 1.15, 2.0],
];

type Style = "stone" | "wood";
const NAMES: Record<Style, Record<string, PieceName>> = {
  stone: { w: "wall", c: "wall-corner", d: "wall-door", a: "wall-window-shutters", b: "wall-window-glass", s: "wall-window-small" },
  wood: { w: "wall-wood", c: "wall-wood-corner", d: "wall-wood-door", a: "wall-wood-window-shutters", b: "wall-wood-window-glass", s: "wall-wood-window-small" },
};

// Window pane sizes by facade key: [width, height, centre height above the floor].
const WINDOW_SIZE: Record<string, [number, number, number]> = { a: [0.42, 0.4, 0.58], b: [0.3, 0.32, 0.58], s: [0.2, 0.3, 0.6] };

interface HouseSpec {
  x0: number;
  cols: number;
  zFront: number;
  depth: number;
  style: Style;
  /** One string per floor, one letter per column: c corner, w wall, d door, a/b/s windows. */
  floors: string[];
  roof: PieceName;
  roofScaleY?: number;
  roofTilt?: number;
  chimneyAt?: number;
}

interface Placement {
  name: PieceName;
  position: [number, number, number];
  rotationY: number;
}

interface WindowSpec {
  x: number;
  level: number;
  z: number;
  key: "a" | "b" | "s";
}

function buildHouse(h: HouseSpec) {
  const names = NAMES[h.style];
  const pieces: Placement[] = [];
  const windows: WindowSpec[] = [];
  h.floors.forEach((row, level) => {
    for (let i = 0; i < h.cols; i++) {
      const x = h.x0 + i;
      const key = row[i];
      // Front row: panels face +Z, so the panel sits on the cell's +Z edge (rotate -90deg).
      if (key === "c") {
        pieces.push({ name: names.c, position: [x, level, h.zFront], rotationY: i === 0 ? -HALF_PI : 0 });
      } else {
        pieces.push({ name: names[key] ?? names.w, position: [x, level, h.zFront], rotationY: -HALF_PI });
        if (WINDOW_SIZE[key]) windows.push({ x, level, z: h.zFront + 0.5, key: key as "a" | "b" | "s" });
      }
      // Rows behind the front: side walls, back corners and the back wall.
      for (let j = 1; j < h.depth; j++) {
        const z = h.zFront - j;
        const last = j === h.depth - 1;
        if (i === 0) pieces.push({ name: last ? names.c : names.w, position: [x, level, z], rotationY: Math.PI });
        else if (i === h.cols - 1) pieces.push({ name: last ? names.c : names.w, position: [x, level, z], rotationY: last ? HALF_PI : 0 });
        else if (last) pieces.push({ name: names.w, position: [x, level, z], rotationY: HALF_PI });
      }
    }
  });
  return { pieces, windows };
}

const HOUSES: HouseSpec[] = [
  { x0: -6, cols: 5, zFront: -2, depth: 2, style: "stone", floors: ["cabdc", "csabc"], roof: "roof-gable", chimneyAt: 1 },
  { x0: 2, cols: 4, zFront: -2, depth: 2, style: "wood", floors: ["cdac", "cabc"], roof: "roof-high-gable", roofScaleY: 0.85, chimneyAt: 2 },
  { x0: -1, cols: 3, zFront: -7, depth: 2, style: "stone", floors: ["cdc", "cac"], roof: "roof-gable" },
  // A far row of houses so the top of the frame is town, not empty cobbles. They sit in the blur.
  { x0: -11, cols: 6, zFront: -10, depth: 2, style: "wood", floors: ["cabdac", "csabsc"], roof: "roof-gable", chimneyAt: 3 },
  { x0: 4, cols: 6, zFront: -10, depth: 2, style: "stone", floors: ["cbdasc", "casbac"], roof: "roof-high-gable", roofScaleY: 0.85, chimneyAt: 2 },
];

const BUILT = HOUSES.map(buildHouse);
const ALL_WINDOWS: WindowSpec[] = BUILT.flatMap((b) => b.windows);

function House({ spec, built }: { spec: HouseSpec; built: ReturnType<typeof buildHouse> }) {
  const top = spec.floors.length;
  const roofZ = spec.zFront - (spec.depth - 1) / 2;
  return (
    <group>
      {built.pieces.map((p, i) => (
        <Piece key={i} name={p.name} position={p.position} rotationY={p.rotationY} />
      ))}
      {Array.from({ length: spec.cols }, (_, i) => (
        <Piece key={`roof${i}`} name={spec.roof} position={[spec.x0 + i, top, roofZ]} rotationY={spec.roofTilt ?? 0} scale={[1, spec.roofScaleY ?? 1.35, spec.depth]} />
      ))}
      {spec.chimneyAt !== undefined && <Piece name="chimney" position={[spec.x0 + spec.chimneyAt, top + 0.35, roofZ - 0.2]} scale={[1.2, 1.2, 1.2]} />}
    </group>
  );
}

function Ground({ pixel }: { pixel: boolean }) {
  const map = useMemo(() => {
    const t = makeCobblePixel();
    t.repeat.set(13.1, 13.1);
    return t;
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial map={pixel ? map : null} color={pixel ? "#ffffff" : "#6f6561"} roughness={0.85} metalness={0} />
    </mesh>
  );
}

function Glow({ position, color, intensity, size }: { position: [number, number, number]; color: string; intensity: number; size: number }) {
  const map = useMemo(() => makeRadialTexture(128), []);
  const mat = useRef<SpriteMaterial>(null);
  const sprite = useRef<Sprite>(null);
  const seed = useMemo(() => position[0] * 1.7 + position[2] * 2.3, [position]);
  useLayoutEffect(() => {
    mat.current?.color.set(color).multiplyScalar(intensity);
  }, [color, intensity]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = 1 + 0.05 * Math.sin(t * 7.1 + seed) * Math.sin(t * 2.9 + seed * 0.6);
    sprite.current?.scale.set(size * k, size * k, 1);
  });
  return (
    <sprite ref={sprite} position={position} scale={[size, size, 1]} userData={{ noOutline: true }}>
      <spriteMaterial ref={mat} map={map} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

/** The look before this round: a flat additive oval over each window. Kept so the two can be compared. */
function SimpleWindowGlow({ preset }: { preset: TimePreset }) {
  const material = useMemo(
    () => new MeshBasicMaterial({ map: makeWindowGlowTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    material.color.set(preset.windowColor).multiplyScalar(preset.windowGlow);
  }, [material, preset.windowColor, preset.windowGlow]);
  return (
    <group userData={{ noOutline: true }}>
      {ALL_WINDOWS.map((w, i) => {
        const [pw, ph, cy] = WINDOW_SIZE[w.key];
        return (
          <mesh key={i} position={[w.x, w.level + cy, w.z + 0.025]} material={material}>
            <planeGeometry args={[pw, ph]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Lit panes with mullions, curtains and silhouettes, plus warm light spilling onto the wall and the cobbles. */
function WindowLights({ preset }: { preset: TimePreset }) {
  const panes = useMemo(
    () =>
      ALL_WINDOWS.map((w, i) => {
        const withCat = w.x === 3 && w.level === 1 && w.key === "a";
        return new MeshBasicMaterial({ map: makePaneTexture(w.key as PaneKind, i + 1, withCat), toneMapped: false });
      }),
    [],
  );
  const wallSpill = useMemo(() => new MeshBasicMaterial({ map: makeWallSpillTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const groundSpill = useMemo(() => new MeshBasicMaterial({ map: makeGroundSpillTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const phase = useMemo(() => ALL_WINDOWS.map((_, i) => i * 1.9 + 0.7), []);

  useEffect(
    () => () => {
      panes.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      wallSpill.map?.dispose();
      wallSpill.dispose();
      groundSpill.map?.dispose();
      groundSpill.dispose();
    },
    [panes, wallSpill, groundSpill],
  );

  const base = 1 + 0.45 * preset.windowGlow;
  useLayoutEffect(() => {
    wallSpill.color.set(preset.windowColor).multiplyScalar(0.55 * preset.windowGlow);
    groundSpill.color.set(preset.windowColor).multiplyScalar(0.7 * preset.windowGlow);
  }, [wallSpill, groundSpill, preset.windowColor, preset.windowGlow]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    panes.forEach((m, i) => {
      // A slow breathing flicker, a little different in every room.
      const k = base * (0.9 + 0.1 * Math.sin(t * 1.4 + phase[i]) * Math.sin(t * 0.37 + phase[i] * 0.5 + 1));
      m.color.setRGB(k, k, k);
    });
  });

  return (
    <group userData={{ noOutline: true }}>
      {ALL_WINDOWS.map((w, i) => {
        const [pw, ph, cy] = WINDOW_SIZE[w.key];
        return (
          <group key={i} position={[w.x, w.level, w.z + 0.02]}>
            <mesh position={[0, cy, 0]} material={panes[i]}>
              <planeGeometry args={[pw, ph]} />
            </mesh>
            <mesh position={[0, cy - ph / 2 - 0.36, -0.006]} material={wallSpill}>
              <planeGeometry args={[pw * 2.1, 0.72]} />
            </mesh>
            {w.level === 0 && (
              <mesh rotation-x={-HALF_PI} position={[0, 0.012, 0.64]} material={groundSpill}>
                <planeGeometry args={[pw * 1.8, 1.25]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function SwayingBunting() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    // The string breathes in a light breeze.
    g.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.012;
    g.position.y = Math.sin(clock.elapsedTime * 0.9) * 0.012;
  });
  return (
    <group ref={group}>
      <Bunting from={[-1.5, 1.85, -1.4]} to={[1.5, 1.85, -1.4]} sag={0.22} flags={12} />
      <Bunting from={[-1.5, 1.45, -1.45]} to={[1.5, 1.6, -1.45]} sag={0.3} flags={11} size={0.1} />
    </group>
  );
}

/** Big, near objects at the bottom corners: the tilt-shift turns them into soft, glowing framing. */
function ForegroundFrame({ preset }: { preset: TimePreset }) {
  // Capped so the big near lanterns do not wash out the corners at night.
  const glowIntensity = Math.min(0.35 + preset.lanternIntensity * 0.09, 1.0) * 0.9;
  // Positions were worked out by projecting through the default camera: only tall things at z ~ 5.4
  // and low things at z ~ 3.5 land in the soft bottom edge of the frame.
  return (
    <group>
      <Piece name="lantern" position={[-3.0, 0, 5.4]} scale={2.3} />
      <Glow position={[-3.0, 3.3, 5.4]} color={preset.lanternColor} intensity={glowIntensity} size={2.7} />
      <Piece name="lantern" position={[3.1, 0, 5.4]} scale={2.3} />
      <Glow position={[3.1, 3.3, 5.4]} color={preset.lanternColor} intensity={glowIntensity} size={2.7} />
      <Barrel position={[-3.9, 0, 3.55]} scale={2.4} />
      <Crate position={[-2.9, 0, 3.7]} rotationY={0.5} size={0.7} />
      <Crate position={[3.9, 0, 3.6]} rotationY={-0.4} size={0.75} />
      <Piece name="hedge" position={[2.6, 0, 3.6]} rotationY={-HALF_PI} scale={3.2} />
      <Piece name="hedge" position={[1.6, 0, 3.6]} rotationY={-HALF_PI} scale={3.2} />
      <FlowerPot position={[-1.6, 0, 3.6]} seed={5} scale={2.6} />
    </group>
  );
}

interface StreetProps {
  preset: TimePreset;
  pixelGround: boolean;
  windowDetail: boolean;
  foreground: boolean;
}

export function Street({ preset, pixelGround, windowDetail, foreground }: StreetProps) {
  const lampGlow = 0.35 + preset.lanternIntensity * 0.09;
  return (
    <group>
      <Ground pixel={pixelGround} />
      {HOUSES.map((spec, i) => (
        <House key={i} spec={spec} built={BUILT[i]} />
      ))}
      {windowDetail ? <WindowLights preset={preset} /> : <SimpleWindowGlow preset={preset} />}

      {/* Market stalls and goods. */}
      <Piece name="stall-red" position={[-3.4, 0, 1.5]} rotationY={0.25} />
      <Piece name="stall-green" position={[3.3, 0, 1.2]} rotationY={-0.3} />
      <Piece name="cart-high" position={[-1.5, 0, -0.55]} rotationY={0.5} />
      <Crate position={[-4.3, 0, 1.2]} rotationY={0.4} />
      <Crate position={[-4.3, 0.26, 1.2]} rotationY={-0.3} size={0.2} />
      <Crate position={[2.2, 0, 1.6]} rotationY={0.2} size={0.22} />
      <Barrel position={[-2.5, 0, 1.0]} />
      <Barrel position={[4.4, 0, 0.3]} scale={1.1} />
      <Barrel position={[1.6, 0, -1.25]} scale={0.9} />
      <Piece name="stall-bench" position={[-3.3, 0, 2.3]} rotationY={HALF_PI} />
      <ProduceCrate position={[2.75, 0, 1.75]} rotationY={0.2} seed={3} />
      <ProduceCrate position={[3.35, 0, 1.85]} rotationY={-0.25} seed={6} />
      <ProduceCrate position={[-2.9, 0, 1.95]} rotationY={0.4} seed={9} />

      {/* Door steps, flowers, a shop sign and notices. */}
      <FlowerPot position={[-3.55, 0, -1.3]} seed={1} />
      <FlowerPot position={[-2.45, 0, -1.3]} seed={2} />
      <FlowerPot position={[2.55, 0, -1.3]} seed={3} />
      <FlowerPot position={[3.45, 0, -1.3]} seed={4} />
      <HangingSign position={[1.56, 1.38, -1.36]} />
      <Poster position={[-2.0, 0.62, -1.47]} seed={1} rotationZ={0.05} />
      <Poster position={[-2.0, 1.55, -1.47]} seed={2} rotationZ={-0.04} />

      {/* Lantern posts, each with a glow halo. */}
      {LANTERNS.map((p, i) => (
        <group key={i}>
          <Piece name="lantern" position={[p[0], 0, p[2]]} scale={0.8} />
          <Glow position={p} color={preset.lanternColor} intensity={lampGlow} size={1.4} />
        </group>
      ))}
      <Glow position={[0, 0.9, -5.3]} color={preset.lanternColor} intensity={lampGlow * 0.55} size={0.6} />

      {/* Greenery, fence and bunting. */}
      <Piece name="tree" position={[-6.4, 0, 0.2]} scale={0.85} />
      <Piece name="tree-high" position={[6.4, 0, -0.2]} scale={0.8} />
      <Piece name="tree-crooked" position={[-2, 0, -4.6]} scale={0.8} />
      <Piece name="tree" position={[2.6, 0, -5]} scale={0.8} />
      {[-6, -5, -4].map((x) => (
        <Piece key={x} name="fence" position={[x, 0, 2.1]} rotationY={-HALF_PI} />
      ))}
      <Piece name="hedge" position={[5.5, 0, 1.7]} rotationY={-HALF_PI} />
      <SwayingBunting />

      {foreground && <ForegroundFrame preset={preset} />}
    </group>
  );
}
