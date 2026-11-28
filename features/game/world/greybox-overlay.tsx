// A development aid (open /play?greybox=1): draws the invisible things the cat bumps into, the edge of the
// walkable strip and the circles in which interaction prompts appear, so they can be compared with the scenery.
import type { LoadedMap } from "./map/load-map";

export function GreyboxOverlay({ map }: { map: LoadedMap }) {
  const colliders = map.colliders;
  const bounds = map.walkBounds;
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxZ - bounds.minZ;
  return (
    <group>
      {/* The walkable strip. */}
      <mesh position={[(bounds.minX + bounds.maxX) / 2, 0.02, (bounds.minZ + bounds.maxZ) / 2]} rotation-x={-Math.PI / 2} renderOrder={5}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color="#4cc9a0" transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
      {colliders.map((c) =>
        c.kind === "box" ? (
          <mesh key={c.id} position={[c.x, 0.2, c.z]} renderOrder={6}>
            <boxGeometry args={[c.hx * 2, 0.4, c.hz * 2]} />
            <meshBasicMaterial color="#ff5a7a" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
          </mesh>
        ) : (
          <mesh key={c.id} position={[c.x, 0.2, c.z]} renderOrder={6}>
            <cylinderGeometry args={[c.r, c.r, 0.4, 20]} />
            <meshBasicMaterial color="#ff5a7a" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
          </mesh>
        ),
      )}
      {map.interactables.map((i) => (
        <mesh key={i.id} position={[i.x, 0.03, i.z]} rotation-x={-Math.PI / 2} renderOrder={5}>
          <ringGeometry args={[i.radius - 0.03, i.radius, 40]} />
          <meshBasicMaterial color="#ffd36a" transparent opacity={0.8} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
