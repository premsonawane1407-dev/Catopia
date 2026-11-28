/* eslint-disable react-hooks/immutability -- the live look and the clock are rewritten in place every frame by design */

// Runs the day/night clock inside the canvas. Every frame it moves the clock on and rewrites the one live look
// (`look`) that the lights, windows, glows, post effects and the cat read from; nothing here re-renders React.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { HOUR_OF, presetAtHour, stepClock, type DayClock, type TimeSetting } from "./day-clock";
import type { TimePreset } from "./time-presets";

export interface DayCycleProps {
  clock: DayClock;
  /** The live look: the same object for the life of the game, rewritten here. */
  look: TimePreset;
  setting: TimeSetting;
}

export function DayCycle({ clock, look, setting }: DayCycleProps) {
  const latest = useRef(setting);
  const frameloop = useThree((s) => s.frameloop);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    latest.current = setting;
    // While the game is paused nothing animates, so a change made in the pause menu would otherwise show only a
    // frame of its easing: go straight to the chosen moment and draw it.
    if (frameloop === "demand" && setting !== "auto") {
      clock.hour = HOUR_OF[setting];
      Object.assign(look, presetAtHour(clock.hour));
      invalidate();
    }
  }, [setting, frameloop, clock, look, invalidate]);

  useFrame((_, delta) => {
    // A long frame (a returning tab) must not skip a chunk of the day.
    stepClock(clock, Math.min(delta, 0.1), latest.current);
    Object.assign(look, presetAtHour(clock.hour));
  }, -20);

  return null;
}
