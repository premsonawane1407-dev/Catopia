# Catopia project status

**Current stage:** Stage 1 — Project foundation and repository baseline  
**Overall state:** Initial audit complete; application shell, skill setup, dependency installation and production build are established.

## What exists

- Five Catopia planning documents in `CATOPIA — AI EXECUTION PROMPTS/`:
  - `# CATOPIA — PROJECT MASTER INSTRUCT.txt`
  - `catopia - detailed insights and framework.txt`
  - `CATOPIA — Asset Library & Codex Age.txt`
  - `CATOPIA — AUTONOMOUS ASSET ACQUIS.txt`
  - `EXECUTION PROMPTS 1.txt`
- These provide the vision, requirements, proposed stack, data model, security requirements, staged prompts, skill recommendations and asset sourcing rules.
- Node.js and npm are available in the environment.

## What does not exist yet

- No application source, package manifest, lockfile, tests, asset files, migrations, `.env` template, or Git repository was present at audit time.
- No Supabase project/credentials, campus identity or boundary, verified landmarks, approved cat records/photos, map tile provider, or deployment target was supplied.
- Project skill inventory is documented in `docs/INSTALLED_SKILLS.md`: frontend design, React/Next performance, Playwright, Supabase/PostgreSQL, focused Three.js skills, and three Catopia-specific skills are present under `.agents/skills/`.

## Completed in this session

- Read all five supplied project documents and inventoried the repository.
- Created the implementation roadmap and baseline project documentation.
- Stage 1 app shell, project instructions, environment template and local preview are present. Runtime and development packages are pinned in `package.json` and `package-lock.json`; the production build succeeds with Webpack. TypeScript check passes and lint has one image optimization warning.
- Acquired assets and source/license notes are cataloged in `docs/ASSET_CATALOG.md`, `docs/ASSET_LICENSES.md` and `docs/ASSET_COMPATIBILITY_REPORT.md`.

## Feature progress

| Area | State | Evidence / next step |
|---|---|---|
| Product documentation audit | Complete | Five supplied text files reviewed |
| Application foundation | In progress | Dependencies installed; production build and typecheck pass; lint has one warning |
| Homepage / visual identity | In progress | Editorial paper-style homepage with a characterful hero, purpose section, interactive three-part concept guide, animal-care promise, and clear not-open-yet close; no 3D world or cat community is shown |
| 3D world / 2D map | Not started | Requires shared location model and verified references |
| Cat identity / sightings / community | Not started | Requires schema, auth, storage and moderation decisions |
| Backend / deployment | Not connected | No project credentials or target supplied |
| Production assets | Acquired candidates cataloged | Kenney environment GLBs and fonts are staged; cat rig and campus-specific art need further validation |

## Current blockers and assumptions

- Public campus-specific content cannot be built accurately until the campus/locality is identified and reference data is supplied or independently verified.
- A live Supabase integration cannot be verified until a project URL and public anon key are configured; privileged keys must remain server-only.
- The default Turbopack build hits a Windows worker startup failure in this environment. The `build` script uses Webpack, which completed a production build successfully.
- The project will use Next.js, React and TypeScript as the documented baseline, while optional technologies such as MapLibre and React Three Fiber are introduced only when their stages begin.
