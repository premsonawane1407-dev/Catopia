# Catopia game roadmap (phased, gated)

Status: **Phase 0 passed. Phase 1 is built and verified and is waiting for your review before it counts as mastered.** No later phase has started. Created 2026-11-25.

## The game

A standalone cozy exploration game, opened from a controller icon that replaces the profile "P" in the top bar (profile stays in the sidebar). It has its own route and a fullscreen canvas, with no switching to the 2D map. You play a cat in a lit, miniature-feeling HD-2D world.

- **Look:** low-poly 3D scenery rendered with pixelation, outlines, tilt-shift blur, bloom, warm lights, fog and particles, with pixel-art cat sprites at the same pixel density. Detail is concentrated near the player and the far view is softened.
- **Camera:** a preset per location, stored in map data. The market street uses a fixed tilted view. Interiors use an isometric view.
- **First area:** an invented market street, labelled as a placeholder and not the real campus.
- **Loop:** cozy exploration plus light quests and collectibles. No combat, timers or fail states. Rewards are cosmetic.
- **Art route:** open and CC0 assets plus procedurally generated art. No external AI generation services.
- **Safety:** cats are clearly labelled sample or original characters until real approved data exists. Locations are invented or approximate. Cat interaction is observe-only: no feeding, chasing or handling mechanics.

## How the gates work

We do not start a phase until the previous one is **mastered**. Mastered means all of the following:

1. Every item on the phase's exit checklist is observed working, and what was checked is recorded in `docs/PROJECT_STATUS.md`.
2. You review a demo and say the phase is mastered. I do not declare it myself.
3. `tsc`, eslint and `npm run build` pass, and any new asset is in the catalog and licence register.

Rules while inside a phase:

- A failed gate means we iterate inside the phase. No new scope is added to fix it.
- New ideas go to a **parking lot** list (a section at the bottom of this file) and are scheduled into a later phase, not built now.
- If a phase takes more than 1.5 times its estimate, we stop and re-plan.
- Each phase ends with a short note on what it taught us and re-estimates the remaining phases.
- Art is made just in time for each phase. There is no separate "art phase".
- Earlier-phase code is not rewritten without a recorded reason.

## Overview

| Phase | Name | Estimate | You get |
|---|---|---|---|
| 0 | Look test | 1–2 days | A decision on the look, with evidence |
| 1 | Shell and render foundation | 4–6 days | A game you can enter, exit and tune, with the render stack |
| 2 | The cat | 1.5–2 weeks | A cat that moves and feels good |
| 3 | World engine and market street | 2–3 weeks | The first beautiful, data-driven area |
| 4 | Life and sound | 1–1.5 weeks | NPC cats and a living soundscape |
| 5 | Play loop | 1.5–2 weeks | Quests, collectibles, journal, local save |
| 6 | Second location | 1–1.5 weeks | An isometric interior and camera switching |
| 7 | Hardening and release prep | 1–2 weeks | Mobile, performance, accessibility, tests |
| 8 | Real data (optional, blocked) | 1–2 weeks | Approved real records, once a backend exists |

Phases 0–3 give a playable, good-looking slice in about 5–7 weeks. Phases 0–7 give the first version in about 10–14 weeks. These are rough ranges for AI-assisted work with your reviews between phases. Phase 0 will replace the guesses below with measurements.

---

## Phase 0: Look test (1–2 days)

**Goal:** prove the HD-2D look and decide the pipeline before building anything permanent.

**Build (throwaway):** one street corner from the staged Kenney town modules, with pixelation, outlines, tilt-shift, bloom, warm window lights, fog, drifting leaves or fireflies, and a placeholder cat sprite on a fixed tilted camera. Compare two variants: pixelated 3D, and clean low-poly with tilt-shift only.

**Status: passed on 2026-11-25.** You chose and approved look B, the HD world with a pixel-art cat, refined in round 2. Findings, evidence and decisions are in `docs/LOOK_TEST.md`; stills are in `docs/look-test/captures/`. Carried into Phase 1: real FPS and a phone are still unmeasured, the Full tier is over the 60 fps budget on an integrated GPU, and the lab stays isolated until its reusable parts are ported.

**Exit checklist**
- [x] You approve a still image and a short capture against your reference images. (Approved on stills; no short capture was recorded.)
- [~] Frame rate is recorded on this PC, and on a phone if one is available. (Frame cost in ms recorded on this PC; real FPS and a phone were not available, and the Full tier is over the 60 fps budget on this integrated GPU. Carried into Phase 1.)
- [x] A written decision records the internal pixel resolution, palette, camera angle, effect list and quality tiers. (`LOOK_TEST.md`, approved with the look.)
- [x] The cat sprite stays crisp inside the sharp band under blur and bloom.
- [x] The throwaway code is deleted or isolated and never imported by the app. (Isolated in `app/lab/`; 404 in a production build.)

