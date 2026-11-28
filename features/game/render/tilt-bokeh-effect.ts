// The miniature blur, now driven by depth. Every pixel is blurred according to how far it is from the plane the cat
// stands on (measured along the view direction from the depth buffer), not by where it is on the screen: a sharp zone
// around the cat's distance, a ramp, then a strong disc blur for what is much farther away (the far houses and sky)
// or much nearer (the tops of roofs, the lamp heads). Bright lights are weighted up so they melt into round bokeh orbs.
// Each tap is weighted by its own blur size, so a sharp object (the cat) does not smear its colour into the blurred
// background behind it. The sampling pattern is rotated only a little per pixel, which keeps the result smooth instead of
// grainy. The radius is resolution-independent.
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /* glsl */ `
uniform float focusDistance;
uniform float sharpFar;
uniform float sharpNear;
uniform float featherFar;
uniform float featherNear;
uniform float maxRadius;
uniform float boost;
uniform int samples;

float labHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// How blurred a point is, 0 (sharp) to 1 (fully blurred), from its distance along the view direction.
float blurAmount(vec2 uv) {
  float dist = -getViewZ(readDepth(uv));
  float d = dist - focusDistance;
  float over = d > 0.0 ? d - sharpFar : -d - sharpNear;
  float ramp = d > 0.0 ? featherFar : featherNear;
  return smoothstep(0.0, max(ramp, 0.0001), over);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float amount = blurAmount(uv);
  float scale = resolution.y / 1080.0;
  float radius = amount * maxRadius * scale;
  if (radius < 0.6) {
    outputColor = inputColor;
    return;
  }
  vec2 texel = 1.0 / resolution;
  // A small turn per pixel, not a full one: enough to hide the pattern, too little to make grain.
  float rot = labHash(gl_FragCoord.xy) * 0.7;
  vec3 acc = inputColor.rgb;
  float wsum = 1.0;
  int n = int(clamp(10.0 + radius * 1.1, 12.0, float(samples)));
  for (int i = 0; i < 96; i++) {
    if (i >= n) break;
    float rr = sqrt((float(i) + 0.5) / float(n));
    float a = float(i) * 2.39996323 + rot;
    vec2 tuv = uv + vec2(cos(a), sin(a)) * rr * radius * texel;
    vec3 c = texture2D(inputBuffer, tuv).rgb;
    // A tap only counts if its own blur would reach this far: sharp things stay inside their own outline.
    float tapRadius = blurAmount(tuv) * maxRadius * scale;
    float reach = smoothstep(rr * radius * 0.5, rr * radius, tapRadius + 0.5);
    float lum = min(dot(c, vec3(0.299, 0.587, 0.114)), 4.0);
    float w = (1.0 + boost * lum * lum) * reach;
    acc += c * w;
    wsum += w;
  }
  vec3 blurred = acc / wsum;
  outputColor = vec4(mix(inputColor.rgb, blurred, smoothstep(0.0, 0.25, amount)), inputColor.a);
}
`;

export interface TiltBokehOptions {
  /** How far behind the cat's distance things stay sharp, in world units, and how long the ramp to full blur is. */
  sharpFar?: number;
  featherFar?: number;
  /** The same for things nearer than the cat. */
  sharpNear?: number;
  featherNear?: number;
  maxRadius?: number;
  boost?: number;
  samples?: number;
}

export class TiltBokehEffect extends Effect {
  constructor({ sharpFar = 2.6, featherFar = 4.5, sharpNear = 1.6, featherNear = 3.0, maxRadius = 24, boost = 1.3, samples = 72 }: TiltBokehOptions = {}) {
    super("LabDepthBokehEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["focusDistance", new Uniform(14)],
        ["sharpFar", new Uniform(sharpFar)],
        ["featherFar", new Uniform(featherFar)],
        ["sharpNear", new Uniform(sharpNear)],
        ["featherNear", new Uniform(featherNear)],
        ["maxRadius", new Uniform(maxRadius)],
        ["boost", new Uniform(boost)],
        ["samples", new Uniform(samples)],
      ]),
    });
  }

  /** The distance from the camera, along the view direction, of what is in focus: the cat. */
  setFocusDistance(distance: number) {
    this.uniforms.get("focusDistance")!.value = distance;
  }

  setOptions({ sharpFar, featherFar, sharpNear, featherNear, maxRadius, boost, samples }: TiltBokehOptions) {
    const set = (name: string, v: number | undefined) => {
      if (v !== undefined) this.uniforms.get(name)!.value = v;
    };
    set("sharpFar", sharpFar);
    set("featherFar", featherFar);
    set("sharpNear", sharpNear);
    set("featherNear", featherNear);
    set("maxRadius", maxRadius);
    set("boost", boost);
    set("samples", samples);
  }
}
