import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings, resolveMotion, serializeSettings } from "./settings";

describe("parseSettings", () => {
  it("returns the defaults for missing, empty or broken input", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{not json")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("null")).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips valid settings", () => {
    const custom = { muted: true, quality: "light", motion: "reduced", showStats: true } as const;
    expect(parseSettings(serializeSettings(custom))).toEqual(custom);
  });

  it("keeps valid fields and replaces invalid ones individually", () => {
    const parsed = parseSettings(JSON.stringify({ muted: true, quality: "ultra", motion: 7, showStats: "yes" }));
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, muted: true });
  });

  it("returns a fresh object each time so callers cannot mutate the defaults", () => {
    const a = parseSettings(null);
    a.muted = true;
    expect(parseSettings(null).muted).toBe(false);
    expect(DEFAULT_SETTINGS.muted).toBe(false);
  });
});

describe("resolveMotion", () => {
  it("follows the operating system when set to system", () => {
    expect(resolveMotion("system", true)).toBe("reduced");
    expect(resolveMotion("system", false)).toBe("full");
  });

  it("lets an explicit choice override the operating system", () => {
    expect(resolveMotion("full", true)).toBe("full");
    expect(resolveMotion("reduced", false)).toBe("reduced");
  });
});
