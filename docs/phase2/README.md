# Phase 2 evidence (the cat)

Made 2026-11-26 to 2026-11-28. The decisions are in `docs/TECHNICAL_DECISIONS.md`, the checks and what was not checked are in `docs/PROJECT_STATUS.md` ("Game Phase 2"), and the gate is in `docs/GAME_ROADMAP.md`.

**Start here to judge the cat: open `review.html`** (double-click it; it reads the `sheet-*.png` files next to it). Pick a coat, a clip and a direction, step frame by frame, change the speed, and turn on "Moving ground" for walk and run: the ground scrolls by exactly one body step per frame, so a planted paw should stay on the same cobble.

| File | What it shows |
|---|---|
| `review.html` | The player described above |
| `coats.png` | The six coat presets side by side: front, side and back standing, walking, running, sitting from two sides and asleep. This is where the default coat is chosen |
| `frames-idle.png`, `frames-walk.png`, `frames-run.png`, `frames-sitDown.png`, `frames-sit.png`, `frames-lieDown.png`, `frames-sleep.png` | Every frame of each clip for the Marmalade coat: one row per direction (S, SE, E, NE, N, NW, W, SW from the top), one column per frame, enlarged 3 or 4 times |
| `sheet-<coat>.png` | The full sprite sheet for each coat as the game draws it (1152 x 1080, 16 frames per row, 72 x 60 each) |
| `sheet-marmalade-normal.png` | The matching normal map (the direction each pixel faces, which lets lamps shade the cat) |
| `quality-report.json` | The automated scores per coat and per clip, the palette figures and the gait checks, with notes on what the port of the rubric does and does not score |
| `captures/` | Screenshots from the running game, taken on 2026-11-28 at 800 px wide: the collision boxes (red), the walkable strip (green) and the interaction circles (gold) are drawn because the greybox switch was on; one shows the prompt and a line of text; two show the phone-landscape touch controls before and after the foreground lanterns were made to ride with the camera |

How the files were made: `node scripts/run-ts.mjs scripts/cat/bake.ts docs/phase2` draws every sheet from the same code the game runs (`features/game/cat/`) and writes this folder. Nothing here is loaded by the game; the game draws its own sheet when it loads, from the coat settings, so there are no image files for the cat in `public/`.

Limits: one desktop PC, a Chromium-based in-app browser, no real phone or gamepad. The sprite pictures are exact (they are the data); the screenshots are small and have the greybox overlay on.
