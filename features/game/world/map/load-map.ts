// Turns a map document into what the game runs on. `loadMap` checks the document against the schema, then
// checks the things a schema cannot (the spawn is not inside a wall, every interaction can be reached, the
// watcher's window exists, ...), and builds the placements, windows, lights, colliders and interactions.
// It throws a `MapError` listing every problem found, so a bad map fails on load with a readable message and
// never half-loads.
import type { Bounds, Collider } from "../../player/colliders";
import type { Interactable } from "../../player/interactions";
import type { Placement } from "../static-batch";
import type { Vec3 } from "../stage-constants";
import { buildHouse, type WindowSpec } from "./build-house";
import { BARREL, CRATE_RADIUS_PER_SIZE, HOUSE_HEIGHT, LAMP_POST, PIECE_PROFILES, POT } from "./collision-profiles";
import { heightAt, heightColliders, rasterizeTerrain, waterColliders, type TerrainGrid } from "./terrain";
import { mapSchema, type AwningSpec, type BarrelSpec, type BuntingString, type CrateSpec, type MapCamera, type MapData, type PlanterSpec, type PosterSpec, type PotSpec, type ProduceSpec } from "./map-schema";

export class MapError extends Error {
  constructor(
    readonly mapId: string,
    readonly problems: readonly string[],
  ) {
    super(`Map "${mapId}" is not valid:\n- ${problems.join("\n- ")}`);
    this.name = "MapError";
  }
}

/** Soft light halos. `kind` decides how bright they are for the time of day. */
export interface GlowSpec {
  position: Vec3;
  size: number;
  kind: "lamp" | "far" | "foreground";
}

export interface PropSpecs {
  crates: readonly CrateSpec[];
  barrels: readonly BarrelSpec[];
  produce: readonly ProduceSpec[];
  pots: readonly PotSpec[];
  awnings: readonly AwningSpec[];
  planters: readonly PlanterSpec[];
}

/** Where a window's sill is, within its floor, for each kind of window (the flower box sits just under it). */
const SILL_Y: Record<"a" | "b" | "s", number> = { a: 0.38, b: 0.42, s: 0.45 };

export interface LoadedMap {
  id: string;
  name: string;
  /** True for an invented or approximate place: the game must say so wherever it names the area. */
  sample: boolean;
  camera: MapCamera;
  terrain: MapData["terrain"];
  /** The ground as a grid of surfaces (what the ground shader draws and the water walls come from). */
  terrainGrid: TerrainGrid;
  walkBounds: Bounds;
  spawn: { x: number; z: number; direction: number };
  /** Every model piece, then the two halves of it. Framing pieces ride with the camera. */
  placements: Placement[];
  worldPlacements: Placement[];
  framingPlacements: Placement[];
  windows: WindowSpec[];
  /** The lamp heads: real point lights (as many as the quality tier allows) and glow halos. */
  lamps: Vec3[];
  glows: GlowSpec[];
  worldGlows: GlowSpec[];
  framingGlows: GlowSpec[];
  worldProps: PropSpecs;
  framingProps: PropSpecs;
  bunting: BuntingString[];
  posters: PosterSpec[];
  sign: Vec3 | null;
  colliders: Collider[];
  interactables: Interactable[];
}

const inside = (b: Bounds, x: number, z: number) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
const hits = (c: Collider, x: number, z: number) => (c.kind === "box" ? Math.abs(x - c.x) <= c.hx && Math.abs(z - c.z) <= c.hz : Math.hypot(x - c.x, z - c.z) <= c.r);

