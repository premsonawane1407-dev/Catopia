import { describe, expect, it } from "vitest";
import { CAT_FRAME_H, CAT_FRAME_W, CLIPS, CLIP_NAMES, DIRECTION_COUNT, directionHeading } from "./clips";
import { COAT_PRESETS, DEFAULT_COAT, buildPalette, rgbToHex } from "./coat";
import { checkClip, checkFrame } from "./quality";
import { poseFor } from "./poses";
import { renderCat } from "./render";

const draw = (clip: Parameters<typeof poseFor>[0], frame: number, dir: number, coat = DEFAULT_COAT) => renderCat({ pose: poseFor(clip, frame), heading: directionHeading(dir), coat });

describe("drawing the cat", () => {
  it("is deterministic: the same inputs give the same pixels", () => {
    const a = draw("walk", 3, 2);
    const b = draw("walk", 3, 2);
    expect(Buffer.from(a.rgba).equals(Buffer.from(b.rgba))).toBe(true);
    expect(Buffer.from(a.normal).equals(Buffer.from(b.normal))).toBe(true);
  });

  it("never touches the edge of its frame, so nothing is cut off", () => {
    let touching = 0;
    for (const clip of CLIP_NAMES) {
      for (let d = 0; d < DIRECTION_COUNT; d++) {
        for (let f = 0; f < CLIPS[clip].frames; f++) {
          const r = draw(clip, f, d);
          for (let x = 0; x < CAT_FRAME_W; x++) {
            if (r.rgba[x * 4 + 3] !== 0 || r.rgba[((CAT_FRAME_H - 1) * CAT_FRAME_W + x) * 4 + 3] !== 0) touching++;
          }
          for (let y = 0; y < CAT_FRAME_H; y++) {
            if (r.rgba[y * CAT_FRAME_W * 4 + 3] !== 0 || r.rgba[(y * CAT_FRAME_W + CAT_FRAME_W - 1) * 4 + 3] !== 0) touching++;
          }
        }
      }
    }
    expect(touching).toBe(0);
    // Every frame of every clip is drawn here, which is slow when the machine is busy.
  }, 30000);

  it("is one piece with a normal on every pixel it covers, and a flat normal elsewhere", () => {
    const r = draw("idle", 0, 0);
    expect(checkFrame(r).components).toBe(1);
    for (let i = 0; i < CAT_FRAME_W * CAT_FRAME_H; i++) {
      if (r.rgba[i * 4 + 3] === 0) expect([r.normal[i * 4], r.normal[i * 4 + 1], r.normal[i * 4 + 2]]).toEqual([128, 128, 255]);
      else expect(r.normal[i * 4 + 3]).toBe(255);
    }
  });

  it("uses only the coat's palette, within the 32-colour cap, in every coat", () => {
    for (const coat of COAT_PRESETS) {
      const p = buildPalette(coat);
      const allowed = new Set<string>();
      Object.values(p.ramps).forEach((ramp) => ramp.forEach((c) => allowed.add(rgbToHex(c))));
      Object.values(p.outline).forEach((c) => allowed.add(rgbToHex(c)));
      for (const c of [p.eye.rim, p.eye.light, p.eye.dark, p.eye.pupil, p.eye.glint, p.nose, p.noseLight, p.mouth, p.earInner, p.earInnerDark]) allowed.add(rgbToHex(c));
      expect(allowed.size, coat.id).toBeLessThanOrEqual(32);
      const r = draw("walk", 1, 3, coat);
      let off = 0;
      for (let i = 0; i < CAT_FRAME_W * CAT_FRAME_H; i++) if (r.rgba[i * 4 + 3] && !allowed.has(rgbToHex([r.rgba[i * 4], r.rgba[i * 4 + 1], r.rgba[i * 4 + 2]]))) off++;
      expect(off, coat.id).toBe(0);
    }
  });

  it("keeps stray single pixels under 5% of the cat in sample frames", () => {
    for (const [clip, f, d] of [["idle", 0, 0], ["idle", 0, 2], ["walk", 2, 2], ["run", 3, 6], ["sit", 0, 0], ["sleep", 0, 3]] as const) {
      expect(checkFrame(draw(clip, f, d)).orphanRatio, `${clip} ${f} ${d}`).toBeLessThan(0.05);
    }
  });

  it("keeps the amount of cat steady through a walk cycle", () => {
    for (const d of [0, 2, 4]) {
      const frames = Array.from({ length: CLIPS.walk.frames }, (_, f) => draw("walk", f, d));
      expect(checkClip(frames).massDeviation).toBeLessThan(0.15);
    }
  });

  it("closes the eyes for a blink", () => {
    const open = draw("idle", 0, 0);
    const blink = draw("idle", 4, 0);
    expect(Buffer.from(open.rgba).equals(Buffer.from(blink.rgba))).toBe(false);
  });
});

