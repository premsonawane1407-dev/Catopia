# Catopia community product blueprint

**Status:** Phase 1 approved; the `/community-preview` design prototype now includes PAW in place of the Cats directory. The prototype is a design preview only; no community or PAW database, authentication, or upload flow is connected.

## Product idea

Catopia is a campus cat field journal: people discover approved stories, learn about reviewed cat identities, and submit memories for careful review. It can borrow the convenience of visual discovery products without becoming an engagement-driven social network. The cats' comfort, contributor consent, and location privacy shape the product.

## Proposed sections

| Section | Purpose | First-release behavior |
|---|---|---|
| **Home** | One image-first community landing feed | Combine the welcome, horizontally browsable cat moments, and scrollable story posts on one page. Keep posts editorial and cat-centered; do not create a separate For You page or personalization algorithm in the first release. |
| **Explore** | Intentional browsing | Search and filter approved stories and cats by broad themes and approved campus areas. Offer grid/list views; map is a later phase. |
| **Plays** | A relaxed feed of community cat videos | Scroll one reviewed clip at a time with a gentle snap and small inter-clip gap. Preserve each uploaded video's original aspect ratio instead of cropping every clip into a vertical format. Keep this distinct from the story archive while allowing a clip to link to a reviewed cat or broad area. |
| **Map** | Street-map context for approved stories around DYPIU Akurdi and nearby areas | Show broad areas and reviewed landmarks with selectable filters (for example, paw markers and story types). Never show live or precise cat sightings. The current screen uses real OpenStreetMap-based street tiles with no cat markers until reviewed records exist. |
| **PAW** | Curated feline knowledge and discovery hub | Browse source-linked editorial notes through Meet the Cats, Cat Curiosities, Cat Through Time, and The Cat Toolkit. A future reviewed-cat directory can be added within Meet the Cats once approved records and rights-cleared images exist; reference portraits must not be presented as real profiles or breed/species evidence. |
| **Cat page** | A small, respectful portrait of an individual cat | Approved photos, safe public description, reviewed stories, and an approximate public area only when appropriate. Avoid a people-first social profile template. |
| **Stories** | Archive of approved moments | Browse observations and memories by cat, theme, broad area, or date range. Public dates may need coarsening when they could reveal a routine. |
| **Share a story** | Private contribution intake | Contributor submits a photo and short note. It remains private until reviewed. Exact location is neither required nor publicly shown. |
| **Profile** | Contributor controls | View submission status, edit or withdraw pending work, and request removal of published contributions. Keep public contributor identity optional. |
| **Review desk** | Moderator workflow | Private queue for review, location/text redaction, photo-rights confirmation, duplicate identity flags, approval, rejection, and removal. Staff-only. |
| **Admin access** | Master admin delegates moderation work | A master admin has full control and can create sub-admin accounts with role-scoped access. Admin actions must be permission-checked and auditable. Phase 2 shows role controls as a non-persistent prototype only. |

## Main journeys

### Discover a cat

`Home feed → Discover or story post → Reviewed cat page → Related approved stories`

### Browse by place

`Explore → Choose broad campus area → Stories from that area`

The map is not required for this journey. When it is introduced, it will use approved public landmarks or broad zones rather than precise sightings.

### Submit a story

`Share a story → Add photo and note → Consent and safety review → Private pending state → Moderator decision → Published story or private rejection`

### Correct an identity or story

`Story or cat page → Report a correction → Private review queue → Moderator updates or removes content`

## First-release scope

1. Read-only Home feed, Discover, PAW, cat pages, and Stories using approved material. PAW's current preview uses a small source-linked editorial dataset and clearly labeled visual reference portraits.
2. Clear empty states when no approved material exists; do not fill screens with fabricated production records.
3. Private story submission and moderator review may follow once permissions, storage, and moderation ownership are ready. Support sightings, portraits, and memories.
4. Map, 3D world, live updates, public comments, DMs, public user profiles, likes/counts, follows, and recommendation algorithms are out of the first release.

## Safety, privacy, and moderation rules

- Default public location to a broad named area or no location. No live location, route, feeding time, hiding spot, or precise coordinates.
- Review visible photo details and text for location clues; approximate coordinates alone do not prevent inference.
- Do not encourage approach, handling, feeding, chasing, or attempts to find a cat.
- Obtain contributor permission for each submitted photo and provide removal controls.
- Keep unreviewed submissions private and enforce this in trusted server/database permissions, not only by hiding UI.
- Contributor identity is private by default. Offer public display only as an explicit opt-in at submission; recommend anonymity without pressuring the contributor.
- Review cat identity manually. Similar appearance is a review hint, never an automatic match or merge.
- Record moderation state and reason for staff review. Public screens show only approved records.
- Master admin can create sub-admin accounts and configure role scopes; least privilege is the default, and privileged changes should be logged.
- Do not introduce engagement counts, streaks, rewards, or notifications that encourage repeated sightings.

## Design direction and reference use

Use the user's supplied Instagram-inspired desktop feed brief for a persistent left navigation, centered photo feed, circular moments row, and mobile bottom navigation. Keep Catopia typography, colors, and field-note tone; do not copy Instagram branding. Combine Home and For You into one Home feed. Use the supplied Pinterest gallery reference for image-led discovery and varied image cards, while keeping Discover calmer and more editorial. Use the supplied iNaturalist reference for observation search and view/filter organization. Use the supplied Airbnb map reference only for the relationship between a selected map feature and its story card. Use the National Geographic reference for generous photography, typography, and breathing room on cat/story pages. Use Are.na for quiet collections and intentional browsing. Use Linear only as a usability reference for clear submission and review states, not as a visual style.

