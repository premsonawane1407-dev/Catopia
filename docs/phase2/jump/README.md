# Jumping, with real physics (2026-11-28)

This replaces the first time-based hop described in `../jump-emotes/README.md`. The cat sprite itself was not redesigned: the new jump poses are drawn by the same generator, with the same body, palette, outline, face and proportions as the walking and sitting cat.

## What the jump is

A jump is now a short physical simulation (`features/game/player/air.ts`), not a drawn curve. The frames follow the motion:

1. **Crouch (anticipation)**: hind legs fold and compress, the body drops and shifts back, the front paws start to lift, the tail drops for balance. About 0.1 s; most of the cat's speed is kept.
2. **Take-off**: the hind legs push, the front paws are already off the ground, the body is driven up and forward, the tail follows behind.
3. **Rise, then top**: the body stretches, the front paws reach forward and the hind legs trail; at the top the legs tuck and the tail balances.
4. **Fall, then brace**: the front paws reach down and forward for the ground while the hind legs trail.
5. **Landing**: the front paws touch first, the hind paws follow, the legs and body compress (more for a higher fall) and the body lowers. **Recovery**: it rises, the tail settles, and the cat goes back to standing or to the walk or run it was in.

The frame shown is chosen from the cat's real vertical speed and height (up, top, down, near the floor), so a taller or longer jump simply spends longer on the same frames. 10 frames per direction in 8 directions (`jump` clip; frame 9 is the stretched "leap" pose).

The physics: gravity of 591 sprite pixels a second squared, a launch speed worked out from the height the kind needs, horizontal speed carried through the air (the cat can still be steered), a floor under the cat that is the ground or the top of whatever it is over, landing detection when it comes back down onto that floor, and a landing impact that grows with the fall (and so the squash lasts longer after a bigger fall). Nothing is teleported: the tests check that the height never changes by more than the speed allows in one step.

## Kinds of jump

| Kind | When | Peak | In the air | Travels (stand / walk / run) |
|---|---|---|---|---|
| hop | a low thing ahead (about 0.1) | 9 px, 0.14 units | 0.35 s | 0 / 0.30 / 0.72 |
| standard | Space from standing or walking | 22 px, 0.34 units | 0.55 s | 0 / 0.47 / 1.12 |
| vertical | a tall platform ahead (above about 0.4) | 44 px, 0.68 units | 0.78 s | 0 / 0.64 / 1.52 |
| long | Space while running (Shift): thrown forward and low | 14 px, 0.22 units | 0.45 s | 1.02 / 1.08 / 1.15 |
| down | not a jump: walking off a ledge into a fall | falls from the ledge height | by gravity | by momentum |

(from `jump-measurements.json`, produced by the game's own simulation). The kind is chosen in `chooseJump` from whether the player is running and the height of the platform ahead (`platformAhead`); the architecture is a table (`KINDS`), so a new kind is one more row.

## Platforms

The street greybox now has heights: the bench (0.26), the stacked crates (0.26 and 0.46), a barrel, pots and the low market cart can be stood on; the stalls, houses, lamps and trees are walls. On the ground, pushing against a low platform does not get the cat up it; jumping does. A jump that is too short for a tall thing is stopped by it like a wall, and a jump never moves the cat through a collider. Standing on top, the cat walks around the platform's top and steps off into a "down" fall.

## Pictures

From the game's own simulation (`scripts/cat/jump-preview.ts`; the animated ones are APNG, open in a browser):

| File | Shows |
|---|---|
| `jump-frames.png` | All 10 jump frames in all 8 directions |
| `standard-jump.apng`, `-moments.png` | A continuous standing jump |
| `small-hop-onto-kerb.apng` | A hop onto a low kerb |
| `jump-onto-platform.apng`, `-moments.png` | A jump onto a bench, a walk across it and a step off into a fall |
| `vertical-jump-onto-tall.apng` | A jump at a tall platform (in this preview the platform was within a standard jump's reach, see limits) |
| `long-leap-across-gap.apng`, `-moments.png` | A running leap, stretched flat |

And captured from the running game (the real renderer, lighting and camera; 1x crops, ten moments about 85 ms apart):

| File | Shows | Checked numbers |
|---|---|---|
| `ingame-jump-onto-bench.png` | Walking north, Space: crouch, rise, land on the bench | height 0 → 0.31 at the top → 0.26 and stays; the cat then walked on along the bench |
| `ingame-vertical-jump-onto-crates.png` | Walking north at the crate stack: the game chose the vertical jump | height 0 → 0.64 at the top → 0.46 on the top crate, standing there |
| `ingame-jump-down-from-crates.png` | Walking off the top crate | 0.46 → falls with the legs braced → 0 about 0.4 s after stepping off, landing squash, then walks on |
| `ingame-running-leap.png` | Running east (Shift), Space: long leap | the cat's body stretches flat, about 1.0 world unit covered in about 0.5 s, peak 0.20, back to running |

## Controls

Space jumps (A on a gamepad, the round button on touch); Shift plus Space (or B/RB/RT held plus A) is the long leap. Pressing Space while sitting or asleep gets the cat up instead. There is no double jump. The walk cycle does not play or advance in the air.

## Checked

- Unit tests (`air.test.ts`, the jump tests in `cat-state.test.ts` and `player-sim.test.ts`): crouch before take-off, height and flight time from gravity, no teleporting, platform and ground landing detection, landing impact scaling, frame order for every kind, front paws before hind on landing, kind choice, momentum through the air and the same jump at 30 and 144 frames a second.
- In the running game (Chromium, dev server): all four cases in the table above, with the numbers shown.

## Not checked, and limits

- The "long leap across a gap" has no gap in the game: the preview draws one, but there is no pit or hole in the street to fall into. The leap is a longer and lower jump, and jumping over a real gap needs level geometry that does not exist yet (Phase 3).
- The preview named "vertical jump onto tall" was run against a platform within a standard jump's reach, so it shows a standard jump (see `jump-measurements.json`); the vertical kind was checked in the game against the crates.
- Near the market lamp the cat blows out to a bright yellow in the captures (the lamp's glow and bloom over the cat's lighting); this is the existing lighting, not the jump, and was not changed.
- Not checked: a real gamepad, real touch on the Jump button, and how the jump feels in your hands (timings and heights are first guesses: `KINDS` in `air.ts`).
- Reference: the pack suggested as a reference (bragorn's pixel cat animation set, CC BY 4.0) was not imported or copied; nothing from it is in the game.
