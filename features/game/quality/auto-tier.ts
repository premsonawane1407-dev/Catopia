// Picks a quality tier from measured frame times. Pure logic: it is fed frame durations and says when
// to change tier, so it can be tested without a GPU.
//
// Frame time alone cannot show headroom when the display is capping the frame rate, so the governor
// steps down quickly but steps up only on trial: after a long comfortable stretch it tries the richer
// tier, judges the next few windows, and goes back (and never tries that tier again) if it was too slow.
import { cheaperTier, richerTier, type TierName } from "./tiers";

export interface GovernorOptions {
  /** Frames per evaluation window. */
  windowFrames?: number;
  /** A window averaging above this many ms counts as slow (22 ms is about 45 fps). */
  slowMs?: number;
  /** A window averaging at or below this many ms counts as comfortable. */
  fastMs?: number;
  /** Consecutive slow windows needed before stepping down. */
  downWindows?: number;
  /** Comfortable time needed before trying a richer tier. */
  upAfterMs?: number;
  /** Windows judged after trying a richer tier. */
  trialWindows?: number;
  /** Cap on tier changes per session, so it can never oscillate forever. */
  maxChanges?: number;
  /** Frames longer than this (tab switch, a garbage-collection pause) are ignored. */
  ignoreAboveMs?: number;
}

const DEFAULTS: Required<GovernorOptions> = {
  windowFrames: 90,
  slowMs: 22,
  fastMs: 17.5,
  downWindows: 2,
  upAfterMs: 20000,
  trialWindows: 2,
  maxChanges: 8,
  ignoreAboveMs: 250,
};

export interface Governor {
  /** Feed one frame duration in milliseconds. Returns the new tier if it just changed, otherwise null. */
  push(frameMs: number): TierName | null;
  tier(): TierName;
  changes(): number;
  /** Jump to a tier (for example when the player picks one) and forget the evidence so far. */
  setTier(tier: TierName): void;
}

export function createGovernor(start: TierName, options: GovernorOptions = {}): Governor {
  const o = { ...DEFAULTS, ...options };
  let tier = start;
  let frames = 0;
  let sum = 0;
  let slowStreak = 0;
  let comfortMs = 0;
  let changeCount = 0;
  let trial: { from: TierName; windowsLeft: number } | null = null;
  const blocked = new Set<TierName>();

  const change = (to: TierName) => {
    tier = to;
    changeCount += 1;
    slowStreak = 0;
    comfortMs = 0;
  };

  const evaluate = (avg: number, windowMs: number): TierName | null => {
    if (trial) {
      if (avg > o.slowMs) {
        // The richer tier was too slow: go back and never try it again this session.
        const back = trial.from;
        blocked.add(tier);
        trial = null;
        change(back);
        return tier;
      }
      trial.windowsLeft -= 1;
      if (trial.windowsLeft <= 0) trial = null;
      return null;
    }
    if (avg > o.slowMs) {
      comfortMs = 0;
      slowStreak += 1;
      if (slowStreak >= o.downWindows) {
        const lower = cheaperTier(tier);
        if (lower && changeCount < o.maxChanges) {
          change(lower);
          return tier;
        }
        slowStreak = 0;
      }
      return null;
    }
    slowStreak = 0;
    if (avg <= o.fastMs) {
      comfortMs += windowMs;
      if (comfortMs >= o.upAfterMs) {
        const higher = richerTier(tier);
        if (higher && !blocked.has(higher) && changeCount < o.maxChanges) {
          const from = tier;
          change(higher);
          trial = { from, windowsLeft: o.trialWindows };
          return tier;
        }
        comfortMs = 0;
      }
    } else {
      comfortMs = 0;
    }
    return null;
  };

  return {
    push(frameMs) {
      if (!(frameMs > 0) || frameMs > o.ignoreAboveMs) return null;
      frames += 1;
      sum += frameMs;
      if (frames < o.windowFrames) return null;
      const avg = sum / frames;
      const windowMs = sum;
      frames = 0;
      sum = 0;
      return evaluate(avg, windowMs);
    },
    tier: () => tier,
    changes: () => changeCount,
    setTier(next) {
      tier = next;
      frames = 0;
      sum = 0;
      slowStreak = 0;
      comfortMs = 0;
      trial = null;
    },
  };
}
