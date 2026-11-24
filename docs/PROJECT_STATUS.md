# Catopia project status

**Current stage:** Stage 2 — Visual identity and community preview
**Overall state:** Application foundation is established; the community preview now includes a PAW knowledge and discovery hub in place of the Cats section.

Community roadmap note: Phase 1 decisions are approved. `/community-preview` contains the merged Home/For You feed, Pinterest-inspired Discover, snap-scrolling Plays, an interactive Map (now with real place discovery, see below), and PAW replacing the top-level Cats directory. PAW's refined overview now leads with a compact hero and four category boards, one date-selected sourced discovery, consistent note cards, and a compact learning trail. Its category pages provide collection-specific context; search, source links, quiz, trail, and session-only saves remain. Twelve user-provided images from `references/paw/` now illustrate PAW sections and notes. Their identity/source attribution is unverified, so they are prototype-only and do not establish cat identities or article evidence. No backend, uploads, or production content are connected. Verified the narrow local-browser layout and the category → Explore more → article → return flow; a full desktop/tablet/mobile responsive pass remains pending.

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
| Application foundation | In progress | Dependencies installed; production build, typecheck and lint pass |
| Homepage / visual identity | In progress | Editorial paper-style homepage with a characterful hero, purpose section, interactive three-part concept guide, animal-care promise, and clear not-open-yet close; no 3D world or cat community is shown |
| 3D world / 2D map | Map preview implemented; place-discovery prototype added; 3D world not started | `/community-preview` Map uses interactive MapLibre/OpenFreeMap streets centered broadly on DYPIU Akurdi; no cat sighting records are fabricated. It now also discovers real cat-related businesses (vet clinics, pet shops, grooming, shelters) via the public Overpass API within OpenStreetMap, clustered with custom category pins, plus a handful of clearly-labeled "sample place" entries for categories OSM has no local coverage for (cat cafés, cat-friendly spots). A Google-Maps-style floating left panel (bottom sheet on mobile) shows each place's details, a session-only review/rating system, save/unsave, and an external directions link — none of this is persisted since no Supabase project is configured yet. Verified live in the local browser (desktop and mobile widths): search, multi-select category filters, clustering/expansion, marker selection, the panel's gallery/lightbox, review submission, save toggle, and the mobile bottom sheet's collapsed/half/full states. |
| Community preview / PAW | Prototype in progress | `/community-preview` has Home, Discover, Plays, Map, PAW and Store. PAW replaces the Cats nav section with curated feline discovery; its sample content is source-linked and controls are local/non-persistent. Reviewed cat identities and production content remain unimplemented. |
| Concept store | Boutique redesign implemented; backend remains unconnected | The Store now presents a 10-category/subcategory concept taxonomy (Food & Feeding, Toys & Play, Furniture & Comfort, Grooming & Hygiene, Clothing & Accessories, Travel & Outdoors, Health & Wellness, Smart Tech & Safety, Kitten & Senior Care, Gifts & Collections) via a "Shop by Category" tile grid, a minimal image-first product grid, and a left-sliding filter drawer (category/subcategory accordion, price range, dynamically-generated Life Stage/Material/Size/Colour facets, availability) with removable active-filter chips and a sticky "Show N products" action. Product selection still opens the existing full editorial detail page with URL-addressable product state, quantity selection, session cart/wishlist, information tabs, and related products. No fabricated ratings, popularity stats, discounts, or stock counts exist anywhere. Verified live in the local browser at desktop and mobile widths: category tiles, drawer open/close (button, overlay click, Escape), accordion expand/collapse, every dynamic facet, price range, active-chip removal, clear-all, search-specific vs. filter-specific empty states, and that add-to-bag/cart/detail-page flows are unaffected. `npx tsc --noEmit`, `npx eslint app/community-preview --quiet`, and `npm run build` all pass. |
| Backend / deployment | Not connected | No project credentials or target supplied |
| Production assets | Acquired candidates cataloged | Kenney environment GLBs and fonts are staged; cat rig and campus-specific art need further validation |

## Current blockers and assumptions

- Public campus-specific content cannot be built accurately until the campus/locality is identified and reference data is supplied or independently verified.
- A live Supabase integration cannot be verified until a project URL and public anon key are configured; privileged keys must remain server-only.
- The Map's place-discovery feature has no routing/directions API key configured, so "Directions" opens an external Google Maps link rather than drawing an in-app route. Reviews and saved places are session-only (no backend) by the same constraint; see `docs/TECHNICAL_DECISIONS.md` for the full data-source and persistence notes.
- The default Turbopack build hits a Windows worker startup failure in this environment. The `build` script uses Webpack, which completed a production build successfully.
- The project will use Next.js, React and TypeScript as the documented baseline, while optional technologies such as MapLibre and React Three Fiber are introduced only when their stages begin.
