import { describe, expect, it } from "vitest";
import { DAY_SECONDS, HOUR_OF, KEYFRAMES, START_HOUR, blendPresets, createClock, hoursBetween, phaseName, presetAtHour, stepClock, wrapHour, type DayClock, type TimeSetting } from "./day-clock";
import { TIMES_OF_DAY, TIME_PRESETS, type TimePreset } from "./time-presets";

const NUMBERS = ["fogDensity", "hemiIntensity", "sunIntensity", "lanternIntensity", "windowGlow", "catGlow", "bloomIntensity", "bloomThreshold", "vignette", "saturation", "contrast", "fireflies"] as const;
const COLORS = ["background", "fogColor", "hemiSky", "hemiGround", "sunColor", "lanternColor", "windowColor"] as const;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe("the key moments", () => {
  it("each have a complete, sensible look", () => {
    for (const t of TIMES_OF_DAY) {
      const p = TIME_PRESETS[t];
      for (const c of COLORS) expect(p[c], `${t}.${c}`).toMatch(/^#[0-9a-f]{6}$/);
      for (const n of NUMBERS) expect(Number.isFinite(p[n]), `${t}.${n}`).toBe(true);
      expect(p.fireflies).toBeGreaterThanOrEqual(0);
      expect(p.fireflies).toBeLessThanOrEqual(1);
    }
  });

  it("run from bright and lampless by day to dark and lamp-lit at night", () => {
    expect(TIME_PRESETS.day.lanternIntensity).toBe(0);
    expect(TIME_PRESETS.night.lanternIntensity).toBeGreaterThan(TIME_PRESETS.golden.lanternIntensity);
    expect(TIME_PRESETS.day.windowGlow).toBeLessThan(TIME_PRESETS.night.windowGlow);
    expect(TIME_PRESETS.day.sunIntensity).toBeGreaterThan(TIME_PRESETS.night.sunIntensity);
    const lum = (hex: string) => rgb(hex).reduce((s, v) => s + v, 0);
    expect(lum(TIME_PRESETS.day.background)).toBeGreaterThan(lum(TIME_PRESETS.dusk.background));
    expect(lum(TIME_PRESETS.dusk.background)).toBeGreaterThan(lum(TIME_PRESETS.night.background));
  });
});

describe("the look at an hour", () => {
  it("is exactly the key moment at its own hour", () => {
    for (const k of KEYFRAMES) expect(presetAtHour(k.hour)).toMatchObject({ ...TIME_PRESETS[k.time], sunPosition: TIME_PRESETS[k.time].sunPosition });
  });

  it("opens at the blue hour the owner approved", () => {
    expect(START_HOUR).toBe(HOUR_OF.dusk);
    expect(presetAtHour(START_HOUR).background).toBe(TIME_PRESETS.dusk.background);
  });

  it("is night all through the small hours, and the same either side of midnight", () => {
    for (const h of [22, 23, 0, 1, 3, 4.4]) expect(presetAtHour(h).background, `${h}`).toBe(TIME_PRESETS.night.background);
    expect(presetAtHour(23.999)).toEqual(presetAtHour(0.001));
  });

  it("holds the day between 11:00 and 14:00", () => {
    expect(presetAtHour(11).background).toBe(TIME_PRESETS.day.background);
    expect(presetAtHour(12.7).background).toBe(TIME_PRESETS.day.background);
    expect(presetAtHour(14).background).toBe(TIME_PRESETS.day.background);
  });

  it("changes smoothly: no number or colour jumps between two instants a minute apart, all day and over midnight", () => {
    let worst = 0;
    for (let h = 0; h < 24; h += 1 / 60) {
      const a = presetAtHour(h);
      const b = presetAtHour(h + 1 / 60);
      for (const n of NUMBERS) {
        const scale = Math.max(Math.abs(TIME_PRESETS.night[n]), Math.abs(TIME_PRESETS.dusk[n]), Math.abs(TIME_PRESETS.day[n]), 1);
        worst = Math.max(worst, Math.abs(a[n] - b[n]) / scale);
      }
      for (const c of COLORS) rgb(a[c]).forEach((v, i) => (worst = Math.max(worst, Math.abs(v - rgb(b[c])[i]) / 255)));
    }
    // One game minute (a third of a real second) moves any value by under 2% of its range.
    expect(worst).toBeLessThan(0.02);
  });

  it("lights the lamps as the day ends and puts them out as it begins", () => {
    expect(presetAtHour(12).lanternIntensity).toBe(0);
    expect(presetAtHour(18.5).lanternIntensity).toBeGreaterThan(presetAtHour(17.5).lanternIntensity);
    expect(presetAtHour(21).lanternIntensity).toBeGreaterThan(presetAtHour(19.5).lanternIntensity);
    expect(presetAtHour(8).lanternIntensity).toBeLessThan(presetAtHour(5.5).lanternIntensity);
  });

  it("never gives an invalid colour while blending", () => {
    for (let h = 0; h < 24; h += 0.37) for (const c of COLORS) expect(presetAtHour(h)[c]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("blends two looks straight, halfway being the average", () => {
    const mid = blendPresets(TIME_PRESETS.day, TIME_PRESETS.night, 0.5);
    expect(mid.sunIntensity).toBeCloseTo((TIME_PRESETS.day.sunIntensity + TIME_PRESETS.night.sunIntensity) / 2, 9);
    expect(blendPresets(TIME_PRESETS.day, TIME_PRESETS.night, 0).background).toBe(TIME_PRESETS.day.background);
    expect(blendPresets(TIME_PRESETS.day, TIME_PRESETS.night, 1).background).toBe(TIME_PRESETS.night.background);
  });

  it("does not change the presets it blends", () => {
    const before = JSON.stringify(TIME_PRESETS);
    presetAtHour(7);
    presetAtHour(18);
    expect(JSON.stringify(TIME_PRESETS)).toBe(before);
  });
});

describe("the clock", () => {
  it("wraps hours into 0 to 24", () => {
    expect(wrapHour(25)).toBe(1);
    expect(wrapHour(-1)).toBe(23);
    expect(wrapHour(24)).toBe(0);
  });

  it("runs a whole day in DAY_SECONDS when left to itself", () => {
    const c = createClock(6);
    for (let t = 0; t < DAY_SECONDS / 2; t += 1 / 60) stepClock(c, 1 / 60, "auto");
    expect(c.hour).toBeCloseTo(18, 1);
    for (let t = 0; t < DAY_SECONDS / 2; t += 1 / 60) stepClock(c, 1 / 60, "auto");
    expect(c.hour).toBeCloseTo(6, 1);
  });

  it("runs the same at any frame rate", () => {
    const at = (fps: number) => {
      const c = createClock(0);
      for (let i = 0; i < fps * 60; i++) stepClock(c, 1 / fps, "auto");
      return c.hour;
    };
    expect(at(30)).toBeCloseTo(at(144), 3);
  });

  it("goes through dusk and night to the next dawn, in order", () => {
    const c = createClock(START_HOUR);
    const seen: string[] = [];
    for (let t = 0; t < DAY_SECONDS; t += 1 / 20) {
      stepClock(c, 1 / 20, "auto");
      const name = phaseName(c.hour);
      if (seen[seen.length - 1] !== name) seen.push(name);
    }
    expect(seen).toEqual(["Blue hour", "Night", "Dawn", "Day", "Golden hour", "Blue hour"]);
  });

  it("eases to a chosen moment by the shorter way round, without overshooting, and stays", () => {
    for (const from of [0.5, 5, 12, 19.5, 23.5]) {
      for (const time of ["dawn", "day", "golden", "dusk", "night"] as const) {
        const c: DayClock = createClock(from);
        const setting: TimeSetting = time;
        let remaining = Math.abs(hoursBetween(c.hour, HOUR_OF[time]));
        for (let i = 0; i < 60 * 12; i++) {
          stepClock(c, 1 / 60, setting);
          const now = Math.abs(hoursBetween(c.hour, HOUR_OF[time]));
          expect(now, `${from}->${time}`).toBeLessThanOrEqual(remaining + 1e-9);
          remaining = now;
        }
        expect(c.hour, `${from}->${time}`).toBeCloseTo(HOUR_OF[time], 2);
        stepClock(c, 1, setting);
        expect(c.hour).toBeCloseTo(HOUR_OF[time], 2);
      }
    }
  });

  it("measures the shorter way round", () => {
    expect(hoursBetween(23, 1)).toBe(2);
    expect(hoursBetween(1, 23)).toBe(-2);
    expect(Math.abs(hoursBetween(6, 18))).toBeCloseTo(12, 9);
  });

  it("names the parts of the day", () => {
    expect(phaseName(2)).toBe("Night");
    expect(phaseName(6)).toBe("Dawn");
    expect(phaseName(12)).toBe("Day");
    expect(phaseName(17.5)).toBe("Golden hour");
    expect(phaseName(19.5)).toBe("Blue hour");
    expect(phaseName(23)).toBe("Night");
  });
});

describe("the look of a looks table entry", () => {
  it("every look has the same set of fields", () => {
    const keys = (p: TimePreset) => Object.keys(p).sort().join();
    for (const t of TIMES_OF_DAY) expect(keys(TIME_PRESETS[t])).toBe(keys(TIME_PRESETS.dusk));
  });
});
