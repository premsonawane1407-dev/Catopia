import { describe, expect, it, vi } from "vitest";
import { DEFAULT_VOLUME, MUTE_DELAY_SECONDS, PAUSED_WORLD_CUTOFF_HZ, PAUSED_WORLD_LEVEL, createAudioBus } from "./audio-bus";
import type { UiPlayer } from "./ui-sounds";

/** An audio parameter that records the targets it is given, and takes the latest one as its value straight away. */
function fakeParam(initial = 1) {
  const p = {
    value: initial,
    setTargetAtTime: vi.fn((...args: [target: number, startTime: number, timeConstant: number]) => void (p.value = args[0])),
    cancelScheduledValues: vi.fn(),
  };
  return p;
}

/** A stand-in for the browser's audio context that records what the bus does to it. */
function fakeContext(initial: "suspended" | "running" = "suspended") {
  const gains: { gain: ReturnType<typeof fakeParam>; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const filters: { type: string; frequency: ReturnType<typeof fakeParam>; Q: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const ctx = {
    state: initial as string,
    currentTime: 0,
    destination: { name: "destination" },
    createGain: vi.fn(() => {
      const g = { gain: fakeParam(), connect: vi.fn(), disconnect: vi.fn() };
      gains.push(g);
      return g;
    }),
    createBiquadFilter: vi.fn(() => {
      const f = { type: "allpass", frequency: fakeParam(22050), Q: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
      filters.push(f);
      return f;
    }),
    resume: vi.fn(async () => void (ctx.state = "running")),
    suspend: vi.fn(async () => void (ctx.state = "suspended")),
    close: vi.fn(async () => void (ctx.state = "closed")),
  };
  return { ctx, gains, filters, context: ctx as unknown as AudioContext };
}

function setup(initial: "suspended" | "running" = "suspended") {
  const fake = fakeContext(initial);
  const stop = vi.fn();
  const startAmbience = vi.fn<(context: AudioContext, output: AudioNode) => () => void>(() => stop);
  const uiPlayer = vi.fn<UiPlayer>();
  const createUiPlayer = vi.fn<(context: AudioContext, destination: AudioNode) => UiPlayer>(() => uiPlayer);
  const createContext = vi.fn(() => fake.context);
  const bus = createAudioBus({ createContext, startAmbience, createUiPlayer });
  /** The master is the first gain the bus makes, then the game's own sound. */
  const master = () => fake.gains[0];
  const world = () => fake.gains[1];
  return { ...fake, stop, startAmbience, uiPlayer, createUiPlayer, createContext, bus, master, world };
}

describe("createAudioBus", () => {
  it("does nothing until it is unlocked", () => {
    const { bus, createContext } = setup();
    expect(bus.state()).toBe("idle");
    expect(bus.output()).toBeNull();
    expect(createContext).not.toHaveBeenCalled();
  });

  it("starts the context, the ambience and the master volume when unlocked", async () => {
    const { bus, ctx, master, startAmbience, filters } = setup();
    expect(await bus.unlock()).toBe("running");
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(master().gain.value).toBeCloseTo(DEFAULT_VOLUME, 6);
    expect(bus.output()).not.toBeNull();
    // The ambience plays into the game's own sound path, not straight into the master.
    expect(startAmbience).toHaveBeenCalledTimes(1);
    expect(startAmbience.mock.calls[0][1]).toBe(filters[0]);
  });

  it("builds the menu's sound player on the master, so mute silences it too", async () => {
    const { bus, createUiPlayer, master } = setup();
    await bus.unlock();
    expect(createUiPlayer).toHaveBeenCalledTimes(1);
    expect(createUiPlayer.mock.calls[0][1]).toBe(master());
  });

  it("creates only one context however often it is unlocked", async () => {
    const { bus, createContext, startAmbience } = setup();
    await bus.unlock();
    await bus.unlock();
    expect(createContext).toHaveBeenCalledTimes(1);
    expect(startAmbience).toHaveBeenCalledTimes(1);
  });

  it("reports unsupported, and stays quiet, when the browser has no audio", async () => {
    const bus = createAudioBus({ createContext: () => null });
    expect(await bus.unlock()).toBe("unsupported");
    expect(bus.state()).toBe("unsupported");
    expect(() => {
      bus.setMuted(true);
      bus.setVolume(0.2);
      bus.setPaused(true);
      bus.playUi("select");
    }).not.toThrow();
    await expect(bus.suspend()).resolves.toBeUndefined();
  });
});

describe("mute", () => {
  it("really silences the output, after a moment so the sound announcing it can finish, and unmutes at once", async () => {
    const { bus, master, ctx } = setup();
    await bus.unlock();
    ctx.currentTime = 4;
    bus.setMuted(true);
    expect(bus.isMuted()).toBe(true);
    expect(master().gain.value).toBe(0);
    const lastCall = master().gain.setTargetAtTime.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe(0);
    expect(lastCall[1]).toBeCloseTo(4 + MUTE_DELAY_SECONDS, 9);

    bus.setMuted(false);
    expect(master().gain.value).toBeCloseTo(DEFAULT_VOLUME, 6);
    expect(master().gain.setTargetAtTime.mock.calls.at(-1)![1]).toBe(4);
  });

  it("forgets a mute that was still waiting when the sound is turned back on", async () => {
    const { bus, master } = setup();
    await bus.unlock();
    bus.setMuted(true);
    const cancelsBefore = master().gain.cancelScheduledValues.mock.calls.length;
    bus.setMuted(false);
    expect(master().gain.cancelScheduledValues.mock.calls.length).toBe(cancelsBefore + 1);
  });

  it("keeps a mute chosen before the first click", async () => {
    const { bus, master } = setup();
    bus.setMuted(true);
    await bus.unlock();
    expect(master().gain.value).toBe(0);
  });

  it("keeps the volume between 0 and 1, and a muted bus muted when the volume changes", async () => {
    const { bus, master } = setup();
    await bus.unlock();
    bus.setVolume(5);
    expect(bus.volume()).toBe(1);
    bus.setVolume(-2);
    expect(bus.volume()).toBe(0);
    bus.setVolume(Number.NaN);
    expect(bus.volume()).toBe(DEFAULT_VOLUME);
    bus.setMuted(true);
    bus.setVolume(0.9);
    expect(master().gain.value).toBe(0);
  });
});

describe("pausing the game", () => {
  it("quiets and muffles the game's own sound, and leaves the menu's sounds and the master alone", async () => {
    const { bus, world, master, filters } = setup();
    await bus.unlock();
    const masterBefore = master().gain.value;
    bus.setPaused(true);
    expect(bus.isPaused()).toBe(true);
    expect(world().gain.value).toBe(PAUSED_WORLD_LEVEL);
    expect(filters[0].frequency.value).toBe(PAUSED_WORLD_CUTOFF_HZ);
    expect(master().gain.value).toBe(masterBefore);
  });

  it("brings the game's sound back when it resumes", async () => {
    const { bus, world, filters } = setup();
    await bus.unlock();
    bus.setPaused(true);
    bus.setPaused(false);
    expect(world().gain.value).toBe(1);
    expect(filters[0].frequency.value).toBeGreaterThan(15000);
  });

  it("keeps a pause chosen before the first click", async () => {
    const { bus, world } = setup();
    bus.setPaused(true);
    await bus.unlock();
    expect(world().gain.value).toBe(PAUSED_WORLD_LEVEL);
  });

  it("keeps the context running so the menu can make sounds", async () => {
    const { bus, ctx } = setup();
    await bus.unlock();
    bus.setPaused(true);
    expect(ctx.suspend).not.toHaveBeenCalled();
    expect(bus.state()).toBe("running");
  });
});

describe("menu sounds", () => {
  it("are ignored until the audio is unlocked", () => {
    const { bus, uiPlayer } = setup();
    bus.playUi("move");
    expect(uiPlayer).not.toHaveBeenCalled();
    expect(bus.uiStats()).toEqual({ requested: 0, last: null });
  });

  it("are passed to the player with their options once the audio is running", async () => {
    const { bus, uiPlayer } = setup();
    await bus.unlock();
    bus.playUi("move", { step: 3 });
    bus.playUi("adjust", { direction: -1 });
    expect(uiPlayer).toHaveBeenNthCalledWith(1, "move", { step: 3 });
    expect(uiPlayer).toHaveBeenNthCalledWith(2, "adjust", { direction: -1 });
    expect(bus.uiStats()).toEqual({ requested: 2, last: "adjust" });
  });

  it("are not queued up while the context is suspended (a hidden tab)", async () => {
    const { bus, uiPlayer } = setup();
    await bus.unlock();
    await bus.suspend();
    bus.playUi("select");
    expect(uiPlayer).not.toHaveBeenCalled();
    await bus.resume();
    bus.playUi("select");
    expect(uiPlayer).toHaveBeenCalledTimes(1);
  });
});

describe("suspending and ending", () => {
  it("stops all processing for a hidden tab and starts it again", async () => {
    const { bus } = setup();
    await bus.unlock();
    await bus.suspend();
    expect(bus.state()).toBe("suspended");
    await bus.resume();
    expect(bus.state()).toBe("running");
  });

  it("stops the ambience and closes the context when disposed, and can start fresh afterwards", async () => {
    const { bus, ctx, stop, createContext } = setup();
    await bus.unlock();
    await bus.dispose();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(ctx.close).toHaveBeenCalledTimes(1);
    expect(bus.state()).toBe("idle");
    expect(bus.output()).toBeNull();
    ctx.state = "suspended";
    await bus.unlock();
    expect(createContext).toHaveBeenCalledTimes(2);
  });
});
