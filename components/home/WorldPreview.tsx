"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Place = "courtyard" | "library" | "garden";

const placeCopy: Record<Place, { label: string; note: string }> = {
  courtyard: { label: "The courtyard", note: "A little room to wander." },
  library: { label: "The library walk", note: "A familiar route, seen differently." },
  garden: { label: "The garden path", note: "Follow the softer way home." },
};

function Tree({ position, scale = 1, color = "#82bd83" }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 0.86, 7]} />
        <meshStandardMaterial color="#9b7455" flatShading />
      </mesh>
      <mesh position={[0, 1.18, 0]} castShadow>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial color={color} flatShading roughness={0.96} />
      </mesh>
      <mesh position={[-0.29, 1.03, 0.14]} castShadow>
        <icosahedronGeometry args={[0.37, 1]} />
        <meshStandardMaterial color="#a3d494" flatShading roughness={0.96} />
      </mesh>
      <mesh position={[0.29, 1.3, -0.08]} castShadow>
        <icosahedronGeometry args={[0.37, 1]} />
        <meshStandardMaterial color="#548c70" flatShading roughness={0.96} />
      </mesh>
    </group>
  );
}

function Building({ position, color, roof, width = 1.45 }: { position: [number, number, number]; color: string; roof: string; width?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 1.05, 1.15]} />
        <meshStandardMaterial color={color} flatShading roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.26, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[width * 0.79, 0.58, 4]} />
        <meshStandardMaterial color={roof} flatShading roughness={0.82} />
      </mesh>
      {[-0.36, 0.36].map(x => (
        <mesh key={x} position={[x, 0.66, 0.582]}>
          <boxGeometry args={[0.24, 0.31, 0.035]} />
          <meshStandardMaterial color="#b7e8e7" emissive="#467d87" emissiveIntensity={0.13} />
        </mesh>
      ))}
      <mesh position={[0, 0.33, 0.592]}>
        <boxGeometry args={[0.26, 0.56, 0.04]} />
        <meshStandardMaterial color="#80644b" />
      </mesh>
    </group>
  );
}

