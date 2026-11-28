// The rules of the pause menu, away from the screen: which rows there are, what the arrow keys do on
// each kind of row, and which setting a row changes. The menu component only draws this and reports clicks.
import { COAT_PRESETS } from "../cat/coat";
import type { TimeSetting } from "../render/day-clock";
import type { GameSettings, MotionSetting, QualitySetting } from "../settings/settings";

export interface Choice<T extends string> {
  value: T;
  label: string;
}

export const QUALITY_CHOICES: readonly Choice<QualitySetting>[] = [
  { value: "auto", label: "Automatic" },
  { value: "full", label: "Full" },
  { value: "light", label: "Light" },
  { value: "minimal", label: "Minimal" },
];

export const MOTION_CHOICES: readonly Choice<MotionSetting>[] = [
  { value: "system", label: "Follow my device" },
  { value: "full", label: "Full" },
  { value: "reduced", label: "Reduced" },
];

export const TIME_CHOICES: readonly Choice<TimeSetting>[] = [
  { value: "auto", label: "Let the day pass" },
  { value: "dawn", label: "Dawn" },
  { value: "day", label: "Day" },
  { value: "golden", label: "Golden hour" },
  { value: "dusk", label: "Blue hour" },
  { value: "night", label: "Night" },
];

/** The cats you can play: every coat, by the cat's name. */
export const CAT_CHOICES: readonly Choice<string>[] = COAT_PRESETS.map((c) => ({ value: c.id, label: `${c.name}, ${c.label.toLowerCase()}` }));

export type MenuItemId = "resume" | "cat" | "sound" | "quality" | "motion" | "time" | "stats" | "leave";

/** An action does something when chosen; a toggle flips on and off; a choice steps through a short list. */
export type MenuItemKind = "action" | "toggle" | "choice";

export interface MenuItem {
  id: MenuItemId;
  kind: MenuItemKind;
  label: string;
  /** What the current value reads as, such as "On" or "Light". Actions have none. */
  value?: string;
  /** Toggles only: whether the switch is on. */
  on?: boolean;
}

const labelOf = <T extends string>(choices: readonly Choice<T>[], value: T) => choices.find((c) => c.value === value)?.label ?? String(value);

/** The rows of the menu, in order, for the current settings. */
export function buildMenuItems(settings: GameSettings): MenuItem[] {
  return [
    { id: "resume", kind: "action", label: "Resume" },
    { id: "cat", kind: "choice", label: "Your cat", value: labelOf(CAT_CHOICES, settings.cat) },
    { id: "sound", kind: "toggle", label: "Sound", on: !settings.muted, value: settings.muted ? "Off" : "On" },
    { id: "quality", kind: "choice", label: "Picture quality", value: labelOf(QUALITY_CHOICES, settings.quality) },
    { id: "motion", kind: "choice", label: "Motion", value: labelOf(MOTION_CHOICES, settings.motion) },
    { id: "time", kind: "choice", label: "Time of day", value: labelOf(TIME_CHOICES, settings.time) },
    { id: "stats", kind: "toggle", label: "Performance numbers", on: settings.showStats, value: settings.showStats ? "On" : "Off" },
    { id: "leave", kind: "action", label: "Leave the street" },
  ];
}

/** Moves a highlight by `delta` rows, wrapping round at either end. */
export function moveSelection(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + delta) % count) + count) % count;
}

/** The next (or previous) choice in a list, wrapping round. An unknown current value starts from the first. */
export function cycleChoice<T extends string>(choices: readonly Choice<T>[], current: T, direction: 1 | -1): T {
  const index = choices.findIndex((c) => c.value === current);
  return choices[moveSelection(index < 0 ? 0 : index, direction, choices.length)].value;
}

/** The change to the settings that flipping a toggle or stepping a choice makes. Actions change nothing, so they give null. */
export function settingsPatch(id: MenuItemId, direction: 1 | -1, settings: GameSettings): Partial<GameSettings> | null {
  switch (id) {
    case "cat":
      return { cat: cycleChoice(CAT_CHOICES, settings.cat, direction) };
    case "sound":
      return { muted: !settings.muted };
    case "stats":
      return { showStats: !settings.showStats };
    case "quality":
      return { quality: cycleChoice(QUALITY_CHOICES, settings.quality, direction) };
    case "motion":
      return { motion: cycleChoice(MOTION_CHOICES, settings.motion, direction) };
    case "time":
      return { time: cycleChoice(TIME_CHOICES, settings.time, direction) };
    default:
      return null;
  }
}

/** What a screen reader should say after a row changed, such as "Picture quality: Light". */
export function describeChange(id: MenuItemId, settings: GameSettings, patch: Partial<GameSettings>): string {
  const item = buildMenuItems({ ...settings, ...patch }).find((i) => i.id === id);
  return item?.value === undefined ? (item?.label ?? "") : `${item.label}: ${item.value}`;
}

export type MenuKeyAction =
  | { type: "move"; delta: 1 | -1 }
  | { type: "jump"; to: "first" | "last" }
  | { type: "change"; direction: 1 | -1 }
  | { type: "activate" }
  | { type: "none" };

/**
 * What a key does in the menu. Up and down (and Tab) move between rows, left and right change a toggle
 * or a choice, Enter and Space press the row. Escape is handled by the game shell, which resumes.
 */
export function interpretKey(key: string, shiftKey: boolean, item: MenuItem | undefined): MenuKeyAction {
  switch (key) {
    case "ArrowUp":
      return { type: "move", delta: -1 };
    case "ArrowDown":
      return { type: "move", delta: 1 };
    case "Tab":
      return { type: "move", delta: shiftKey ? -1 : 1 };
    case "Home":
      return { type: "jump", to: "first" };
    case "End":
      return { type: "jump", to: "last" };
    case "ArrowLeft":
    case "ArrowRight":
      return item && item.kind !== "action" ? { type: "change", direction: key === "ArrowRight" ? 1 : -1 } : { type: "none" };
    case "Enter":
    case " ":
    case "Spacebar":
      return { type: "activate" };
    default:
      return { type: "none" };
  }
}
