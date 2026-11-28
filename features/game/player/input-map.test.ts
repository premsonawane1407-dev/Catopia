import { describe, expect, it } from "vitest";
import { applyDeadzone, chooseDevice, dragToStick, emoteIndexForKey, GAME_KEYS, INTERACT_KEYS, isTap, JUMP_KEYS, keyboardPush, readPad, stickPush } from "./input-map";

const keys = (...k: string[]) => new Set(k);

describe("keyboard", () => {
  it("is still with no keys, and with opposite keys", () => {
    expect(keyboardPush(keys())).toBeNull();
    expect(keyboardPush(keys("ArrowLeft", "ArrowRight"))).toBeNull();
  });
  it("maps arrows and WASD onto the screen: up is away from the camera", () => {
    expect(keyboardPush(keys("ArrowUp"))).toMatchObject({ x: 0, z: -1 });
    expect(keyboardPush(keys("KeyS"))).toMatchObject({ x: 0, z: 1 });
    expect(keyboardPush(keys("KeyA"))).toMatchObject({ x: -1, z: 0 });
    expect(keyboardPush(keys("KeyD"))).toMatchObject({ x: 1, z: 0 });
  });
  it("is no faster diagonally", () => {
    const p = keyboardPush(keys("KeyW", "KeyD"))!;
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(1);
  });
  it("runs with shift, walks otherwise", () => {
    expect(keyboardPush(keys("KeyD"))!.gait).toBe("walk");
    expect(keyboardPush(keys("KeyD", "ShiftLeft"))!.gait).toBe("run");
  });
});

describe("sticks", () => {
  it("ignores a resting stick's wobble", () => {
    expect(stickPush(0.1, -0.12, false)).toBeNull();
    expect(applyDeadzone(0.15, 0.1, 0.2).mag).toBe(0);
  });
  it("reaches full push at full tilt and scales in between", () => {
    expect(applyDeadzone(1, 0, 0.2).mag).toBeCloseTo(1);
    expect(applyDeadzone(0.6, 0, 0.2).mag).toBeCloseTo(0.5);
  });
  it("walks for a gentle tilt and runs for a full one or when run is held", () => {
    expect(stickPush(0.6, 0, false)!.gait).toBe("walk");
    expect(stickPush(1, 0, false)!.gait).toBe("run");
    expect(stickPush(0.6, 0, true)!.gait).toBe("run");
  });
  it("points the stick's down at the camera", () => {
    expect(stickPush(0, 1, false)!.z).toBeGreaterThan(0.9);
  });
  it("limits a touch drag to the stick's radius", () => {
    const s = dragToStick(300, 0, 60);
    expect(s).toEqual({ x: 1, y: 0 });
    expect(dragToStick(30, 0, 60).x).toBeCloseTo(0.5);
    expect(dragToStick(0, 0, 60)).toEqual({ x: 0, y: 0 });
  });
});

describe("gamepad", () => {
  const pad = (axes: number[], pressed: number[] = []) => ({ axes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })) });
  it("does nothing without a pad", () => {
    expect(readPad(null)).toMatchObject({ push: null, interact: false, jump: false, emotePlay: false, anyInput: false });
  });
  it("moves with the left stick and ignores a drifting one", () => {
    expect(readPad(pad([0.05, -0.08])).push).toBeNull();
    expect(readPad(pad([0.7, 0])).push).toMatchObject({ gait: "walk" });
  });
  it("moves with the d-pad", () => {
    expect(readPad(pad([0, 0], [12])).push).toMatchObject({ x: 0, z: -1 });
    expect(readPad(pad([0, 0], [15, 13])).push!.x).toBeGreaterThan(0.5);
  });
  it("runs while B or a right shoulder or trigger is held, A jumps, X interacts, Y plays an emote, the left bumper picks the next", () => {
    expect(readPad(pad([0.6, 0], [1])).push!.gait).toBe("run");
    expect(readPad(pad([0.6, 0], [7])).push!.gait).toBe("run");
    expect(readPad(pad([0, 0], [0])).jump).toBe(true);
    expect(readPad(pad([0, 0], [0])).interact).toBe(false);
    expect(readPad(pad([0, 0], [2])).interact).toBe(true);
    expect(readPad(pad([0.6, 0], [2])).push!.gait).toBe("walk");
    expect(readPad(pad([0, 0], [3])).emotePlay).toBe(true);
    expect(readPad(pad([0, 0], [4])).emoteNext).toBe(true);
  });
});

describe("touch and choosing", () => {
  it("tells a tap from a drag", () => {
    expect(isTap(4, 120)).toBe(true);
    expect(isTap(40, 120)).toBe(false);
    expect(isTap(4, 900)).toBe(false);
  });
  it("uses the first source that is pushing", () => {
    const a = { x: 1, z: 0, gait: "walk" as const };
    const b = { x: 0, z: 1, gait: "run" as const };
    expect(chooseDevice([{ device: "touch", push: null }, { device: "keyboard", push: a }, { device: "gamepad", push: b }])).toBe(a);
    expect(chooseDevice([{ device: "touch", push: null }])).toBeNull();
  });
});

describe("keys for jumping and emotes", () => {
  it("jumps with Space, which no longer interacts (E does)", () => {
    expect(JUMP_KEYS).toEqual(["Space"]);
    expect(INTERACT_KEYS).toEqual(["KeyE"]);
    expect(GAME_KEYS).toContain("Space");
  });
  it("chooses emotes with the number keys 1 to 6 (top row or number pad) and nothing else", () => {
    expect(emoteIndexForKey("Digit1")).toBe(0);
    expect(emoteIndexForKey("Numpad6")).toBe(5);
    expect(emoteIndexForKey("Digit7")).toBe(-1);
    expect(emoteIndexForKey("KeyA")).toBe(-1);
    for (const code of ["Digit1", "Digit6", "Numpad3", "KeyQ"]) expect(GAME_KEYS).toContain(code);
  });
});
