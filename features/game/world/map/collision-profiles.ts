// How solid each kind of thing is, as a property of the thing and not of any one map: the footprint (half the
// size along x and z before rotation, or a radius per unit of scale) and the height the cat can stand on or has
// to jump over. A model piece with no entry here is scenery the cat walks through. Heights are first guesses to
// be tuned by feel.
import type { PieceName } from "../pieces";

export type Profile = { shape: "box"; half: readonly [number, number]; height: number } | { shape: "circle"; radius: number; height: number };

export const PIECE_PROFILES: Partial<Record<PieceName, Profile>> = {
  "stall-red": { shape: "box", half: [0.55, 0.55], height: 1.4 },
  "stall-green": { shape: "box", half: [0.55, 0.55], height: 1.4 },
  stall: { shape: "box", half: [0.33, 0.5], height: 0.37 },
  "stall-stool": { shape: "circle", radius: 0.13, height: 0.23 },
  "cart-high": { shape: "box", half: [0.55, 0.45], height: 0.42 },
  "stall-bench": { shape: "box", half: [0.22, 0.55], height: 0.26 },
  fence: { shape: "box", half: [0.5, 0.06], height: 0.4 },
  hedge: { shape: "box", half: [0.5, 0.2], height: 0.45 },
  "fountain-round": { shape: "circle", radius: 0.95, height: 0.2 },
  tree: { shape: "circle", radius: 0.22, height: 3 },
  "tree-high": { shape: "circle", radius: 0.22, height: 3 },
  "tree-crooked": { shape: "circle", radius: 0.22, height: 3 },
};

/** A street lamp's post. */
export const LAMP_POST: Profile = { shape: "circle", radius: 0.11, height: 2 };
/** A house is as tall as a wall to a cat. */
export const HOUSE_HEIGHT = 4;
/** Code-built props: a crate (radius per unit of size), a barrel and a flower pot (per unit of scale). */
export const CRATE_RADIUS_PER_SIZE = 0.85;
export const BARREL = { radius: 0.17, height: 0.34 } as const;
export const POT = { radius: 0.13, height: 0.2 } as const;
/** Café furniture: a table, a chair (low enough to jump onto), a parasol's pole, a chalkboard. */
export const TABLE = { height: 0.43 } as const;
/** Leafy trees: only the trunk is solid (the canopy is above the cat); a bush is a low solid mound the cat can jump onto. */
export const TREE_TRUNK = { radius: 0.2, height: 3 } as const;
export const BUSH = { radius: 0.34, height: 0.5 } as const;
export const CHAIR = { radius: 0.15, height: 0.3 } as const;
export const UMBRELLA_POLE = { radius: 0.05, height: 2 } as const;
export const CHALKBOARD = { radius: 0.2, height: 0.55 } as const;
