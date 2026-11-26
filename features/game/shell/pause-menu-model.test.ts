import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings, type GameSettings } from "../settings/settings";
import { MOTION_CHOICES, QUALITY_CHOICES, buildMenuItems, cycleChoice, describeChange, interpretKey, moveSelection, settingsPatch, type MenuItem } from "./pause-menu-model";

const settings = (patch: Partial<GameSettings> = {}): GameSettings => ({ ...DEFAULT_SETTINGS, ...patch });
const item = (kind: MenuItem["kind"]): MenuItem => ({ id: "quality", kind, label: "x" });

describe("buildMenuItems", () => {
  it("lists the rows in order: resume first, leave last", () => {
    expect(buildMenuItems(settings()).map((i) => i.id)).toEqual(["resume", "sound", "quality", "motion", "stats", "leave"]);
  });

  it("reads the current settings out as words", () => {
    const rows = Object.fromEntries(buildMenuItems(settings()).map((i) => [i.id, i]));
    expect(rows.sound).toMatchObject({ kind: "toggle", on: true, value: "On" });
    expect(rows.quality).toMatchObject({ kind: "choice", value: "Automatic" });
    expect(rows.motion).toMatchObject({ kind: "choice", value: "Follow my device" });
    expect(rows.stats).toMatchObject({ kind: "toggle", on: false, value: "Off" });
    expect(rows.resume).toMatchObject({ kind: "action" });
    expect(rows.resume.value).toBeUndefined();
  });

  it("follows changes to the settings", () => {
    const rows = Object.fromEntries(buildMenuItems(settings({ muted: true, quality: "light", motion: "reduced", showStats: true })).map((i) => [i.id, i]));
    expect(rows.sound).toMatchObject({ on: false, value: "Off" });
    expect(rows.quality.value).toBe("Light");
    expect(rows.motion.value).toBe("Reduced");
    expect(rows.stats).toMatchObject({ on: true, value: "On" });
  });

  it("only offers choices that the settings accept", () => {
    for (const c of QUALITY_CHOICES) expect(parseSettings(JSON.stringify({ quality: c.value })).quality).toBe(c.value);
    for (const c of MOTION_CHOICES) expect(parseSettings(JSON.stringify({ motion: c.value })).motion).toBe(c.value);
  });
});

describe("moveSelection", () => {
  it("moves down and up, and wraps round at both ends", () => {
    expect(moveSelection(2, 1, 6)).toBe(3);
    expect(moveSelection(2, -1, 6)).toBe(1);
    expect(moveSelection(5, 1, 6)).toBe(0);
    expect(moveSelection(0, -1, 6)).toBe(5);
  });

  it("copes with an empty list", () => {
    expect(moveSelection(3, 1, 0)).toBe(0);
  });
});

describe("cycleChoice", () => {
  it("steps forward and back through a list and wraps", () => {
    expect(cycleChoice(QUALITY_CHOICES, "auto", 1)).toBe("full");
    expect(cycleChoice(QUALITY_CHOICES, "minimal", 1)).toBe("auto");
    expect(cycleChoice(QUALITY_CHOICES, "auto", -1)).toBe("minimal");
    expect(cycleChoice(MOTION_CHOICES, "system", -1)).toBe("reduced");
  });

  it("starts from the first choice when the current value is not in the list", () => {
    expect(cycleChoice(QUALITY_CHOICES, "weird" as never, 1)).toBe("full");
  });
});

describe("settingsPatch", () => {
  it("flips the toggles", () => {
    expect(settingsPatch("sound", 1, settings())).toEqual({ muted: true });
    expect(settingsPatch("sound", -1, settings({ muted: true }))).toEqual({ muted: false });
    expect(settingsPatch("stats", 1, settings())).toEqual({ showStats: true });
  });

  it("steps the choices in the direction asked", () => {
    expect(settingsPatch("quality", 1, settings())).toEqual({ quality: "full" });
    expect(settingsPatch("quality", -1, settings())).toEqual({ quality: "minimal" });
    expect(settingsPatch("motion", 1, settings())).toEqual({ motion: "full" });
  });

  it("changes nothing for actions", () => {
    expect(settingsPatch("resume", 1, settings())).toBeNull();
    expect(settingsPatch("leave", 1, settings())).toBeNull();
  });

  it("describes the new value for a screen reader", () => {
    expect(describeChange("quality", settings(), { quality: "light" })).toBe("Picture quality: Light");
    expect(describeChange("sound", settings(), { muted: true })).toBe("Sound: Off");
    expect(describeChange("resume", settings(), {})).toBe("Resume");
  });
});

describe("interpretKey", () => {
  it("moves between rows with the up and down arrows, and with Tab", () => {
    expect(interpretKey("ArrowDown", false, item("choice"))).toEqual({ type: "move", delta: 1 });
    expect(interpretKey("ArrowUp", false, item("choice"))).toEqual({ type: "move", delta: -1 });
    expect(interpretKey("Tab", false, item("action"))).toEqual({ type: "move", delta: 1 });
    expect(interpretKey("Tab", true, item("action"))).toEqual({ type: "move", delta: -1 });
  });

  it("jumps to the first and last rows", () => {
    expect(interpretKey("Home", false, undefined)).toEqual({ type: "jump", to: "first" });
    expect(interpretKey("End", false, undefined)).toEqual({ type: "jump", to: "last" });
  });

  it("changes a toggle or a choice with left and right, and ignores them on an action", () => {
    expect(interpretKey("ArrowRight", false, item("choice"))).toEqual({ type: "change", direction: 1 });
    expect(interpretKey("ArrowLeft", false, item("toggle"))).toEqual({ type: "change", direction: -1 });
    expect(interpretKey("ArrowLeft", false, item("action"))).toEqual({ type: "none" });
    expect(interpretKey("ArrowRight", false, undefined)).toEqual({ type: "none" });
  });

  it("presses the row with Enter or Space", () => {
    for (const key of ["Enter", " ", "Spacebar"]) expect(interpretKey(key, false, item("action"))).toEqual({ type: "activate" });
  });

  it("leaves every other key alone, Escape included (the game shell resumes on Escape)", () => {
    for (const key of ["Escape", "a", "m", "F5", "Shift"]) expect(interpretKey(key, false, item("choice"))).toEqual({ type: "none" });
  });
});
