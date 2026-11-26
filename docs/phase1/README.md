# Phase 1 evidence (shell and render foundation)

Taken on 2026-11-25 in the in-app browser against the local Next.js server (and, where stated, a production build served by `next start`). Results and decisions are summarised in `docs/GAME_ROADMAP.md` (Phase 1) and `docs/TECHNICAL_DECISIONS.md`.

| File | What it shows |
|---|---|
| `bench-frame-cost-2026-11-25.json` | Frame cost per tier (dev and production), Phase 0 comparison, the one real-FPS reading, the ten enter/leave cycles, and the bundle measurements |
| `captures/phase1-begin-desktop.jpg` | The "Begin" card resting over the live street (800x714 window) |
| `captures/phase0-lab-same-view-for-comparison.jpg` | The Phase 0 lab at the same window size, for a by-eye comparison with the line above |
| `captures/phase1-production-full-1280x720.jpg` | The production build at Full, 1280x720 emulation, with the performance readout |
| `captures/phase1-tier-minimal.jpg` | The Minimal tier (no post-processing, no shadows, no lamp lights, 0.6 render scale) |
| `captures/phase1-hud-only-ii-desktop.jpg` | Playing: the only control on screen is the small II in the far top-right corner |
| `captures/phase1-hud-only-ii-375.jpg` | The same at 375px wide |
| `captures/phase1-pause-menu-desktop.jpg` | The pause menu: the frozen picture dark and blurred, the choices floating as text, Resume highlighted |
| `captures/phase1-pause-menu-selection-desktop.jpg` | The highlight moved to Picture quality (gold text, underline, the paw beside it, arrows around the value) |
| `captures/phase1-pause-menu-375.jpg` | The pause menu at 375px wide, every row on one line |
| `ui-sounds-report-2026-11-25.json` | The pause menu's sounds measured offline: peak, loudness, length and brightness of each |
| `music-report-2026-11-26.json` | The background music (taken 2026-11-26): where the file came from and that its licence is unverified, how the 6:03 excerpt was chosen and cut, and what was measured in the browser (loop, level, pause duck, Sound off, hidden tab) and in a production build |
| `captures/phase1-rotate-hint-375.jpg` | The "turn your phone sideways" hint on an emulated 375x812 phone |
| `captures/phase1-fallback-webgl-off.jpg` | The friendly screen shown when WebGL 2 is missing (`/play?webgl=off`) |
| `captures/phase1-cat-size-before-after.png` | The same view and magnification before and after the cat was made smaller (16% to 10.7% of the window height at 1600x900); the pixels stay even |
| `captures/phase1-cat-smaller-full-1600x900.jpg` | A full 1600x900 frame with the smaller cat |
| `captures/phase1-window-light-before-after.jpg` | The same windows before and after the light coming out of them was fixed: flat pale boxes and hard-edged patches on the left, soft halos and a fading pool of light on the right (1920x1080 buffer, enlarged 2x) |
| `captures/phase1-window-light-after-1920x1080.jpg` | A full 1920x1080 frame with the new window light |
| `captures/phase1-community-entry-desktop.jpg` | The controller button in the Community top bar on desktop |
| `captures/phase1-community-entry-375.jpg` | The same button at 375px, where the old "P" avatar was hidden |

How the numbers were read: `window.__catopia` (`perf`, `bench`, `fingerprint`, `audio` (which also reports the music's state and position), `master`, `musicSeek`, `reportUiSounds`, `feedFrame`) exists in development and, in production, with `/play?perf=1`. `bench(150)` draws frames back to back and forces the GPU to finish each one, so it reports frame cost in milliseconds and does not depend on the browser's throttled animation loop.

Limits: one desktop PC with an integrated AMD GPU, an emulated phone viewport (not a phone), Chrome-based browser only.
