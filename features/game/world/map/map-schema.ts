// The map data format (version 1): everything that makes one area of the game, as plain data. A map is a JSON
// document; `loadMap` (load-map.ts) checks it against this schema and builds from it the things the game runs on
// (model placements, colliders, lights, the camera preset, interactions). Nothing about a particular street is
// written in code: a second area is a second document.
//
// What the format covers today: terrain, spawn, walkable area, houses (expanded into wall pieces), single pieces,
// street lamps, light halos, code-built props, bunting, wall notices, a hanging sign, a cat in a window,
// interactions, extra colliders and the camera preset. Not yet: per-cell terrain materials, triggers and doors
// that move the player to another map (the scene-transition work comes later in Phase 3), and a day/night clock
// stored in the map.
import { z } from "zod";
import { PIECE_NAMES } from "../pieces";

export const MAP_FORMAT_VERSION = 1;

/** The kinds of ground. Order matters: the number is what the ground shader reads from the terrain grid. */
export const SURFACES = ["cobbles", "road", "paving", "grass", "dirt", "bed", "water"] as const;
export type Surface = (typeof SURFACES)[number];

const num = z.number();
const int = z.number().int();
const vec3 = z.tuple([num, num, num]);

export const boundsSchema = z
  .strictObject({ minX: num, maxX: num, minZ: num, maxZ: num })
  .refine((b) => b.minX < b.maxX && b.minZ < b.maxZ, { message: "bounds must have min below max on both axes" });

/** A fixed tilted perspective camera, and how far it may drift while following the cat. */
export const cameraSchema = z.strictObject({
  fov: num.min(10).max(90),
  pitch: num.min(5).max(85),
  distance: num.positive().max(60),
  /** About how much of the window height the cat covers: smaller makes the world larger around it (the street: 0.115). */
  catScreen: num.min(0.03).max(0.3).default(0.115),
  /** What the camera looks at when the cat is at the spawn point. */
  target: vec3,
  /** The area the camera's focus may move over. */
  follow: boundsSchema,
});

const layer = z.enum(["world", "framing"]).optional();

/** One stroke of ground painted over what is under it: a rectangle or a disc of one surface. Water is also a wall to the cat. */
export const paintSchema = z
  .strictObject({
    /** The surface to paint; left out, only the height changes. */
    surface: z.enum(SURFACES).optional(),
    /** Raises (or lowers) the ground to this height, in world units above the base level. */
    height: num.min(0).max(8).optional(),
    rect: boundsSchema.optional(),
    circle: z.strictObject({ x: num, z: num, r: num.positive() }).optional(),
    /**
     * A flight of stairs over the rectangle: the height goes from `from` to `to` along `axis` in treads of `tread` world
     * units deep (the first tread is one step up from `from`). Use it with a surface for the stone the steps are made of.
     */
    stairs: z.strictObject({ axis: z.enum(["x", "z"]), from: num.min(0).max(8), to: num.min(0).max(8), tread: num.min(0.125).max(1).default(0.25) }).optional(),
  })
  .refine((p) => p.surface !== undefined || p.height !== undefined || p.stairs !== undefined, { message: "a stroke must change the surface, the height or both" })
  .refine((p) => p.rect !== undefined || p.circle !== undefined, { message: "a stroke needs a rect or a circle" });

export const houseSchema = z
  .strictObject({
    x0: num,
    cols: int.min(1).max(24),
    zFront: num,
    depth: int.min(1).max(8),
    style: z.enum(["stone", "wood"]),
    /** One string per floor, one letter per column: c corner, w wall, d door, a / b / s windows. */
    floors: z.array(z.string().regex(/^[cwdabs]+$/)).min(1).max(6),
    roof: z.enum(PIECE_NAMES),
    /** The roof tiles: terracotta (the default for steep roofs), slate (blue-grey) or moss. */
    roofColor: z.enum(["terracotta", "slate", "moss"]).optional(),
    roofScaleY: num.positive().optional(),
    chimneyAt: int.min(0).optional(),
    /** A flower box under every shuttered or glazed window (the small ones have no sill for one). */
    windowBoxes: z.boolean().optional(),
  })
  .refine((h) => h.floors.every((row) => row.length === h.cols), { message: "every floor row needs one letter per column" })
  .refine((h) => h.chimneyAt === undefined || h.chimneyAt < h.cols, { message: "the chimney must stand over one of the columns" });

