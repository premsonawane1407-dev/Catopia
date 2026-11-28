# Walk refinement (2026-11-28)

The brief: refine the existing cat's eight-frame walk without redesigning the cat. The cat's colours, head, face, ears, tail, body size, outline and shading are unchanged. The only visible changes to the cat itself are in the legs and how high the body stands (see below), so the same cat is shown with a longer, better-bent leg.

## Open these first

| File | What it is |
|---|---|
| `walk-compare.html` | Original and refined side by side, with a ground that scrolls at exactly the walking speed. Slow, normal and fast speed buttons, eight directions, step forward and back. Double-click to open |
| `comparison-E.png`, `comparison-S.png`, `comparison-N.png` | Original (top row) against refined (bottom row), frames 1 to 8 left to right, side view and the two views along the camera's axis |
| `loop-refined-E.apng` (and `-S`, `-N`) | The refined walk looping over a scrolling ground. Browsers play it; the image viewer in some apps shows only the first frame |
| `loop-original-vs-refined-E.apng` (and `-S`, `-N`) | The same, original on the left, refined on the right |
| `refined-walk-sheet.png` | The updated eight-frame sprite sheet: 8 frames across, 8 directions down, 72 x 60 px each, transparent background (576 x 480). `original-walk-sheet.png` is the same layout for the old walk |
| `frames/walk-E-1.png` to `walk-E-8.png` (and `S`, `N`) | The individual frames, 72 x 60, transparent. `frames/preview-E.png` shows the side view enlarged 6 times |
| `foot-slide-report.json` | Foot sliding measured at slow (0.4 x), normal and fast (1.6 x) walking speed, in all eight directions |

The game's own sheet (`../sheet-marmalade.png`) is regenerated with the same frames; the game draws its sheet itself, so nothing needs copying.

## What was wrong, and what changed

1. **The hind leg had no hock.** A cat's back leg is a Z: thigh forward, shin back, a long hock bone, then the paw. It was one straight two-part tube, so it could not show the lift, fold and reach in your references. It now has the hock (and the front leg a short wrist bone); the paw folds back behind the wrist or hock as the leg lifts and swings forward to land, and the heel leans back as the leg pushes off.
2. **The swing was a plain arc.** The paw now leaves the ground quickly, passes close under the body, reaches forward, and turns slightly toward the middle line so the paws walk in a track.
3. **The frames were drawn at the start of each eighth of the cycle**, so every shown frame was off by up to a whole body step. Each frame is now drawn for the middle of its eighth, so the shown picture is never more than half a step from the truth, and the lift-off, passing and landing poses of each leg fall on different frames (two or three paws bear weight in every frame, never fewer, a four-beat gait: left hind, left front, right hind, right front, a quarter cycle apart).
4. **The body motion was not tied to the footfalls.** It now bounces by under a pixel, highest in the middle of each diagonal pair of supporting paws; the shoulders and hips turn against each other; the head does less than the body; the tail sways a little less.
5. **The cat stood low on short legs.** The whole body now stands 2.5 pixels higher at the same body size so the legs have room to bend and stretch; the legs gained a bone each (wrist, hock) and so are 2 to 3 px longer overall; idle and the other clips stand at the same height, so there is no jump between them. The legs on the far side of the body are one tone darker so the near legs read against them.
6. **Stopping.** After the player lets go the cat used to switch to the standing pose at once and glide to a halt in it, which slid the feet. It now keeps stepping, planted, while it slows down, and stands when it has stopped.

Unchanged and kept: the step cycle follows the distance travelled (so it adapts to any speed), the ground scroll matches the walking speed, the 8-frame structure, frame size, centring and transparent edges; no pose touches the edge of its frame (a test fails if one does).

## Checks (all in the test suite, 329 tests passing)

- Two or three paws on the ground in every frame; the landing order and spacing; every leg can reach its paw; the planted paw moves back by exactly one body step per frame.
- The last frame flows into the first with no bigger a jump than any other step.
- Bounce at most 1 px, side sway at most 1.3 px, the head moves less than the body.
- Through the real step logic (the cycle driven by distance) at 0.4, 1 and 1.6 times the walking speed, in all eight directions, a planted paw never strays more than half a body step from the middle of its stance, and the figure is the same at every speed.

## What eight frames cannot do (explained before proposing more)

Each frame covers an eighth of the cycle, which is 3.25 pixels of ground, while the cat moves smoothly. So a planted paw is drawn up to half a step (1.6 px) ahead of and behind its true place, back to zero each time the next frame arrives. Measured: 1.7 px at most for the side view, 1.3 on the diagonals, 0.8 toward or away from the camera, identical at slow, normal and fast speed (`foot-slide-report.json`). That is the width of a pixel and a half of the cat, so it is not a slide that travels, but a flicker of position you can see when you look for it on a scrolling ground. Eight frames can have this much and no less; 12 frames would halve it (about 1.1 px) and 16 would make it about 0.8, at 50% and 100% more walk frames in memory. I have not added frames: it is a choice for you after you have watched it.

Also not solved:

- **Stopping mid-stride still snaps to the standing pose** once the cat has fully stopped (a stop lasts about 0.1 s of stepping first). A stopping step would need extra frames: two per walk frame and direction (128 more).
- **The legs are short** compared with the cats in your references. The cat's proportions were kept, as asked; the body is only 2.5 px higher. A longer-legged cat is a different cat.
- **The run** shares the leg changes (hock, wrist) but its gait and body motion were not refined in this pass, and its planted paws stray up to 3.1 px (half of its 6.25 px step).
- **Not seen in motion in the game by a person.** The measurements are through the real step logic; the preview animations are generated from the same frames.
