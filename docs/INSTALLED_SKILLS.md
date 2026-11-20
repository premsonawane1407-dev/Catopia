# Catopia installed agent skills

Skills live in `.agents/skills/` and are project scoped. The third-party skill source pins and hashes are recorded in `skills-lock.json`; Catopia's three custom skills are maintained in this repository. The current project inventory contains 26 skills: 23 third-party skills and 3 Catopia-specific skills.

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

## Discovery and selection

The requested areas were checked against the current project stack and feature plan. The React/Next.js performance skill was inspected and selected because its trigger scope includes React components, Next pages, data fetching and bundle performance without prescribing a conflicting stack. TypeScript is the chosen project language and its conventions are documented in `AGENTS.md`. General page accessibility remains an explicit project quality requirement in `AGENTS.md` and `catopia-art-direction`; `threejs-accessibility` covers the 3D surface. Motion and WebGL guidance is covered by the relevant Three.js animation, performance and interaction skills.

The Three.js collection originally included 24 entries. Six were removed because their topics are outside the current browser-based Catopia scope: physics, post-processing, product viewers, custom shaders, WebGPU and XR. Add one only if the product scope later needs it. SEO-specific advice was not installed because the current deliverable is an early product shell and there is no launch/search-content requirement yet.

## Verification

- Third-party entries have source, commit and content hash records in `skills-lock.json`.
- The three Catopia skills have YAML frontmatter with a `name` and activation `description`.
- Skill folders are discoverable under `.agents/skills/` by Codex.
- There are no duplicate skill folder names. General interface design and 3D accessibility address distinct surfaces; database and PostgreSQL skills provide complementary rather than conflicting guidance.
- Dependency installation and app build verification are tracked separately in `docs/PROJECT_STATUS.md`.
