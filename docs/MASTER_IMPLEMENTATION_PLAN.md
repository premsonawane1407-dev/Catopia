# Catopia master implementation plan

## Planning basis

The repository audit found five planning text files and no application, dependencies, source assets, environment configuration, or Git metadata. This roadmap follows the product specification and execution prompts while keeping unverified campus data and external services out of the product. Effort estimates are person-days and include implementation and review; they are planning ranges, not commitments.

The community product information architecture and approval-gated delivery plan are in [`COMMUNITY_PRODUCT_BLUEPRINT.md`](COMMUNITY_PRODUCT_BLUEPRINT.md). Phase 1 decisions are approved; the existing community preview is being extended stage by stage, and production data flows remain gated on review.

## Stage 1 — Project foundation and repository baseline

- **Objective / outcome:** Establish a runnable, typed web application and repeatable development conventions.
- **Features / components:** Next.js App Router shell, strict TypeScript, styling baseline, environment template, server/client Supabase configuration boundary, migration directory, project instructions, source-control-ready ignore rules, baseline health page.
- **Likely files:** `app/`, `components/`, `lib/`, `supabase/migrations/`, `package.json`, `tsconfig.json`, `next.config.*`, `.env.example`, `.gitignore`, `AGENTS.md`, `docs/`.
- **Prerequisites:** None; this is the initial stage.
- **Assets:** No production assets required. Record that none were supplied.
- **Approach:** Start with a minimal App Router structure; keep public Supabase access separate from any future server-only secret. Do not claim a live backend before credentials and a project exist.
- **Checks:** Install dependencies, run production build and type/lint checks supported by the configured toolchain; verify no secrets are tracked.
- **Definition of done:** Clean install and production build succeed; app shell runs; configuration and backend setup limitations are documented.
- **Effort:** 1–2 days.
- **Risks / dependencies:** Network restrictions can prevent package installation; Supabase project credentials and campus identity are not supplied.
- **Status:** In progress.

## Stage 2 — Visual identity and accessible design system

- **Objective / outcome:** Define Catopia's cozy, illustrated visual language consistently across screen sizes.
- **Features / components:** Tokens, typography, buttons, surfaces, focus states, reduced-motion rules, responsive layout primitives, logo treatment.
- **Likely files:** `app/globals.css`, `components/ui/`, `docs/DESIGN_SYSTEM.md`, `public/`.
- **Prerequisites:** Stage 1.
- **Assets:** Fonts and icons only after source/license verification; original CSS/SVG treatments are acceptable.
- **Approach:** Warm cream, sage, forest, terracotta and butter accents; preserve contrast and avoid repetitive SaaS cards.
- **Checks:** Keyboard/focus review, contrast spot-checks, reduced-motion behavior, viewport inspection.
- **Definition of done:** Reusable tokens and primitives are in use, with documented design choices and mobile behavior.
- **Effort:** 2–4 days.
- **Risks / dependencies:** Final logo and campus visual references are not provided.
- **Status:** Planned.

## Stage 3 — Main application shell and navigation

- **Objective / outcome:** Provide a coherent entry point to exploration and community features.
- **Features / components:** Home page, floating desktop navigation, compact mobile navigation, clear empty/loading/error states, working route links.
- **Likely files:** `app/page.tsx`, `app/(community)/`, `components/navigation/`, `components/layout/`.
- **Prerequisites:** Stages 1–2.
- **Assets:** Approved decorative illustrations if available.
- **Approach:** Build real route structure incrementally; label any demonstration content and never imply it is community data.
- **Checks:** Route/link behavior, narrow viewport, keyboard navigation, no decorative dead controls.
- **Definition of done:** All visible navigation reaches a real page or a clearly explained unavailable state.
- **Effort:** 2–4 days.
- **Risks / dependencies:** Final information architecture may change after user journeys are prototyped.
- **Status:** Planned.

## Stage 4 — World data model and verified campus reference

- **Objective / outcome:** Define shared landmark/location records that can drive both map and 3D views.
- **Features / components:** Campus, location and landmark schemas; world coordinate conventions; source/verification metadata; safe public-location policy.
- **Likely files:** `features/locations/`, `features/world/`, `supabase/migrations/`, `docs/WORLD_LAYOUT.md`.
- **Prerequisites:** Stage 1; campus/locality reference data for a production representation.
- **Assets:** User-provided or otherwise verifiable campus references; licensed models as cataloged.
- **Approach:** Separate geographic coordinates from presentation coordinates; use seed/demo fixtures only when explicitly labeled.
- **Checks:** Schema validation, migration review, coordinate mapping checks, no precise sensitive animal locations in public records.
- **Definition of done:** A documented, validated shared data contract and a verified or explicitly demo-only initial layout.
- **Effort:** 2–4 days.
- **Risks / dependencies:** Campus name, boundaries, landmarks, and real-world references are missing.
- **Status:** Planned.

## Stage 5 — Interactive 3D exploration world