/** The solid things of a map, on the ground plane: houses, solid pieces, lamp posts, props and any extra colliders. */
export function buildColliders(data: MapData, grid: TerrainGrid): Collider[] {
  const bounds = data.walkBounds;
  // Everything stands on the ground under it: its height is measured from there, and a collider's top is a height above the base level.
  const base = (x: number, z: number) => heightAt(grid, x, z);
  const out: Collider[] = [];
  // Things far from the walkable strip are out of reach and are left out.
  const near = (x: number, z: number, margin = 1) => z <= bounds.maxZ + margin && z >= bounds.minZ - margin - 3 && x >= bounds.minX - 1 && x <= bounds.maxX + 1;

  data.houses.forEach((h, i) => {
    const z1 = h.zFront + 0.5;
    const z0 = h.zFront - h.depth + 0.5;
    if (z1 < bounds.minZ - 0.5) return;
    out.push({ kind: "box", id: `house-${i}`, x: h.x0 + (h.cols - 1) / 2, z: (z0 + z1) / 2, hx: h.cols / 2, hz: (z1 - z0) / 2, height: base(h.x0 + (h.cols - 1) / 2, (z0 + z1) / 2) + HOUSE_HEIGHT });
  });

  for (const p of data.pieces) {
    const profile = PIECE_PROFILES[p.piece];
    if (!profile || profile.shape !== "box" || p.layer === "framing" || p.solid === false) continue;
    const [x, , z] = p.position;
    if (!near(x, z)) continue;
    const scale = typeof p.scale === "number" ? p.scale : 1;
    const quarter = Math.abs(Math.round(((p.rotationY ?? 0) / (Math.PI / 2)) % 2)) === 1;
    let hx = quarter ? profile.half[1] : profile.half[0];
    let hz = quarter ? profile.half[0] : profile.half[1];
    // A tilted piece covers a little more than its straight footprint.
    const tilt = Math.abs((p.rotationY ?? 0) % (Math.PI / 2));
    const grow = 1 + 0.35 * Math.min(tilt, Math.PI / 2 - tilt);
    hx *= grow * scale;
    hz *= grow * scale;
    out.push({ kind: "box", id: `${p.piece}@${x},${z}`, x, z, hx, hz, height: base(x, z) + profile.height });
  }

  data.lamps.forEach((l, i) => {
    if (near(l.head[0], l.head[2])) out.push({ kind: "circle", id: `lamp-${i}`, x: l.head[0], z: l.head[2], r: LAMP_POST.shape === "circle" ? LAMP_POST.radius : 0.11, height: base(l.head[0], l.head[2]) + LAMP_POST.height });
  });
  data.props.crates.forEach((c, i) => {
    if (c.layer !== "framing" && near(c.position[0], c.position[2])) out.push({ kind: "circle", id: `crate-${i}`, x: c.position[0], z: c.position[2], r: c.size * CRATE_RADIUS_PER_SIZE, height: base(c.position[0], c.position[2]) + c.position[1] + c.size });
  });
  data.props.barrels.forEach((b, i) => {
    if (b.layer !== "framing" && near(b.position[0], b.position[2])) out.push({ kind: "circle", id: `barrel-${i}`, x: b.position[0], z: b.position[2], r: BARREL.radius * b.scale, height: base(b.position[0], b.position[2]) + BARREL.height * b.scale });
  });
  data.props.pots.forEach((p, i) => {
    if (p.layer !== "framing" && near(p.position[0], p.position[2])) out.push({ kind: "circle", id: `pot-${i}`, x: p.position[0], z: p.position[2], r: POT.radius, height: base(p.position[0], p.position[2]) + POT.height });
  });
  for (const p of data.pieces) {
    const profile = PIECE_PROFILES[p.piece];
    if (!profile || profile.shape !== "circle" || p.solid === false) continue;
    const scale = typeof p.scale === "number" ? p.scale : 1;
    if (near(p.position[0], p.position[2], 0.3)) out.push({ kind: "circle", id: `${p.piece}@${p.position[0]},${p.position[2]}`, x: p.position[0], z: p.position[2], r: profile.radius * scale, height: base(p.position[0], p.position[2]) + profile.height });
  }
  out.push(...data.colliders);
  return out;
}