Verified product documentation that informs interaction patterns:

- Pinterest describes visual discovery, a home feed, and organizing saved ideas into boards: [Pinterest Help — All about Pinterest](https://help.pinterest.com/en/guide/all-about-pinterest).
- iNaturalist documents Explore with map, grid, and list views plus filters: [iNaturalist Help — Search observations](https://help.inaturalist.org/en/support/solutions/articles/151000169670-how-to-search-inaturalist-observations).
- iNaturalist warns that obscured coordinates may still be inferred from other clues, supporting Catopia's broader location policy: [iNaturalist Help — Geoprivacy](https://help.inaturalist.org/en/support/solutions/articles/151000169938).
- eBird shared hotspots demonstrate shared places moderated by designated admins: [eBird Help — Explore hotspots](https://support.ebird.org/en/support/solutions/articles/48001280356-explore-ebird-hotspots).
- Are.na channels provide a reference for collecting content into browsable collections: [Are.na Help — Channels](https://help.are.na/docs/getting-started/channels).

These are references for specific patterns, not instructions to reproduce a product's complete interface. Final screen compositions should use Catopia's warm cream, sage, forest green, terracotta, and field-notes visual language.

## Delivery phases and approval gates

| Phase | Deliverable | Approval checkpoint |
|---|---|---|
| **1. Product blueprint** | This section map, journeys, first-release boundary, safety rules, and reference rationale | User reviews this document before design work begins. |
| **2. Screen design and clickable prototype** | Approved desktop/mobile wireframes and linked prototype for key journeys | User approves navigation, page layouts, and interaction behavior before application implementation. |
| **3. Read-only community experience** | Screens for approved stories, Explore, PAW, and reviewed cat pages | User approves observed responsive screens before connecting production data. PAW content requires editorial/source review; cat identity content requires manual review and photo permissions. |
| **4. Submission and moderation** | Authenticated private submission, consent, upload handling, moderator queue, and removal controls | User approves workflow and moderation permissions before opening submissions. |
| **5. Map and community interactions** | Approximate-location map and carefully chosen low-pressure interactions | User approves location treatment and interaction policy before release. |

Each phase will be presented for review before work on the next phase starts.

## Delivery responsibilities

Implementation phases must cover the user's requested responsibilities, not stop at component generation:

- **Design:** Consistent screen composition and a Catopia design system.
- **Frontend:** Working navigation, filters, cards, submission states, and responsive layouts.
- **Backend and security:** Validated server input, authenticated access, private submissions, protected storage, and database-enforced permissions.
- **Moderation:** Review states, approval/removal actions, and manual cat-identity decisions.
- **Media:** Consent tracking, image metadata review/removal, and optimized uploads.
- **Quality:** Browser workflow checks, visual comparison, keyboard/accessibility review, and desktop/tablet/mobile inspection.
- **Release:** Environment configuration, deployment readiness, and accurate feature status.

The supplied skill names (`frontend-design`, `ui-visual-composition`, `supabase`, `playwright`, `accessibility`, `web-performance`, `catopia-design-system`, `catopia-moderation`, `catopia-location-privacy`, `catopia-photo-pipeline`, and `catopia-quality-gate`) are capability suggestions for the later design/implementation phases. Phase 1 records them as needs; it does not install skills or implement the community.

## User decisions recorded for Phase 2

- **Starting area:** DYPIU Akurdi, Pune, plus nearby places. Catopia is not restricted to this campus long term.
- **Moderation ownership:** Admins review and moderate submissions and site data. A master admin has full access and can create sub-admins and assign their access/roles.
- **Contributor identity:** Private by default, public only by choice. The interface should recommend anonymity and preserve the user's final choice.
- **Story types:** Sightings, portraits, and memories.
- **Prototype imagery:** Use supplied reference cat images, visibly labeled as samples/portrait studies. The user will supply approved photos and written permissions after the database is connected.
- **Plays feed:** Add a separate video-browsing section inspired by short-video feeds, but preserve source aspect ratios. Phase 2 uses labeled still-image placeholders because no sample video files or connected uploads are available yet.
- **Like gesture:** Double-tapping a feed post or reel adds a local preview like and briefly animates a heart in the center of the media. It does not display engagement counts or persist data.
- **Map prototype:** Use MapLibre with OpenFreeMap's OpenStreetMap-based Positron/Liberty styles. The prototype has map pan/zoom, place search, style toggle, permission-based recentering, category chips, map/list nearby panel, and privacy copy. It has no cat markers or submissions until approved records and protected storage are connected. Street-level imagery is not simulated; a provider token and coverage review are still needed.
- **Map direction:** Street map with filters, including paw markers and additional types as the product grows. Public cat locations remain approximate and reviewed.
- **PAW direction:** Replace the top-level Cats directory with an editorial discovery hub. The current prototype has four collections, date-indexed sourced field notes, search, session-only saved notes, a source-linked quiz, and a short learning trail. It is not a complete encyclopedia; collection filters only cover the small curated sample dataset, and sample cat portraits are not evidence of breed/species identity.

## Phase 1 completion check

- [x] Sections and their responsibilities are defined.
- [x] Primary browse, map-context, submission, and correction journeys are defined.
- [x] First-release and later-phase boundaries are explicit.
- [x] Safety, privacy, consent, and manual identity review rules are recorded.
- [x] Design and product references are mapped to specific patterns.
- [x] User approved Phase 1 and supplied the initial campus, admin, identity, story-type, image, and map decisions.
- [ ] User reviews the Phase 2 prototype before Phase 3 implementation begins.
