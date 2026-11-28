/* eslint-disable react-hooks/immutability -- three.js textures and objects are mutated by design (UV offsets, refs, useFrame) */

// The player's cat: an upright pixel-art sprite standing in the 3D scene. It carries a normal map, so lamps and
// moonlight shade it like a real object, and it casts a shadow shaped like the cat rather than like its
// rectangle. Which frame of the sprite sheet shows, where the cat stands, how far off the ground a hop has lifted it,
// and which little picture floats above it, come from the player simulation through a shared object that is read once
// per frame (nothing here decides how the cat behaves).
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { DataTexture, DoubleSide, MeshDepthMaterial, NearestFilter, RGBADepthPacking, RGBAFormat, SRGBColorSpace, UnsignedByteType, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import { frameWindow } from "../cat/atlas-textures";
import type { CatTextures } from "../cat/atlas-textures";
import { ICON_CELL, ICON_ORDER, makeIconSheet } from "../cat/bubble-icons";
import { CAT_FRAME_H, CAT_FRAME_W, CAT_ORIGIN_PX, type BubbleIcon } from "../cat/clips";
import { KINDS } from "../player/air";
import { LOOK } from "../render/look";
import type { TimePreset } from "../render/time-presets";
import { makeRadialTexture } from "../render/soft-textures";

/** A picture floating above the cat: which, how long it has been there, and how long it stays (infinite for a sleeper's Zzz). */
export interface BubbleState {
  icon: BubbleIcon;
  age: number;
  seconds: number;
}

/** What the sprite needs from the simulation each frame. */
export interface CatVisual {
  /** Where the cat's feet are on the ground (already snapped to whole screen pixels). */
  x: number;
  z: number;
  /** Which cell of the sprite sheet to show. */
  frame: number;
  /** How high the cat's feet are above the ground, in world units (a jump, or standing on something). */
  lift: number;
  /** The height of the floor under the cat, where its shadow falls. */
  shadowY: number;
  bubble: BubbleState | null;
}

export interface CatSpriteProps {
  visual: RefObject<CatVisual>;
  textures: CatTextures;
  /** World size of one sprite pixel. */
  unitsPerPx: number;
  /** 0 = upright plane, 1 = plane tilted to face the camera exactly. */
  lean: number;
  pitchDeg: number;
  /** The live look of the time of day: `catGlow` is how much of the sprite's own colour is added back so it never disappears into the dark. */
  look: TimePreset;
  castShadow: boolean;
}

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** The picture above the cat's head: pops in, bobs, fades out. A sleeper's Zzz drifts up and fades, again and again. */
function CatBubble({ visual, unitsPerPx }: { visual: RefObject<CatVisual>; unitsPerPx: number }) {
  const mesh = useRef<Mesh>(null);
  const sheet = useMemo(() => {
    const s = makeIconSheet();
    // Texture rows run bottom to top, the sheet's top to bottom.
    const flipped = new Uint8Array(s.data.length);
    for (let y = 0; y < s.height; y++) flipped.set(s.data.subarray(y * s.width * 4, (y + 1) * s.width * 4), (s.height - 1 - y) * s.width * 4);
    const t = new DataTexture(flipped, s.width, s.height, RGBAFormat, UnsignedByteType);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.generateMipmaps = false;
    t.flipY = false;
    t.colorSpace = SRGBColorSpace;
    t.repeat.set(ICON_CELL / s.width, 1);
    t.needsUpdate = true;
    return { texture: t, width: s.width };
  }, []);
  useEffect(() => () => sheet.texture.dispose(), [sheet]);

  useFrame(() => {
    const m = mesh.current;
    const b = visual.current?.bubble;
    if (!m) return;
    m.visible = !!b;
    if (!b) return;
    const material = m.material as MeshBasicMaterial;
    sheet.texture.offset.x = (ICON_ORDER.indexOf(b.icon) * ICON_CELL) / sheet.width;
    const rises = !Number.isFinite(b.seconds);
    const fadeIn = smooth(b.age / 0.15);
    let alpha = fadeIn;
    let lift = 0;
    if (rises) {
      const cycle = (b.age * 0.8) % 1;
      lift = cycle * 12;
      alpha = Math.sin(Math.PI * cycle) ** 0.7;
    } else {
      lift = Math.sin(b.age * 6) * 0.8;
      alpha *= smooth((b.seconds - b.age) / 0.3);
    }
    material.opacity = alpha;
    // A sitting cat's picture floats above its head; a sleeping loaf is much lower, so its Zzz starts closer.
    m.position.y = ((rises ? 26 : 46) + lift) * unitsPerPx;
    m.scale.setScalar(rises ? 0.85 : 0.6 + 0.4 * fadeIn);
  });

  const size = ICON_CELL * unitsPerPx * 1.15;
  return (
    <mesh ref={mesh} position={[10 * unitsPerPx, 46 * unitsPerPx, 0]} renderOrder={10} visible={false}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={sheet.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function CatSprite({ visual, textures, unitsPerPx, lean, pitchDeg, look, castShadow }: CatSpriteProps) {
  const { color, normal } = textures;
  const group = useRef<Group>(null);
  const lifted = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const win = frameWindow(0);
  const body = useRef<MeshStandardMaterial>(null);

  const depthMaterial = useMemo(() => new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: color, alphaTest: 0.5, side: DoubleSide }), [color]);
  const blob = useMemo(
    () =>
      makeRadialTexture(64, [
        [0, "rgba(255,255,255,0.9)"],
        [0.55, "rgba(255,255,255,0.5)"],
        [1, "rgba(255,255,255,0)"],
      ]),
    [],
  );
  useEffect(() => {
    for (const t of [color, normal]) t.repeat.set(win.repeatX, win.repeatY);
  }, [color, normal, win.repeatX, win.repeatY]);
  useEffect(() => () => depthMaterial.dispose(), [depthMaterial]);
  useEffect(() => () => blob.dispose(), [blob]);

  const topOfHop = KINDS.standard.heightPx * unitsPerPx;
  useFrame(() => {
    if (body.current) body.current.emissiveIntensity = look.catGlow;
    const v = visual.current;
    if (!v) return;
    group.current?.position.set(v.x, 0, v.z);
    // A hop lifts the cat but not its shadow, which stays on the ground and shrinks the higher the cat goes.
    if (lifted.current) lifted.current.position.y = v.lift;
    if (shadow.current) {
      shadow.current.position.y = v.shadowY + 0.006;
      shadow.current.scale.setScalar(1 - 0.45 * Math.min(1, Math.max(0, v.lift - v.shadowY) / topOfHop));
    }
    const w = frameWindow(v.frame);
    for (const t of [color, normal]) t.offset.set(w.offsetX, w.offsetY);
  });

  const width = CAT_FRAME_W * unitsPerPx;
  const height = CAT_FRAME_H * unitsPerPx;
  // The feet-centre is a point inside the frame; lift the picture so that point sits on the ground.
  const lift = (CAT_ORIGIN_PX[1] - CAT_FRAME_H / 2) * unitsPerPx;
  const tilt = -((pitchDeg * Math.PI) / 180) * lean;
  return (
    <group ref={group}>
      {/* A soft contact shadow, so the cat sits on the cobbles even where real shadows are off. */}
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.006} renderOrder={2}>
        <planeGeometry args={[30 * unitsPerPx, 15 * unitsPerPx]} />
        <meshBasicMaterial map={blob} transparent opacity={0.35} depthWrite={false} color="#120c24" toneMapped={false} />
      </mesh>
      <group ref={lifted}>
        <group rotation-x={tilt}>
          <mesh position-y={lift} castShadow={castShadow} receiveShadow customDepthMaterial={depthMaterial}>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial
              ref={body}
              map={color}
              normalMap={normal}
              normalScale={[LOOK.catNormalScale, LOOK.catNormalScale]}
              alphaTest={0.5}
              roughness={1}
              metalness={0}
              emissive="#ffffff"
              emissiveMap={color}
              emissiveIntensity={look.catGlow}
              side={DoubleSide}
            />
          </mesh>
          <CatBubble visual={visual} unitsPerPx={unitsPerPx} />
        </group>
      </group>
    </group>
  );
}
