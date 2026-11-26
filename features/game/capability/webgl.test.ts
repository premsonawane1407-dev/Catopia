import { describe, expect, it, vi } from "vitest";
import { supportsWebGL } from "./webgl";

describe("supportsWebGL", () => {
  it("is true when a WebGL 2 context can be created, and releases it", () => {
    const loseContext = vi.fn();
    const getContext = vi.fn(() => ({ getExtension: () => ({ loseContext }) }));
    expect(supportsWebGL(() => ({ getContext }))).toBe(true);
    expect(getContext).toHaveBeenCalledWith("webgl2");
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it("is false when the browser returns no context", () => {
    expect(supportsWebGL(() => ({ getContext: () => null }))).toBe(false);
  });

  it("is false (not a crash) when probing throws", () => {
    expect(
      supportsWebGL(() => {
        throw new Error("no canvas");
      }),
    ).toBe(false);
  });

  it("still reports support when the lose-context extension is missing", () => {
    expect(supportsWebGL(() => ({ getContext: () => ({}) }))).toBe(true);
  });
});
