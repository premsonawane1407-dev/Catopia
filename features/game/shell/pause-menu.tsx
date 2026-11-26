// The pause menu: the choices float as plain text over the frozen, darkened and blurred picture. The
// highlight moves with the arrow keys (or the pointer), left and right change a setting, Enter presses a
// row. The rules for all that live in pause-menu-model.ts; this file draws it and reports what happened.
import { PawPrint } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { GameSettings } from "../settings/settings";
import { buildMenuItems, describeChange, interpretKey, moveSelection, settingsPatch, type MenuItem, type MenuItemId } from "./pause-menu-model";

export interface PauseMenuProps {
  settings: GameSettings;
  /** A setting was changed, and which way it went (1 forward, -1 back). */
  onChange: (patch: Partial<GameSettings>, direction: 1 | -1) => void;
  /** The highlight moved to this row (0 is the top). */
  onMove: (step: number) => void;
  onResume: () => void;
  onLeave: () => void;
}

/** Remembers the latest change of a row, so its value can slide in from the right side. */
interface Bump {
  id: MenuItemId;
  direction: 1 | -1;
  count: number;
}

const roleFor = (item: MenuItem) => (item.kind === "toggle" ? "menuitemcheckbox" : "menuitem");

const hintFor = (item: MenuItem) => (item.kind === "choice" ? `${item.label}: ${item.value}. Left and right arrows change it.` : undefined);

export function PauseMenu({ settings, onChange, onMove, onResume, onLeave }: PauseMenuProps) {
  const titleId = useId();
  const items = useMemo(() => buildMenuItems(settings), [settings]);
  // Which row is highlighted. The state draws it; the ref is the truth the key handlers read, so a burst of
  // key presses (or a held key) always builds on the row the last press reached, never on a stale one.
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(0);
  const [bump, setBump] = useState<Bump | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const focusingFromCode = useRef(false);

  // Keyboard focus follows the highlight, so Enter and the arrow keys always act on the highlighted row.
  useEffect(() => {
    const row = rows.current[selectedRef.current];
    if (!row || document.activeElement === row) return;
    focusingFromCode.current = true;
    row.focus({ preventScroll: true });
    focusingFromCode.current = false;
  }, [selected]);

  const highlight = useCallback((index: number) => {
    selectedRef.current = index;
    setSelected(index);
  }, []);

  const select = useCallback(
    (index: number) => {
      if (index === selectedRef.current) return;
      highlight(index);
      onMove(index);
    },
    [highlight, onMove],
  );

  const change = useCallback(
    (item: MenuItem, direction: 1 | -1) => {
      const patch = settingsPatch(item.id, direction, settings);
      if (!patch) return;
      onChange(patch, direction);
      setBump((current) => ({ id: item.id, direction, count: (current?.id === item.id ? current.count : 0) + 1 }));
      setAnnouncement(describeChange(item.id, settings, patch));
    },
    [settings, onChange],
  );

  const activate = useCallback(
    (item: MenuItem) => {
      if (item.id === "resume") onResume();
      else if (item.id === "leave") onLeave();
      else change(item, 1);
    },
    [change, onResume, onLeave],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const current = selectedRef.current;
    const action = interpretKey(event.key, event.shiftKey, items[current]);
    if (action.type === "none") return;
    event.preventDefault();
    if (action.type === "move") select(moveSelection(current, action.delta, items.length));
    else if (action.type === "jump") select(action.to === "first" ? 0 : items.length - 1);
    else if (action.type === "change") change(items[current], action.direction);
    // Holding Enter must not press a row again and again.
    else if (!event.repeat) activate(items[current]);
  };

  return (
    <div className="cg-pause" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="cg-pause-inner">
        <h2 id={titleId} className="cg-pause-title">
          Paused
        </h2>
        <span className="cg-pause-rule" aria-hidden="true" />
        <div className="cg-menu-wrap" style={{ "--sel": selected } as CSSProperties}>
          <span className="cg-menu-marker" aria-hidden="true">
            <PawPrint size={17} strokeWidth={2.2} />
          </span>
          <ul
            className="cg-menu"
            role="menu"
            aria-label="Pause menu"
            onKeyDown={onKeyDown}
            // Releasing Space would otherwise press the focused button a second time.
            onKeyUp={(event) => {
              if (event.key === " " || event.key === "Spacebar") event.preventDefault();
            }}
          >
            {items.map((item, index) => {
              const bumped = bump?.id === item.id ? bump : null;
              return (
                <li key={item.id} role="none" className="cg-menu-row" style={{ "--i": index } as CSSProperties}>
                  <button
                    ref={(element) => {
                      rows.current[index] = element;
                    }}
                    type="button"
                    role={roleFor(item)}
                    aria-checked={item.kind === "toggle" ? item.on : undefined}
                    aria-label={hintFor(item)}
                    tabIndex={index === selected ? 0 : -1}
                    className="cg-menu-item"
                    data-id={item.id}
                    data-kind={item.kind}
                    data-selected={index === selected ? "true" : "false"}
                    onPointerMove={() => select(index)}
                    // A screen reader's own cursor can land on a row; our own focus moves must not count.
                    onFocus={() => {
                      if (!focusingFromCode.current) select(index);
                    }}
                    onClick={() => {
                      if (index !== selectedRef.current) highlight(index);
                      activate(item);
                    }}
                  >
                    <span className="cg-menu-label">{item.label}</span>
                    {item.value !== undefined && (
                      <span className="cg-menu-value" key={`${item.id}-${bumped?.count ?? 0}`} data-bump={bumped ? bumped.direction : undefined}>
                        <span className="cg-chev" aria-hidden="true">
                          ‹
                        </span>
                        <b>{item.value}</b>
                        <span className="cg-chev" aria-hidden="true">
                          ›
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="cg-menu-hint" aria-hidden="true">
          ↑ ↓ move · ← → change · Enter select · Esc resume · M sound
        </p>
      </div>
      <div className="cg-sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
