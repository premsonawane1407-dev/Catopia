// Draws one pose of the cat from one heading into a small pixel-art picture and a matching normal map.
//
// It is a tiny ray caster: every pixel of the frame sends one straight ray into the cat's solids, and the
// nearest hit decides the pixel. The hit's normal picks one of five flat tones (no smooth gradients, as pixel
// art wants), a second ray toward the light decides self-shadows, and the coat's pattern and the face are
// painted onto the surface. Then outlines go on, stray single pixels are cleaned up, and the whole thing is
// written out as colours plus normals. No random numbers, so the same inputs always make the same pixels.
import { CAT_FRAME_H, CAT_FRAME_W, CAT_ORIGIN_PX, VIEW_ELEVATION_DEG } from "./clips";
import { buildPalette, materialAt, type CatCoat, type CoatPalette, type Material, type RGB, type SurfacePoint } from "./coat";
import { LEG_NAMES, buildParts, type CatLook, type EllipsoidPrim, type LegName, type Pose, type Prim, type TrianglePrim } from "./model";
import { IDENTITY, add, clamp, dot, mulMat, mulVec, normalize, rotY, scale, sub, transpose, type M3, type V3 } from "./vec";

export { VIEW_ELEVATION_DEG };

const ELEV = (VIEW_ELEVATION_DEG * Math.PI) / 180;
const RIGHT: V3 = [1, 0, 0];
const UP: V3 = [0, Math.cos(ELEV), -Math.sin(ELEV)];
/** Points from the cat toward the camera. */
const TOWARD: V3 = [0, Math.sin(ELEV), Math.cos(ELEV)];
/** The light, in camera space (x right, y up, z toward the viewer): from the top left, in front. */
const LIGHT_CAM: V3 = normalize([-0.6, 0.5, 0.62]);
const LIGHT_WORLD: V3 = normalize(add(add(scale(RIGHT, LIGHT_CAM[0]), scale(UP, LIGHT_CAM[1])), scale(TOWARD, LIGHT_CAM[2])));
/** The refined look is lit from more in front, so the side turned away from the light is not a dark slab. */
const LIGHT_CAM_REFINED: V3 = normalize([-0.24, 0.55, 0.8]);
const LIGHT_WORLD_REFINED: V3 = normalize(add(add(scale(RIGHT, LIGHT_CAM_REFINED[0]), scale(UP, LIGHT_CAM_REFINED[1])), scale(TOWARD, LIGHT_CAM_REFINED[2])));

export interface RenderedFrame {
  width: number;
  height: number;
  /** RGBA, 4 bytes a pixel. Transparent pixels have alpha 0. */
  rgba: Uint8ClampedArray;
  /** Normal map, RGBA (xyz packed to 0..255, alpha as the colour's). */
  normal: Uint8ClampedArray;
  /** Where each paw's centre landed in the frame, in pixels (fractional), and whether it is on the ground. */
  paws: Record<LegName, { x: number; y: number }>;
}

interface Hit {
  prim: number;
  depth: number;
  /** Surface normal in camera space. */
  nx: number;
  ny: number;
  nz: number;
  /** Direction on the part's own unit sphere. */
  ux: number;
  uy: number;
  uz: number;
  /** Barycentric coordinates, for triangles. */
  b0: number;
  b1: number;
  b2: number;
}

function transformPrim(prim: Prim, heading: number): Prim {
  const m = rotY(heading);
  if (prim.kind === "ell") return { ...prim, c: mulVec(m, prim.c), R: mulMat(m, prim.R) };
  return { ...prim, a: mulVec(m, prim.a), b: mulVec(m, prim.b), c: mulVec(m, prim.c) };
}

interface Cache {
  /** Rotation from world to the ellipsoid's local axes, and its reciprocal radii. */
  inv: M3;
}

