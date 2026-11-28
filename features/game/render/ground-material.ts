// The ground, drawn from the map's terrain grid. One plane, one shader: for every pixel it looks up which surface
// the square under it is (cobbles, road, paving, grass, earth, flower bed or water), draws that surface's pixel
// tile, and then looks at the four neighbouring squares to draw the edges between surfaces by hand, in whole
// texels: a stone kerb where a built surface meets grass, earth or a flower bed, a wide kerb and a dark wet line
// where land meets water, ragged tufts where grass meets stone. Water is the same pixel water as the fountain's.
import { DataTexture, MeshStandardMaterial, NearestFilter, RedFormat, UnsignedByteType, type Texture } from "three";
import type { TerrainGrid } from "../world/map/terrain";
import { makeBedTexture, makeDirtTexture, makeGrassTexture, makePavingTexture, makeRoadTexture } from "./ground-textures";
import { TEXELS_PER_UNIT, makeCobblePixel } from "./pixel-textures";
import { WATER_PIXEL_GLSL, waterUniforms } from "./water-material";

export interface GroundTextures {
  cobbles: Texture;
  road: Texture;
  paving: Texture;
  grass: Texture;
  dirt: Texture;
  bed: Texture;
  dispose(): void;
}

export function createGroundTextures(): GroundTextures {
  const t = { cobbles: makeCobblePixel(), road: makeRoadTexture(), paving: makePavingTexture(), grass: makeGrassTexture(), dirt: makeDirtTexture(), bed: makeBedTexture() };
  return { ...t, dispose: () => Object.values(t).forEach((x) => x.dispose()) };
}

export function createTerrainTexture(grid: TerrainGrid): DataTexture {
  const texture = new DataTexture(grid.data, grid.cols, grid.rows, RedFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

const TEXELS = TEXELS_PER_UNIT.toFixed(1);

const FRAGMENT_COMMON = /* glsl */ `
varying vec3 vGroundWorld;
uniform sampler2D uCobbles;
uniform sampler2D uRoad;
uniform sampler2D uPaving;
uniform sampler2D uGrass;
uniform sampler2D uDirt;
uniform sampler2D uBed;
uniform sampler2D uTerrain;
uniform vec4 uTerrainInfo; // minX, minZ, columns, rows
uniform float uCell;
uniform float uTile;
uniform float uGroundTime;
${WATER_PIXEL_GLSL}

float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 gLin(vec3 c) { return pow(c, vec3(2.2)); }
int gCell(ivec2 c) {
  c = clamp(c, ivec2(0), ivec2(int(uTerrainInfo.z) - 1, int(uTerrainInfo.w) - 1));
  return int(texelFetch(uTerrain, c, 0).r * 255.0 + 0.5);
}
bool gSoft(int s) { return s == 3 || s == 4 || s == 5; }
int gRank(int s) { return s == 6 ? 0 : (gSoft(s) ? 1 : (s == 1 ? 5 : 4)); }

vec3 gSurface(int s, vec2 uv, vec2 xz) {
  if (s == 1) return textureLod(uRoad, uv, 0.0).rgb;
  if (s == 2) return textureLod(uPaving, uv, 0.0).rgb;
  if (s == 3) return textureLod(uGrass, uv, 0.0).rgb;
  if (s == 4) return textureLod(uDirt, uv, 0.0).rgb;
  if (s == 5) return textureLod(uBed, uv, 0.0).rgb;
  if (s == 6) return waterPixel(xz, uGroundTime);
  return textureLod(uCobbles, uv, 0.0).rgb;
}

// The edge between this square and a neighbour, dist world units from it, drawn in whole texels.
void gEdge(int self, int other, float dist, vec2 px, inout vec3 col) {
  if (self == other || dist > 0.1) return;
  float h = gHash(floor(px * ${TEXELS}));
  if (self == 6) {
    // Water: a dark line under the bank.
    if (dist < 0.03) col *= 0.6;
    return;
  }
  if (gSoft(self)) {
    if (other == 6) {
      // A muddy bank where grass or earth meets the water.
      if (dist < 0.05) col = mix(col, gLin(vec3(0.36, 0.28, 0.2)), 0.75);
    } else if (!gSoft(other) && dist < 0.045 && h > 0.5) {
      // Tufts of darker grass crowd the stone.
      col = gLin(vec3(0.2, 0.4, 0.18));
    }
    return;
  }
  float wide = other == 6 ? 0.09 : (gSoft(other) ? 0.05 : (gRank(self) > gRank(other) ? 0.045 : 0.0));
  if (wide > 0.0 && dist < wide) {
    // A stone kerb: a bright top edge, then a mid stone with a little grain.
    vec3 stone = dist < 0.026 ? vec3(0.8, 0.75, 0.66) : vec3(0.62, 0.58, 0.52);
    if (other == 6 && dist > wide - 0.02) stone = vec3(0.42, 0.4, 0.38);
    col = gLin(stone * (0.94 + 0.12 * h));
  }
}
`;

const FRAGMENT_COLOR = /* glsl */ `
  vec2 gq = (floor(vGroundWorld.xz * ${TEXELS}) + 0.5) / ${TEXELS};
  vec2 gcp = (gq - uTerrainInfo.xy) / uCell;
  ivec2 gc = ivec2(floor(gcp));
  vec2 gf = fract(gcp);
  int gs = gCell(gc);
  vec3 gcol = gSurface(gs, vGroundWorld.xz * uTile, gq);
  vec2 gd0 = gf * uCell;
  vec2 gd1 = (1.0 - gf) * uCell;
  gEdge(gs, gCell(gc + ivec2(-1, 0)), gd0.x, gq, gcol);
  gEdge(gs, gCell(gc + ivec2(1, 0)), gd1.x, gq, gcol);
  gEdge(gs, gCell(gc + ivec2(0, -1)), gd0.y, gq, gcol);
  gEdge(gs, gCell(gc + ivec2(0, 1)), gd1.y, gq, gcol);
  diffuseColor.rgb = gcol;
`;

export interface GroundMaterialOptions {
  textures: GroundTextures;
  terrain: DataTexture;
  grid: TerrainGrid;
  /** Repeats of the 128-texel tile per world unit. */
  tile: number;
}

export function createGroundMaterial({ textures, terrain, grid, tile }: GroundMaterialOptions): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.85, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uCobbles: { value: textures.cobbles },
      uRoad: { value: textures.road },
      uPaving: { value: textures.paving },
      uGrass: { value: textures.grass },
      uDirt: { value: textures.dirt },
      uBed: { value: textures.bed },
      uTerrain: { value: terrain },
      uTerrainInfo: { value: [grid.minX, grid.minZ, grid.cols, grid.rows] },
      uCell: { value: grid.cell },
      uTile: { value: tile },
      uGroundTime: waterUniforms.uWaterTime,
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGroundWorld;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${FRAGMENT_COMMON}`).replace("#include <color_fragment>", `#include <color_fragment>\n${FRAGMENT_COLOR}`);
  };
  material.customProgramCacheKey = () => "ground-1";
  return material;
}
