import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SETTINGS_KEY } from "./settings";
import { applySettingsPatch, loadSettings, saveSettings, type KeyValueStorage } from "./settings-store";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
  };
}

const throwingStorage: KeyValueStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
};

describe("loadSettings", () => {
  it("returns the defaults when nothing is stored, and when storage is missing or blocked", () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(throwingStorage)).toEqual(DEFAULT_SETTINGS);
  });

  it("reads back what was saved", () => {
    const storage = memoryStorage();
    saveSettings({ muted: true, quality: "light", motion: "reduced", time: "dusk", showStats: true }, storage);
    expect(loadSettings(storage)).toEqual({ muted: true, quality: "light", motion: "reduced", time: "dusk", showStats: true });
  });

  it("repairs a damaged value instead of trusting it", () => {
    const storage = memoryStorage({ [SETTINGS_KEY]: JSON.stringify({ muted: "yes", quality: "ultra", motion: "full" }) });
    expect(loadSettings(storage)).toEqual({ ...DEFAULT_SETTINGS, motion: "full" });
  });
});

describe("saveSettings", () => {
  it("says whether it saved", () => {
    expect(saveSettings(DEFAULT_SETTINGS, memoryStorage())).toBe(true);
    expect(saveSettings(DEFAULT_SETTINGS, null)).toBe(false);
    expect(saveSettings(DEFAULT_SETTINGS, throwingStorage)).toBe(false);
  });
});

describe("applySettingsPatch", () => {
  it("changes only what it is given", () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { muted: true })).toEqual({ ...DEFAULT_SETTINGS, muted: true });
  });

  it("refuses values that are not valid choices", () => {
    const patched = applySettingsPatch(DEFAULT_SETTINGS, { quality: "ultra" as never });
    expect(patched.quality).toBe(DEFAULT_SETTINGS.quality);
  });
});
