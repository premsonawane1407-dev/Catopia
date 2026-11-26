// PHASE 0 LOOK TEST - throwaway. A screen-space "miniature" blur that follows the cat: a sharp
// horizontal band around the cat, a smooth ramp, then a strong disc blur toward the top and
// bottom of the screen. Bright lights are weighted up so they melt into round bokeh orbs, like
// the blurred lanterns in the reference stills. The radius is resolution-independent.
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /* glsl */ `
uniform float focusY;
uniform float focusUp;
uniform float focusDown;
uniform float feather;
uniform float maxRadius;
uniform float boost;
uniform int samples;

float labHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Asymmetric band: more of the scene above the cat stays sharp than below it.
  float d = uv.y > focusY ? (uv.y - focusY) - focusUp : (focusY - uv.y) - focusDown;
  float ramp = uv.y > focusY ? feather : feather * 0.6;
  float amount = smoothstep(0.0, max(ramp, 0.0001), d);
  float radius = amount * maxRadius * (resolution.y / 1080.0);
  if (radius < 0.6) {
    outputColor = inputColor;
    return;
  }
  vec2 texel = 1.0 / resolution;
  float rot = labHash(gl_FragCoord.xy) * 6.2831853;
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  // Small blur radii need far fewer taps than the strongest blur, which saves a lot of GPU time.
  int n = int(clamp(6.0 + radius * 0.85, 8.0, float(samples)));
  for (int i = 0; i < 64; i++) {
    if (i >= n) break;
    float r = sqrt((float(i) + 0.5) / float(n)) * radius;
    float a = float(i) * 2.39996323 + rot;
    vec3 c = texture2D(inputBuffer, uv + vec2(cos(a), sin(a)) * r * texel).rgb;
    float lum = min(dot(c, vec3(0.299, 0.587, 0.114)), 4.0);
    float w = 1.0 + boost * lum * lum;
    acc += c * w;
    wsum += w;
  }
  vec3 blurred = acc / wsum;
  outputColor = vec4(mix(inputColor.rgb, blurred, smoothstep(0.0, 0.3, amount)), inputColor.a);
}
`;

export interface TiltBokehOptions {
  focusUp?: number;
  focusDown?: number;
  feather?: number;
  maxRadius?: number;
  boost?: number;
  samples?: number;
}

export class TiltBokehEffect extends Effect {
  constructor({ focusUp = 0.26, focusDown = 0.14, feather = 0.3, maxRadius = 30, boost = 1.6, samples = 56 }: TiltBokehOptions = {}) {
    super("LabTiltBokehEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["focusY", new Uniform(0.35)],
        ["focusUp", new Uniform(focusUp)],
        ["focusDown", new Uniform(focusDown)],
        ["feather", new Uniform(feather)],
        ["maxRadius", new Uniform(maxRadius)],
        ["boost", new Uniform(boost)],
        ["samples", new Uniform(samples)],
      ]),
    });
  }

  /** Screen height (0 = bottom, 1 = top) of the middle of the sharp band. */
  setFocusY(y: number) {
    this.uniforms.get("focusY")!.value = y;
  }

  setOptions({ focusUp, focusDown, feather, maxRadius, boost, samples }: TiltBokehOptions) {
    if (focusUp !== undefined) this.uniforms.get("focusUp")!.value = focusUp;
    if (focusDown !== undefined) this.uniforms.get("focusDown")!.value = focusDown;
    if (feather !== undefined) this.uniforms.get("feather")!.value = feather;
    if (maxRadius !== undefined) this.uniforms.get("maxRadius")!.value = maxRadius;
    if (boost !== undefined) this.uniforms.get("boost")!.value = boost;
    if (samples !== undefined) this.uniforms.get("samples")!.value = samples;
  }
}
