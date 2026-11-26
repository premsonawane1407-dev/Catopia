import { describe, expect, it, vi } from "vitest";
import { BEYOND_THE_VALE, startMusic } from "./music";

/** A stand-in for an <audio> element: it records what the player does and lets a test play out its events. */
function fakeElement(play: () => Promise<void> = async () => {}) {
  const listeners = new Map<string, (() => void)[]>();
  const element = {
    preload: "",
    loop: false,
    src: "",
    paused: true,
    currentTime: 0,
    duration: 363,
    addEventListener: vi.fn((type: string, listener: () => void) => void listeners.set(type, [...(listeners.get(type) ?? []), listener])),
    removeAttribute: vi.fn(),
    load: vi.fn(),
    play: vi.fn(async () => {
      await play();
      element.paused = false;
      element.emit("playing");
    }),
    pause: vi.fn(() => void (element.paused = true)),
    emit: (type: string) => listeners.get(type)?.forEach((listener) => listener()),
  };
  return element;
}

/** A stand-in for the audio context: just the two nodes the music needs, and a record of how they were joined. */
function fakeContext() {
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const level = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
  const context = { createMediaElementSource: vi.fn(() => source), createGain: vi.fn(() => level) };
  return { source, level, context, asContext: context as unknown as AudioContext };
}

const output = { name: "world filter" } as unknown as AudioNode;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup(play?: () => Promise<void>) {
  const element = fakeElement(play);
  const fake = fakeContext();
  const player = startMusic(fake.asContext, output, { createElement: () => element as unknown as HTMLAudioElement });
  return { element, player, ...fake };
}

describe("the music track", () => {
  it("is a web path to an mp3 under public/audio, played well below the file's own level", () => {
    expect(BEYOND_THE_VALE.src).toMatch(/^\/audio\/.+\.mp3$/);
    expect(BEYOND_THE_VALE.level).toBeGreaterThan(0);
    expect(BEYOND_THE_VALE.level).toBeLessThan(1);
  });
});

describe("startMusic", () => {
  it("streams the file, looped, through a level control into the output it is given", () => {
    const { element, source, level, context, asContext } = setup();
    expect(element.src).toBe(BEYOND_THE_VALE.src);
    expect(element.loop).toBe(true);
    expect(element.preload).toBe("auto");
    expect(context.createMediaElementSource).toHaveBeenCalledWith(element);
    expect(level.gain.value).toBe(BEYOND_THE_VALE.level);
    expect(source.connect).toHaveBeenCalledWith(level);
    expect(level.connect).toHaveBeenCalledWith(output);
    expect(asContext).toBeDefined();
  });

  it("starts playing straight away, inside the click that unlocked the audio", () => {
    const { element } = setup();
    expect(element.play).toHaveBeenCalledTimes(1);
  });

  it("reports playing once the browser has started it, with where it is and how long it is", async () => {
    const { element, player } = setup();
    element.currentTime = 12.5;
    await flush();
    expect(player.stats()).toEqual({ state: "playing", position: 12.5, duration: 363 });
  });

  it("reports zero for a position or length the browser does not know yet", async () => {
    const { element, player } = setup();
    element.duration = Number.NaN;
    await flush();
    expect(player.stats().duration).toBe(0);
  });
});

describe("pausing and playing", () => {
  it("pauses and continues the same element", async () => {
    const { element, player } = setup();
    await flush();
    player.pause();
    expect(element.pause).toHaveBeenCalledTimes(1);
    expect(player.stats().state).toBe("paused");
    player.play();
    await flush();
    expect(element.play).toHaveBeenCalledTimes(2);
    expect(player.stats().state).toBe("playing");
  });

  it("calls itself blocked, without throwing, when the browser refuses to start it, and tries again on the next play", async () => {
    let refuse = true;
    const { element, player } = setup(async () => {
      if (refuse) throw new DOMException("play() failed because the user didn't interact with the document first.", "NotAllowedError");
    });
    await flush();
    expect(player.stats().state).toBe("blocked");
    expect(element.paused).toBe(true);
    refuse = false;
    player.play();
    await flush();
    expect(player.stats().state).toBe("playing");
  });

  it("reports failed, without throwing, when the file cannot be loaded", async () => {
    const { element, player } = setup();
    await flush();
    expect(() => element.emit("error")).not.toThrow();
    expect(player.stats().state).toBe("failed");
  });
});

describe("seek and stop", () => {
  it("jumps to a time for verification", () => {
    const { element, player } = setup();
    player.seek(361);
    expect(element.currentTime).toBe(361);
  });

  it("stops for good: stops the download and lets go of the audio nodes", () => {
    const { element, player, source, level } = setup();
    player.stop();
    expect(element.pause).toHaveBeenCalled();
    expect(element.removeAttribute).toHaveBeenCalledWith("src");
    expect(element.load).toHaveBeenCalledTimes(1);
    expect(source.disconnect).toHaveBeenCalledTimes(1);
    expect(level.disconnect).toHaveBeenCalledTimes(1);
  });
});
