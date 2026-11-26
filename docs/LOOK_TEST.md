# Phase 0 look test: findings and proposed decisions

Status (2026-11-25): **approved by you; Phase 0 is passed.** You approved the refined look B (HD world with a pixel-art cat) after reviewing the stills, the step-by-step ladder and the close-ups. Real FPS, a phone measurement and the Full tier's cost are carried into Phase 1.

## Where this stands

- **Round 1** compared two looks: A (everything pixelated) and B (smooth HD world with a pixel-art cat). You chose B ("HD plus pixelated") and asked for three things: more detail in the windows with light coming out, a more detailed cat and objects around it, and the rest blurred out like the Octopath reference stills.
- **Round 2** delivers that. Look A is still in the lab behind a switch but is no longer maintained. Its round-1 evidence is archived in `docs/look-test/captures/round1/`.

## What round 2 changed

| Your request | What was done | Evidence |
|---|---|---|
| Windows with light coming out had less detail | Real lit panes: mullions, curtains, a hanging lamp or plant silhouette in each, a flicker that differs per room. Warm light now spills down the wall below each window, and on the ground floor as a window-shaped pool of light with mullion shadows on the cobbles. | `B2-crop-windows-before.png` / `-after.png`, ladder step 2 |
| Detail the objects around the cat | Pixel-art textures on all the scenery, generated in code: brick chimneys, a stone-block plinth and speckled plaster with cracks on stone houses, timber planks on wooden houses, roof tiles, and pixel-art cobbles with mossy stones. New props: flower pots, produce crates (oranges, plums, apples), a swinging paw-print shop sign, wall notices, a second string of bunting. A far row of houses fills the top of the frame. | `B2-crop-house-before.png` / `-after.png`, ladder step 1 |
| Detail the cat | The cat is now 48 px (was 32): fur strands, whiskers, striped body, ringed tail, glossy eyes, toe lines. It breathes, sways its tail, twitches an ear and blinks every few seconds. It carries a generated normal map, so lamps and moonlight shade it, and it casts a sprite-shaped shadow. | `B2-crop-cat.png`, `B2-crop-cat-flat.png`, ladder step 3 |
| Blur the other objects like the references | A custom miniature depth-of-field: a sharp band that follows the cat, a smooth ramp, then a strong disc blur toward the top and bottom, with bright lights melting into round bokeh orbs. Big foreground lanterns, crates and hedges sit in the bottom corners and blur into soft framing. | ladder steps 4 and 5, `B2-dusk.jpg` |

## Evidence

All in `docs/look-test/captures/`.

| File | Shows |
|---|---|
| `B2-dusk.jpg`, `B2-golden.jpg`, `B2-night.jpg` | The refined look at three times of day |
| `B2-ladder-0-baseline.jpg` to `B2-ladder-5-miniature-blur.jpg` | Cumulative steps at dusk: 0 earlier flat look, 1 pixel textures, 2 lit windows, 3 lit cat, 4 foreground framing, 5 miniature blur (the final look) |
| `B2-crop-windows-before.png`, `B2-crop-windows-after.png` | One facade's windows at 4x, flat glow ovals versus lit panes |
| `B2-crop-house-before.png`, `B2-crop-house-after.png` | A house front at 3x, flat colours versus pixel textures |
| `B2-crop-cat.png`, `B2-crop-cat-flat.png` | The cat at 5x with scene lighting versus a flat tint |
| `bench-frame-cost-round2-2026-11-25.json` | Frame costs and the profiling run |
| `round1/` | Round 1: look A and B stills, the effects ablation, the pixel-density comparison and the first benchmark |

## What round 2 showed

