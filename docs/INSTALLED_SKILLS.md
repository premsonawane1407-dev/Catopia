# Catopia installed agent skills

Skills live in `.agents/skills/` and are project scoped. The third-party skill source pins and hashes are recorded in `skills-lock.json`; Catopia's three custom skills are maintained in this repository. The current project inventory contains 31 skills: 28 third-party skills and 3 Catopia-specific skills. Five game and pixel-art skills were added on 2026-11-25 for the planned standalone HD-2D game (see below).

## Core development

| Skill | Contribution |
|---|---|
| `frontend-design` | Polished, responsive interface design and implementation. |
| `playwright` | Browser automation and end-to-end checks. |
| `vercel-react-best-practices` | React and Next.js rendering, data fetching, bundle and runtime performance guidance. |
| `supabase` | Supabase database, auth, storage and client integration guidance. |
| `supabase-postgres-best-practices` | PostgreSQL schema, query, security and performance guidance. |
| `threejs-r3f` | React Three Fiber scene implementation. |
| `threejs-web` | Three.js browser application patterns. |
| `threejs-scene` | Scene structure, composition and lifecycle. |
| `threejs-geometry` | Geometry selection and mesh construction. |
| `threejs-materials` | Material setup and rendering choices. |
| `threejs-lighting` | Lighting and color management. |
| `threejs-animation` | Three.js animation and mixer patterns. |
| `threejs-interaction` | Pointer, touch and object interaction. |
| `threejs-accessibility` | Accessible alternatives and controls for 3D scenes. |
| `threejs-performance` | Rendering budgets and optimization. |
| `threejs-assets` | Loading and managing 3D assets. |
| `threejs-spatial-data` | Coordinate and spatial data handling. |
| `threejs-particles` | Lightweight environmental effects when used. |
| `threejs-audio` | Spatial or interface audio when used. |
| `threejs-html` | HTML overlays integrated with Three.js scenes. |
| `threejs-debugging` | Diagnosing scene and renderer issues. |
| `threejs-testing` | Testing Three.js scenes and interactions. |
| `threejs-deployment` | Delivering Three.js applications in production. |

## Catopia-specific skills

| Skill | Contribution |
|---|---|
| `catopia-art-direction` | Applies Catopia's cozy illustrated visual identity and honest UI states. |
| `catopia-3d-world-builder` | Enforces shared world data, safe locations, compatible cat rigs and accessible 3D behavior. |
| `catopia-asset-manager` | Guides sourcing, license review, technical inspection and asset registration. |

## Game and pixel-art skills (added 2026-11-25)

Installed with `npx skills add <repo> --skill <name>` at project scope; recorded in `skills-lock.json`.

| Skill | Source and pinned commit | Repository licence | Contribution |
|---|---|---|---|
| `threejs-game-director` | majidmanzarpour/threejs-game-skills @ 8286774 | MIT | Entry point that routes whole-game work (loop, art, UI, QA) across sibling skills. |
| `threejs-gameplay-systems` | majidmanzarpour/threejs-game-skills @ 8286774 | MIT | Core loop, input, camera, collision, quests/state patterns; includes a Vite game template. |
| `threejs-game-ui-designer` | majidmanzarpour/threejs-game-skills @ 8286774 | MIT | HUD, menus, overlays and touch UI for 3D games. |
| `pixel-art-sprites` | omer-metin/skills-for-antigravity @ e8dcf4e | Apache-2.0 | Sprite, sprite-sheet, tileset and limited-palette guidance. |
| `pixel-art-studio` | AnastasiyaW/claude-code-config @ 1d8f832 | MIT | Programmatic pixel art: palettes, dithering, animation, sprite sheets, automated quality checks. |

Review notes (read before installing, 2026-11-25):

- The `SKILL.md` files and bundled scripts of all five were read; a search of the inspected files found no download-and-run, `eval` or `rm -rf` patterns. `pixel-art-studio/scripts/bake_animation.py` uses base64 only to decode PNG data from a local page. This is a read-through, not a security audit, and none of the skills has been exercised yet.
- `threejs-game-director` references sibling skills that are **not** installed (`threejs-aaa-graphics-builder`, `threejs-debug-profiler`, `threejs-qa-release` and three asset generators). Its asset-sourcing step runs `scripts/probe_asset_credentials.sh`, which sources the shell profile and reports only `SET`/`MISSING` for `TRIPO_API_KEY`, `GEMINI_API_KEY` and `ELEVENLABS_API_KEY`. **Project decision:** Catopia uses procedural and CC0/open assets only; do not use external generation services or send project content to them. Its "do not end the turn with an offer" style does not override `AGENTS.md`.
- `threejs-gameplay-systems` ships `scripts/create_threejs_game.py` (a standalone Vite scaffold). Do not run it in the Next.js app root; use it only as a pattern reference.
- `pixel-art-studio` bundles 30+ colour palettes (many from public community palettes). Their individual terms were not checked; verify a palette's terms before shipping art that uses it.
- The CLI also created `.claude/skills/` symlinks with absolute machine paths. They are local convenience links and should not be committed.
- First use (Phase 0, 2026-11-25): `pixel-art-studio`'s rules guided the placeholder cat sprite; its Python scripts did not run because Python is not installed. Second use (Phase 2, 2026-11-26): its written rubric (`references/05-quality-rubric.md`) and rules (five-tone hue-shifted ramps, a darker outline, no pillow shading, the stray-pixel cap) guided the generated cat, and the well-defined checks were ported to TypeScript (`features/game/cat/quality.ts`); the skill's scripts and art were not used or copied. The other four new skills have not been exercised yet.

## Discovery and selection

The requested areas were checked against the current project stack and feature plan. The React/Next.js performance skill was inspected and selected because its trigger scope includes React components, Next pages, data fetching and bundle performance without prescribing a conflicting stack. TypeScript is the chosen project language and its conventions are documented in `AGENTS.md`. General page accessibility remains an explicit project quality requirement in `AGENTS.md` and `catopia-art-direction`; `threejs-accessibility` covers the 3D surface. Motion and WebGL guidance is covered by the relevant Three.js animation, performance and interaction skills.

The Three.js collection originally included 24 entries. Six were removed because their topics are outside the current browser-based Catopia scope: physics, post-processing, product viewers, custom shaders, WebGPU and XR. Add one only if the product scope later needs it. SEO-specific advice was not installed because the current deliverable is an early product shell and there is no launch/search-content requirement yet.

## Verification

- Third-party entries have source, commit and content hash records in `skills-lock.json`.
- The three Catopia skills have YAML frontmatter with a `name` and activation `description`.
- Skill folders are discoverable under `.agents/skills/` by Codex.
- There are no duplicate skill folder names. General interface design and 3D accessibility address distinct surfaces; database and PostgreSQL skills provide complementary rather than conflicting guidance.
- Dependency installation and app build verification are tracked separately in `docs/PROJECT_STATUS.md`.
