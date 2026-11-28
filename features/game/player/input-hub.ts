// Gathers every way of steering the cat (keyboard, gamepad, touch stick, taps and clicks) into one place the
// game reads once per frame. It listens to the browser; everything it decides with is in input-map.ts.
import { EMOTES } from "../cat/clips";
import { EMOTE_MENU_KEY, GAME_KEYS, INTERACT_KEYS, JUMP_KEYS, chooseDevice, emoteIndexForKey, keyboardPush, readPad, stickPush, type Device, type Push } from "./input-map";

export interface Reading {
  push: Push | null;
  /** The interact button was pressed since the last reading. */
  interact: boolean;
  /** The jump button was pressed since the last reading. */
  jump: boolean;
  /** An emote was chosen since the last reading (an index into EMOTES), or null. */
  emote: number | null;
  /** A tap or click since the last reading, as a point on the screen from -1 to 1 (y up). */
  tap: { x: number; y: number } | null;
}

export interface InputHub {
  /** Starts listening to the keyboard. Returns the function that stops. */
  attach(): () => void;
  /** Forgets everything held: used when the game pauses, so no key stays "down". */
  reset(): void;
  /** Reads the state for this frame (and clears the one-shot presses). */
  read(): Reading;
  /** The touch stick, as a reading (-1 to 1, y down the screen), or null when no finger is on it. */
  setStick(stick: { x: number; y: number } | null): void;
  setRunHeld(held: boolean): void;
  pressInteract(): void;
  pressJump(): void;
  /** Plays an emote now (from the picker, a number key or the gamepad). */
  requestEmote(index: number): void;
  /** The emote the gamepad's Y plays, and the left bumper cycles. */
  selectedEmote(): number;
  selectEmote(index: number): void;
  /** Told when the picker should open or close (Q, or the gamepad), and when the chosen emote changes. */
  onEmoteMenu(listener: () => void): () => void;
  onEmoteSelect(listener: (index: number) => void): () => void;
  /** A tap or a click at a screen point, in normalised device coordinates. */
  tapAt(x: number, y: number, device: Device): void;
  /** The device used last, for choosing which button hint to show. */
  device(): Device;
  onDeviceChange(listener: (d: Device) => void): () => void;
  /** For checks: is a key counted as held? */
  heldKeys(): string[];
}

export function createInputHub(): InputHub {
  const keys = new Set<string>();
  let stick: { x: number; y: number } | null = null;
  let runHeld = false;
  let interactQueued = false;
  let jumpQueued = false;
  let emoteQueued: number | null = null;
  let tap: { x: number; y: number } | null = null;
  let lastDevice: Device = "keyboard";
  let selected = 0;
  const pad = { interact: false, jump: false, emotePlay: false, emoteNext: false };
  const listeners = new Set<(d: Device) => void>();
  const menuListeners = new Set<() => void>();
  const selectListeners = new Set<(i: number) => void>();

  const setDevice = (d: Device) => {
    if (d === lastDevice) return;
    lastDevice = d;
    listeners.forEach((l) => l(d));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!GAME_KEYS.includes(event.code)) return;
    event.preventDefault();
    setDevice("keyboard");
    if (INTERACT_KEYS.includes(event.code)) {
      if (!event.repeat) interactQueued = true;
      return;
    }
    if (JUMP_KEYS.includes(event.code)) {
      if (!event.repeat) jumpQueued = true;
      return;
    }
    if (event.code === EMOTE_MENU_KEY) {
      if (!event.repeat) menuListeners.forEach((l) => l());
      return;
    }
    const emote = emoteIndexForKey(event.code);
    if (emote >= 0) {
      if (!event.repeat) emoteQueued = emote;
      return;
    }
    keys.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.code);
  };

  const reset = () => {
    keys.clear();
    stick = null;
    runHeld = false;
    interactQueued = false;
    jumpQueued = false;
    emoteQueued = null;
    tap = null;
  };

  const selectEmote = (index: number) => {
    selected = ((index % EMOTES.length) + EMOTES.length) % EMOTES.length;
    selectListeners.forEach((l) => l(selected));
  };

  return {
    attach() {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", reset);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("blur", reset);
        reset();
      };
    },
    reset,
    read() {
      const pads = typeof navigator !== "undefined" && navigator.getGamepads ? Array.from(navigator.getGamepads()).filter((p): p is Gamepad => !!p && p.connected) : [];
      const state = readPad(pads[0] ?? null);
      if (state.anyInput) setDevice("gamepad");
      const padInteract = state.interact && !pad.interact;
      const padJump = state.jump && !pad.jump;
      const padEmote = state.emotePlay && !pad.emotePlay;
      if (state.emoteNext && !pad.emoteNext) selectEmote(selected + 1);
      pad.interact = state.interact;
      pad.jump = state.jump;
      pad.emotePlay = state.emotePlay;
      pad.emoteNext = state.emoteNext;
      const touch = stick ? stickPush(stick.x, stick.y, runHeld) : null;
      const push = chooseDevice([
        { device: "keyboard", push: keyboardPush(keys) },
        { device: "gamepad", push: state.push },
        { device: "touch", push: touch },
      ]);
      const reading: Reading = { push, interact: interactQueued || padInteract, jump: jumpQueued || padJump, emote: emoteQueued ?? (padEmote ? selected : null), tap };
      interactQueued = false;
      jumpQueued = false;
      emoteQueued = null;
      tap = null;
      return reading;
    },
    setStick(next) {
      stick = next;
      if (next) setDevice("touch");
    },
    setRunHeld(held) {
      runHeld = held;
    },
    pressInteract() {
      interactQueued = true;
    },
    pressJump() {
      jumpQueued = true;
    },
    requestEmote(index) {
      emoteQueued = index;
      selected = index;
    },
    selectedEmote: () => selected,
    selectEmote,
    onEmoteMenu(listener) {
      menuListeners.add(listener);
      return () => menuListeners.delete(listener);
    },
    onEmoteSelect(listener) {
      selectListeners.add(listener);
      return () => selectListeners.delete(listener);
    },
    tapAt(x, y, device) {
      tap = { x, y };
      setDevice(device);
    },
    device: () => lastDevice,
    onDeviceChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    heldKeys: () => [...keys],
  };
}
