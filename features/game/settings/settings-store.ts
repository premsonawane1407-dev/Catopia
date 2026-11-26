// Saving the player's preferences in the browser. Storage can be missing or throw (private windows,
// blocked cookies), so every access is guarded and the game simply uses its defaults.
import { DEFAULT_SETTINGS, SETTINGS_KEY, parseSettings, serializeSettings, type GameSettings } from "./settings";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(storage: KeyValueStorage | null = browserStorage()): GameSettings {
  try {
    return parseSettings(storage?.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Returns whether the settings were actually saved. */
export function saveSettings(settings: GameSettings, storage: KeyValueStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, serializeSettings(settings));
    return true;
  } catch {
    return false;
  }
}

/** Applies a change on top of the current settings, re-validating the result. */
export function applySettingsPatch(current: GameSettings, patch: Partial<GameSettings>): GameSettings {
  return parseSettings(serializeSettings({ ...current, ...patch }));
}
