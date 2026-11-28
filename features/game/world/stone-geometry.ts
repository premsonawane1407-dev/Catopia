// The stone bridge and the rowing boat, built from faces in code. A bridge is drawn with the street's stone surface and a boat
// with the plank pattern, in vertex colours, so they merge into the same few meshes as the other props.
import { BufferGeometry, Float32BufferAttribute } from "three";

type V3 = [number, number, number];

/** One flat face from four corners in order, facing the way `n` says, as a geometry with the attributes the prop meshes share. */
export function face(a: V3, b: V3, c: V3, d: V3, n: V3): BufferGeometry {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const facing = cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] > 0;
  const tris = facing ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(tris.flat(), 3));
  g.setAttribute("normal", new Float32BufferAttribute(tris.flatMap(() => n), 3));
  g.setAttribute("uv", new Float32BufferAttribute(new Array(12).fill(0), 2));
  return g;
}

/** The height of the arch's underside at `x` (centred on 0): a circular segment of the given span and rise, from the water's level. */
export function archHeight(x: number, span: number, rise: number): number {
  if (Math.abs(x) >= span / 2) return 0;
  const radius = (span * span) / (8 * rise) + rise / 2;
  const centre = rise - radius;
  return Math.max(0, centre + Math.sqrt(radius * radius - x * x));
}

/** The top of the roadway at `x` along a bridge of length `length`: low at the ends, a gentle hump in the middle. */
export function deckHeight(x: number, length: number, endHeight: number, midHeight: number): number {
  const u = (2 * x) / length;
  return endHeight + (midHeight - endHeight) * (1 - u * u);
}
