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

## Community product decisions (approved for prototype direction)

- Start with DYPIU Akurdi, Pune, and nearby areas; Catopia should remain usable for other localities later.
- Support sightings, portraits, and memories.
- Contributor identity is private by default, with an explicit public opt-in and a gentle anonymity recommendation.
- Master admin can create sub-admins and assign role-scoped access. Production permissions and audit requirements still need implementation design.
- Map direction is a street map with filters and paw markers; public cat locations remain broad and reviewed.
- The Phase 2 prototype may use supplied reference images only when clearly labeled as samples/portrait studies.
- Add a dedicated Plays browse section for community cat videos. Preserve each uploaded clip's original aspect ratio; do not crop every clip to a portrait-only format. Until approved video samples and uploads exist, the prototype uses clearly labeled still-image layout samples.
- Use the existing MapLibre dependency with OpenFreeMap vector styles for the map preview; retain provider attribution. Do not create sample cat pins or sightings. Keep the map empty of animal records until reviewed data and permissioned storage are available. Street-level imagery requires a separately reviewed provider and token.
- Map place-discovery (cat cafés, shelters, adoption centres, vets, pet shops, grooming, cat-friendly spots) is a separate concept from cat sightings/pins above and is not subject to the "keep empty" rule, since these are ordinary public businesses, not animal records: query real business data from the public Overpass API (OpenStreetMap) by category tag (`amenity=veterinary`, `shop=pet`, `shop=pet_grooming`, `amenity=animal_shelter`), and fill categories OSM has no usable tag/data for (cat cafés, general cat-friendly spots) with a handful of names/descriptions that say "sample"/"concept" outright. Never attach a rating, review count, or photo to a place unless it came from a real source (OSM tag) or Catopia's own session-local review system — no fabricated review data, ever. Ratings/reviews/saved places are session-only `useState` (no Supabase project is configured), matching the same non-persistence convention used by Saved stories and PAW. Directions open an external Google Maps link (no routing API key configured) rather than drawing an in-app route.
- The Stories nav section was replaced with a concept Store (food, treats, litter, toys, grooming, health, furniture, carriers) per explicit direction, since Stories' filterable-list layout was already duplicated by Discover/Home. Every product is an original Catopia-concept name — never a real brand, never real inventory — since there is no real supplier relationship to represent honestly. No payment form or payment provider is used anywhere in the checkout flow (not even a fake one): checkout only collects a name/address/phone and ends with an explicit "nothing was charged or delivered" confirmation. Cart/order state is session-only `useState`, matching every other non-persistent feature, since no Supabase or payment provider is configured.
- Store detail pages use a `?product=<id>` query value within the existing `/community-preview` shell. Next.js's documented native History API integration keeps the in-page selection refreshable and browser-back aware without introducing a second storefront routing shell. The current catalog contains no product image, rating, review, variant, specification, supplier, stock-count, shipping-policy, or delivery data, so the detail view uses a clearly-labeled original category illustration and omission/empty states rather than presenting those fields as real. Cart and wishlist remain session-only preview interactions.
- Store redesign (boutique catalogue + left filter drawer): the 8-category placeholder taxonomy was replaced with a 10-category/subcategory concept taxonomy (`store-data.ts`), each product optionally carrying `lifeStage`/`material`/`size`/`color` so the filter drawer's facets (Life Stage, Material, Size, Colour) are computed live from `PRODUCTS` and scoped to the active category/subcategory — a facet section is only rendered when at least one matching product has that attribute, so no empty or irrelevant filter option is ever shown. The old right-aligned dropdown filter panel was replaced with a true left-sliding drawer (`role="dialog"`, body scroll-locked while open, closes on Escape/overlay click/explicit close button, ~300ms easing, sticky "Show N products" footer) per explicit design direction, plus a "Shop by Category" discovery-tile grid above the toolbar and a removable active-filter chip row above the product grid. No rating, review-count, discount, or stock-count values are fabricated anywhere in the catalogue or filters — "New"/"Staff pick" are the only product tags, both editorial rather than statistical, and there is deliberately no Rating filter or Brand filter since no real review data or multi-brand catalogue exists yet. "Newest Arrivals" sort is based on catalogue array order (last-added = newest), not a real timestamp, since no creation-date field exists; this is a known simplification, not fabricated metadata.

## Pending production decisions

- Exact campus boundary, verified public landmarks, and approved map content.
- Supabase project/environment ownership, role matrix details, moderator coverage, and audit retention.
- Map tile/style provider and attribution requirements.
- Photo consent records, retention policy, deletion workflow, and approved photos.
- Hosting/deployment target and production domain.
