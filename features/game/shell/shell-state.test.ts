import { describe, expect, it } from "vitest";
import { hasCanvas, initialShellState, loopRunning, shellReducer, type ShellEvent, type ShellState } from "./shell-state";

const run = (events: ShellEvent[], from: ShellState = initialShellState) => events.reduce(shellReducer, from);

describe("shellReducer happy path", () => {
  it("checks, loads, becomes ready, then plays", () => {
    expect(run([{ type: "supported" }]).phase).toBe("loading");
    expect(run([{ type: "supported" }, { type: "loaded" }]).phase).toBe("ready");
    expect(run([{ type: "supported" }, { type: "loaded" }, { type: "start" }]).phase).toBe("playing");
  });

  it("pauses and resumes", () => {
    const playing = run([{ type: "supported" }, { type: "loaded" }, { type: "start" }]);
    expect(run([{ type: "pause" }], playing).phase).toBe("paused");
    expect(run([{ type: "pause" }, { type: "resume" }], playing).phase).toBe("playing");
  });
});

describe("shellReducer fallbacks", () => {
  it("shows the fallback when WebGL is unsupported", () => {
    expect(run([{ type: "unsupported" }]).phase).toBe("unsupported");
  });

  it("cannot leave the unsupported state", () => {
    const state = run([{ type: "unsupported" }]);
    for (const event of [{ type: "loaded" }, { type: "start" }, { type: "retry" }, { type: "supported" }] as ShellEvent[]) {
      expect(shellReducer(state, event)).toBe(state);
    }
  });

  it("records an error message and lets the player retry with a new attempt number", () => {
    const failed = run([{ type: "supported" }, { type: "error", message: "assets failed" }]);
    expect(failed).toMatchObject({ phase: "error", message: "assets failed" });
    const retried = shellReducer(failed, { type: "retry" });
    expect(retried).toEqual({ phase: "loading", attempt: 1 });
  });

  it("handles a lost graphics context while playing and recovers through retry", () => {
    const playing = run([{ type: "supported" }, { type: "loaded" }, { type: "start" }]);
    const lost = shellReducer(playing, { type: "contextLost" });
    expect(lost.phase).toBe("lost");
    expect(shellReducer(lost, { type: "retry" }).phase).toBe("loading");
  });
});

describe("shellReducer ignores impossible transitions", () => {
  it("does not start before the world is ready or pause when not playing", () => {
    const loading = run([{ type: "supported" }]);
    expect(shellReducer(loading, { type: "start" })).toBe(loading);
    expect(shellReducer(loading, { type: "pause" })).toBe(loading);
    expect(shellReducer(loading, { type: "resume" })).toBe(loading);
  });

  it("does not skip the capability check", () => {
    expect(shellReducer(initialShellState, { type: "loaded" })).toBe(initialShellState);
    expect(shellReducer(initialShellState, { type: "start" })).toBe(initialShellState);
  });
});

describe("phase helpers", () => {
  it("has a canvas only while the world is on screen", () => {
    expect(hasCanvas("checking")).toBe(false);
    expect(hasCanvas("unsupported")).toBe(false);
    expect(hasCanvas("lost")).toBe(false);
    expect(hasCanvas("error")).toBe(false);
    for (const phase of ["loading", "ready", "playing", "paused"] as const) expect(hasCanvas(phase)).toBe(true);
  });

  it("stops the render loop while paused", () => {
    expect(loopRunning("paused")).toBe(false);
    expect(loopRunning("playing")).toBe(true);
    expect(loopRunning("ready")).toBe(true);
  });
});