/** The problems with a map that a schema cannot express. */
export function checkMap(data: MapData, colliders: readonly Collider[], windows: readonly WindowSpec[], grid: TerrainGrid): string[] {
  const problems: string[] = [];
  const [w, d] = data.terrain.size;
  const [cx, cz] = data.terrain.center ?? [0, 0];
  const onGround = (x: number, z: number) => Math.abs(x - cx) <= w / 2 && Math.abs(z - cz) <= d / 2;
  // Solid at a spot: a wall, or something more than half a unit above the floor there.
  const solid = (x: number, z: number) => colliders.filter((c) => c.height === undefined || c.height > heightAt(grid, x, z) + 0.5).find((c) => hits(c, x, z));

  if (!inside(data.walkBounds, data.spawn.x, data.spawn.z)) problems.push("the spawn point is outside the walkable area");
  const atSpawn = solid(data.spawn.x, data.spawn.z);
  if (atSpawn) problems.push(`the spawn point is inside "${atSpawn.id}"`);
  if (!onGround(data.walkBounds.minX, data.walkBounds.minZ) || !onGround(data.walkBounds.maxX, data.walkBounds.maxZ)) problems.push("the walkable area reaches past the terrain");

  const ids = new Set<string>();
  for (const i of data.interactables) {
    if (ids.has(i.id)) problems.push(`two interactions are called "${i.id}"`);
    ids.add(i.id);
    const at = i.approach ?? { x: i.x, z: i.z };
    if (!inside(data.walkBounds, at.x, at.z)) problems.push(`the spot for "${i.id}" is outside the walkable area`);
    const blocker = solid(at.x, at.z);
    if (blocker) problems.push(`the spot for "${i.id}" is inside "${blocker.id}"`);
    if (i.verb === "look" && !i.text) problems.push(`"${i.id}" looks at something but has no text`);
  }
  const colliderIds = new Set<string>();
  for (const c of colliders) {
    if (colliderIds.has(c.id)) problems.push(`two colliders are called "${c.id}"`);
    colliderIds.add(c.id);
  }
  if (data.watcher && !windows.some((win) => win.x === data.watcher!.x && win.level === data.watcher!.level && win.key === data.watcher!.key)) problems.push("the watcher's window does not exist");
  for (const p of data.pieces) if (!onGround(p.position[0], p.position[2])) problems.push(`${p.piece} at ${p.position[0]},${p.position[2]} is off the terrain`);
  for (const l of data.lamps) if (!onGround(l.head[0], l.head[2])) problems.push(`a lamp at ${l.head[0]},${l.head[2]} is off the terrain`);
  if (data.camera.follow.minX > data.camera.follow.maxX) problems.push("the camera's drift area is empty");
  return problems;
}