function CatCharacter({ position, tint = "#f0a16f", scale = 1 }: { position: [number, number, number]; tint?: string; scale?: number }) {
  const tail = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.15, 0.34, -0.35),
    new THREE.Vector3(0.52, 0.46, -0.46),
    new THREE.Vector3(0.71, 0.72, -0.39),
    new THREE.Vector3(0.62, 0.91, -0.34),
  ]), []);
  return (
    <group position={position} scale={scale} rotation={[0, -0.42, 0]}>
      <mesh position={[0, 0.37, -0.04]} scale={[0.36, 0.3, 0.53]} castShadow>
        <icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={tint} flatShading roughness={0.82} />
      </mesh>
      <mesh position={[0.02, 0.67, 0.36]} scale={[0.3, 0.29, 0.28]} castShadow>
        <icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={tint} flatShading roughness={0.82} />
      </mesh>
      {[-0.18, 0.18].map(x => (
        <mesh key={x} position={[x, 0.91, 0.39]} rotation={[0, 0, x < 0 ? 0.16 : -0.16]} castShadow>
          <coneGeometry args={[0.12, 0.31, 5]} /><meshStandardMaterial color={tint} flatShading />
        </mesh>
      ))}
      {[-0.22, 0.22].map(x => (
        <group key={x}>
          <mesh position={[x, 0.18, 0.24]} castShadow><capsuleGeometry args={[0.075, 0.22, 3, 5]} /><meshStandardMaterial color={tint} flatShading /></mesh>
          <mesh position={[x, 0.17, -0.27]} castShadow><capsuleGeometry args={[0.075, 0.22, 3, 5]} /><meshStandardMaterial color={tint} flatShading /></mesh>
        </group>
      ))}
      <mesh>
        <tubeGeometry args={[tail, 16, 0.065, 6, false]} /><meshStandardMaterial color={tint} flatShading />
      </mesh>
      <mesh position={[-0.115, 0.68, 0.585]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#2c3544" /></mesh>
      <mesh position={[0.125, 0.68, 0.585]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#2c3544" /></mesh>
      <mesh position={[0.005, 0.61, 0.631]}><coneGeometry args={[0.035, 0.045, 3]} /><meshStandardMaterial color="#a85f6b" /></mesh>
    </group>
  );
}

function PlaceMarker({ position, color, onClick }: { position: [number, number, number]; color: string; onClick: () => void }) {
  const ring = useMemo(() => new THREE.TorusGeometry(0.26, 0.025, 8, 40), []);
  return (
    <group position={position} onClick={event => { event.stopPropagation(); onClick(); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={ring}><meshBasicMaterial color={color} /></mesh>
      <mesh position={[0, 0.18, 0]}><sphereGeometry args={[0.085, 12, 8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} /></mesh>
    </group>
  );
}

function Scene({ active, onSelect, calm }: { active: Place; onSelect: (place: Place) => void; calm: boolean }) {
  const world = useRef<THREE.Group>(null);
  useFrame(state => {
    if (!calm && world.current) world.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.14) * 0.025;
  });
  return (
    <group ref={world}>
      <group>
        <ambientLight intensity={1.1} color="#e4f0ff" />
        <directionalLight position={[-5, 9, 6]} intensity={2.8} color="#fff0ce" castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[1, 5, -3]} intensity={34} distance={13} color="#82d3c0" />

        <mesh position={[0, -0.36, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[5.8, 5.38, 0.55, 12]} /><meshStandardMaterial color="#344b56" flatShading roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.055, 0]} receiveShadow>
          <cylinderGeometry args={[5.77, 5.77, 0.08, 12]} /><meshStandardMaterial color="#608a72" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[5.39, 12]} /><meshStandardMaterial color="#6e9b76" side={THREE.DoubleSide} flatShading />
        </mesh>

        <Building position={[-1.75, 0, -1.18]} color="#f2d39b" roof="#e88565" width={1.6} />
        <Building position={[1.42, 0, -1.05]} color="#d9e7be" roof="#7d9aa1" width={1.5} />
        <Building position={[0.1, 0, 2.07]} color="#b8d9cc" roof="#e6b95e" width={1.28} />

        <Tree position={[-3.63, 0, -1.63]} scale={1.22} color="#66a783" />
        <Tree position={[3.28, 0, -1.71]} scale={1.05} color="#5a987d" />
        <Tree position={[-3.5, 0, 2.23]} scale={0.92} color="#80ba79" />
        <Tree position={[3.25, 0, 2.4]} scale={1.18} color="#7fbd83" />
        <Tree position={[0.2, 0, -3.46]} scale={0.82} color="#75a985" />

        <mesh position={[0, 0.045, 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.05, 0.105, 7, 72, Math.PI * 1.8]} /><meshStandardMaterial color="#f2d29a" roughness={1} />
        </mesh>
        <mesh position={[-2.12, 0.05, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.37, 0.09, 7, 48, Math.PI * 0.72]} /><meshStandardMaterial color="#e9ce9b" roughness={1} />
        </mesh>
        <mesh position={[2.06, 0.08, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.42, 0.095, 7, 48, Math.PI * 0.78]} /><meshStandardMaterial color="#e9ce9b" roughness={1} />
        </mesh>

        <CatCharacter position={[0.02, 0.02, 0.65]} scale={1.2} />
        <CatCharacter position={[-2.62, 0.02, 0.73]} tint="#d7d7d1" scale={0.78} />

        <PlaceMarker position={[-1.73, 0.02, -1.2]} color={active === "library" ? "#f4d16e" : "#ffe8b4"} onClick={() => onSelect("library")} />
        <PlaceMarker position={[1.42, 0.02, -1.05]} color={active === "courtyard" ? "#f4d16e" : "#ffe8b4"} onClick={() => onSelect("courtyard")} />
        <PlaceMarker position={[0.1, 0.02, 2.07]} color={active === "garden" ? "#f4d16e" : "#ffe8b4"} onClick={() => onSelect("garden")} />

        <ContactShadows position={[0, -0.005, 0]} opacity={0.24} scale={13} blur={2.2} far={5} />
      </group>
    </group>
  );
}

export default function WorldPreview() {
  const [active, setActive] = useState<Place>("courtyard");
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCalm(motion.matches);
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);

  return (
    <div className="world-preview-shell">
      <div className="world-preview-meta"><span><i /> WORLD PREVIEW</span><b>ILLUSTRATIVE CAMPUS · NOT LIVE DATA</b></div>
      <div className="world-canvas-wrap">
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [8.4, 8.4, 10.5], fov: 36 }} gl={{ antialias: true, alpha: true }}>
          <color attach="background" args={["#182637"]} />
          <Scene active={active} onSelect={setActive} calm={calm} />
          <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.58} maxPolarAngle={1.17} minAzimuthAngle={-0.65} maxAzimuthAngle={0.65} rotateSpeed={0.55} enableDamping dampingFactor={0.09} />
        </Canvas>

        <div className="world-glass world-locals-card" aria-live="polite">
          <span className="glass-kicker">YOUR LITTLE WORLD</span>
          <strong>{placeCopy[active].label}</strong>
          <p>{placeCopy[active].note}</p>
          <span className="local-online"><i /> A WORLD STILL GROWING</span>
        </div>
        <div className="world-glass world-mini-label"><span>✳</span><div><b>Take the long way</b><small>the cats know the good spots</small></div></div>
        <div className="world-drag-cue"><span>DRAG TO LOOK AROUND</span><i>↗</i></div>
        <div className="world-place-pins" aria-label="Choose a place in the illustrated preview">
          <button type="button" aria-pressed={active === "courtyard"} onClick={() => setActive("courtyard")}>Courtyard</button>
          <button type="button" aria-pressed={active === "library"} onClick={() => setActive("library")}>Library walk</button>
          <button type="button" aria-pressed={active === "garden"} onClick={() => setActive("garden")}>Garden path</button>
        </div>
      </div>
      <div className="world-preview-footer"><span><i className="world-cat-dot" /> Two little locals found their way here</span><span>AN INVITATION TO WANDER <b>↗</b></span></div>
    </div>
  );
}
