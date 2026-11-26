"use client";
/* eslint-disable react-hooks/immutability -- seeded pseudo-random generators reassign a local counter; throwaway Phase 0 lab code */

// PHASE 0 LOOK TEST - throwaway. Small props built in code (no model files): crates, barrels, bunting.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, LatheGeometry, Vector2, type Group } from "three";
import { makePosterTexture, makeSignTexture } from "./pixel-textures";
import { makePlankTexture } from "./textures";

export function Crate({ position, rotationY = 0, size = 0.26 }: { position: [number, number, number]; rotationY?: number; size?: number }) {
  const map = useMemo(() => makePlankTexture(), []);
  return (
    <mesh position={[position[0], position[1] + size / 2, position[2]]} rotation-y={rotationY} castShadow receiveShadow>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial map={map} roughness={1} />
    </mesh>
  );
}

export function Barrel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const geometry = useMemo(() => {
    const pts = [
      [0.0, 0.0], [0.105, 0.0], [0.125, 0.05], [0.15, 0.17], [0.125, 0.3], [0.105, 0.34], [0.0, 0.34],
    ].map(([r, y]) => new Vector2(r, y));
    return new LatheGeometry(pts, 14);
  }, []);
  return (
    <group position={position} scale={scale}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#8a5a33" roughness={1} />
      </mesh>
      {[0.07, 0.27].map((y) => (
        <mesh key={y} position-y={y} rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[y < 0.1 ? 0.132 : 0.132, 0.011, 6, 18]} />
          <meshStandardMaterial color="#4a4650" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

const BUNTING_COLORS = ["#d9573b", "#f0b441", "#3a9a8a", "#e9e0c8", "#c9506a"];

/** A string of triangular flags hanging between two points. */
export function Bunting({ from, to, sag = 0.25, flags = 13, size = 0.11 }: { from: [number, number, number]; to: [number, number, number]; sag?: number; flags?: number; size?: number }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const hex = (h: string) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    for (let i = 0; i < flags; i++) {
      const t = (i + 0.5) / flags;
      const cx = from[0] + dx * t;
      const cz = from[2] + dz * t;
      const cy = from[1] + (to[1] - from[1]) * t - sag * 4 * t * (1 - t);
      const hw = size * 0.5;
      positions.push(cx - ux * hw, cy, cz - uz * hw, cx + ux * hw, cy, cz + uz * hw, cx, cy - size * 1.1, cz);
      const c = hex(BUNTING_COLORS[i % BUNTING_COLORS.length]);
      for (let k = 0; k < 3; k++) colors.push(...c);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return g;
  }, [from, to, sag, flags, size]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshBasicMaterial vertexColors side={DoubleSide} toneMapped={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------------------------
// Round 2 props: market produce, flower pots, a hanging shop sign and wall notices.

const FRUIT_COLORS = ["#d23b2a", "#f08a24", "#7a3a8a", "#6aa84f", "#e8c33a", "#c9506a"];

export function ProduceCrate({ position, rotationY = 0, seed = 1 }: { position: [number, number, number]; rotationY?: number; seed?: number }) {
  const map = useMemo(() => makePlankTexture(), []);
  const fruit = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const base = FRUIT_COLORS[Math.floor(rand() * FRUIT_COLORS.length)];
    return Array.from({ length: 9 }, (_, i) => ({
      x: ((i % 3) - 1) * 0.075 + (rand() - 0.5) * 0.02,
      z: (Math.floor(i / 3) - 1) * 0.075 + (rand() - 0.5) * 0.02,
      y: 0.2 + rand() * 0.03,
      color: rand() < 0.75 ? base : FRUIT_COLORS[Math.floor(rand() * FRUIT_COLORS.length)],
    }));
  }, [seed]);
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position-y={0.09} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.18, 0.28]} />
        <meshStandardMaterial map={map} roughness={1} />
      </mesh>
      {fruit.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]} castShadow>
          <icosahedronGeometry args={[0.04, 1]} />
          <meshStandardMaterial color={f.color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

const FLOWER_COLORS = ["#f06a8a", "#f4d03f", "#f4f0e0", "#a56be0", "#ff9a3c"];

export function FlowerPot({ position, seed = 1, scale = 1 }: { position: [number, number, number]; seed?: number; scale?: number }) {
  const potGeometry = useMemo(() => {
    const pts = [[0, 0], [0.07, 0], [0.095, 0.16], [0.11, 0.17], [0.11, 0.2], [0.09, 0.2], [0.0, 0.18]].map(([r, y]) => new Vector2(r, y));
    return new LatheGeometry(pts, 10);
  }, []);
  const blooms = useMemo(() => {
    let s = seed * 7919 + 17;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: 11 }, () => {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.075;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.24 + rand() * 0.09, color: FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)] };
    });
  }, [seed]);
  return (
    <group position={position} scale={scale}>
      <mesh geometry={potGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#b65a35" roughness={0.95} />
      </mesh>
      <mesh position-y={0.24} scale={[1, 0.7, 1]} castShadow>
        <icosahedronGeometry args={[0.1, 1]} />
        <meshStandardMaterial color="#3f7a3a" roughness={1} />
      </mesh>
      {blooms.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <icosahedronGeometry args={[0.03, 0]} />
          <meshStandardMaterial color={b.color} roughness={0.8} emissive={b.color} emissiveIntensity={0.18} />
        </mesh>
      ))}
    </group>
  );
}

export function HangingSign({ position }: { position: [number, number, number] }) {
  const map = useMemo(() => makeSignTexture(), []);
  const swing = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (swing.current) swing.current.rotation.z = Math.sin(clock.elapsedTime * 1.1) * 0.05;
  });
  return (
    <group position={position}>
      {/* Wall bracket reaching out to the left. */}
      <mesh position={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.025, 0.025]} />
        <meshStandardMaterial color="#3a2a22" roughness={0.7} />
      </mesh>
      <group ref={swing} position={[-0.3, 0, 0]}>
        <mesh position={[-0.11, -0.05, 0]}>
          <boxGeometry args={[0.006, 0.1, 0.006]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0.11, -0.05, 0]}>
          <boxGeometry args={[0.006, 0.1, 0.006]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, -0.18, 0]} castShadow>
          <boxGeometry args={[0.34, 0.22, 0.03]} />
          <meshStandardMaterial map={map} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export function Poster({ position, seed = 1, rotationZ = 0 }: { position: [number, number, number]; seed?: number; rotationZ?: number }) {
  const map = useMemo(() => makePosterTexture(seed), [seed]);
  return (
    <mesh position={position} rotation-z={rotationZ}>
      <planeGeometry args={[0.13, 0.17]} />
      <meshStandardMaterial map={map} roughness={1} />
    </mesh>
  );
}