function intersectEllipsoid(p: EllipsoidPrim, cache: Cache, baseX: number, baseY: number, baseZ: number): { s: number; qx: number; qy: number; qz: number } | null {
  // The ray is base + TOWARD * s, with base lying in the screen plane.
  const dx = baseX - p.c[0];
  const dy = baseY - p.c[1];
  const dz = baseZ - p.c[2];
  const m = cache.inv;
  const ox = (m[0] * dx + m[1] * dy + m[2] * dz) / p.r[0];
  const oy = (m[3] * dx + m[4] * dy + m[5] * dz) / p.r[1];
  const oz = (m[6] * dx + m[7] * dy + m[8] * dz) / p.r[2];
  const ex = (m[0] * TOWARD[0] + m[1] * TOWARD[1] + m[2] * TOWARD[2]) / p.r[0];
  const ey = (m[3] * TOWARD[0] + m[4] * TOWARD[1] + m[5] * TOWARD[2]) / p.r[1];
  const ez = (m[6] * TOWARD[0] + m[7] * TOWARD[1] + m[8] * TOWARD[2]) / p.r[2];
  const a = ex * ex + ey * ey + ez * ez;
  const b = ox * ex + oy * ey + oz * ez;
  const c = ox * ox + oy * oy + oz * oz - 1;
  const disc = b * b - a * c;
  if (disc < 0) return null;
  const s = (-b + Math.sqrt(disc)) / a;
  return { s, qx: ox + ex * s, qy: oy + ey * s, qz: oz + ez * s };
}

/** Ray from `origin` along `dir` against a triangle (double sided). Returns the distance, or -1. */
function rayTriangle(origin: V3, dir: V3, t: TrianglePrim): { t: number; u: number; v: number } | null {
  const e1 = sub(t.b, t.a);
  const e2 = sub(t.c, t.a);
  const px = dir[1] * e2[2] - dir[2] * e2[1];
  const py = dir[2] * e2[0] - dir[0] * e2[2];
  const pz = dir[0] * e2[1] - dir[1] * e2[0];
  const det = e1[0] * px + e1[1] * py + e1[2] * pz;
  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det;
  const tx = origin[0] - t.a[0];
  const ty = origin[1] - t.a[1];
  const tz = origin[2] - t.a[2];
  const u = (tx * px + ty * py + tz * pz) * inv;
  if (u < 0 || u > 1) return null;
  const qx = ty * e1[2] - tz * e1[1];
  const qy = tz * e1[0] - tx * e1[2];
  const qz = tx * e1[1] - ty * e1[0];
  const v = (dir[0] * qx + dir[1] * qy + dir[2] * qz) * inv;
  if (v < 0 || u + v > 1) return null;
  const dist = (e2[0] * qx + e2[1] * qy + e2[2] * qz) * inv;
  return dist > 1e-6 ? { t: dist, u, v } : null;
}

const level = (shade: number, look: CatLook): number => (shade > 0.86 ? 4 : shade > 0.58 ? 3 : shade > (look === "refined" ? 0.15 : 0.18) ? 2 : shade > (look === "refined" ? -0.42 : -0.22) ? 1 : 0);

/** Half-width and half-height of the refined head in pixels, which the refined face is measured in. */
const REFINED_HEAD = [9.2, 7.7] as const;

const pack = (c: RGB): number => (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);

interface Pixel {
  hit: Hit | null;
  color: number;
  /** Material for outline colouring; -1 for none. */
  mat: number;
  /** Protected from the stray-pixel cleanup (eye glints and the nose). */
  keep: boolean;
}

const MATERIALS: readonly Material[] = ["base", "mark", "white", "patch"];

export interface RenderInput {
  pose: Pose;
  /** 0 faces the camera; a quarter turn faces screen right. */
  heading: number;
  coat: CatCoat;
  palette?: CoatPalette;
  /** Which drawing of the cat. The refined look has a more natural face (round eyes with a glint, a small nose and mouth, whiskers) and softer shadows. */
  look?: CatLook;
}