- **Pixel-art textures are what turn the flat stock pieces into HD-2D surfaces.** Brick, plaster, planks, tile and pixel cobbles at about one cat-pixel per texel did more for the sense of detail than any lighting change.
- **The library's standard tilt-shift could not give this look.** Its focus band collapses to nothing when the feather is larger than the focus area, its offset is in a different unit than expected, and its blur radius depends on the buffer size. It is replaced by a purpose-built effect (`tilt-bokeh-effect.ts`).
- **The first blur attempt was too strong.** The house fronts and windows dissolved into orbs, which defeated the point of detailed windows. The fix is an asymmetric band: more of the scene above the cat stays sharp than below it, so the front houses keep their detail while roofs, the far street and the bottom edge blur.
- **Foreground framing has to be placed by projecting through the camera.** Low objects at the near edge fall out of frame; only tall things (lamp heads) at about z = 5.4 and low things at about z = 3.5 land in the soft bottom edge.
- **Baked sprite shading and scene lighting stack up.** The cat's colours already carry top-left shading, so full scene lighting made it muddy. Mixing some of the sprite's own colour back in (`catGlow`) fixed it. The generator may need a lower-contrast "unlit" version in Phase 2.
- **The first wall-light attempt showed hard-edged translucent boxes** under each window. Soft procedural falloff textures fixed it.
- **Film grain is off by default.** It produced white speckle in the brightest windows.
- **Posterize (colour bit reduction) stays rejected,** from round 1.
- **Look A versus B (round 1):** A reads as one pixel-art game; B has the smooth world and the pixel cat as separate layers, which is the HD-2D contrast you chose.

## Measurements

Per-frame **cost** in milliseconds (CPU plus GPU, GPU forced to finish each frame), 150 frames per row, two passes, AMD Radeon integrated GPU, dev server, Windows 11, window 1280x720 at device pixel ratio 1.25. The 60 fps budget is 16.7 ms.

| Look B tier | Internal buffer | Cost p50 | Cost p95 | Draw calls | What differs |
|---|---|---|---|---|---|
| Full | 1600x900 | 19.7 / 20.6 | 23.3 / 23.9 | about 510 | MSAA 4x, half-float buffer, 56-tap blur, all effects |
| Light | 1200x675 | 13.5 / 13.2 | 16.4 / 16.6 | about 520 | render scale 0.75, SMAA instead of MSAA, 8-bit buffer, 24-tap blur, 1024 shadow map, 2 point lights |
| Minimal | 960x540 | 8.4 / 8.3 | 9.3 / 9.3 | about 315 | render scale 0.6, no post-processing, no shadows, no point lights |

What this says:

- **Round 2's richness is heavier than round 1.** Full look B cost about 6 ms at a smaller buffer in round 1 and costs about 20 ms now, so **on this integrated GPU the Full tier is over the 60 fps budget** (roughly 50 fps), while Light fits with room to spare.
- **Profiling found where some of it goes:** 4x multisampling about 4 ms, bloom about 2.5 ms, an 8-bit buffer saves about 1.4 ms. Switching off the blur, shadows, particles, foreground, lit windows, pixel textures or cat lighting each changed the cost by about 1 ms or less.
- **A floor of about 13 ms is not explained** even with multisampling off. The minimal tier still costs about 8 ms at only half a megapixel with 315 draw calls. A likely candidate is per-draw overhead from many separate meshes and materials, but removing 150 shadow draws changed nothing, so this is a hypothesis, not a finding. It needs GPU timer queries and a merged-geometry experiment in Phase 1.
- Look A at 533x300 costs about 13 ms because its outline pass draws the scene twice. It is not maintained in round 2.

**These are frame costs, not frames per second.** The browser pane I measured in throttles animation frames (hidden, and capped near 30 Hz even when visible but unfocused), so real FPS could not be observed. You said look B runs smooth on your machine; that is your observation and has not been measured. A real FPS run takes one click: open the lab in a focused browser window and press **Bench all** (about 75 seconds), which writes `bench-all-*.json` into the captures folder. No phone, tablet or low-end laptop was available.

## Proposed decisions (all need your approval)

