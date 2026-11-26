// Surface materials for the street: the flat Kenney colours get pixel-art brick, plaster, timber and
// roof-tile patterns, projected in world space, plus a little colour variation and a darker base so
// pieces feel grounded. One material is shared by every piece with the same surface, which is what
// lets the pieces be merged into a handful of meshes.
import { MeshStandardMaterial, NearestFilter, type Texture } from "three";
import type { SurfaceProfile } from "../world/pieces";
import { TEXELS_PER_UNIT, TILE_PX, makeBrickDetail, makePlasterDetail, makeRoofDetail, makeStoneDetail, makeWoodDetail } from "./pixel-textures";

/** Shared uniforms: set `.strength.value` to 0 to switch the surface detail off. */
export const surfaceUniforms = {
  strength: { value: 1 },
  texelScale: { value: TEXELS_PER_UNIT / TILE_PX },
  /** Height of the stone plinth along the foot of the walls. */
  plinth: { value: 0.3 },
};

export interface SurfaceTextures {
  brick: Texture;
  stone: Texture;
  plaster: Texture;
  wood: Texture;
  roof: Texture;
  dispose(): void;
}

export function createSurfaceTextures(): SurfaceTextures {
  const brick = makeBrickDetail();
  const stone = makeStoneDetail();
  const plaster = makePlasterDetail();
  const wood = makeWoodDetail();
  const roof = makeRoofDetail();
  return {
    brick,
    stone,
    plaster,
    wood,
    roof,
    dispose() {
      for (const t of [brick, stone, plaster, wood, roof]) t.dispose();
    },
  };
}

function profileTextures(profile: SurfaceProfile, d: SurfaceTextures): { a?: Texture; b?: Texture; c?: Texture } {
  switch (profile) {
    case "plaster": return { a: d.plaster, b: d.stone, c: d.wood };
    case "woodwall": return { a: d.wood, b: d.stone };
    case "roof": return { a: d.roof };
    case "wood": return { a: d.wood };
    case "stone": return { a: d.stone };
    case "brick": return { a: d.brick };
    default: return {};
  }
}

const COMMON_GLSL = /* glsl */ `
varying vec3 vSurfWorld;
varying vec3 vSurfNormal;
float surfHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float surfNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(surfHash(i + vec3(0, 0, 0)), surfHash(i + vec3(1, 0, 0)), f.x),
        mix(surfHash(i + vec3(0, 1, 0)), surfHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(surfHash(i + vec3(0, 0, 1)), surfHash(i + vec3(1, 0, 1)), f.x),
        mix(surfHash(i + vec3(0, 1, 1)), surfHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
#ifdef SURF_HAS_A
uniform sampler2D uSurfA;
uniform float uSurfStrength;
uniform float uSurfTexel;
#ifdef SURF_HAS_B
uniform sampler2D uSurfB;
uniform float uSurfPlinth;
#endif
#ifdef SURF_HAS_C
uniform sampler2D uSurfC;
#endif
// One sample per texture: project along the dominant axis of the surface normal. Architecture is
// axis-aligned, so this looks the same as triplanar blending at a third of the texture fetches.
vec3 surfProj(sampler2D t, vec3 p, vec3 a) {
  vec2 uv = (a.x > a.y && a.x > a.z) ? p.zy : (a.y > a.z ? p.xz : p.xy);
  return texture2D(t, uv * uSurfTexel).rgb;
}
#endif
`;

const DETAIL_GLSL = /* glsl */ `
#ifdef SURF_HAS_A
  if (uSurfStrength > 0.0) {
    vec3 surfAxis = abs(normalize(vSurfNormal));
    vec3 surfDetail = surfProj(uSurfA, vSurfWorld, surfAxis) * 2.0;
    #ifdef SURF_HAS_C
      // Timber frame: orange-ish albedo gets the wood pattern instead of plaster.
      float surfTimber = smoothstep(0.2, 0.45, diffuseColor.r - diffuseColor.b);
      if (surfTimber > 0.01) surfDetail = mix(surfDetail, surfProj(uSurfC, vSurfWorld, surfAxis) * 2.0, surfTimber);
    #endif
    #ifdef SURF_HAS_B
      // Stone plinth along the base of the walls.
      float surfPlinth = 1.0 - smoothstep(uSurfPlinth - 0.02, uSurfPlinth + 0.02, vSurfWorld.y);
      if (surfPlinth > 0.01) surfDetail = mix(surfDetail, surfProj(uSurfB, vSurfWorld, surfAxis) * 2.0, surfPlinth);
    #endif
    diffuseColor.rgb *= mix(vec3(1.0), surfDetail, uSurfStrength);
  }
#endif
`;

export interface SurfaceMaterialOptions {
  profile: SurfaceProfile;
  textures: SurfaceTextures;
  tint?: [number, number, number];
  /** The shared Kenney colour map. Leave out for geometry that carries vertex colours instead. */
  colormap?: Texture | null;
  vertexColors?: boolean;
}

export function createSurfaceMaterial({ profile, textures, tint, colormap = null, vertexColors = false }: SurfaceMaterialOptions): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ map: colormap, vertexColors, roughness: profile === "roof" ? 0.82 : 0.92, metalness: 0 });
  if (tint) material.color.setRGB(tint[0], tint[1], tint[2]);
  if (colormap) {
    // Kenney colour maps are tiny palettes: nearest filtering stops colours bleeding into each other.
    colormap.magFilter = NearestFilter;
    colormap.minFilter = NearestFilter;
    colormap.generateMipmaps = false;
    colormap.needsUpdate = true;
  }
  const tex = profileTextures(profile, textures);
  const defines = [tex.a ? "#define SURF_HAS_A" : "", tex.b ? "#define SURF_HAS_B" : "", tex.c ? "#define SURF_HAS_C" : ""].join("\n");

  material.onBeforeCompile = (shader) => {
    if (tex.a) {
      shader.uniforms.uSurfA = { value: tex.a };
      shader.uniforms.uSurfStrength = surfaceUniforms.strength;
      shader.uniforms.uSurfTexel = surfaceUniforms.texelScale;
    }
    if (tex.b) {
      shader.uniforms.uSurfB = { value: tex.b };
      shader.uniforms.uSurfPlinth = surfaceUniforms.plinth;
    }
    if (tex.c) shader.uniforms.uSurfC = { value: tex.c };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSurfWorld;\nvarying vec3 vSurfNormal;")
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvSurfNormal = normalize(mat3(modelMatrix) * objectNormal);")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSurfWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader =
      defines +
      "\n" +
      shader.fragmentShader
        .replace("#include <common>", "#include <common>\n" + COMMON_GLSL)
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
        float surfN = surfNoise(vSurfWorld * 3.0);
        diffuseColor.rgb *= 0.92 + 0.16 * surfN;
        ${DETAIL_GLSL}
        diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 0.5, vSurfWorld.y));`,
        );
  };
  material.customProgramCacheKey = () => `surface-1-${tex.a ? "a" : ""}${tex.b ? "b" : ""}${tex.c ? "c" : ""}${vertexColors ? "v" : ""}`;
  return material;
}