describe("the refined look (under review; the game still uses the original)", () => {
  const drawRefined = (clip: Parameters<typeof poseFor>[0], frame: number, dir: number, coat = DEFAULT_COAT) => renderCat({ pose: poseFor(clip, frame, "refined"), heading: directionHeading(dir), coat, look: "refined" });

  it("is deterministic and different from the original", () => {
    const a = drawRefined("sit", 0, 0);
    expect(Buffer.from(a.rgba).equals(Buffer.from(drawRefined("sit", 0, 0).rgba))).toBe(true);
    expect(Buffer.from(a.rgba).equals(Buffer.from(draw("sit", 0, 0).rgba))).toBe(false);
  });

  it("never touches the edge of its frame in any pose or direction", () => {
    let touching = 0;
    for (const clip of CLIP_NAMES) for (let d = 0; d < DIRECTION_COUNT; d++) for (let f = 0; f < CLIPS[clip].frames; f++) {
      const r = drawRefined(clip, f, d);
      for (let x = 0; x < CAT_FRAME_W; x++) if (r.rgba[x * 4 + 3] !== 0 || r.rgba[((CAT_FRAME_H - 1) * CAT_FRAME_W + x) * 4 + 3] !== 0) touching++;
      for (let y = 0; y < CAT_FRAME_H; y++) if (r.rgba[y * CAT_FRAME_W * 4 + 3] !== 0 || r.rgba[(y * CAT_FRAME_W + CAT_FRAME_W - 1) * 4 + 3] !== 0) touching++;
    }
    expect(touching).toBe(0);
  });

  it("keeps the same palette (plus the whisker colour), within the 32-colour cap, in every coat", () => {
    for (const coat of COAT_PRESETS) {
      const p = buildPalette(coat);
      const allowed = new Set<string>();
      Object.values(p.ramps).forEach((ramp) => ramp.forEach((c) => allowed.add(rgbToHex(c))));
      Object.values(p.outline).forEach((c) => allowed.add(rgbToHex(c)));
      for (const c of [p.eye.rim, p.eye.light, p.eye.dark, p.eye.pupil, p.eye.glint, p.nose, p.noseLight, p.mouth, p.earInner, p.earInnerDark, p.whisker]) allowed.add(rgbToHex(c));
      expect(allowed.size, coat.id).toBeLessThanOrEqual(32);
      for (const [clip, f, d] of [["sit", 0, 0], ["idle", 0, 1], ["walk", 2, 2]] as const) {
        const r = drawRefined(clip, f, d, coat);
        let off = 0;
        for (let i = 0; i < CAT_FRAME_W * CAT_FRAME_H; i++) if (r.rgba[i * 4 + 3] && !allowed.has(rgbToHex([r.rgba[i * 4], r.rgba[i * 4 + 1], r.rgba[i * 4 + 2]]))) off++;
        expect(off, `${coat.id} ${clip}`).toBe(0);
      }
    }
  });

  it("is one piece with few stray pixels, and its sitting frames keep a steady amount of cat", () => {
    for (const [clip, f, d] of [["sit", 0, 0], ["sit", 0, 4], ["idle", 0, 0], ["walk", 2, 2], ["sleep", 0, 3]] as const) {
      const r = checkFrame(drawRefined(clip, f, d));
      expect(r.components, `${clip} ${f} ${d}`).toBeLessThanOrEqual(2);
      expect(r.orphanRatio, `${clip} ${f} ${d}`).toBeLessThan(0.05);
    }
    for (const d of [0, 2, 4]) expect(checkClip(Array.from({ length: CLIPS.sit.frames }, (_, f) => drawRefined("sit", f, d))).massDeviation).toBeLessThan(0.1);
  });

  it("shows the two front paws apart, with daylight between them, when sitting facing the camera", () => {
    const r = drawRefined("sit", 0, 0);
    // Look at the rows around the paws, in the middle of the frame, for two separate runs of cat.
    let separated = false;
    for (let y = 40; y < 56 && !separated; y++) {
      const runs: [number, number][] = [];
      let start = -1;
      for (let x = 18; x <= 54; x++) {
        const solid = r.rgba[(y * CAT_FRAME_W + x) * 4 + 3] > 0;
        if (solid && start < 0) start = x;
        if ((!solid || x === 54) && start >= 0) {
          runs.push([start, solid ? x : x - 1]);
          start = -1;
        }
      }
      for (let i = 1; i < runs.length; i++) if (runs[i][0] - runs[i - 1][1] > 2 && runs[i][1] - runs[i][0] >= 3 && runs[i - 1][1] - runs[i - 1][0] >= 3) separated = true;
    }
    expect(separated).toBe(true);
  });
});

describe("sitting and sleeping shapes", () => {
  const extent = (look: "original" | "refined", clip: "sit" | "sleep", dir: number) => {
    const r = renderCat({ pose: poseFor(clip, 0, look), heading: directionHeading(dir), coat: DEFAULT_COAT, look });
    let lo = 999;
    let hi = -1;
    let top = 999;
    let bottom = -1;
    for (let y = 0; y < CAT_FRAME_H; y++) for (let x = 0; x < CAT_FRAME_W; x++) if (r.rgba[(y * CAT_FRAME_W + x) * 4 + 3]) {
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    return { width: hi - lo + 1, height: bottom - top + 1 };
  };

  it("keeps a cat sitting to face the camera narrow: the hind legs are tucked in, not out to the sides", () => {
    // The first drawing of the sit was 37 pixels wide from the front, with its hind legs and tail out like wings.
    expect(extent("original", "sit", 0).width).toBeLessThanOrEqual(31);
    expect(extent("refined", "sit", 0).width).toBeLessThanOrEqual(31);
  });

  it("lies a sleeping cat low, like a loaf, seen from the side, and closes its eyes", () => {
    for (const look of ["original", "refined"] as const) {
      expect(extent(look, "sleep", 2).height, look).toBeLessThanOrEqual(30);
      expect(extent(look, "sleep", 6).height, look).toBeLessThanOrEqual(30);
      expect(poseFor("sleep", 0, look).eyes).toBe(0);
    }
  });
});
