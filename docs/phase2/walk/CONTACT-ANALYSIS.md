# Planted-paw drift: where the 1.7 px comes from (2026-11-28)

Question: is the 1.7 px a real foot slide, or pixel rounding or sampling? Short answer: **it is sampling**, not sliding. The animation itself does not slide. Eight frames cannot follow a smoothly moving cat closer than half a step.

## 1. What it is, measured by cause

Planted-paw stray = how far a paw that should be standing still wanders from the middle of its own stance, in sprite pixels on the screen (a sprite pixel is 2 screen pixels at 1600 x 900). Walk, normal speed. `analyzeContact` in `features/game/player/slide-check.ts`:

| Case | Side view (E) | Toward the camera (S) | Diagonal |
|---|---|---|---|
| The walk played continuously (no frames at all) | **0.00** | **0.00** | 0.53 |
| Eight frames (what the game draws) | **1.70** | 0.77 | 1.3 |
| Twelve frames | 1.11 | 0.51 | |
| Sixteen frames | 0.83 | 0.37 | |

- **The animation's own motion has no sliding** along the screen's axes: with the cycle played continuously a planted paw is exactly still (0.00).
- **Sampling is the 1.7 px.** Each frame stands for the middle of an eighth of the cycle (3.25 px of ground), so between frame changes the cat has moved up to half that (1.6 px) past what the picture shows. It is zero at the instant a frame arrives and grows until the next. It does not depend on speed.
- **Rounding is separate and small.** The game puts the picture on whole screen pixels so its pixels never shimmer: at most 0.25 sprite pixels (half a screen pixel), measured in the game as the 0.26 to 0.34 "picture off the true path" with no lock.
- **A third, small cause on the diagonals only (up to 0.53 px):** the cat is drawn from 28 degrees above and the camera looks down at 34, so on a diagonal the drawn paws and the ground foreshorten slightly differently. Drawing the cat from 35 degrees would remove it but changes the look of every pose; not done.

## 2. Can the paws be held steadier? Yes, by moving the cost somewhere else

The drift is the leftover between where the cat really is in its cycle and the middle of the frame being shown. If the picture is moved back along the ground by that leftover, the planted paws stay on their cobbles. The leftover then shows up as the **body stepping with the frames** instead. It is a trade, not a fix. `lock` (0 to 1) says how much of the leftover is taken out of the picture; `/play?footlock=1` turns it on in the game (default 0, off), and `window.__catopia.player().setFootLock(v)` changes it live.

Measured in the real game (full quality, 1600 x 900, `docs/phase2/walk/ingame/ingame-measurements.json`; sprite pixels):

| | Planted paws drift (max / average) | Picture off the cat's true path |
|---|---|---|
| Walk sideways, lock off | 1.81 / 0.96 | 0.26 |
| Walk sideways, **lock on** | **0.28 / 0.14** | 1.77 |
| Walk toward the camera, lock off | 0.97 / 0.45 | 0.34 |
| Walk toward the camera, **lock on** | **0.42 / 0.18** | 0.97 |
| Run sideways, lock off | 3.26 / 1.82 | 0.34 |
| Run sideways, **lock on** | **0.46 / 0.17** | 3.20 |

A half lock splits it (walk sideways: paws about 0.9, body about 0.8). The model predicted 1.70 and 1.62 and the game measured 1.81 and 1.77.

So: with the lock, a planted paw sits on its cobble to within a fraction of a pixel, but the whole cat shifts by up to 1.8 px (3.2 px when running) at about 13 steps a second against a steadily moving camera. Whether that looks better than paws that swim a little is a judgement for the eye, and the numbers cannot make it. The body step is about 3.5 screen pixels at 1600 x 900 for the walk and 6.4 for the run, so I would not lock the run.

## 3. Are the ground and the animation phase in step? Yes

- By test: through speeding up, slowing down, different speeds and letting go, the cycle equals the ground covered divided by the stride to within 0.01 of a cycle, and it does not advance while the cat is blocked by a wall or has stopped (`features/game/player/player-sim.test.ts`).
- In the running game, in real time at about 165 frames a second: slow (0.28 world units a second), normal (0.64) and run (1.52): the cycle followed the distance with a worst error of **0.0001 of a cycle** (0.0001, 0 and 0).
- On screen the ground scrolls at the cat's speed because the camera follows the cat; the animation's step per frame (3.25 px) is exactly the ground a body covers in that part of the cycle.

## 4. Would twelve frames meaningfully help?

| | Planted paws drift (side view) | Body offset | Walk frames in memory |
|---|---|---|---|
| 8 frames, no lock (now) | 1.70 | 0 | 1x |
| 8 frames, full lock | 0 | 1.6 | 1x |
| 8 frames, half lock | 0.85 | 0.8 | 1x |
| 12 frames, no lock | 1.11 | 0 | 1.5x |
| 12 frames, full lock | 0 | 1.1 | 1.5x |
| 16 frames, no lock | 0.83 | 0 | 2x |

Twelve frames take the drift from 1.7 to 1.1 px (35% less), the same amount as a 35% lock with no extra frames. The lock reaches any amount at no cost in frames; frames only shrink the cost of the lock. So I would not add frames to fix this: decide first whether the lock looks better to you at 8 frames. If the paw swim is visible to you and the body step is not, use the lock; if neither bothers you, leave it.

## 5. See it in the game

`docs/phase2/walk/ingame/index.html` plays frames the running game drew, lock off and on side by side, walking sideways, walking toward the camera and running, at real time, half speed and a quarter speed, with step buttons. To try it yourself: `/play?footlock=1` (or 0.5), then walk with the arrow keys.

Not done: the drift was not judged by a person in motion (I measured it and showed it; I cannot say whether it is visible to you), and the run's gait was not refined.
