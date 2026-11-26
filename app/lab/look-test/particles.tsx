"use client";
/* eslint-disable react-hooks/immutability -- three.js scene objects are mutated by design (refs, useFrame); throwaway Phase 0 lab code */

// PHASE 0 LOOK TEST - throwaway. Drifting fireflies and falling leaves.
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, Object3D, type InstancedMesh } from "three";

const LEAF_COLORS = ["#d9572b", "#e8872f", "#c23b2a", "#f0b441", "#a8532a"];

function Leaves({ count, size }: { count: number; size: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const leaves = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 16,
      y: rand() * 4,
      z: (rand() - 0.5) * 9,
      fall: 0.22 + rand() * 0.32,
      phase: rand() * Math.PI * 2,
      spin: 0.8 + rand() * 1.6,
      color: LEAF_COLORS[Math.floor(rand() * LEAF_COLORS.length)],
    }));
  }, [count]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    leaves.forEach((leaf, i) => m.setColorAt(i, c.set(leaf.color)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [leaves]);

  useFrame(({ clock }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    leaves.forEach((leaf, i) => {
      leaf.y -= leaf.fall * Math.min(dt, 0.05);
      if (leaf.y < 0.03) {
        leaf.y = 3.8 + Math.random() * 0.6;
        leaf.x = (Math.random() - 0.5) * 16;
        leaf.z = (Math.random() - 0.5) * 9;
      }
      dummy.position.set(leaf.x + Math.sin(t * 0.8 + leaf.phase) * 0.45, leaf.y, leaf.z + Math.cos(t * 0.6 + leaf.phase) * 0.3);
      dummy.rotation.set(t * leaf.spin, leaf.phase, t * leaf.spin * 0.7);
      dummy.scale.setScalar(size);
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

interface ParticlesProps {
  scale: number;
  /** Rough on-screen size of a firefly in CSS pixels. */
  fireflySize: number;
  fireflyColor: string;
  leaves: boolean;
}

export function Particles({ scale, fireflySize, fireflyColor, leaves }: ParticlesProps) {
  return (
    <group userData={{ noOutline: true }}>
      <Sparkles
        count={Math.max(6, Math.round(46 * scale))}
        size={fireflySize}
        scale={[14, 2.4, 8]}
        position={[0, 1.3, -0.5]}
        speed={0.35}
        noise={0.8}
        color={fireflyColor}
        opacity={0.95}
      />
      {leaves && <Leaves count={Math.max(8, Math.round(40 * scale))} size={1} />}
    </group>
  );
}
