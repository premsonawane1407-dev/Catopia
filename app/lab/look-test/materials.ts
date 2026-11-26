// PHASE 0 LOOK TEST - throwaway. Gives the flat-coloured Kenney materials surface detail:
// pixel-art brick, plaster, timber and roof-tile patterns projected in world space (triplanar),
// multiplied over the original colours, plus a little colour variation and a darker base.
import { Material, MeshStandardMaterial, NearestFilter, type Texture } from "three";
import { TEXELS_PER_UNIT, TILE_PX, makeBrickDetail, makePlasterDetail, makeRoofDetail, makeStoneDetail, makeWoodDetail } from "./pixel-textures";

export type DetailProfile = "plaster" | "woodwall" | "roof" | "wood" | "stone" | "brick" | "none";

/** Shared uniforms: change `.value` to switch the surface detail on or off live. */
export const labUniforms = {
  strength: { value: 1 },
  texelScale: { value: TEXELS_PER_UNIT / TILE_PX },
  plinth: { value: 0.3 },
};

interface DetailSet {
  brick: Texture;
  stone: Texture;
  plaster: Texture;
  wood: Texture;
  roof: Texture;
}
let detailSet: DetailSet | null = null;
function details(): DetailSet {
  detailSet ??= { brick: makeBrickDetail(), stone: makeStoneDetail(), plaster: makePlasterDetail(), wood: makeWoodDetail(), roof: makeRoofDetail() };
  return detailSet;
}

function profileTextures(profile: DetailProfile): { a?: Texture; b?: Texture; c?: Texture } {
  const d = details();
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

const NOISE_GLSL = /* glsl */ `
varying vec3 vLabWorld;
varying vec3 vLabNormal;
float labHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float labNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(labHash(i + vec3(0, 0, 0)), labHash(i + vec3(1, 0, 0)), f.x),
        mix(labHash(i + vec3(0, 1, 0)), labHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(labHash(i + vec3(0, 0, 1)), labHash(i + vec3(1, 0, 1)), f.x),
        mix(labHash(i + vec3(0, 1, 1)), labHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
#ifdef LAB_HAS_A
uniform sampler2D uDetailA;
uniform float uDetailStrength;
uniform float uTexelScale;
#ifdef LAB_HAS_B
uniform sampler2D uDetailB;
uniform float uPlinth;
#endif
#ifdef LAB_HAS_C
uniform sampler2D uDetailC;
#endif
// One sample per texture: project along the dominant axis of the surface normal. Architecture is
// axis-aligned, so this looks the same as triplanar blending at a third of the texture fetches.
vec3 labProj(sampler2D t, vec3 p, vec3 a) {
  vec2 uv = (a.x > a.y && a.x > a.z) ? p.zy : (a.y > a.z ? p.xz : p.xy);
  return texture2D(t, uv * uTexelScale).rgb;
}
#endif
`;

const DETAIL_FRAGMENT = /* glsl */ `
#ifdef LAB_HAS_A
  if (uDetailStrength > 0.0) {
    vec3 labAxis = abs(normalize(vLabNormal));
    vec3 labDetail = labProj(uDetailA, vLabWorld, labAxis) * 2.0;
    #ifdef LAB_HAS_C
      // Timber frame: orange-ish albedo gets the wood pattern instead of plaster.
      float labTimber = smoothstep(0.2, 0.45, diffuseColor.r - diffuseColor.b);
      if (labTimber > 0.01) labDetail = mix(labDetail, labProj(uDetailC, vLabWorld, labAxis) * 2.0, labTimber);
    #endif
    #ifdef LAB_HAS_B
      // Stone plinth along the base of the walls.
      float labPlinth = 1.0 - smoothstep(uPlinth - 0.02, uPlinth + 0.02, vLabWorld.y);
      if (labPlinth > 0.01) labDetail = mix(labDetail, labProj(uDetailB, vLabWorld, labAxis) * 2.0, labPlinth);
    #endif
    diffuseColor.rgb *= mix(vec3(1.0), labDetail, uDetailStrength);
  }
#endif
`;

export function stylizeMaterial(material: Material, profile: DetailProfile = "none", tint?: [number, number, number]): void {
  if (!(material instanceof MeshStandardMaterial) || material.userData.labStyled) return;
  material.userData.labStyled = true;
  material.roughness = profile === "roof" ? 0.82 : 0.92;
  material.metalness = 0;
  if (tint) material.color.setRGB(tint[0], tint[1], tint[2]);
  if (material.map) {
    // Kenney colour maps are tiny palettes: nearest filtering stops colours bleeding into each other.
    material.map.magFilter = NearestFilter;
    material.map.minFilter = NearestFilter;
    material.map.generateMipmaps = false;
    material.map.needsUpdate = true;
  }
  const tex = profileTextures(profile);
  const defines = [tex.a ? "#define LAB_HAS_A" : "", tex.b ? "#define LAB_HAS_B" : "", tex.c ? "#define LAB_HAS_C" : ""].join("\n");

  material.onBeforeCompile = (shader) => {
    if (tex.a) {
      shader.uniforms.uDetailA = { value: tex.a };
      shader.uniforms.uDetailStrength = labUniforms.strength;
      shader.uniforms.uTexelScale = labUniforms.texelScale;
    }
    if (tex.b) {
      shader.uniforms.uDetailB = { value: tex.b };
      shader.uniforms.uPlinth = labUniforms.plinth;
    }
    if (tex.c) shader.uniforms.uDetailC = { value: tex.c };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLabWorld;\nvarying vec3 vLabNormal;")
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvLabNormal = normalize(mat3(modelMatrix) * objectNormal);")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLabWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader =
      defines +
      "\n" +
      shader.fragmentShader
        .replace("#include <common>", "#include <common>\n" + NOISE_GLSL)
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
        float labN = labNoise(vLabWorld * 3.0);
        diffuseColor.rgb *= 0.92 + 0.16 * labN;
        ${DETAIL_FRAGMENT}
        diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 0.5, vLabWorld.y));`,
        );
  };
  material.customProgramCacheKey = () => `lab-stylize-2-${tex.a ? "a" : ""}${tex.b ? "b" : ""}${tex.c ? "c" : ""}`;
  material.needsUpdate = true;
}
