/* eslint-disable react-hooks/immutability -- the three.js camera and shared per-frame objects are updated in place by design */

// Runs the player once per frame inside the canvas: reads the input hub, steps the simulation, moves the
// camera after the cat, keeps the blur's sharp band on it, and hands the sprite the frame to draw. The rules
// live in features/game/player; this is only the wiring to three.js.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Plane, Raycaster, Vector2, Vector3, type Group, type PerspectiveCamera } from "three";
import { frameIndex, RUN_SPEED_PX, WALK_SPEED_PX } from "../cat/clips";
import { followTarget, stepFollow, type Follow } from "../player/follow-camera";
import { resolveCollisions } from "../player/colliders";
import type { InputHub } from "../player/input-hub";
import type { Interactable } from "../player/interactions";
import { createPlayer, stepPlayer, type PlayerState, type SimEnv } from "../player/player-sim";
import { cameraPose } from "./camera-pose";
import { CAT_FOCUS_RATIO, CAT_FRAME_PX, type Vec3 } from "./stage-constants";
import type { CatVisual } from "./cat-sprite";
import type { LoadedMap } from "./map/load-map";
import { heightAt } from "./map/terrain";

/** Collision radius of the cat in sprite pixels (about half the width of its body). */
export const CAT_RADIUS_PX = 8;

/** What the shell reads for checks and for the on-screen prompt. */
export interface PlayerDebug {
  state(): {
    x: number;
    z: number;
    vx: number;
    vz: number;
    mode: string;
    direction: number;
    phase: number;
    camera: Follow;
    prompt: string | null;
    autoWalk: boolean;
    /** How far off the ground a hop has lifted the cat, in world units, and which emote is playing. */
    lift: number;
    emote: number | null;
    /** Where a tap or an interaction is walking the cat to, if anywhere. */
    target: { x: number; z: number } | null;
    unitsPerPx: number;
  };
  teleport(x: number, z: number): void;
  /** Changes the foot lock (0 to 1) while the game runs, for comparing. */
  setFootLock(value: number): void;
  /** Where the cat's feet are on the screen, 0 to 1 from the top left. */
  screen(): { x: number; y: number };
  /** The sprite as drawn this frame: where it stands in the world and which sheet frame shows. */
  sprite(): { x: number; z: number; frame: number };
  step(seconds: number, push?: { x: number; z: number; run?: boolean }): void;
}

export interface PlayerRigProps {
  /** The area being played: its colliders, interactions, spawn point, walkable strip and camera preset. */
  map: LoadedMap;
  hub: InputHub;
  visual: RefObject<CatVisual>;
  /** World size of one sprite pixel, and of one screen pixel at the cat's depth. */
  unitsPerPx: number;
  deviceUnit: number;
  /** Mutated every frame to the point of the cat the blur keeps sharp. */
  focus: Vec3;
  /** A group that rides along with the camera (the objects framing the screen's corners). */
  framing?: RefObject<Group | null>;
  motion: boolean;
  /** 0 to 1: how much of the step cycle's leftover is taken out of the picture to hold planted paws still (see cycleResidual). */
  footLock: number;
  onPrompt: (prompt: Interactable | null) => void;
  onCaption: (text: string | null) => void;
  debugRef?: RefObject<PlayerDebug | null>;
}

