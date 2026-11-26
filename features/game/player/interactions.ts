// Things the cat can interact with, and the prompt that offers them. An interaction is about the street, never
// about other animals: sit somewhere, curl up somewhere, sniff or read something. Nothing here feeds, chases or
// handles a cat.
import type { Point } from "./colliders";

export type Verb = "sit" | "sleep" | "look";

export interface Interactable {
  id: string;
  /** Where the thing is (the middle of the circle in which its prompt shows). */
  x: number;
  z: number;
  radius: number;
  /** What the prompt says, such as "Sit and watch the market". */
  label: string;
  verb: Verb;
  /** For "look": the line that appears. */
  text?: string;
  /** Where the cat walks to before settling or looking, and the direction (0 to 7) it faces there. */
  approach: Point;
  facing: number;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * The thing whose prompt should show for a cat at `at`. The one already showing stays until the cat is a bit
 * farther away than it takes to show it, so the prompt does not flicker at the edge.
 */
export function pickInteractable(at: Point, list: readonly Interactable[], current: Interactable | null): Interactable | null {
  if (current && dist(at, current) <= current.radius * 1.15) {
    // Still in range of the current one, but a clearly closer one wins.
    const closer = list.find((i) => i.id !== current.id && dist(at, i) + 0.12 < dist(at, current) && dist(at, i) <= i.radius);
    return closer ?? current;
  }
  let best: Interactable | null = null;
  let bestD = Infinity;
  for (const i of list) {
    const d = dist(at, i);
    if (d <= i.radius && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

/** How long a line of text stays on screen, in seconds. */
export const CAPTION_SECONDS = 4.5;