| Decision | Proposal | Why |
|---|---|---|
| Look | **B, HD world with a pixel-art cat (HD-2D)** | Your choice. |
| Surfaces | Pixel-art textures at about 42 texels per world unit (about one cat-pixel), projected onto the stock pieces in world space by dominant axis, chosen per piece type (stone with plinth and timber, wood, roof, brick). No external texture files. | Detail without new assets; matches the sprite's pixel size. |
| Windows | Lit panes with mullions and curtains, wall spill and ground light pools, per-room flicker | Fixes the "less detail" complaint. |
| Cat sprite | **48 px frame**, 22 colours, five frames (idle, blink, ear twitch), a generated normal map, lit by the scene with some own-colour mixed in, sprite-shaped shadow | More detail and it sits in the light. |
| Camera | Unchanged: perspective, FOV 28, pitch 34, distance 14, aimed 0.9 above and 0.9 behind the cat, sprite lean 0.55 | |
| Blur | Custom bokeh depth-of-field: sharp band 0.26 of the screen height above the cat and 0.14 below, ramp 0.3, radius 30 px at 1080 rows, up to 56 adaptive taps, highlight weighting 1.6. Foreground framing objects in the bottom corners. | Matches the reference stills. |
| Effects stack | Bokeh blur, bloom, hue/contrast, Neutral tone mapping, SMAA (light tier), vignette. Grain off. No posterize. | |
| Quality tiers | **Full / Light / Minimal** as in the measurements table. Tiers must change render resolution and anti-aliasing, not only effects. Phase 1 should pick a tier automatically from measured frame time. | In round 2 only a lower render scale and cheaper anti-aliasing made a tier meaningfully faster. |
| Internal resolution | The cat's 48 px frame at a whole-number device-pixel scale (3 device pixels per cat pixel at the tested window). World textures share that texel size. | |
| Targets (to confirm in Phase 1) | Desktop integrated GPU: frame cost p95 at or below 12 ms at the default tier, which is not met by Full today. Mid-range phone: 30 fps, so cost p95 at or below about 25 ms, once measured. | Full needs optimisation first. |

## Things found that Phase 1 must handle

- **Performance work comes first, not last:** merge static geometry per material, share one colour-map texture (each of the 72 piece files loaded its own copy, 72 duplicate requests), reduce meshes and materials, consider an 8-bit buffer plus SMAA as the default, and profile with GPU timer queries.
- **Portrait phones:** a 375x812 phone gives a game grid only about 125 pixels wide. Phase 1 must decide between locking landscape, a wider framing, or a different base resolution on small screens.
- **Keeping sprites, glows and window light out of any normal or outline pass:** the `userData.noOutline` convention from round 1 does this. Look B does not use outlines, so it only matters if look A returns.
- **Custom effects:** the standard postprocessing tilt-shift is not usable; the bokeh blur and outline effects are small custom `Effect` classes that Phase 1 can promote.
- **Sprite pipeline:** the cat generator must output a normal map next to the colour sheet; plan a lower-contrast variant for lit rendering.
- **Python is not installed,** so the `pixel-art-studio` scripts (render, quality check) could not run. The cat is generated by `scripts/lab/make-cat-sprite.mjs` in Node, following that skill's rules. Self-check: 22 colours, 2.5% orphan pixels (cap 5%).
- **Any automated measurement must come from a focused browser window.** The in-app pane throttles animation frames, which made FPS unobservable and stalled initialisation when hidden.
- `next typegen` or the dev server must run before `tsc` will know the `RouteContext` type.

## Kenney piece facts, for the Phase 3 map format

- Everything sits on a 1-unit grid. Wall panels are thin slabs on the **local +X edge** of a cell, 1 unit high. Rotating by -90 degrees puts the panel on the +Z (camera-facing) edge.
- `wall-corner` is an L: panels on the local +X and +Z edges. Rotations 0, 90, 180 and -90 degrees give the four building corners.
- `roof-gable` works as a prism covering one cell width, stretched along Z to cover the building depth; `roof-high-gable` is the steeper red variant (tinted toward terracotta here).
- Lamps are 1.56 units tall (scaled 0.8 here), stalls 1 by 1.24, the loaded cart 0.9 by 0.86 by 1.4. Pivots are at the base centre.
- Window openings are glazed insets, not see-through holes, so a lit pane placed in front of the glass is what makes them look lit.
- Not checked: the rear and inside faces of the pieces, because the camera only sees the front.

## Exit checklist status