**Not included:** controls, UI, game logic.

## Phase 1: Shell and render foundation (4–6 days)

**Goal:** a game you can enter and leave cleanly, with the final render stack and quality tiers.

**Build:** controller icon replacing "P", a standalone `/play` route, a fullscreen canvas loaded only on demand, a loading screen, pause and exit, settings (mute, reduced motion, quality), a WebGL-unavailable fallback, three quality tiers (full, light, minimal), an asset loader with caching, and pixel-perfect scaling across window sizes and display densities.

**Status: built and verified on 2026-11-25, awaiting your mastery review.** The game lives in `features/game/` (shell, quality, settings, audio, render, world, debug) with a thin route at `app/play/`. The look is the approved look B, ported from the Phase 0 lab into merged geometry: the street draws in 56 calls across all passes (about 510 before) and the Full tier costs about 7 ms per frame instead of about 20 ms on the same PC. Evidence and numbers are in `docs/phase1/` (benchmark file and 11 captures), and the decisions are in `TECHNICAL_DECISIONS.md`. `npm test` runs 212 unit tests of the logic.

**Exit checklist**
- [x] The controller icon is keyboard-reachable and labelled. (A link labelled "Play the Catopia game world"; Tab-focusable, Enter opens `/play`. It stays visible on every Community screen and at 375px, where the old "P" had been hidden.)
- [x] Ten enter/exit cycles leave memory stable, with the renderer disposed. (Ten cycles on the dev server: 10 graphics contexts created, 10 released, 0 lost; 1 live while playing and 0 after every leave; no canvas left on the Community page; the same 27 geometries, 39 textures and 23 programs on every visit; JS heap saw-toothed between 50 and 79 MB with no trend, 61.7 MB first and 64.6 MB last. The heap was not forced to collect.)
- [x] The Community pages' bundle size is unchanged, measured. (Production build: `/community-preview` 9 scripts and 300.9 KB gzipped before, 10 scripts and 301.5 KB after, +0.6 KB for the icon and link; `/` 180.7 to 180.8 KB. No game code is in the Community scripts; `/play`'s own chunk is 4.4 KB because the game loads on demand.)
- [x] The fallback appears when WebGL is disabled. (Checked with the development switch `/play?webgl=off`: a friendly "can't show the street" screen with a way back, and no game files requested. A browser with WebGL really turned off was not tried.)
- [x] All three quality tiers switch live. (Switched from the pause menu: Full, Light and Minimal change the render size, anti-aliasing, blur, bloom, shadows and lamps at once and the choice is remembered. The automatic mode stepped Full to Light to Minimal on injected slow frames and climbed back after about 20 s of comfortable frames; it was not seen stepping down on its own, because the test pane throttled its frame rate while that was tried.)
- [x] Reduced motion removes the sway, particles and camera easing. (With Motion set to Reduced, three frames drawn 0.8 s apart were pixel-identical; with Full they all differed. Window and lamp flicker, halo shimmer, bunting and sign sway, fireflies, falling leaves and the cat's idle loop are all gated. The camera is fixed in Phase 1, so there is no camera sway or easing to remove yet.)
- [x] It works at 375px wide and on desktop. (Emulated 375x812 phone: the "turn your phone sideways" hint, Play anyway, the begin card, the in-game buttons and the pause card all fit with no sideways scrolling; desktop checked at 1280x720 and wider.)

**Changed after your first look at it:** you found the cat too big, so its picture was cut from 16 to 20% of the window height to about 11.5%, about a third smaller (one setting, `CAT_SCREEN_FRACTION`; side-by-side in `docs/phase1/captures/phase1-cat-size-before-after.png`). Its pixels stay whole and even, and the blur's sharp band follows the smaller cat. You then pointed at the light coming out of the windows: it was a flat pale box under each window and a hard-edged patch on the cobbles. Each window now has a soft halo and the cobbles a pool of light that widens, blurs and fades with distance (before and after: `docs/phase1/captures/phase1-window-light-before-after.jpg`). You confirmed the new window light looks right. You then asked for a proper pause menu: the only thing on screen while playing is now a small II in the far corner; pressing it freezes the picture, darkens and blurs it, and shows the settings as floating text that animates as you move through it with the arrow keys or the pointer, with soft generated sounds for moving, changing, pressing, opening and closing (pictures in `docs/phase1/captures/`, sound measurements in `docs/phase1/ui-sounds-report-2026-11-25.json`). You then supplied a recording, "Beyond the Vale", to replace the generated breeze as the background music. It is 176 MB and 3 h 12 min, so the game plays a lossless 6:03 cut of its opening piece (5.8 MB), streamed after Begin and looped; the original is kept out of git, and its licence is unverified, so it is prototype-only (`docs/ASSET_LICENSES.md`; measurements in `docs/phase1/music-report-2026-11-26.json`).

Also checked: pause freezes the picture (0 frames drawn in 2 s), quiets and muffles the game's own sound while the menu keeps making its sounds, and the picture stays visible behind the menu after a resize; Escape pauses, M mutes, and a hidden tab pauses itself; sound starts only after the Begin click and mute really sets the master gain to zero and survives a reload; a lost graphics context shows "The picture was interrupted" and Reload brings the street back (created 2, lost 1, live 1); lint, type-check, `npm run build` and the 212 tests pass, and the lab routes still return 404 in a production build. The pause menu was then checked again in a rebuilt production build (`next start`) in a visible browser pane 268 px wide: the picture behind it resolved to `blur(14px) saturate(0.7) brightness(0.72)`; no frames were drawn while paused (the frame counter held at 13,719 for 2 s); each arrow key, Enter, Escape and M made a menu-sound request and created fresh audio nodes (the request counter went from 1 at Begin to 18 after leaving); the quality arrows switched the picture tier live and the Sound row set the master gain to 0 and back to 0.6; and Leave the street played its sound, opened the Community page and released the graphics context (1 created, 1 released, 0 lost). A POST to the lab's capture endpoint returned 404 and wrote nothing. That pass found two faults, both fixed and rechecked in a new build: a held Escape or M key repeated and flickered the menu (key repeats are now ignored; tested with synthetic repeat events, not a physically held key), and the optional performance readout, wider than a very narrow screen, let the game's `overflow: hidden` box be scrolled sideways, which shifted the whole menu 81 px to the left (the game box now clips, so it can never scroll, and the readout wraps within the screen).

**Not verified in Phase 1:** a real phone or tablet (only an emulated viewport on this desktop PC), Safari and Firefox, a screen reader, real touch input, the automatic mode stepping down by itself, and real FPS beyond one 165 fps reading taken in the dev server while the test pane was in use (it throttles at other times, so frame cost in milliseconds is the number to trust).

**What Phase 1 taught us:**
- The Phase 0 hypothesis was right: draw-call overhead, not the effects, was most of the unexplained cost. Merging by surface took the Full tier from about 20 to about 7 ms (Light 13 to 4.5 ms, Minimal 8 to 1.5 ms) on the same integrated GPU, so Full now has real headroom there. Keep the rule: anything static is merged by surface; only things that move (the cat, NPCs, doors, props that sway) stay separate.
- The remaining unknown is a phone. Until one is measured, the automatic tier and the Light and Minimal tiers are the safety net, and the numbers above should not be read as phone numbers.
- The first visit to `/play` moves about 1.4 MB, most of it the 684 KB uncompressed model file. That is fine for now and is a Phase 7 job (quantize or compress).
- Phase 1 took well under its 4 to 6 day estimate. The remaining estimates stay as they are, because the phone measurement could still change Phases 3 and 7.
- Building the verification hooks (`window.__catopia`, in development or with `/play?perf=1`) was worth it: frame cost, graphics-context counts, pixel fingerprints and audio state could be read without trusting screenshots.

## Phase 2: The cat (1.5–2 weeks)

**Goal:** a cat you enjoy moving around.

**Build:** a code-generated cat (coat colour and pattern as settings) baked into sprite sheets, using the `pixel-art-studio` quality checks. Animations v1: idle, walk, run, sit and sleep, in the directions the camera needs, with normal-mapped lighting. Controls: keyboard, gamepad, touch joystick and tap-to-move. Camera follow with smoothing, collision against a greybox, and an interaction-prompt system.

**Exit checklist**
- [ ] Every animation has been reviewed frame by frame, with no foot sliding.
- [ ] Automated quality-check scores are recorded.
- [ ] A five-minute free roam works on keyboard, gamepad and touch without snagging.
- [ ] The cat is readable at its on-screen size under the full effect stack.
- [ ] You sign off the cat's look.

**Parked until later:** groom, stretch and jump animations, and player customization.

## Phase 3: World engine and market street (2–3 weeks)

**Goal:** the first beautiful area, built entirely from data.

**Build:** a map data format (terrain grid, placements, colliders, triggers, lights, spawn points, camera preset), a loader, collision and triggers, a scene-transition system, per-map camera presets, and a day/night clock. The street is dressed from the Kenney town modules and code-generated cobbles, awnings, crates and bunting, with dense detail near the walking path and ambient particles.

**Exit checklist**
- [ ] The street is built only from data, with no hardcoded placements.
- [ ] The camera preset is read from the map data.
- [ ] Day, dusk and night transitions work.
- [ ] At least ten richness techniques from the list below are visibly present.
- [ ] You sign off stills at dawn, day, dusk and night.
- [ ] The performance budget is met on each quality tier.
- [ ] Every asset is in the register with its licence.

Richness techniques list: tilt-shift blur, foreground framing, warm/cool light contrast, window glow, light shafts, layered fog, floating particles, soft contact shadows, swaying foliage, swinging lanterns, chimney smoke, wet cobbles, distance fade, colour grading.

## Phase 4: Life and sound (1–1.5 weeks)

**Goal:** the street feels inhabited.

**Build:** five or more NPC cats from clearly-labelled sample data, with wander, sit, sleep, groom and look-at-player behaviour, nameplates, and cat cards that link to PAW. Ambient critters. Audio from CC0 files and code-generated sound: time-of-day ambience layers, cobble footsteps, meow and purr, UI sounds, with mute and volume.

**Exit checklist**
- [ ] Five NPC cats with distinct coats and behaviours run for ten minutes with no stuck states.
- [ ] A written check confirms no mechanic encourages feeding, chasing or handling.
- [ ] Every sound is CC0 or generated and listed in the register.
- [ ] Audio starts only after a user gesture, and mute works.
- [ ] Cats and places are labelled as samples.

## Phase 5: Play loop (1.5–2 weeks)

**Goal:** a complete, gentle session you want to finish.

**Build:** a data-driven quest system, collectibles, a journal, achievements, and a HUD built with `threejs-game-ui-designer`. Starter quests: find sunny spots, meet the street cats, collect lost trinkets. Rewards are cosmetic. Local save with versioning.

**Exit checklist**
- [ ] A new player can finish a 15–20 minute session with at least three quests.
- [ ] Save and restore survives a page refresh.
- [ ] Quest-logic tests show no dead-end states.
- [ ] Quest and collectible data is validated on load.
- [ ] The HUD is readable at 375px.
- [ ] There is no fail state and no timer anywhere.

Save is local only, and the game says so. Server-side progress comes in Phase 8.

## Phase 6: Second location (1–1.5 weeks)

**Goal:** prove the hybrid camera with an isometric café interior.

**Build:** the interior from Kenney furniture and the town modules, a door transition with a smooth camera-preset change, and different lighting.

**Exit checklist**
- [ ] Both directions of the transition work with no loss of player, quest or save state.
- [ ] Both cameras stay readable.
- [ ] Collision and interaction behave the same in both areas.
- [ ] Performance holds on each quality tier.

## Phase 7: Hardening and release prep (1–2 weeks)

**Goal:** it is solid on real devices.

**Build and check:** performance on a mid-range phone, accessibility (keyboard alternatives, reduced motion, text size, contrast, screen-reader labels on the HUD), error and loading states, Playwright smoke tests, compressed models and textures, a credits page, and a privacy review.

**Exit checklist**
- [ ] Measured frame rate and load time meet the targets set in Phase 0.
- [ ] Playwright smoke tests pass.
- [ ] The accessibility checks above pass.
- [ ] The credits page lists every asset that requires or invites credit.
- [ ] `KNOWN_ISSUES.md` is current.

## Phase 8: Real data (optional, blocked)

**Blocked on:** a configured Supabase backend, a verified campus reference and approved cat records and photos.

**Goal:** the game reads approved real records.

**Exit checklist**
- [ ] Only moderation-approved records appear.
- [ ] Permissions are enforced by server and database rules.
- [ ] Locations stay approximate or at public landmarks.
- [ ] Similar-looking cats are never merged automatically.

## Open decisions

| Decision | Settled in |
|---|---|
| Internal pixel resolution, palette, quality tiers | Phase 0 |
| Final frame-rate and load-time targets | Phase 0 |
| The player cat's name and default coat | Phase 2 |
| The street's invented name | Phase 3 |
| Whether real campus places ever replace invented ones | Phase 8 |

## Parking lot

Ideas that are not scheduled yet. Add new ones here instead of building them.

- Groom, stretch and jump animations
- Player customization (collars, hats)
- Fishing-nook garden area with a top-down camera
- Weather
- Photo mode
- Compress the packed model file (quantized positions and normals, or meshopt) and the first-visit transfer (Phase 7)
- A Playwright smoke test for entering and leaving the game, and for the fallback screen (Phase 7)
- GPU timer queries for per-pass timing, if a phone shows a problem that frame cost alone cannot explain