export function loadMap(raw: unknown): LoadedMap {
  const parsed = mapSchema.safeParse(raw);
  if (!parsed.success) {
    const id = typeof (raw as { id?: unknown } | null)?.id === "string" ? (raw as { id: string }).id : "unknown";
    throw new MapError(
      id,
      parsed.error.issues.map((i) => `${i.path.join(".") || "(map)"}: ${i.message}`),
    );
  }
  const data = parsed.data;

  const terrainGrid = rasterizeTerrain(data.terrain);
  // Heights in a map are above the ground at that spot: a house, a lamp or a crate is placed at floor level and stands on
  // whatever the terrain's height is there (things that ride with the camera, the framing layer, are not lifted).
  const baseAt = (x: number, z: number) => heightAt(terrainGrid, x, z);
  const lift = (v: Vec3, layer?: "world" | "framing"): Vec3 => (layer === "framing" ? v : [v[0], v[1] + baseAt(v[0], v[2]), v[2]]);

  const built = data.houses.map((h) => {
    const house = buildHouse(h);
    const base = baseAt(h.x0 + (h.cols - 1) / 2, h.zFront - (h.depth - 1) / 2);
    return { placements: house.placements.map((p) => ({ ...p, position: [p.position[0], p.position[1] + base, p.position[2]] as Vec3 })), windows: house.windows.map((w) => ({ ...w, base })) };
  });
  const lampPosts: Placement[] = data.lamps.map((l) => ({ piece: "lantern", position: lift([l.head[0], 0, l.head[2]]), scale: l.postScale }));
  const scenery: Placement[] = data.pieces.map((p) => ({ piece: p.piece, position: lift(p.position as Vec3, p.layer), ...(p.rotationY !== undefined ? { rotationY: p.rotationY } : {}), ...(p.scale !== undefined ? { scale: p.scale } : {}) }));
  const placements = [...built.flatMap((b) => b.placements), ...lampPosts, ...scenery];
  const framingPlacements = data.pieces.flatMap((p, i) => (p.layer === "framing" ? [scenery[i]] : []));
  const worldPlacements = [...built.flatMap((b) => b.placements), ...lampPosts, ...data.pieces.flatMap((p, i) => (p.layer === "framing" ? [] : [scenery[i]]))];

  const windows: WindowSpec[] = built.flatMap((b) => b.windows).map((w) => (data.watcher && w.x === data.watcher.x && w.level === data.watcher.level && w.key === data.watcher.key ? { ...w, cat: true } : w));

  const lamps = data.lamps.map((l) => lift(l.head as Vec3));
  const glows: GlowSpec[] = [
    ...data.lamps.map<GlowSpec>((l) => ({ position: lift(l.head as Vec3), size: l.glowSize, kind: "lamp" })),
    ...data.glows.map<GlowSpec>((g) => ({ position: g.kind === "foreground" ? (g.position as Vec3) : lift(g.position as Vec3), size: g.size, kind: g.kind })),
  ];

  // A flower box under every shuttered or glazed window of the houses that ask for them.
  const planters: PlanterSpec[] = data.props.planters.map((p) => ({ ...p, position: lift(p.position as Vec3) }));
  data.houses.forEach((h, hi) => {
    if (!h.windowBoxes) return;
    built[hi].windows.forEach((w, wi) => {
      if (w.key === "s") return;
      planters.push({ position: [w.x, (w.base ?? 0) + w.level + SILL_Y[w.key] - 0.03, w.z + 0.05], width: w.key === "a" ? 0.46 : 0.36, seed: hi * 31 + wi * 7 + 1 });
    });
  });
  const liftProp = <T extends { position: [number, number, number]; layer?: "world" | "framing" }>(list: readonly T[]): T[] => list.map((p) => ({ ...p, position: lift(p.position, p.layer) }));
  const props = {
    crates: liftProp(data.props.crates),
    barrels: liftProp(data.props.barrels),
    produce: liftProp(data.props.produce),
    pots: liftProp(data.props.pots),
    awnings: liftProp(data.props.awnings),
  };

  const colliders = [...buildColliders(data, terrainGrid), ...waterColliders(terrainGrid), ...heightColliders(terrainGrid)];
  const problems = checkMap(data, colliders, windows, terrainGrid);
  if (problems.length) throw new MapError(data.id, problems);

  const framing = <T extends { layer?: "world" | "framing" }>(list: readonly T[], want: boolean) => list.filter((x) => (x.layer === "framing") === want);
  return {
    id: data.id,
    name: data.name,
    sample: data.sample,
    camera: data.camera,
    terrain: data.terrain,
    terrainGrid,
    walkBounds: data.walkBounds,
    spawn: data.spawn,
    placements,
    worldPlacements,
    framingPlacements,
    windows,
    lamps,
    glows,
    worldGlows: glows.filter((g) => g.kind !== "foreground"),
    framingGlows: glows.filter((g) => g.kind === "foreground"),
    worldProps: { crates: framing(props.crates, false), barrels: framing(props.barrels, false), produce: props.produce, pots: framing(props.pots, false), awnings: framing(props.awnings, false), planters },
    framingProps: { crates: framing(props.crates, true), barrels: framing(props.barrels, true), produce: [], pots: framing(props.pots, true), awnings: framing(props.awnings, true), planters: [] },
    bunting: data.bunting.map((b) => ({ ...b, from: lift(b.from as Vec3), to: lift(b.to as Vec3) })),
    posters: data.posters.map((p) => ({ ...p, position: lift(p.position as Vec3) })),
    sign: data.sign ? lift(data.sign.position as Vec3) : null,
    colliders,
    interactables: data.interactables.map<Interactable>((i) => ({ ...i, approach: i.approach ?? { x: i.x, z: i.z }, facing: i.facing ?? 0 })),
  };
}
