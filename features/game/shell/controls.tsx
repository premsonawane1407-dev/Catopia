"use client";

// What the player touches and sees while playing: a layer that turns touches and clicks into steering (a
// floating thumb stick, taps and clicks to walk somewhere), a Run button for touch, the interaction prompt
// and a line of text. They only report input to the hub and show what the player simulation decided.
import { ChevronUp, PawPrint, Smile } from "lucide-react";
import { EMOTES } from "../cat/clips";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { InputHub } from "../player/input-hub";
import { dragToStick, isTap, type Device } from "../player/input-map";
import type { Interactable } from "../player/interactions";

/** How far, in pixels, a thumb drag has to reach for full push. */
const STICK_RADIUS = 56;
/** Seconds between new walk-to points while a mouse button is held and dragged. */
const DRAG_RETARGET_MS = 110;

/** Keeps receiving a finger's moves after it leaves the layer. Not every pointer can be captured (a synthetic one cannot), and that is fine. */
function capture(el: Element, id: number): void {
  try {
    el.setPointerCapture(id);
  } catch {
    // no capture: the drag still works while the finger stays over the layer
  }
}

interface Touch {
  id: number;
  startX: number;
  startY: number;
  startTime: number;
  moved: number;
  stick: boolean;
}

export function TouchLayer({ hub }: { hub: InputHub }) {
  const layer = useRef<HTMLDivElement>(null);
  const touch = useRef<Touch | null>(null);
  const mouseDown = useRef(false);
  const lastRetarget = useRef(0);
  const [stick, setStick] = useState<{ x: number; y: number; kx: number; ky: number } | null>(null);

  const toNdc = useCallback((clientX: number, clientY: number) => {
    const r = layer.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return { x: 0, y: 0 };
    return { x: ((clientX - r.left) / r.width) * 2 - 1, y: -(((clientY - r.top) / r.height) * 2 - 1) };
  }, []);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") {
      if (e.button !== 0) return;
      capture(e.currentTarget, e.pointerId);
      mouseDown.current = true;
      const n = toNdc(e.clientX, e.clientY);
      hub.tapAt(n.x, n.y, "mouse");
      lastRetarget.current = performance.now();
      return;
    }
    if (touch.current) return; // one finger steers; a second is ignored
    capture(e.currentTarget, e.pointerId);
    touch.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, startTime: performance.now(), moved: 0, stick: false };
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") {
      if (!mouseDown.current) return;
      const now = performance.now();
      if (now - lastRetarget.current < DRAG_RETARGET_MS) return;
      lastRetarget.current = now;
      const n = toNdc(e.clientX, e.clientY);
      hub.tapAt(n.x, n.y, "mouse");
      return;
    }
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.startX;
    const dy = e.clientY - t.startY;
    t.moved = Math.max(t.moved, Math.hypot(dx, dy));
    if (!t.stick && t.moved >= 12) t.stick = true;
    if (!t.stick) return;
    const s = dragToStick(dx, dy, STICK_RADIUS);
    hub.setStick(s);
    const r = layer.current?.getBoundingClientRect();
    setStick({ x: t.startX - (r?.left ?? 0), y: t.startY - (r?.top ?? 0), kx: s.x * STICK_RADIUS, ky: s.y * STICK_RADIUS });
  };

  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") {
      mouseDown.current = false;
      return;
    }
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    if (!t.stick && e.type === "pointerup" && isTap(t.moved, performance.now() - t.startTime)) {
      const n = toNdc(e.clientX, e.clientY);
      hub.tapAt(n.x, n.y, "touch");
    }
    touch.current = null;
    hub.setStick(null);
    setStick(null);
  };

  // If the layer goes away mid-drag, let go of everything.
  useEffect(
    () => () => {
      hub.setStick(null);
      hub.setRunHeld(false);
    },
    [hub],
  );

  return (
    <div ref={layer} className="cg-touch-layer" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} aria-hidden="true">
      {stick && (
        <div className="cg-stick" style={{ left: stick.x, top: stick.y }}>
          <i className="cg-stick-knob" style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }} />
        </div>
      )}
    </div>
  );
}

/** A hold-to-run button for touch. */
export function RunButton({ hub }: { hub: InputHub }) {
  const [held, setHeld] = useState(false);
  const set = (value: boolean) => {
    hub.setRunHeld(value);
    setHeld(value);
  };
  return (
    <button
      type="button"
      className="cg-run-btn"
      data-held={held ? "true" : "false"}
      aria-label="Run (hold)"
      onPointerDown={(e) => {
        e.stopPropagation();
        capture(e.currentTarget, e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
    >
      Run
    </button>
  );
}

const HINT: Record<Device, string | null> = { keyboard: "E", gamepad: "X", touch: null, mouse: null };

/** The offer of something to do: a pill with the key to press and what it does. Clicking or tapping it works too. */
export function InteractionPrompt({ prompt, device, onActivate }: { prompt: Interactable; device: Device; onActivate: () => void }) {
  const hint = HINT[device];
  return (
    <button type="button" className="cg-prompt" onClick={onActivate} onPointerDown={(e) => e.stopPropagation()}>
      <span className="cg-prompt-key" aria-hidden="true">
        {hint ?? <PawPrint size={15} />}
      </span>
      <span className="cg-prompt-label">{prompt.label}</span>
    </button>
  );
}

export function Caption({ text }: { text: string }) {
  return (
    <p className="cg-caption" role="status">
      {text}
    </p>
  );
}

/** Announces a new prompt to screen readers without adding anything to look at. */
export function PromptAnnouncer({ prompt }: { prompt: Interactable | null }) {
  return (
    <div className="cg-sr" aria-live="polite">
      {prompt ? `${prompt.label}. Press E, or X on a gamepad, or tap the button.` : ""}
    </div>
  );
}

/** A button to hop (for touch and mouse; the keyboard's Space and the gamepad's A do the same). */
export function JumpButton({ hub }: { hub: InputHub }) {
  return (
    <button
      type="button"
      className="cg-jump-btn"
      aria-label="Jump"
      onPointerDown={(e) => {
        e.stopPropagation();
        hub.pressJump();
      }}
    >
      <ChevronUp size={26} aria-hidden="true" />
    </button>
  );
}

/**
 * The emote picker: a small button that opens six choices. The number keys 1 to 6 and Q (or the gamepad's Y and left
 * bumper) do the same without opening it. Choosing one makes the cat sit facing you and say it.
 */
export function EmoteBar({ hub, open, selected, onToggle }: { hub: InputHub; open: boolean; selected: number; onToggle: (open: boolean) => void }) {
  return (
    <div className="cg-emotes" onPointerDown={(e) => e.stopPropagation()}>
      {open && (
        <div className="cg-emote-list" role="menu" aria-label="Emotes">
          {EMOTES.map((e, i) => (
            <button
              key={e.id}
              type="button"
              role="menuitem"
              className="cg-emote-chip"
              data-selected={i === selected ? "true" : "false"}
              onClick={() => {
                hub.requestEmote(i);
                onToggle(false);
              }}
            >
              <kbd>{i + 1}</kbd>
              <span>{e.label}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="cg-emote-btn" aria-label="Emotes (Q)" aria-expanded={open} onClick={() => onToggle(!open)}>
        <Smile size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

/** A short line that names the emote the gamepad has chosen. */
export function Toast({ text }: { text: string }) {
  return (
    <p className="cg-toast" role="status">
      {text}
    </p>
  );
}
