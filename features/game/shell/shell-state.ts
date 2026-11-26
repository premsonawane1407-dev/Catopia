// The game shell as a small state machine. All the "what screen am I on" rules live here, away from
// the visual components, so they can be tested and so impossible transitions are simply ignored.

export type ShellPhase =
  | "checking" // working out whether the browser can run the game
  | "unsupported" // no WebGL 2: show the friendly fallback
  | "loading" // fetching and preparing the world
  | "ready" // world is drawn behind a "press to begin" card
  | "playing"
  | "paused"
  | "lost" // the graphics context was lost while playing
  | "error";

export interface ShellState {
  phase: ShellPhase;
  message?: string;
  /** Bumped on every retry so the canvas can be remounted from scratch. */
  attempt: number;
}

export type ShellEvent =
  | { type: "supported" }
  | { type: "unsupported" }
  | { type: "loaded" }
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "contextLost" }
  | { type: "error"; message: string }
  | { type: "retry" };

export const initialShellState: ShellState = { phase: "checking", attempt: 0 };

export function shellReducer(state: ShellState, event: ShellEvent): ShellState {
  const { phase } = state;
  switch (event.type) {
    case "supported":
      return phase === "checking" ? { ...state, phase: "loading" } : state;
    case "unsupported":
      return phase === "checking" ? { ...state, phase: "unsupported" } : state;
    case "loaded":
      return phase === "loading" ? { ...state, phase: "ready" } : state;
    case "start":
      return phase === "ready" ? { ...state, phase: "playing" } : state;
    case "pause":
      return phase === "playing" ? { ...state, phase: "paused" } : state;
    case "resume":
      return phase === "paused" ? { ...state, phase: "playing" } : state;
    case "contextLost":
      return phase === "ready" || phase === "playing" || phase === "paused" ? { ...state, phase: "lost" } : state;
    case "error":
      return phase === "loading" || phase === "ready" || phase === "playing" || phase === "paused"
        ? { ...state, phase: "error", message: event.message }
        : state;
    case "retry":
      return phase === "error" || phase === "lost" ? { phase: "loading", attempt: state.attempt + 1 } : state;
  }
}

/** Phases in which the 3D canvas exists. */
export function hasCanvas(phase: ShellPhase): boolean {
  return phase === "loading" || phase === "ready" || phase === "playing" || phase === "paused";
}

/** Phases in which the render loop should be running. A paused game stops drawing to save battery. */
export function loopRunning(phase: ShellPhase): boolean {
  return phase === "loading" || phase === "ready" || phase === "playing";
}
