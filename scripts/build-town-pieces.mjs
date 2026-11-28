// Packs the staged Kenney Fantasy Town Kit pieces into one binary file plus a manifest, and copies
// the shared colour map once. The game then makes 3 requests instead of ~145 (72 model files, each of
// which carried its own copy of the same texture), and never needs a glTF loader at run time.
//
// Source:  assets/3d/town/*.glb and assets/3d/town/Textures/colormap.png  (CC0, see ASSET_LICENSES.md)
// Output:  public/models/town/pieces.json, pieces.bin, colormap.png
// Usage:   node scripts/build-town-pieces.mjs
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = "assets/3d/town";
const OUT = "public/models/town";

const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readGlb(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const binHeader = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binHeader);
  const bin = buf.subarray(binHeader + 8, binHeader + 8 + binLen);
  return { json, bin };
}

/** Reads an accessor into a fresh, tightly packed typed array (handles interleaved buffers). */
function readAccessor({ json, bin }, index) {
  const acc = json.accessors[index];
  const view = json.bufferViews[acc.bufferView];
  const Type = COMPONENT[acc.componentType];
  const itemSize = SIZE[acc.type];
  const out = new Type(acc.count * itemSize);
  const stride = view.byteStride ?? Type.BYTES_PER_ELEMENT * itemSize;
  const base = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const read = { Float32Array: "getFloat32", Uint16Array: "getUint16", Uint32Array: "getUint32", Int8Array: "getInt8", Uint8Array: "getUint8", Int16Array: "getInt16" }[Type.name];
  for (let i = 0; i < acc.count; i++) {
    for (let k = 0; k < itemSize; k++) out[i * itemSize + k] = dv[read](base + i * stride + k * Type.BYTES_PER_ELEMENT, true);
  }
  return out;
}

/** Node transform as a 4x4 column-major matrix. The Kenney pieces use identity, but bake it in if not. */
function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const isIdentity = (m) => m.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-6);

/** Which primitives to take: the stock pieces carry one set of colour-map faces, and a few (the fountain) a second mesh with its own "Water" material, which must not be read through the colour map. */
const isWater = (json, prim) => json.materials?.[prim.material]?.name === "Water";

function extractPiece(file, water = false) {
  const glb = readGlb(file);
  const { json } = glb;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let vertexBase = 0;
  const visit = (nodeIndex, parent) => {
    const node = json.nodes[nodeIndex];
    const m = nodeMatrix(node);
    if (node.mesh !== undefined) {
      for (const prim of json.meshes[node.mesh].primitives) {
        if (isWater(json, prim) !== water) continue;
        const p = readAccessor(glb, prim.attributes.POSITION);
        const n = readAccessor(glb, prim.attributes.NORMAL);
        const t = readAccessor(glb, prim.attributes.TEXCOORD_0);
        const idx = readAccessor(glb, prim.indices);
        if (!isIdentity(m) || parent) {
          const world = parent ? mul(parent, m) : m;
          for (let i = 0; i < p.length; i += 3) {
            const x = p[i], y = p[i + 1], z = p[i + 2];
            p[i] = world[0] * x + world[4] * y + world[8] * z + world[12];
            p[i + 1] = world[1] * x + world[5] * y + world[9] * z + world[13];
            p[i + 2] = world[2] * x + world[6] * y + world[10] * z + world[14];
          }
        }
        positions.push(...p);
        normals.push(...n);
        uvs.push(...t);
        for (const i of idx) indices.push(i + vertexBase);
        vertexBase += p.length / 3;
      }
    }
    for (const child of node.children ?? []) visit(child, parent ? mul(parent, m) : m);
  };
  for (const root of json.scenes[json.scene ?? 0].nodes) visit(root, null);
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: Uint32Array.from(indices) };
}

function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".glb")).sort();
const chunks = [];
const manifest = { version: 1, generatedBy: "scripts/build-town-pieces.mjs", source: "Kenney Fantasy Town Kit 2.0 (CC0)", pieces: {} };
let offset = 0;
const push = (typed) => {
  const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const start = offset;
  chunks.push(bytes);
  offset += bytes.length;
  const pad = (4 - (offset % 4)) % 4; // keep every section 4-byte aligned
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    offset += pad;
  }
  return start;
};

let totalVertices = 0;
let totalTriangles = 0;
for (const file of files) {
  const name = file.replace(/\.glb$/, "");
  for (const water of [false, true]) {
  const { positions, normals, uvs, indices } = extractPiece(path.join(SRC, file), water);
  if (water && positions.length === 0) continue;
  const vertexCount = positions.length / 3;
  if (vertexCount > 65535) throw new Error(`${name}: too many vertices for 16-bit indices`);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], positions[i + k]);
    max[k] = Math.max(max[k], positions[i + k]);
  }
  const r = (v) => Math.round(v * 1000) / 1000;
  manifest.pieces[water ? `${name}-water` : name] = {
    vertexCount,
    indexCount: indices.length,
    positionOffset: push(positions),
    normalOffset: push(normals),
    uvOffset: push(uvs),
    indexOffset: push(Uint16Array.from(indices)),
    min: min.map(r),
    max: max.map(r),
  };
  totalVertices += vertexCount;
  totalTriangles += indices.length / 3;
  }
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "pieces.bin"), Buffer.concat(chunks));
writeFileSync(path.join(OUT, "pieces.json"), JSON.stringify(manifest));
copyFileSync(path.join(SRC, "Textures", "colormap.png"), path.join(OUT, "colormap.png"));
console.log(`packed ${files.length} pieces: ${totalVertices} vertices, ${totalTriangles} triangles, ${offset} bytes of geometry`);