export function renderCat({ pose, heading, coat, palette = buildPalette(coat), look = "original" }: RenderInput): RenderedFrame {
  const W = CAT_FRAME_W;
  const H = CAT_FRAME_H;
  const [ox, oy] = CAT_ORIGIN_PX;
  const prims = buildParts(pose, look).map((p) => transformPrim(p, heading));
  const lightCam = look === "refined" ? LIGHT_CAM_REFINED : LIGHT_CAM;
  const lightWorld = look === "refined" ? LIGHT_WORLD_REFINED : LIGHT_WORLD;
  const caches: Cache[] = prims.map((p) => (p.kind === "ell" ? { inv: transpose(p.R) } : { inv: IDENTITY }));

  // Which pixels each solid can touch: its bounding circle, projected.
  const boxes = prims.map((p) => {
    if (p.kind === "ell") {
      const R = Math.max(p.r[0], p.r[1], p.r[2]) + 1;
      const u = dot(p.c, RIGHT);
      const v = dot(p.c, UP);
      return [Math.floor(ox + u - R), Math.ceil(ox + u + R), Math.floor(oy - v - R), Math.ceil(oy - v + R)] as const;
    }
    const xs = [p.a, p.b, p.c].map((q) => ox + dot(q, RIGHT));
    const ys = [p.a, p.b, p.c].map((q) => oy - dot(q, UP));
    return [Math.floor(Math.min(...xs)) - 1, Math.ceil(Math.max(...xs)) + 1, Math.floor(Math.min(...ys)) - 1, Math.ceil(Math.max(...ys)) + 1] as const;
  });

  const depth = new Float32Array(W * H).fill(-1e9);
  const hits: (Hit | null)[] = new Array(W * H).fill(null);

  for (let i = 0; i < prims.length; i++) {
    const p = prims[i];
    const [x0, x1, y0, y1] = boxes[i];
    for (let py = Math.max(0, y0); py <= Math.min(H - 1, y1); py++) {
      for (let px = Math.max(0, x0); px <= Math.min(W - 1, x1); px++) {
        const u = px + 0.5 - ox;
        const v = oy - (py + 0.5);
        const bx = RIGHT[0] * u + UP[0] * v;
        const by = RIGHT[1] * u + UP[1] * v;
        const bz = RIGHT[2] * u + UP[2] * v;
        const idx = py * W + px;
        if (p.kind === "ell") {
          const h = intersectEllipsoid(p, caches[i], bx, by, bz);
          if (!h || h.s <= depth[idx]) continue;
          const nl: V3 = [h.qx / p.r[0], h.qy / p.r[1], h.qz / p.r[2]];
          const nw = normalize(mulVec(p.R, nl));
          depth[idx] = h.s;
          hits[idx] = { prim: i, depth: h.s, nx: dot(nw, RIGHT), ny: dot(nw, UP), nz: dot(nw, TOWARD), ux: h.qx, uy: h.qy, uz: h.qz, b0: 0, b1: 0, b2: 0 };
        } else {
          const origin: V3 = [bx + TOWARD[0] * 200, by + TOWARD[1] * 200, bz + TOWARD[2] * 200];
          const h = rayTriangle(origin, [-TOWARD[0], -TOWARD[1], -TOWARD[2]], p);
          if (!h) continue;
          const s = 200 - h.t;
          if (s <= depth[idx]) continue;
          let n = normalize(cross3(sub(p.b, p.a), sub(p.c, p.a)));
          if (dot(n, TOWARD) < 0) n = scale(n, -1);
          depth[idx] = s;
          hits[idx] = { prim: i, depth: s, nx: dot(n, RIGHT), ny: dot(n, UP), nz: dot(n, TOWARD), ux: 0, uy: 0, uz: 0, b0: 1 - h.u - h.v, b1: h.u, b2: h.v };
        }
      }
    }
  }

  // Is a point shadowed from the light by another solid?
  const shadowed = (p: V3, self: number): boolean => {
    for (let i = 0; i < prims.length; i++) {
      if (i === self) continue;
      const q = prims[i];
      if (sameChain(prims[self], q)) continue;
      if (q.kind === "ell") {
        const dx = p[0] - q.c[0];
        const dy = p[1] - q.c[1];
        const dz = p[2] - q.c[2];
        const R = Math.max(q.r[0], q.r[1], q.r[2]);
        // Cheap bound first: the ray must pass within the solid's radius.
        const along = dx * lightWorld[0] + dy * lightWorld[1] + dz * lightWorld[2];
        if (along > 0) continue;
        const dist2 = dx * dx + dy * dy + dz * dz - along * along;
        if (dist2 > R * R) continue;
        const m = caches[i].inv;
        const lx = (m[0] * dx + m[1] * dy + m[2] * dz) / q.r[0];
        const ly = (m[3] * dx + m[4] * dy + m[5] * dz) / q.r[1];
        const lz = (m[6] * dx + m[7] * dy + m[8] * dz) / q.r[2];
        const ex = (m[0] * lightWorld[0] + m[1] * lightWorld[1] + m[2] * lightWorld[2]) / q.r[0];
        const ey = (m[3] * lightWorld[0] + m[4] * lightWorld[1] + m[5] * lightWorld[2]) / q.r[1];
        const ez = (m[6] * lightWorld[0] + m[7] * lightWorld[1] + m[8] * lightWorld[2]) / q.r[2];
        const a = ex * ex + ey * ey + ez * ez;
        const b = lx * ex + ly * ey + lz * ez;
        const c = lx * lx + ly * ly + lz * lz - 1;
        const disc = b * b - a * c;
        if (disc >= 0 && (-b + Math.sqrt(disc)) / a > 0.02) return true;
      } else if (rayTriangle(p, lightWorld, q)) return true;
    }
    return false;
  };

  const pixels: Pixel[] = new Array(W * H);
  const levelOf = new Int8Array(W * H);
  for (let idx = 0; idx < W * H; idx++) {
    const hit = hits[idx];
    if (!hit) {
      pixels[idx] = { hit: null, color: -1, mat: -1, keep: false };
      continue;
    }
    pixels[idx] = shadePixel(hit, idx);
  }

  function shadePixel(hit: Hit, idx: number): Pixel {
    const prim = prims[hit.prim];
    const px = idx % W;
    const py = Math.floor(idx / W);
    const u = px + 0.5 - ox;
    const v = oy - (py + 0.5);
    const world: V3 = [RIGHT[0] * u + UP[0] * v + TOWARD[0] * hit.depth, RIGHT[1] * u + UP[1] * v + TOWARD[1] * hit.depth, RIGHT[2] * u + UP[2] * v + TOWARD[2] * hit.depth];
    let lvl = level(hit.nx * lightCam[0] + hit.ny * lightCam[1] + hit.nz * lightCam[2], look);
    const nWorld: V3 = add(add(scale(RIGHT, hit.nx), scale(UP, hit.ny)), scale(TOWARD, hit.nz));
    if (lvl > 1 && shadowed(add(world, scale(nWorld, 0.5)), hit.prim)) lvl = 1;
    // A leg on the far side of the body (or a back leg seen from the front) is one tone darker, so the near legs read clearly against it.
    if (prim.kind === "ell" && prim.leg !== undefined && prim.c[2] < -1.5) lvl = Math.max(0, lvl - 1);

    let surface: SurfacePoint;
    if (prim.kind === "ell") {
      const local: V3 = [hit.ux * prim.r[0], hit.uy * prim.r[1], hit.uz * prim.r[2]];
      const rest = add(prim.restC, mulVec(prim.restR, local));
      surface = { part: prim.part, side: prim.side, u: prim.u, rx: rest[0], ry: rest[1], rz: rest[2], sx: hit.ux, sy: hit.uy, sz: hit.uz };
    } else {
      surface = { part: prim.part, side: prim.side, u: 0, rx: 0, ry: 0, rz: 0, sx: 0, sy: 1, sz: 0 };
    }
    const mat = materialAt(coat, surface);
    levelOf[idx] = lvl;
    const decal = faceDecal(prim, hit, surface, pose, palette, lvl, look);
    if (decal) return { hit, color: pack(decal.color), mat: MATERIALS.indexOf(mat), keep: decal.keep };
    return { hit, color: pack(palette.ramps[mat][lvl]), mat: MATERIALS.indexOf(mat), keep: false };
  }

  // ---- outlines and separation ----
  const rgba = new Uint8ClampedArray(W * H * 4);
  const normal = new Uint8ClampedArray(W * H * 4);
  const out = new Int32Array(W * H).fill(-1);
  const outMat = new Int8Array(W * H).fill(-1);
  const keep = new Uint8Array(W * H);
  const outNormal: (V3 | null)[] = new Array(W * H).fill(null);
  for (let idx = 0; idx < W * H; idx++) {
    const px = pixels[idx];
    if (!px.hit) continue;
    out[idx] = px.color;
    outMat[idx] = px.mat;
    keep[idx] = px.keep ? 1 : 0;
    outNormal[idx] = [px.hit.nx, px.hit.ny, px.hit.nz];
  }

  // Where one solid sits well in front of another, the farther one gets a dark seam, so legs read against the body.
  const seam: number[] = [];
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const idx = py * W + px;
      const here = pixels[idx];
      if (!here.hit || here.keep) continue;
      const group = groupOf(prims[here.hit.prim]);
      let gap = 0;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const other = pixels[ny * W + nx];
        if (!other.hit) continue;
        const otherGroup = groupOf(prims[other.hit.prim]);
        if (otherGroup === group || (group.startsWith("leg") && otherGroup.startsWith("leg"))) continue;
        gap = Math.max(gap, other.hit.depth - here.hit.depth);
      }
      const soft = group.startsWith("head") || group.startsWith("ear") || group === "tail";
      if (gap > 3.4) seam.push(idx, 0);
      else if (soft && gap > 1.3) seam.push(idx, 1);
    }
  }
  for (let i = 0; i < seam.length; i += 2) {
    const idx = seam[i];
    const mat = MATERIALS[outMat[idx]] ?? "base";
    const hit = pixels[idx].hit as Hit;
    const lvl = seam[i + 1] === 0 ? 0 : Math.max(0, levelOf[idx] - 1);
    out[idx] = pack(palette.ramps[mat][hit ? lvl : 0]);
  }

  // The outline: one pixel around the silhouette, darker than anything inside it.
  const outlineAt: number[] = [];
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const idx = py * W + px;
      if (out[idx] >= 0) continue;
      let best = -1;
      let nx = 0;
      let ny = 0;
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]] as const) {
        const x = px + dx;
        const y = py + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const n = y * W + x;
        if (out[n] < 0) continue;
        if (best < 0 || (outMat[n] === 0 && outMat[best] !== 0)) best = n;
        nx -= dx;
        ny -= dy;
      }
      if (best < 0) continue;
      outlineAt.push(idx, best, nx, ny);
    }
  }
  for (let i = 0; i < outlineAt.length; i += 4) {
    const idx = outlineAt[i];
    const mat = MATERIALS[outMat[outlineAt[i + 1]]] ?? "base";
    out[idx] = pack(palette.outline[mat]);
    outMat[idx] = -2;
    const m = Math.hypot(outlineAt[i + 2], -outlineAt[i + 3], 0.4);
    outNormal[idx] = [outlineAt[i + 2] / m, -outlineAt[i + 3] / m, 0.4 / m];
  }

  cleanOrphans(out, keep, W, H);

  // Whiskers (refined look): thin light lines from either side of the muzzle, drawn last so they stay one pixel wide.
  const whiskerPixels: { idx: number }[] = [];
  if (look === "refined") {
    const head = prims.find((p): p is EllipsoidPrim => p.kind === "ell" && p.part === "head");
    if (head) {
      const facing = dot(mulVec(head.R, [0, 0, 1]), TOWARD);
      if (facing > 0.12) {
        for (const side of [1, -1]) {
          for (const [dy, dz] of [[0.22, -0.12], [-0.3, -0.3]] as const) {
            const root: V3 = [side * 3.0, -2.3 + (dy > 0 ? 0.6 : -0.6), 7.4];
            const dir = normalize([side, dy, dz]);
            for (let t = 0; t <= 6.4; t += 0.4) {
              const q = add(head.c, mulVec(head.R, add(root, scale(dir, t))));
              const px = Math.floor(ox + dot(q, RIGHT));
              const py = Math.floor(oy - dot(q, UP));
              if (px < 0 || py < 0 || px >= W || py >= H) continue;
              const idx = py * W + px;
              const here = dot(q, TOWARD);
              // Hidden where something nearer than the whisker covers the pixel (the far side's whiskers in a profile).
              if (depth[idx] > here + 0.8) continue;
              // Only where the picture is empty, so the whiskers show as lines reaching out past the cheeks, not across the face.
              if (out[idx] >= 0) continue;
              whiskerPixels.push({ idx });
            }
          }
        }
      }
    }
  }
  for (const { idx } of whiskerPixels) {
    out[idx] = pack(palette.whisker);
    outNormal[idx] = [0, 0, 1];
  }

  for (let idx = 0; idx < W * H; idx++) {
    const o = idx * 4;
    const c = out[idx];
    const n = outNormal[idx];
    if (c < 0 || !n) {
      normal[o] = 128;
      normal[o + 1] = 128;
      normal[o + 2] = 255;
      continue;
    }
    rgba[o] = (c >> 16) & 255;
    rgba[o + 1] = (c >> 8) & 255;
    rgba[o + 2] = c & 255;
    rgba[o + 3] = 255;
    normal[o] = Math.round((n[0] * 0.5 + 0.5) * 255);
    normal[o + 1] = Math.round((n[1] * 0.5 + 0.5) * 255);
    normal[o + 2] = Math.round((clamp(n[2], -1, 1) * 0.5 + 0.5) * 255);
    normal[o + 3] = 255;
  }

  // Where the paws landed (screen pixels), for checking that planted feet do not slide.
  const paws = {} as Record<LegName, { x: number; y: number }>;
  for (const name of LEG_NAMES) {
    const prim = prims.find((p): p is EllipsoidPrim => p.kind === "ell" && p.part === "paw" && p.leg === name);
    paws[name] = prim ? { x: ox + dot(prim.c, RIGHT), y: oy - dot(prim.c, UP) } : { x: 0, y: 0 };
  }
  return { width: W, height: H, rgba, normal, paws };
}

