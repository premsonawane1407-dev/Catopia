// Tiny 3D vector and rotation helpers for the cat generator. Plain tuples and row-major 3x3 matrices,
// so the generator runs the same in the browser, in Node scripts and in tests, with no dependencies.

export type V3 = readonly [number, number, number];
/** A 3x3 rotation matrix, row-major: [m00, m01, m02, m10, ...]. */
export type M3 = readonly [number, number, number, number, number, number, number, number, number];

export const v3 = (x: number, y: number, z: number): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function normalize(a: V3): V3 {
  const l = length(a);
  return l < 1e-9 ? [0, 0, 1] : [a[0] / l, a[1] / l, a[2] / l];
}

export const IDENTITY: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function rotX(a: number): M3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}
export function rotY(a: number): M3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}
export function rotZ(a: number): M3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

export function mulMat(a: M3, b: M3): M3 {
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r as unknown as M3;
}
export const mulVec = (m: M3, v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
export const transpose = (m: M3): M3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

/** Euler rotation applied as yaw (about y) after pitch (about x) after roll (about z). */
export function euler(pitch: number, yaw: number, roll: number): M3 {
  return mulMat(rotY(yaw), mulMat(rotX(pitch), rotZ(roll)));
}

/** A rotation whose local +z points along `forward` and whose local +y is as close to `up` as possible. */
export function lookRotation(forward: V3, up: V3 = [0, 1, 0]): M3 {
  const f = normalize(forward);
  let r = cross(up, f);
  if (length(r) < 1e-6) r = cross([1, 0, 0], f);
  r = normalize(r);
  const u = cross(f, r);
  // Columns are the local x, y, z axes expressed in world space.
  return [r[0], u[0], f[0], r[1], u[1], f[1], r[2], u[2], f[2]];
}

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
export const fract = (x: number): number => x - Math.floor(x);

/** Deterministic small hash noise in [0, 1) from integer-ish inputs. */
export function hash3(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(Math.floor(x * 7.31) + 1013, 374761393) ^ Math.imul(Math.floor(y * 7.31) + 7919, 668265263) ^ Math.imul(Math.floor(z * 7.31) + 104729, 2147483647) ^ Math.imul(seed + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1) (trilinear blend of hashed lattice points). */
export function valueNoise(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const fz = smooth(z - z0);
  const h = (dx: number, dy: number, dz: number) => hash3((x0 + dx) / 7.31, (y0 + dy) / 7.31, (z0 + dz) / 7.31, seed);
  const lx = (dy: number, dz: number) => mix(h(0, dy, dz), h(1, dy, dz), fx);
  return mix(mix(lx(0, 0), lx(1, 0), fy), mix(lx(0, 1), lx(1, 1), fy), fz);
}