export const pieceSchema = z.strictObject({
  piece: z.enum(PIECE_NAMES),
  position: vec3,
  rotationY: num.optional(),
  scale: z.union([num.positive(), z.tuple([num.positive(), num.positive(), num.positive()])]).optional(),
  /** "framing" objects ride with the camera in the screen's corners and are never solid. */
  layer,
  /** False for a piece the cat can walk through. */
  solid: z.boolean().optional(),
});

export const lampSchema = z.strictObject({
  /** The lamp's head: where its light and halo are. The post stands under it. */
  head: vec3,
  postScale: num.positive().default(0.8),
  glowSize: num.positive().default(1.4),
});

export const glowSchema = z.strictObject({ position: vec3, size: num.positive(), kind: z.enum(["far", "foreground"]) });

export const crateSchema = z.strictObject({ position: vec3, rotationY: num, size: num.positive(), layer });
export const barrelSchema = z.strictObject({ position: vec3, scale: num.positive(), layer });
export const produceSchema = z.strictObject({ position: vec3, rotationY: num, seed: int });
export const potSchema = z.strictObject({ position: vec3, seed: int, scale: num.positive(), layer });

/** A striped canvas awning over a shop front: it hangs from the wall at `position` (its top edge, in the middle) and slopes down and out. */
export const awningSchema = z.strictObject({
  position: vec3,
  /** Turn about the vertical axis: 0 faces +z, the way the street's front walls do. */
  rotationY: num.optional(),
  width: num.min(0.3).max(6),
  /** How far it reaches out from the wall. */
  reach: num.min(0.15).max(1.2).default(0.45),
  /** How far its outer edge sits below the wall edge. */
  drop: num.min(0).max(0.6).default(0.16),
  /** The two stripe colours. */
  colors: z.tuple([z.string().regex(/^#[0-9a-f]{6}$/), z.string().regex(/^#[0-9a-f]{6}$/)]),
  layer,
});

/** A window flower box (built from the houses' `windowBoxes`; the same shape can also be placed directly). */
export const planterSchema = z.strictObject({ position: vec3, rotationY: num.optional(), width: num.min(0.1).max(2), seed: int });

/** A round café table with a few things on it. */
export const tableSchema = z.strictObject({ position: vec3, radius: num.min(0.15).max(0.6).default(0.3), seed: int });
/** A wooden café chair; at rotation 0 its seat faces +z, and it turns the way the table is. */
export const chairSchema = z.strictObject({ position: vec3, rotationY: num.optional() });
/** A large striped parasol on a pole; `position` is the pole's foot. */
export const umbrellaSchema = z.strictObject({
  position: vec3,
  radius: num.min(0.5).max(2.5).default(1.2),
  height: num.min(1.2).max(2.4).default(1.65),
  colors: z.tuple([z.string().regex(/^#[0-9a-f]{6}$/), z.string().regex(/^#[0-9a-f]{6}$/)]),
});
/** A freestanding A-frame chalkboard with a few chalk marks. */
export const chalkboardSchema = z.strictObject({ position: vec3, rotationY: num.optional(), seed: int });
/** A stone cat on a round pedestal, like the one on the fountain; `position` is the foot of the pedestal. */
export const statueSchema = z.strictObject({ position: vec3, rotationY: num.optional(), scale: num.positive().default(1) });

export const buntingSchema = z.strictObject({ from: vec3, to: vec3, sag: num, flags: int.min(1).max(60), size: num.positive() });
export const posterSchema = z.strictObject({ position: vec3, seed: int, rotationZ: num });

export const colliderSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("box"), id: z.string().min(1), x: num, z: num, hx: num.positive(), hz: num.positive(), height: num.positive().optional() }),
  z.strictObject({ kind: z.literal("circle"), id: z.string().min(1), x: num, z: num, r: num.positive(), height: num.positive().optional() }),
]);

export const interactableSchema = z.strictObject({
  id: z.string().min(1),
  x: num,
  z: num,
  radius: num.positive(),
  label: z.string().min(1).max(80),
  verb: z.enum(["sit", "sleep", "look"]),
  /** For "look": the line that appears. */
  text: z.string().max(240).optional(),
  /** Where the cat walks to first. Left out, the middle of the circle. */
  approach: z.strictObject({ x: num, z: num }).optional(),
  /** The direction (0 to 7) the cat faces there. */
  facing: int.min(0).max(7).optional(),
});

export const mapSchema = z.strictObject({
  format: z.literal(MAP_FORMAT_VERSION),
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  /** Invented or approximate places must say so; the game shows this wherever the area is named. */
  sample: z.boolean(),
  camera: cameraSchema,
  /** The ground: one tiled surface over a rectangle centred on `center`. */
  terrain: z.strictObject({
    size: z.tuple([num.positive(), num.positive()]),
    center: z.tuple([num, num]).optional(),
    /** What the ground is where nothing has been painted. */
    surface: z.enum(SURFACES),
    /** How many times the 128-texel ground tile repeats across the width (the street's cobbles: 13.1 over 40 units). */
    repeat: num.positive(),
    /** Side of one square of the terrain grid, in world units. */
    cell: num.min(0.1).max(2).default(0.5),
    /** Painted in order, later strokes over earlier ones. */
    paint: z.array(paintSchema).default([]),
  }),
  /** The strip the cat may walk on. */
  walkBounds: boundsSchema,
  spawn: z.strictObject({ x: num, z: num, direction: int.min(0).max(7) }),
  houses: z.array(houseSchema),
  /** The window with a cat silhouette watching the street. */
  watcher: z.strictObject({ x: num, level: int.min(0), key: z.enum(["a", "b", "s"]) }).optional(),
  pieces: z.array(pieceSchema),
  lamps: z.array(lampSchema),
  glows: z.array(glowSchema),
  props: z.strictObject({
    crates: z.array(crateSchema),
    barrels: z.array(barrelSchema),
    produce: z.array(produceSchema),
    pots: z.array(potSchema),
    awnings: z.array(awningSchema).default([]),
    planters: z.array(planterSchema).default([]),
    tables: z.array(tableSchema).default([]),
    chairs: z.array(chairSchema).default([]),
    umbrellas: z.array(umbrellaSchema).default([]),
    chalkboards: z.array(chalkboardSchema).default([]),
    statues: z.array(statueSchema).default([]),
  }),
  bunting: z.array(buntingSchema),
  posters: z.array(posterSchema),
  sign: z.strictObject({ position: vec3 }).optional(),
  /** Extra solid things that are not model pieces or props (invisible walls, say). */
  colliders: z.array(colliderSchema),
  interactables: z.array(interactableSchema),
});

export type MapData = z.infer<typeof mapSchema>;
export type MapCamera = z.infer<typeof cameraSchema>;
export type PaintStroke = z.infer<typeof paintSchema>;
export type HouseSpec = z.infer<typeof houseSchema>;
export type PieceSpec = z.infer<typeof pieceSchema>;
export type CrateSpec = z.infer<typeof crateSchema>;
export type BarrelSpec = z.infer<typeof barrelSchema>;
export type ProduceSpec = z.infer<typeof produceSchema>;
export type PotSpec = z.infer<typeof potSchema>;
export type AwningSpec = z.infer<typeof awningSchema>;
export type PlanterSpec = z.infer<typeof planterSchema>;
export type TableSpec = z.infer<typeof tableSchema>;
export type ChairSpec = z.infer<typeof chairSchema>;
export type UmbrellaSpec = z.infer<typeof umbrellaSchema>;
export type ChalkboardSpec = z.infer<typeof chalkboardSchema>;
export type StatueSpec = z.infer<typeof statueSchema>;
export type BuntingString = z.infer<typeof buntingSchema>;
export type PosterSpec = z.infer<typeof posterSchema>;
export type MapInteractable = z.infer<typeof interactableSchema>;
