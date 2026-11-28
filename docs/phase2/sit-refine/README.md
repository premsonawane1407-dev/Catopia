# Sitting cat refinement (2026-11-28)

**Update 2026-11-29: the refined look is now the game's default**, after your feedback on it (a fixed sleeping pose, hind legs tucked in, bigger ears and eyes; see the end). The first version is still there: `/play?look=original` draws it, and `DEFAULT_LOOK` in `features/game/cat/model.ts` sets the default. The pictures below were first made as a side-by-side proposal; the front-view pictures have been redrawn with the latest changes.

The coat is unchanged: the same orange, dark orange and cream ramps (the only addition is the whisker colour that was already in the palette). The frame size (72 x 60) and the five sit frames (four breathing, one blink) are unchanged, so the animation system needs no change.

## Look at these

| File | What it shows |
|---|---|
| `front-original-vs-refined.png` | The front-facing sit, original left, refined right, 10 times enlarged |
| `in-game-original-vs-refined.png` | The same two in the running game at its real pixel size, with the blur, bloom and lamp light (3 times enlarged from the screen) |
| `sit-frames-original-vs-refined.png` | All five sit frames of each, original on top |
| `sit-all-directions-original-vs-refined.png` | The sitting cat from all eight directions, original on top, so you can see the refinement holds up from the side and the back |
| `other-poses-original-vs-refined.png` | Standing and walking faces, original on top: the refined face and head apply to every pose, so the cat stays one character |

## What changed, against your list

1. **Head:** slightly narrower and more natural, with a softer cheek line; the ears are wider at the base and a little less tall, still triangular, and show more of the pink inner ear.
2. **Face:** a small pink nose, a short mouth line with a "w" under it, and whiskers (two a side) that reach out past the cheeks; the muzzle stays cream.
3. **Eyes:** still green, now round, set a little lower and further apart, with an upright pupil and a dark upper lid. At this size they are 4 to 5 pixels across, so the glint is a single pixel that is hard to see in some frames.
4. **Body:** the chest is fuller (30% wider) and the neck longer, so it no longer looks squeezed under the head; the lighting comes from more in front, so the side turned from the light is no longer one dark slab.
5. **Front paws:** two separate columns with daylight between them (a test checks this).
6. **Hind legs:** the thighs are drawn 60% fuller so they read as round hips on either side of the body, with the hind paws at the sides. From behind (N in the all-directions sheet) the two round haunches read clearly.
7. **Tail:** starts further back and to the side, comes out from behind the body and curls round to the front with the tip lifted.
8. **Fur:** the same tabby stripes and cream patches; the chest patch is larger and sits on the fuller chest.

## Honest assessment

- The face, the paws and the haunches from the back are clearly better. From the front the hips still read more like a broad base than two separate round haunches, and the tail is half hidden in the shadow side. I stopped here so you can judge before I polish further.
- The refined face and head are drawn in every pose, not only sitting (otherwise the cat would change face when it stands up). The refined body (fuller chest, thighs, tail) is only in the sitting, sitting-down and lying-down poses.
- Checks: the refined look passes the same tests as the original (nothing cut off by the frame in any pose or direction, the palette cap, one connected piece, strays under 5%, a steady amount of cat across the sit frames), plus one that the front paws are apart. It has not been scored by the quality report yet, and not been reviewed by you in motion.
- How it was made: `node scripts/run-ts.mjs scripts/cat/sit-compare.ts docs/phase2/sit-refine 10` draws the first four files from the same code the game runs.

## Changes after your feedback (2026-11-29)

- **Sleeping, fixed (both looks).** The old sleeping pose was a lumpy ball: legs poking out, the head hard to find. It is now a loaf: the body lying low on its belly, the hind legs tucked under the hips, the front paws stretched out in front, the head resting on them with the nose down and the eyes closed, and the tail wrapped round the side toward the nose. Seen from the side it is under 30 pixels tall (a test checks this). The lie-down in between flows from sitting into the loaf. Checked by rendering all eight directions and by running the real game's state machine (standing, sitting down, sitting, lying down, asleep).
- **Sitting legs not out sideways (both looks).** The hind feet moved in from 7.4 to 5.8 pixels either side of the middle (5.6 in the refined look) and the knees now point forward and up instead of outward, so the legs and thighs sit under the body. The tail curls tighter and stays close. The cat is about 30 pixels wide from the front, down from 37 (a test checks it stays at 31 or less).
- **Cuter (refined look).** The ears are about 10% taller and 10% wider with more pink inside, the head a little rounder and the eyes bigger.
- **Checks:** type-check, lint and the build pass, and 346 tests pass. Quality scores for the refined look (all coats, 288 frames each): mean 87.2 to 94.3, worst frame 79.2 (the pale Biscuit coat; every other coat's worst is 81.8 or higher), strays at most 2.4%, palette 25 to 32 colours, no pixel off the palette. Not checked: how the new sleeping loop looks to you in motion in the game (the browser window was hidden when I tried a capture, so there is no new in-game picture; the state machine was run and the sheets rendered).