export function PlayerRig(props: PlayerRigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const sim = useRef<PlayerState>(createPlayer(props.map.spawn.x, props.map.spawn.z, props.map.spawn.direction, heightAt(props.map.terrainGrid, props.map.spawn.x, props.map.spawn.z)));
  const follow = useRef<Follow | null>(null);
  const camLift = useRef<number | null>(null);
  const lock = useRef(props.footLock);
  const lastPrompt = useRef<string | null>(null);
  const feet = useMemo(() => new Vector3(), []);
  const lastCaption = useRef<string | null>(null);
  const raycaster = useMemo(() => new Raycaster(), []);
  const ground = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new Vector3(), []);

  const advance = (dt: number, push: { x: number; z: number; gait: "walk" | "run" } | null, tap: { x: number; y: number } | null, interact: boolean, jump = false, emote: number | null = null) => {
    const p = latest.current;
    const upp = p.unitsPerPx;
    const { map } = p;
    const env: SimEnv = {
      unitsPerPx: upp,
      pitchDeg: map.camera.pitch,
      motion: p.motion,
      params: { walkSpeed: WALK_SPEED_PX * upp, runSpeed: RUN_SPEED_PX * upp, radius: CAT_RADIUS_PX * upp },
      colliders: map.colliders,
      bounds: map.walkBounds,
      interactables: map.interactables,
    };

    // A tap or click: find the spot on the cobbles under it, and the nearest free place to stand there.
    let target: { x: number; z: number } | null = null;
    if (tap) {
      camera.updateMatrixWorld();
      raycaster.setFromCamera(new Vector2(tap.x, tap.y), camera);
      if (raycaster.ray.intersectPlane(ground, hit)) target = resolveCollisions({ x: hit.x, z: hit.z }, env.params.radius, map.colliders, map.walkBounds);
    }

    const out = stepPlayer(sim.current, { dt, move: push, target, interact, jump, emote }, env);

    // The camera drifts after the cat (rigidly with reduced motion).
    const want = followTarget({ x: out.x, z: out.z, vx: out.vx, vz: out.vz }, p.motion, map.camera.follow);
    follow.current = follow.current ? stepFollow(follow.current, want, dt, p.motion) : want;
    const f = follow.current;
    // The camera rises and falls with the floor the cat is on (a terrace, a flight of stairs), a little behind it.
    camLift.current = camLift.current === null ? out.lift : camLift.current + (out.lift - camLift.current) * Math.min(1, dt * 3);
    const pose = cameraPose([f.x, map.camera.target[1] + camLift.current, f.z + (map.camera.target[2] - map.spawn.z)], map.camera.pitch, map.camera.distance);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);

    p.framing?.current?.position.set(f.x, camLift.current, f.z - map.spawn.z);

    // The sprite is drawn at whole screen pixels from the camera, so its own pixels never shimmer as it moves.
    const pitch = (map.camera.pitch * Math.PI) / 180;
    const sx = Math.round((out.x + lock.current * out.lock.x - f.x) / p.deviceUnit) * p.deviceUnit;
    const sz = Math.round((out.z + lock.current * out.lock.z - f.z) / (p.deviceUnit / Math.sin(pitch))) * (p.deviceUnit / Math.sin(pitch));
    const visual = p.visual.current;
    if (visual) {
      visual.x = f.x + sx;
      visual.z = f.z + sz;
      visual.frame = frameIndex(out.clip, out.direction, out.frame);
      visual.lift = out.lift;
      visual.shadowY = out.shadowY;
      visual.bubble = out.bubble;
    }
    p.focus[0] = f.x + sx;
    p.focus[1] = CAT_FRAME_PX * upp * CAT_FOCUS_RATIO + out.lift;
    p.focus[2] = f.z + sz;

    const promptId = sim.current.prompt?.id ?? null;
    if (promptId !== lastPrompt.current) {
      lastPrompt.current = promptId;
      p.onPrompt(sim.current.prompt);
    }
    const caption = sim.current.caption?.text ?? null;
    if (caption !== lastCaption.current) {
      lastCaption.current = caption;
      p.onCaption(caption);
    }
  };

  // The camera's lens is set once; its position follows the cat every frame.
  useEffect(() => {
    camera.fov = props.map.camera.fov;
    camera.updateProjectionMatrix();
  }, [camera, props.map.camera.fov]);

  useFrame((_, delta) => {
    const reading = latest.current.hub.read();
    advance(delta, reading.push, reading.tap, reading.interact, reading.jump, reading.emote);
  }, -5);

  useEffect(() => {
    const debug = props.debugRef;
    if (!debug) return;
    debug.current = {
      state: () => ({
        x: sim.current.motion.x,
        z: sim.current.motion.z,
        vx: sim.current.motion.vx,
        vz: sim.current.motion.vz,
        mode: sim.current.anim.mode,
        direction: sim.current.anim.direction,
        phase: sim.current.anim.phase,
        camera: follow.current ?? { x: 0, z: 0 },
        prompt: sim.current.prompt?.id ?? null,
        autoWalk: sim.current.autoWalk !== null,
        lift: latest.current.visual.current?.lift ?? 0,
        emote: sim.current.anim.emote,
        target: sim.current.autoWalk ? { x: sim.current.autoWalk.x, z: sim.current.autoWalk.z } : null,
        unitsPerPx: latest.current.unitsPerPx,
      }),
      sprite: () => {
        const v = latest.current.visual.current;
        return { x: v?.x ?? 0, z: v?.z ?? 0, frame: v?.frame ?? 0 };
      },
      setFootLock: (value) => {
        lock.current = Math.min(1, Math.max(0, value));
      },
      screen: () => {
        camera.updateMatrixWorld();
        const v = latest.current.visual.current;
        feet.set(v?.x ?? 0, 0, v?.z ?? 0).project(camera);
        return { x: (feet.x + 1) / 2, y: (1 - feet.y) / 2 };
      },
      teleport: (x, z) => {
        sim.current.motion = { x, z, vx: 0, vz: 0 };
        // Stand on the floor there (a terrace or a stair), not at the height it was.
        const floor = heightAt(latest.current.map.terrainGrid, x, z);
        sim.current.anim.air.y = floor;
        sim.current.anim.air.support = floor;
      },
      step: (seconds, push) => {
        for (let t = 0; t < seconds; t += 1 / 60) advance(1 / 60, push ? { x: push.x, z: push.z, gait: push.run ? "run" : "walk" } : null, null, false);
      },
    };
    return () => {
      debug.current = null;
    };
    // advance only reads refs, so it is safe to leave out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.debugRef]);

  return null;
}
