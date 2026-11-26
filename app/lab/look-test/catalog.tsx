"use client";
/* eslint-disable react-hooks/immutability -- three.js scene objects are mutated by design (refs, useFrame); throwaway Phase 0 lab code */

// PHASE 0 LOOK TEST - throwaway. A contact sheet of the staged pieces so the street can be
// assembled by eye: each piece sits at its own origin, +X to the right, on a unit-cell grid.
import { Html, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import { PIECE_NAMES, Piece, type PieceName } from "./piece";

export type CatalogGroup = "walls" | "roofs" | "props";

export function catalogNames(group: CatalogGroup): PieceName[] {
  if (group === "walls") return PIECE_NAMES.filter((n) => n.startsWith("wall"));
  if (group === "roofs") return PIECE_NAMES.filter((n) => n.startsWith("roof"));
  return PIECE_NAMES.filter((n) => !n.startsWith("wall") && !n.startsWith("roof"));
}

function layout(group: CatalogGroup) {
  const names = catalogNames(group);
  const columns = group === "props" ? 9 : 6;
  const spacing = group === "props" ? 3.2 : 2.2;
  const rows = Math.ceil(names.length / columns);
  return { names, columns, spacing, rows };
}

function CatalogCamera({ group }: { group: CatalogGroup }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    const { columns, spacing, rows } = layout(group);
    const w = columns * spacing;
    const d = rows * spacing;
    const cx = ((columns - 1) * spacing) / 2;
    const cz = ((rows - 1) * spacing) / 2;
    const fov = 40;
    const t = Math.tan((fov * Math.PI) / 360);
    const aspect = size.width / size.height;
    const dist = Math.max(w / (2 * t * aspect), (d * 0.8) / (2 * t)) * 1.08;
    const pitch = ((group === "walls" ? 32 : 55) * Math.PI) / 180;
    if ("fov" in camera) {
      (camera as typeof camera & { fov: number }).fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(cx, Math.sin(pitch) * dist, cz + Math.cos(pitch) * dist);
    camera.lookAt(cx, 0, cz);
  }, [camera, group, size.width, size.height]);
  const { columns, spacing, rows } = layout(group);
  return <OrbitControls makeDefault target={[((columns - 1) * spacing) / 2, 0, ((rows - 1) * spacing) / 2]} />;
}

export function Catalog({ group }: { group: CatalogGroup }) {
  const { names, columns, spacing } = useMemo(() => layout(group), [group]);
  return (
    <group>
      {names.map((name, i) => {
        const x = (i % columns) * spacing;
        const z = Math.floor(i / columns) * spacing;
        return (
          <group key={name} position={[x, 0, z]}>
            <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#6d6a78" wireframe />
            </mesh>
            <Piece name={name} rotationY={group === "walls" ? -Math.PI / 2 : 0} />
            <Html position={[0, 0, 0.95]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
              <span className="lab-catalog-label">{name}</span>
            </Html>
          </group>
        );
      })}
      <axesHelper args={[1.2]} />
      <CatalogCamera group={group} />
    </group>
  );
}
