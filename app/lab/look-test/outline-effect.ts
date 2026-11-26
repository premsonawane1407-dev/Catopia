// PHASE 0 LOOK TEST - throwaway. Screen-space outlines from depth and normal differences.
// The outline colour is a darkened copy of the colour underneath, which reads as painted
// line-work rather than a hard black stroke.
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { Uniform, type Texture } from "three";

const fragmentShader = /* glsl */ `
uniform sampler2D normalBuffer;
uniform float depthThreshold;
uniform float normalThreshold;
uniform float darken;
uniform float strength;

float labViewDepth(const in vec2 uv) {
  return -getViewZ(readDepth(uv));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 t = 1.0 / resolution;
  float d0 = labViewDepth(uv);
  vec3 n0 = texture2D(normalBuffer, uv).rgb * 2.0 - 1.0;
  float dd = 0.0;
  float nd = 0.0;
  vec2 offs[4] = vec2[4](vec2(t.x, 0.0), vec2(-t.x, 0.0), vec2(0.0, t.y), vec2(0.0, -t.y));
  for (int i = 0; i < 4; i++) {
    vec2 u = uv + offs[i];
    float di = labViewDepth(u);
    vec3 ni = texture2D(normalBuffer, u).rgb * 2.0 - 1.0;
    dd = max(dd, abs(di - d0) / max(d0, 0.0001));
    nd = max(nd, 1.0 - dot(n0, ni));
  }
  float edgeD = smoothstep(depthThreshold, depthThreshold * 2.0, dd);
  float edgeN = smoothstep(normalThreshold, normalThreshold * 2.0, nd);
  float edge = clamp(max(edgeD, edgeN * 0.85), 0.0, 1.0) * strength;
  vec3 line = inputColor.rgb * darken;
  outputColor = vec4(mix(inputColor.rgb, line, edge), inputColor.a);
}
`;

export interface OutlineOptions {
  depthThreshold?: number;
  normalThreshold?: number;
  darken?: number;
  strength?: number;
}

export class OutlineEffect extends Effect {
  constructor({ depthThreshold = 0.02, normalThreshold = 0.95, darken = 0.3, strength = 1 }: OutlineOptions = {}) {
    super("LabOutlineEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      // CONVOLUTION: samples neighbouring pixels. DEPTH: needs the camera near/far helpers (getViewZ).
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["normalBuffer", new Uniform<Texture | null>(null)],
        ["depthThreshold", new Uniform(depthThreshold)],
        ["normalThreshold", new Uniform(normalThreshold)],
        ["darken", new Uniform(darken)],
        ["strength", new Uniform(strength)],
      ]),
    });
  }

  setNormalBuffer(normal: Texture | null) {
    this.uniforms.get("normalBuffer")!.value = normal;
  }

  setOptions({ depthThreshold, normalThreshold, darken, strength }: OutlineOptions) {
    if (depthThreshold !== undefined) this.uniforms.get("depthThreshold")!.value = depthThreshold;
    if (normalThreshold !== undefined) this.uniforms.get("normalThreshold")!.value = normalThreshold;
    if (darken !== undefined) this.uniforms.get("darken")!.value = darken;
    if (strength !== undefined) this.uniforms.get("strength")!.value = strength;
  }
}