- **Objective / outcome:** Deliver a genuinely explorable, data-driven stylized campus scene.
- **Features / components:** Lazy-loaded scene, camera controls, buildings/paths/vegetation, interactive landmarks, cat selection, profile preview, lower-cost/2D fallback.
- **Likely files:** `world/scenes/`, `world/cameras/`, `world/environment/`, `world/characters/`, `components/world/`, `public/models/`.
- **Prerequisites:** Stages 2 and 4; compatible assets and verified scene references.
- **Assets:** Coherent licensed GLB environment and quadruped cat assets, or deliberately authored low-poly scene assets.
- **Approach:** React Three Fiber with reusable data-driven components, lazy loading, instancing where useful, no per-cat identity hardcoding in scene code.
- **Checks:** Rendering, controls, selection, asset orientation/materials, mobile and fallback behavior, performance profiling.
- **Definition of done:** Users can navigate, select real world records and open the matching location/cat information without blocking the rest of the app.
- **Effort:** 8–15 days.
- **Risks / dependencies:** Cat model and animation compatibility, asset licensing, device performance, campus references.
- **Status:** Planned.

## Stage 6 — Connected illustrated 2D map

- **Objective / outcome:** Provide a useful geographical view connected to the same locations and selection state as the 3D world.
- **Features / components:** MapLibre map, landmark and approved sighting markers, filters, selected-item panel, 2D/3D handoff.
- **Likely files:** `app/map/`, `components/maps/`, `features/locations/`, `lib/maps/`.
- **Prerequisites:** Stage 4; map style/tile source and verified coordinates.
- **Assets:** Map style and any illustration overlays with compatible terms.
- **Approach:** Keep map selection keyed by shared record IDs; expose only approved approximate/public locations.
- **Checks:** Marker selection, filters, viewport changes, attribution, mobile and no-coordinate states.
- **Definition of done:** Map records resolve to the same cat/location identities and switching views preserves selection when possible.
- **Effort:** 4–7 days.
- **Risks / dependencies:** Tile provider, API terms, network availability, and real campus data.
- **Status:** Planned.

## Stage 7 — Reviewed cat identities and PAW discovery

- **Objective / outcome:** Establish durable, manually reviewed cat records and a source-backed feline knowledge library. PAW is the community preview's replacement for the former top-level Cats directory; it can later host approved cat identity discovery within its Meet the Cats collection.
- **Features / components:** Cat schema, human-readable ID allocation, provisional identification state, reviewed directory/search/filters, profiles, photo and sighting relationships, duplicate review queue foundation, PAW's typed content records, references, collection/search/library and learning-trail relationships.
- **Likely files:** `features/cats/`, `app/discover/`, `app/cats/[id]/`, `supabase/migrations/`, `lib/validation/`.
- **Prerequisites:** Stage 1 backend setup; location records from Stage 4.
- **Assets:** Approved cat photos with contributor rights and metadata.
- **Approach:** Manual-first identity decisions; UUID internal keys and unique public Cat IDs; no automatic merges from image similarity.
- **Checks:** ID uniqueness, profile relationships, access policies, empty/loading/error states.
- **Definition of done:** Approved cat records can be browsed and resolve consistently across app surfaces.
- **Effort:** 5–8 days.
- **Risks / dependencies:** Supabase project, moderation rules, privacy and photo rights.
- **Status:** PAW editorial UI prototype in progress; production content model and reviewed cat directory remain planned.

## Stage 8 — Sightings, photo intake, and moderation

- **Objective / outcome:** Let registered contributors submit useful sightings safely and let moderators review them.
- **Features / components:** Submission flow, location selection, photo validation/storage, pending state, feed, status transitions, reporting.
- **Likely files:** `features/sightings/`, `app/sightings/`, `app/submit/`, storage policies, migrations.
- **Prerequisites:** Stages 4 and 7; authentication and storage setup.
- **Assets:** User-submitted image pipeline and approved photo display rules.
- **Approach:** Server-validated metadata and size/type limits; private originals where needed; public approximate locations; only approved content in public feed/counts.
- **Checks:** Upload restrictions, ownership/RLS, moderation transitions, duplicate/spam protections, mobile submission.
- **Definition of done:** Submission persists, awaits review, and becomes publicly visible only under configured approval rules.
- **Effort:** 6–10 days.
- **Risks / dependencies:** Storage configuration, moderation staffing, abuse controls.
- **Status:** Planned.

### PAW preview refinement (implemented)

The existing PAW overview now uses a compact discovery hero, four image-led category boards, one date-selected source-linked discovery, equally proportioned “Explore more” cards, and a short learning-trail entry. Collection pages use collection-specific context while keeping the current search, source links, quiz, trail, and preview-session library. Reference cat photos remain explicitly identified as sample visuals. This is still editorial preview content, not a connected knowledge CMS or reviewed cat directory; responsive browser review and production content remain outstanding.

### Store product detail preview (implemented; review pending)

Store product selection opens a refreshable, URL-addressable detail view inside the existing community preview shell. The view reuses the session cart and wishlist, supports quantity selection, shows only the catalog fields currently available, and presents same-category recommendations. Since the concept catalog contains no product photography, reviews, variants, stock counts, supplier details, or shipping policy, the page uses original labeled category artwork and honest empty/unconfigured states. A browser visual pass at desktop and mobile widths is still needed; real store data, authentication, payment, fulfilment, and policy integrations remain future work.

