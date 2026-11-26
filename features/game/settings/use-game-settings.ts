// The player's saved preferences as React state. Changes are validated and written to the browser
// straight away; nothing is written until the player actually changes something.
import { useCallback, useRef, useState } from "react";
import type { GameSettings } from "./settings";
import { applySettingsPatch, loadSettings, saveSettings } from "./settings-store";

export function useGameSettings(): readonly [GameSettings, (patch: Partial<GameSettings>) => void] {
  // Client-only: the game is never rendered on the server, so reading storage for the first value is safe.
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const latest = useRef(settings);

  const update = useCallback((patch: Partial<GameSettings>) => {
    const next = applySettingsPatch(latest.current, patch);
    latest.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);

  return [settings, update] as const;
}
