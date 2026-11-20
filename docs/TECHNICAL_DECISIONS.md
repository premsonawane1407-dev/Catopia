# Catopia technical decisions

## Initial decisions

### Application framework

Use Next.js App Router, React and strict TypeScript as the initial application foundation, matching the supplied product specification and execution prompts. Introduce Three.js/React Three Fiber and MapLibre only with the world/map stages so the foundation stays lean.

### Backend boundary

Use Supabase PostgreSQL/Auth/Storage as the planned source of truth. Keep browser-safe Supabase configuration separate from server-only privileged configuration. A local shell without credentials must report that the backend is not configured rather than displaying fabricated persisted data.

### Data and location safety

Use UUIDs for internal records and stable human-readable Cat IDs for public display. Keep geographic coordinates separate from 3D presentation coordinates. Publish landmark or approximate sighting locations by default; precise sensitive animal locations must not be public.

### Identity and moderation

Treat new cat identity as provisional until reviewed. Do not merge cats automatically based on photo similarity. Public counts and feeds should only include records allowed by moderation policy. Enforce permissions in server/database rules, not only in the interface.

### Asset handling

No assets were present in the workspace during the audit. Do not treat listed marketplaces or packs as acquired assets. Record source, author, license, attribution, file path and compatibility before production use. Verify each pack's actual license; availability for free download does not establish production rights.

### Architecture sequence

Establish a runnable application and configuration baseline first, then design/navigation, shared location/world data, 3D world and map, cat/community workflows, server-side gamification, integration and release hardening. This resolves the differing phase groupings in the source prompts while preserving their dependency order.

## Conflicts and resolution

- **Animation libraries:** One section mentions GSAP and React Spring; no feature requires either at foundation time. Avoid adding both by default and choose only when a concrete interaction needs them.
- **Demo data vs. no fake production data:** Prompt examples permit demonstration locations, while the product rules prohibit fabricated production records. Any future seed/demo fixtures must be explicitly labeled and isolated from production paths.
- **Asset checklist vs. missing supplied assets:** Asset acquisition is a goal, but no assets or verified source files were in the repository. Catalog only assets actually acquired and inspected.
- **Test tooling:** The prompts recommend Vitest and Playwright. Add them when application behavior exists and the toolchain is available; do not claim checks that could not run.

## Pending decisions

- Campus and locality name, boundaries, coordinate reference and approved public landmarks.
- Supabase project/environment ownership and initial moderation roles.
- Map tile/style provider and attribution requirements.
- Hosting/deployment target and production domain.
- Final content privacy, photo retention and moderator workflow policy.