/** The spheres of one leg, or of the tail, are one solid and must not shade each other. */
function sameChain(a: Prim, b: Prim): boolean {
  if (a.kind !== "ell" || b.kind !== "ell") return false;
  if (a.part === "tail" && b.part === "tail") return true;
  return a.leg !== undefined && a.leg === b.leg;
}

const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Parts that should get a dark seam where they overlap each other. */
function groupOf(prim: Prim): string {
  if (prim.kind === "tri") return "ear" + prim.side;
  if (prim.part === "leg" || prim.part === "paw") return "leg" + (prim.leg ?? "");
  if (prim.part === "tail") return "tail";
  if (prim.part === "head" || prim.part === "muzzle" || prim.part === "cheek") return "head";
  return "torso";
}

/** A single pixel with no same-coloured neighbour is a speck, not pixel art: it takes the commonest colour around it. */
export function cleanOrphans(colors: Int32Array, keep: Uint8Array, w: number, h: number): void {
  const snapshot = colors.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const c = snapshot[idx];
      if (c < 0 || keep[idx]) continue;
      let same = 0;
      const counts = new Map<number, number>();
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = snapshot[ny * w + nx];
          if (n < 0) continue;
          if (n === c) same++;
          else if (dx === 0 || dy === 0) counts.set(n, (counts.get(n) ?? 0) + 1);
        }
      }
      if (same > 0 || counts.size === 0) continue;
      let best = -1;
      let bestCount = 0;
      for (const [color, count] of counts) {
        if (count > bestCount) {
          best = color;
          bestCount = count;
        }
      }
      if (best >= 0) colors[idx] = best;
    }
  }
}

