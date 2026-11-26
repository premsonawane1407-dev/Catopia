// Checks that the walk and run do not slide their feet. In the cat's own frame a planted paw must move back
// by exactly the distance the body travels in a frame (stride divided by frame count), and every leg must be
// able to reach its paw. Both are facts about the animation data, so they are checked without drawing.
import { CLIPS } from "./clips";
import { LEG_NAMES, legShortfall, type LegName } from "./model";
import { poseFor, RUN_GAIT, WALK_GAIT, type Gait } from "./poses";

export interface GaitReport {
  /** Frame pairs where a paw stayed planted. */
  plantedPairs: number;
  /** Largest gap, in pixels, between how far a planted paw moved and how far the body travelled. */
  maxSlide: number;
  /** Largest amount any leg was asked to reach past its full length. */
  maxShortfall: number;
  /** Largest height of a planted paw above the ground, in pixels. */
  maxPlantedHeight: number;
  /** Frames in which no paw touched the ground (the gallop's flight). */
  flightFrames: number;
}

export function checkGait(clip: "walk" | "run", gait: Gait = clip === "walk" ? WALK_GAIT : RUN_GAIT): GaitReport {
  const n = CLIPS[clip].frames;
  const step = gait.stride / n;
  let plantedPairs = 0;
  let maxSlide = 0;
  let maxShortfall = 0;
  let maxPlantedHeight = 0;
  let flightFrames = 0;
  for (let f = 0; f < n; f++) {
    const a = poseFor(clip, f);
    const b = poseFor(clip, (f + 1) % n);
    let anyPlanted = false;
    for (const leg of LEG_NAMES as readonly LegName[]) {
      maxShortfall = Math.max(maxShortfall, legShortfall(a, leg));
      const plantedA = a.legs[leg].foot[1] <= 1.5 + 1e-6;
      const plantedB = b.legs[leg].foot[1] <= 1.5 + 1e-6;
      if (plantedA) {
        anyPlanted = true;
        maxPlantedHeight = Math.max(maxPlantedHeight, a.legs[leg].foot[1] - 1.5);
      }
      if (plantedA && plantedB) {
        plantedPairs++;
        const moved = a.legs[leg].foot[2] - b.legs[leg].foot[2];
        maxSlide = Math.max(maxSlide, Math.abs(moved - step));
      }
    }
    if (!anyPlanted) flightFrames++;
  }
  return { plantedPairs, maxSlide, maxShortfall, maxPlantedHeight, flightFrames };
}