- [x] **You approve a still and a short capture.** Approved by you on 2026-11-25 after reviewing the stills, the ladder and the close-ups. No short capture was recorded (the pane I use throttles animation), so how the look behaves in motion is still unverified and is checked again in Phase 1.
- [~] **Frame rate recorded.** Frame costs are recorded on this PC (above). Real FPS is not observable here, no phone was available, and the Full tier is over budget on this integrated GPU.
- [x] **Written decision.** This document, approved with the look. The "Targets" row stays "to confirm in Phase 1".
- [x] **Cat stays crisp inside the sharp band under blur and bloom.** Verified in `B2-crop-cat.png` (the cat sits in the sharp band while the houses above and the corners below blur).
- [x] **Throwaway code isolated and never imported by the app.** It lives only in `app/lab/`, `scripts/lab/` and `assets/lab/`. A production build (`npm run build`, then `next start`) returns 404 for `/lab/look-test`, the lab asset route and the lab save endpoint, and a test POST wrote nothing. `tsc`, eslint and the build pass.

## Not verified

- How the look behaves in motion (pixel shimmer, blur noise, flicker feel): the pane cannot play real-time animation.
- Real FPS, any phone, a low-end laptop, production-build timing, memory over time.
- The `pixel-art-studio` automated quality score (Python missing).
- Whether the cat's sprite-shaped shadow reads clearly: it is enabled, but is faint in the stills.
- Rear and interior faces of the building pieces.
- The blur's grain-like noise at its strongest (visible in the biggest bokeh orbs); a smoother two-pass version may be needed.

## Cleanup plan

The lab (`app/lab/`, `scripts/lab/`, `assets/lab/`) stays isolated and dev-only while Phase 1 ports its reusable parts into the real game module. It is then removed in its own commit, after the Phase 0 work has been committed, so it remains in git history.

## Phase 1 outcomes (2026-11-25)

How the "things Phase 1 must handle" above were settled. Evidence and numbers: `docs/phase1/` and `GAME_ROADMAP.md`.

- **Performance work:** done. The street is merged by surface into 7 meshes (props 2, windows 5, halos 1) and the 72 model files with 72 copies of the colour map became three requests (five game files in all). Draw calls fell from about 510 to 56 and the Full tier from about 20 to about 7 ms per frame on this PC (Light about 4.5 ms, Minimal about 1.5 ms). Per-draw overhead was the unexplained cost, so GPU timer queries were not needed. Side by side with the lab at the same window size, the two looks match by eye; the one deliberate carry-over is the pastel bunting colour.
- **Targets:** the desktop integrated-GPU target (frame cost p95 at or below 12 ms at the default tier) is met here: Full p95 is 7.7 to 8.1 ms in a production build. The mid-range phone target (30 fps, cost p95 at or below about 25 ms) is still unmeasured, because no phone was available.
- **Portrait phones:** a narrow portrait screen (under 700px wide, taller than wide) shows a "turn your phone sideways" hint with a "Play anyway" button. Landscape was not locked and the base resolution was not changed, so nobody is blocked.
- **Custom effects:** the bokeh blur was promoted to `features/game/render/tilt-bokeh-effect.ts`. The outline effect was not carried over, because look B does not use outlines.
- **Automatic tier:** done (`quality/auto-tier.ts`), and shown live with injected frames; see `GAME_ROADMAP.md` for what is still unobserved.
- **Automated measurement:** `window.__catopia.bench` times frames synchronously and does not depend on the throttled animation loop. One real-time reading was also taken while the pane was in use: 165 fps at Full.
- **Cat size:** you found the cat too big in the running game, so its picture was reduced from 16 to 20% of the window height to about 11.5% (about a third smaller). This supersedes the table row above that put the cat at 3 device pixels per cat pixel. The cat is now 2 screen pixels per sprite pixel at 1600x900 while the world's textures stay at about 3.4, so the cat is a little finer than the cobbles. Before and after: `docs/phase1/captures/phase1-cat-size-before-after.png`.
- **Window light:** you pointed at the light coming out of the windows in the running game. The round 2 version (a wide pale wall box under each window and a hard-edged ground patch) was replaced by a soft halo around every pane and a pool of light on the cobbles that widens, blurs and fades with distance. This supersedes the round 2 "wall and ground spill" description above. Before and after: `docs/phase1/captures/phase1-window-light-before-after.jpg`.
- **Sprite pipeline and Python:** unchanged; both belong to Phase 2.
- **Still not verified:** how the look feels in motion to you (shimmer, blur noise, flicker), the cat's faint shadow, rear faces of the pieces, and any phone.

The lab is still in the working tree, isolated and 404 in production. It is removed in its own commit after the Phase 0 and Phase 1 work has been committed.
