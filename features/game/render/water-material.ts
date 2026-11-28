// Water for fountains, streams and the harbour edge: a pixel-art surface drawn in the shader. The pattern is laid
// on a world-space grid of about 40 texels a unit (the same density as the cobbles), so its pixels are as big as the
// street's, and three bands (deep, middle, light) plus the odd bright glint move slowly like ripples. It also
// glows a little by itself, so water still reads at night when the sky gives it nothing to reflect.
import { MeshStandardMaterial } from "three";

/** Shared by every water surface: the scene writes the clock here once a frame. */
export const waterUniforms = { uWaterTime: { value: 0 } };

/** Texels per world unit of the water's pixel grid. */
export const WATER_TEXELS = 40;

/** The pixel-water colour at a point of the ground plane, as a GLSL function (shared with the ground shader). */
export const WATER_PIXEL_GLSL = /* glsl */ `
vec3 waterPixel(vec2 xz, float time) {
  vec2 wcell = floor(xz * ${WATER_TEXELS.toFixed(1)}) / ${WATER_TEXELS.toFixed(1)};
  float ripple = sin(wcell.x * 13.0 + time * 1.3) + sin(wcell.y * 16.0 - time * 1.0) + sin((wcell.x + wcell.y) * 8.0 + time * 0.7);
  vec3 deepBlue = vec3(0.13, 0.42, 0.66);
  vec3 midBlue = vec3(0.24, 0.62, 0.84);
  vec3 lightBlue = vec3(0.52, 0.82, 0.94);
  vec3 water = ripple < -0.6 ? deepBlue : (ripple < 1.1 ? midBlue : lightBlue);
  // A rare bright glint, on its own cell for a moment.
  float glint = fract(sin(dot(floor(wcell * ${WATER_TEXELS.toFixed(1)}) + floor(time * 0.8), vec2(12.9898, 78.233))) * 43758.5453);
  if (glint > 0.992) water = vec3(0.95, 0.99, 1.0);
  return water;
}
`;

const COMMON = /* glsl */ `
varying vec3 vWaterWorld;
uniform float uWaterTime;
${WATER_PIXEL_GLSL}`;

const COLOR = /* glsl */ `
  diffuseColor.rgb = waterPixel(vWaterWorld.xz, uWaterTime);
`;

export function createWaterMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.35, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterTime = waterUniforms.uWaterTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWaterWorld;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${COMMON}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${COLOR}`)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.3;");
  };
  material.customProgramCacheKey = () => "water-1";
  return material;
}
