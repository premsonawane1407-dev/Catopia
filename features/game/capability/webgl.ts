// Can this browser run the game? Three.js needs WebGL 2, so that is what we probe for.

interface ProbeContext {
  getExtension?: (name: string) => { loseContext?: () => void } | null;
}

export interface CanvasLike {
  getContext(id: string): unknown;
}

/**
 * Tries to open a WebGL 2 context on a throwaway canvas and releases it again, because browsers cap
 * the number of live contexts. `createCanvas` is injectable so the logic can be tested without a DOM.
 */
export function supportsWebGL(createCanvas: () => CanvasLike = () => document.createElement("canvas")): boolean {
  try {
    const gl = createCanvas().getContext("webgl2") as ProbeContext | null;
    if (!gl) return false;
    gl.getExtension?.("WEBGL_lose_context")?.loseContext?.();
    return true;
  } catch {
    return false;
  }
}