## Stage 9 — Community naming, stories, and profiles

- **Objective / outcome:** Support moderated community identity and stories around cats.
- **Features / components:** Name suggestions and rounds, one-vote constraints, moderator decision/history, moderated stories, user profiles.
- **Likely files:** `features/community/`, `features/naming/`, `features/profiles/`, related routes and migrations.
- **Prerequisites:** Stages 7–8 and authentication.
- **Assets:** No special assets required beyond design system.
- **Approach:** Database constraints enforce vote uniqueness; server-side role checks; preserve naming history.
- **Checks:** Permission tests, vote limits, moderation status, profile privacy.
- **Definition of done:** Users can contribute within policy and moderators can resolve proposals with an auditable history.
- **Effort:** 4–7 days.
- **Risks / dependencies:** Final naming-round and community moderation policy.
- **Status:** Planned.

## Stage 10 — Authentication, authorization, and platform security

- **Objective / outcome:** Secure user and moderator actions across the application.
- **Features / components:** Supabase Auth, role model, RLS for user-facing tables, server-side authorization, rate limits, audit trail, secret handling.
- **Likely files:** `lib/supabase/`, `lib/permissions/`, `middleware.ts` if justified, `supabase/migrations/`.
- **Prerequisites:** Backend project and schema evolution from Stages 1, 7–9.
- **Assets:** Environment credentials supplied securely by project owner.
- **Approach:** Least privilege; anon key only where intended; service role server-only; server validation and explicit policies.
- **Checks:** Auth flows, cross-user access denial, moderator actions, RLS policy review, secret scan.
- **Definition of done:** Role-sensitive operations are enforced by trusted backend/database policy, not hidden UI controls.
- **Effort:** 5–9 days.
- **Risks / dependencies:** Supabase project access and production policy decisions.
- **Status:** Planned.

## Stage 11 — Gamification and contribution history

- **Objective / outcome:** Reward verified, useful community contributions without enabling point farming.
- **Features / components:** XP ledger, level calculation, achievements, quests, personal contribution history; leaderboard only if privacy policy supports it.
- **Likely files:** `features/rewards/`, `supabase/migrations/`, profile UI.
- **Prerequisites:** Approved sighting/story/naming flows and server-side authorization.
- **Assets:** Approved badge illustrations or CSS/SVG originals.
- **Approach:** Server-authoritative idempotent XP transactions tied to eligible source records.
- **Checks:** Duplicate reward prevention, rejected content earns nothing, deterministic levels and achievement rules.
- **Definition of done:** Eligible actions award exactly once and users can understand their progress.
- **Effort:** 4–7 days.
- **Risks / dependencies:** Final reward values and anti-abuse policy.
- **Status:** Planned.

## Stage 12 — End-to-end integration and responsive quality

- **Objective / outcome:** Connect discovery, profiles, sightings, map, world and community into complete journeys.
- **Features / components:** Shared identity links, unified loading/error behavior, mobile layouts, accessibility, cross-view state.
- **Likely files:** `app/`, `components/`, `features/`, `tests/`.
- **Prerequisites:** Core feature stages complete.
- **Assets:** Final optimized production assets.
- **Approach:** Validate critical guest, contributor and moderator journeys against real backend data.
- **Checks:** Unit/integration/E2E coverage, keyboard and screen reader pass, reduced motion, cross-browser/mobile.
- **Definition of done:** Critical journeys work without broken controls, data mismatches, or unresolved high-priority defects.
- **Effort:** 5–9 days.
- **Risks / dependencies:** Stable test environment and representative test data.
- **Status:** Planned.

## Stage 13 — Performance, release readiness, and operations

- **Objective / outcome:** Prepare a secure, observable, maintainable public release.
- **Features / components:** 3D and image optimization, caching, monitoring, backup/restore procedure, deployment configuration, privacy/accessibility polish.
- **Likely files:** `next.config.*`, deployment config, `public/`, docs, CI configuration.
- **Prerequisites:** Integrated application and production services.
- **Assets:** Compressed, licensed, production-ready models, images, fonts, sounds.
- **Approach:** Profile actual devices and network conditions; establish operational checks and rollback procedure.
- **Checks:** Production build, security review, Lighthouse/profiling, backup restore rehearsal, release smoke checks.
- **Definition of done:** Critical defects resolved, deployment and recovery documented, production settings verified.
- **Effort:** 4–8 days.
- **Risks / dependencies:** Hosting, domain, service plans, content moderation and support ownership.
- **Status:** Planned.

## Stage gates

Do not treat the world, map, identity, moderation, or rewards as complete until their own data flows and quality checks pass. No real campus coordinates, cats, photos, user content, or backend connection should be fabricated. At each stage completion, update this plan, `PROJECT_STATUS.md`, `TECHNICAL_DECISIONS.md`, and `KNOWN_ISSUES.md` as needed.
