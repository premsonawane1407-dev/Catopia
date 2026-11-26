// The Kenney Fantasy Town Kit pieces the game uses, and which pixel-art surface each one wears.
// Pieces sit on a 1-unit grid; a wall panel is a thin slab on the local +X edge of its cell.

export const PIECE_NAMES = [
  "wall", "wall-door", "wall-doorway-square", "wall-window-shutters", "wall-window-glass", "wall-window-small",
  "wall-corner", "wall-half", "wall-arch", "wall-wood", "wall-wood-door", "wall-wood-doorway-square",
  "wall-wood-window-shutters", "wall-wood-window-glass", "wall-wood-window-small", "wall-wood-corner",
  "wall-wood-half", "wall-wood-arch",
  "roof", "roof-corner", "roof-gable", "roof-gable-end", "roof-gable-top", "roof-window", "roof-point",
  "roof-left", "roof-right", "roof-high", "roof-high-gable", "roof-high-gable-end", "roof-high-gable-top",
  "roof-high-window",
  "chimney", "chimney-base", "chimney-top",
  "stall", "stall-red", "stall-green", "stall-bench", "stall-stool",
  "cart", "cart-high", "wheel",
  "lantern", "banner-red", "banner-green",
  "fence", "fence-gate", "fence-broken", "hedge",
  "road", "road-bend", "road-curb", "road-edge", "road-corner",
  "stairs-stone", "stairs-stone-handrail", "stairs-wood", "stairs-wood-handrail",
  "pillar-stone", "pillar-wood", "balcony-wall", "overhang", "planks", "poles",
  "tree", "tree-crooked", "tree-high",
  "rock-small", "rock-large", "rock-wide",
  "fountain-round",
] as const;

export type PieceName = (typeof PIECE_NAMES)[number];

/** Which pixel-art pattern a piece's surface gets. */
export type SurfaceProfile = "plaster" | "woodwall" | "roof" | "wood" | "stone" | "brick" | "none";

export interface Surface {
  profile: SurfaceProfile;
  /** Colour multiplier on top of the Kenney palette, when the stock colour needs nudging. */
  tint?: [number, number, number];
}

export function surfaceFor(name: string): Surface {
  if (name.startsWith("wall-wood")) return { profile: "woodwall" };
  if (name.startsWith("wall")) return { profile: "plaster" };
  // The stock red roof reads magenta under blue light; pull it toward terracotta.
  if (name.startsWith("roof-high")) return { profile: "roof", tint: [1.0, 0.74, 0.56] };
  if (name.startsWith("roof")) return { profile: "roof", tint: [0.82, 0.96, 0.9] };
  if (name.startsWith("chimney")) return { profile: "brick" };
  if (
    name.startsWith("stall") || name.startsWith("cart") || name.startsWith("fence") || name === "planks" ||
    name === "poles" || name === "pillar-wood" || name.startsWith("stairs-wood") || name === "wheel"
  ) return { profile: "wood" };
  if (name === "pillar-stone" || name.startsWith("stairs-stone") || name.startsWith("fountain") || name.startsWith("rock")) return { profile: "stone" };
  return { profile: "none" };
}

/** Pieces with the same key share one material, so they can be merged into one mesh. */
export function surfaceKey(name: string): string {
  const { profile, tint } = surfaceFor(name);
  return tint ? `${profile}:${tint.join(",")}` : profile;
}
