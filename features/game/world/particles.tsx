// Drifting fireflies and falling leaves. With reduced motion the fireflies hold still and the leaves go.
import { Sparkles } from "@react-three/drei";
import type { TimePreset } from "../render/time-presets";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, Object3D, type BufferAttribute, type InstancedMesh, type Points } from "three";

const LEAF_COLORS = ["#d9572b", "#e8872f", "#c23b2a", "#f0b441", "#a8532a"];

/** A small repeatable random sequence, so the same leaves fall in the same places on every visit. */
function seededRandom(start: number): () => number {
  let seed = start >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function Leaves({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const sim = useMemo(() => {
    const rand = seededRandom(42);
    const leaves = Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 16,
      y: rand() * 4,
      z: (rand() - 0.5) * 9,
      fall: 0.22 + rand() * 0.32,
      phase: rand() * Math.PI * 2,
      spin: 0.8 + rand() * 1.6,
      color: LEAF_COLORS[Math.floor(rand() * LEAF_COLORS.length)],
    }));
    return { leaves, rand };
  }, [count]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    sim.leaves.forEach((leaf, i) => m.setColorAt(i, c.set(leaf.color)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sim]);

  useFrame(({ clock }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const { leaves, rand } = sim;
    leaves.forEach((leaf, i) => {
      leaf.y -= leaf.fall * Math.min(dt, 0.05);
      if (leaf.y < 0.03) {
        // Back to the top, somewhere else along the street.
        leaf.y = 3.8 + rand() * 0.6;
        leaf.x = (rand() - 0.5) * 16;
        leaf.z = (rand() - 0.5) * 9;
      }
      dummy.position.set(leaf.x + Math.sin(t * 0.8 + leaf.phase) * 0.45, leaf.y, leaf.z + Math.cos(t * 0.6 + leaf.phase) * 0.3);
      dummy.rotation.set(t * leaf.spin, leaf.phase, t * leaf.spin * 0.7);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[0.11, 0.07]} />
      <meshBasicMaterial side={DoubleSide} toneMapped={false} color="#c4c4c4" />
    </instancedMesh>
  );
}

export interface ParticlesProps {
  /** Multiplier on how many there are (a quality tier setting). */
  scale: number;
  /** Rough on-screen size of a firefly in CSS pixels. */
  fireflySize: number;
  fireflyColor: string;
  /** The live look: fireflies come out in the evening and are gone by day (`fireflies`, 0 to 1). */
  look: TimePreset;
  motion: boolean;
}

export function Particles({ scale, fireflySize, fireflyColor, look, motion }: ParticlesProps) {
  const sparkles = useRef<Points>(null);
  const shown = useRef(-1);
  useFrame(() => {
    const points = sparkles.current;
    const opacity = points?.geometry.getAttribute("opacity") as BufferAttribute | undefined;
    if (!points || !opacity) return;
    // Only touch the buffer when the amount has really changed.
    if (Math.abs(look.fireflies - shown.current) < 0.01) return;
    shown.current = look.fireflies;
    (opacity.array as Float32Array).fill(0.95 * look.fireflies);
    opacity.needsUpdate = true;
    points.visible = look.fireflies > 0.01;
  });
  return (
    <group>
      <Sparkles
        ref={sparkles}
        count={Math.max(6, Math.round(46 * scale))}
        size={fireflySize}
        scale={[14, 2.4, 8]}
        position={[0, 1.3, -0.5]}
        speed={motion ? 0.35 : 0}
        noise={0.8}
        color={fireflyColor}
        opacity={0.95}
      />
      {motion && <Leaves count={Math.max(8, Math.round(40 * scale))} />}
    </group>
  );
}
