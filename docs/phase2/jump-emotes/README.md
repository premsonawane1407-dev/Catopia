# Jumping, emotes and the sleeping cat (2026-11-28)

> **The jump described below was replaced the same day by a physics-based jump (10 frames, four kinds, platforms): see `../jump/README.md`.** The sleep, emote and controls parts are still current.

Made on request after the Phase 2 build: the sleeping animation was not good enough, and you asked for a jump on Space and a choice of emotes.

## What the pictures show

| File | What it shows |
|---|---|
| `sleep-in-game.png` | The cat asleep in the running game (three moments), a loaf in profile with closed eyes, tail wrapped round, and a Zzz drifting up and fading |
| `jump-in-game.png` | A hop in the running game, six moments 100 ms apart: crouch, take off, the top, coming down, landing. The shadow stays on the cobbles and shrinks while the cat is up |
| `emotes-in-game.png` | The six emotes in the running game, left to right: Meow (a music note), Happy (a heart), Curious (a question mark), Surprised, Sleepy (a Z) and Hello (a paw wave, with a sparkle) |

All three are crops of the game's own picture (full quality, 1600 x 900, enlarged 2 or 3 times without smoothing), with the blur, bloom and lamp light on. The frames themselves are in `../frames-jump.png`, `../frames-emoteMeow.png` and the other five `../frames-emote*.png`, and `../frames-sleep.png`.

## Controls

| | Keyboard | Gamepad | Touch and mouse |
|---|---|---|---|
| Jump | Space | A | The round up-arrow button |
| Emote | 1 to 6 play one; Q opens the picker | Y plays the chosen one; left bumper picks the next (its name shows at the top) | The smiley button bottom left opens the picker |
| Interact | E | X | Tap the prompt |
| Run | hold Shift | hold B, or the right bumper or trigger | the Run button |

**Space no longer interacts**: that moved to E (and X on a gamepad), so the Space bar can hop. The on-screen prompt still says E.

## How they behave

- **Jump (first version, superseded):** a quick crouch (0.1 s), a hop 20 sprite pixels high (about 0.3 world units) lasting 0.52 s, a landing squash (0.12 s) and a short recovery, 0.8 s in all. It carries the speed the cat had and can be steered in the air; it moves slowly while crouching and landing. There is no double jump. The hop lifts the picture only: the cat's place on the ground, and so its collisions, do not change, so it cannot hop over or through anything. Pressing Space while sitting or asleep gets the cat up instead.
- **Emotes:** the cat sits down facing you (if it was standing), plays the emote for 2 to 3 seconds, and stays sitting. Moving, jumping or choosing another emote cancels or replaces it. Emotes are drawn facing the camera only.
- **Sleep:** the cat now curls into a low loaf; when it settles down to sleep facing away from you it turns to face the front or the side, so its face and closed eyes can be seen. A Zzz floats above it.

## What was added

- Clips: `jump` (7 frames in 8 directions) and six emote clips (4 frames each, facing the camera): 56 + 24 more frames, so the sheet is now 368 frames. Each emote is a change of the sitting cat's face and posture (an open mouth, a smile that squeezes the eyes shut, a tilted head with wide eyes, raised ears and a lifted body, a yawn, a raised paw), drawn by the same generator as the rest.
- The floating pictures are pixel art drawn from bitmaps in code (`features/game/cat/bubble-icons.ts`), not image files.
- Quality scores (all frames of the new clips, Marmalade coat): jump mean 94.1 (worst 86.4); the emotes 96.1 to 97.3 (worst 95.2); sleep 93.4 (worst 86.9). Mass-steadiness: jump 0.138; the emotes under 0.05.
- Tests: the hop's timing and shape, the state machine for jumping and emoting, the hop and the emote bubbles in the player, the key and gamepad mapping, every leg reaching its paw in every pose, and the clip layout. 371 tests pass.

## Honest limits

- Checked in the running game: Space hops (the lift rose to 19.9 of 20 pixels and back to 0, then the cat stood), the picker opened with six choices and the cat played the one clicked, all six emotes drew in the game with their pictures, and the sleeping cat showed its Zzz. Not checked: a real gamepad, real touch on the new buttons, number keys on a number pad, and how it all feels in motion to you.
- The "happy" eyes (smiling arcs) are only a few pixels wide and read as squeezed-shut eyes more than as a smile at game size.
- A few frames show a one-pixel whisker detached from the cat by the outline (the quality tool counts it as a second piece).
- The floating pictures sit at a fixed height above a sitting cat's head; the sleeper's Zzz starts lower because a loaf is low.