// ---- the face ----

/** Paints the eyes, nose, mouth and inner ears. Returns null where the plain fur colour should show. */
function faceDecal(prim: Prim, hit: Hit, s: SurfacePoint, pose: Pose, pal: CoatPalette, lvl: number, look: CatLook): { color: RGB; keep: boolean } | null {
  if (prim.kind === "tri") {
    if (!prim.inner) return null;
    const inside = Math.min(hit.b0, hit.b1, hit.b2) > (look === "refined" ? 0.1 : 0.2);
    return inside ? { color: lvl <= 1 ? pal.earInnerDark : pal.earInner, keep: false } : null;
  }
  if (look === "refined") {
    if (prim.part === "head" && s.sz > 0.3) {
      // Round eyes set a little lower and wider apart, measured in pixels so they stay round: a dark upper lid,
      // a bright iris, an upright pupil and a glint at the top left, which is what makes a cat look alive.
      for (const side of [1, -1]) {
        const ex = (s.sx - side * 0.5) * REFINED_HEAD[0];
        const ey = (s.sy + 0.02) * REFINED_HEAD[1];
        if ((ex / 1.0) ** 2 + (ey / 1.12) ** 2 > (pose.expression?.eyes === "wide" ? 10 : 8.2)) continue;
        const style = pose.expression?.eyes;
        // Smiling eyes are an arch (a happy, squeezed-shut look); closed eyes a soft downward curve, as a sleeper's look.
        if (style === "happy") return Math.abs(ey - (0.55 - 0.75 * (ex / 2.3) ** 2)) < 0.62 ? { color: pal.outline.base, keep: true } : null;
        if (pose.eyes < 0.5 && style !== "half" && style !== "wide") return Math.abs(ey - (-0.55 + 0.55 * (ex / 2.3) ** 2)) < 0.62 ? { color: pal.outline.base, keep: true } : null;
        // Half-closed: the upper half is lid.
        if (style === "half" && ey > -0.2) return Math.abs(ey - 0.1) < 0.6 ? { color: pal.outline.base, keep: true } : { color: pal.ramps.base[2], keep: false };
        if (ey > (style === "wide" ? 2.5 : 1.85)) return { color: pal.eye.dark, keep: false };
        if (ex * side < -0.15 && ex * side > -1.1 && ey > 0.35 && ey < 1.25) return { color: pal.eye.glint, keep: true };
        if ((ex / 0.85) ** 2 + (ey / 1.2) ** 2 <= 1) return { color: pal.eye.pupil, keep: false };
        return { color: pal.eye.light, keep: false };
      }
    }
    if (prim.part === "muzzle") {
      const open = pose.expression?.mouth ?? 0;
      if (open > 0.25 && s.sz > 0.35 && Math.abs(s.sx) < 0.18 + 0.3 * open && s.sy < 0.05 && s.sy > -0.2 - 0.5 * open) return { color: open > 0.6 && s.sy < -0.3 ? pal.earInner : pal.mouth, keep: true };
      if (s.sz > 0.5 && s.sy > 0.3 && Math.abs(s.sx) < 0.4) return { color: s.sy > 0.5 && s.sx < 0 ? pal.noseLight : pal.nose, keep: true };
      if (s.sz > 0.5 && ((Math.abs(s.sx) < 0.1 && s.sy < 0.3 && s.sy > -0.12) || (Math.abs(s.sx) > 0.16 && Math.abs(s.sx) < 0.62 && s.sy < -0.2 && s.sy > -0.46))) return { color: pal.mouth, keep: false };
    }
    return null;
  }
  if (prim.part === "head" && s.sz > 0.3) {
    for (const side of [1, -1]) {
      const dx = s.sx - side * 0.58;
      const dy = s.sy - 0.08;
      const e = (dx / 0.24) ** 2 + (dy / 0.3) ** 2;
      if (e > 1) continue;
      if (pose.eyes < 0.5) return Math.abs(dy) < 0.09 ? { color: pal.outline.base, keep: true } : null;
      if (dy > 0.14 && e > 0.45) return { color: pal.eye.dark, keep: false };
      if (Math.abs(dx) < 0.07 && Math.abs(dy) < 0.22) return { color: pal.eye.pupil, keep: false };
      if (dx < -0.04 * side && dy > 0.05 && dx * side < 0) return { color: pal.eye.glint, keep: true };
      return { color: pal.eye.light, keep: false };
    }
  }
  if (prim.part === "muzzle") {
    if (s.sz > 0.55 && s.sy > 0.2 && Math.abs(s.sx) < 0.5) return { color: s.sy > 0.45 && s.sx < 0 ? pal.noseLight : pal.nose, keep: true };
    if (s.sz > 0.7 && s.sy < -0.05 && s.sy > -0.5 && Math.abs(s.sx) < 0.14) return { color: pal.mouth, keep: false };
  }
  return null;
}
