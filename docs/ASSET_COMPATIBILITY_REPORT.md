# Catopia asset compatibility report

## Current state

- **Source packs acquired:** Four Kenney packs (Nature, Building, City Kit Roads, Furniture) plus Cube Pets.
- **Selected environment GLBs:** 18 files extracted and staged in `assets/3d/` and `public/models/environment/`.
- **Cat models acquired:** One Quaternius Cat GLB from Poly Pizza; not staged for public delivery yet.
- **Textures acquired:** Three 1K Poly Haven diffuse JPGs; retained as source only because their photorealistic look conflicts with the current stylized target.
- **Fonts acquired:** Nunito and Fraunces Latin variable WOFF2 plus OFL texts; local copies staged in `public/fonts/`.
- **Original web mark:** Catopia vector mark authored and copied to the public image and favicon paths.
- **Models opened in a Three.js browser renderer:** None; npm packages are unavailable from the configured registry.
- **Animation clips inspected in metadata:** Quaternius Cat contains `Bite_Front`, `Dance`, `Death`, `HitRecieve`, `Idle`, `Jump`, `No`, `Walk`, and `Yes`; visual behavior is unverified.
- **Optimizations performed:** Selected source GLBs are small and directly usable in public path; no mesh simplification or texture compression performed. 1K textures were source-downloaded but excluded from production delivery.
- **Integrated reusable asset components:** None; assets are staged, not yet referenced by app components.

### PAW preview images supplied by the user

- Twelve selected JPEGs from `references/paw/` are copied to `public/images/paw/` and now appear in the PAW hero, collection collages, and relevant note cards.
- All twelve files decode as JPEGs and loaded through the local Next.js preview. Dimensions and byte sizes are recorded in `docs/ASSET_CATALOG.md`.
- The files remain unoptimized originals; largest selected file is 438,764 bytes. They are suitable for this local prototype at current display sizes.
- Creator and license terms were not supplied with these files. Keep them prototype-only until rights and any attribution requirements are confirmed. Image captions explicitly say these visuals do not verify identities or support the linked articles.

## Acceptance checks for each candidate

### 3D models

- Confirm GLB/GLTF content and all referenced textures are present.
- Confirm scale, forward axis, origin/pivot, normals, material appearance, triangle count and texture dimensions.
- Check model at Catopia's target scale and inspect in a real browser renderer before integration.
- Prefer low-poly meshes and shared materials; record original and optimized sizes.

### Cats and animation

- Confirm a quadruped skeleton or self-contained authored animation clips.
- Inspect each clip on the exact model; verify foot contact, root motion, orientation and looping.
- Do not retarget humanoid Mixamo clips to cat rigs.
- Do not claim walking, sleeping, grooming, stretching, tail movement, or jumping until the corresponding clips visibly work.

### Images, textures and audio

- Record dimensions, MIME/codec, size, color profile and intended delivery format.
- Convert only after preserving the licensed source; check visual quality after optimization.
- For audio, record duration, sample rate, codec and loudness; keep audio optional and provide a mute control.

## Extracted model register

All listed Kenney files are single-mesh or two-mesh GLBs with one primitive mesh in the inspected header. Each GLB parsed successfully and has no external texture references in its JSON chunk. Repeated scene scale, orientation, normals, and actual browser appearance still need visual checking.

### Nature Kit

- `plant_bush.glb` — 4,396 bytes
- `plant_bushLarge.glb` — 6,436 bytes
- `tree_default.glb` — 9,428 bytes
- `tree_oak.glb` — 14,644 bytes
- `tree_pineRoundA.glb` — 14,488 bytes
- `grass.glb` — 11,496 bytes
- `ground_grass.glb` — 1,576 bytes
- `ground_pathStraight.glb` — 5,620 bytes
- `flower_redA.glb` — 7,104 bytes
- `flower_yellowA.glb` — 7,120 bytes
- `fence_planks.glb` — 7,720 bytes
- `fence_gate.glb` — 27,652 bytes

### City Kit Roads

- `road-straight.glb` — 5,248 bytes
- `road-crossroad.glb` — 10,084 bytes
- `light-square.glb` — 6,996 bytes
- `road-sign-street.glb` — 15,948 bytes
- `construction-fence.glb` — 14,856 bytes

### Furniture Kit

- `bench.glb` — 10,756 bytes

### Cat candidate

`assets/3d/cats/quaternius-cat.glb` — 111,948 bytes; one mesh, one skin with four joints, nine animation records. Four joints and generic clip labels are not enough to confirm a fully animated quadruped. It must be loaded and visually tested before reuse or coat variants are created.

## Store UI components (2026-11-24)

- Glare Hover, Fade Content and Dot Grid compile under strict TypeScript, pass the project lint (with the `react-hooks/refs` rule disabled for these vendored files, which use an upstream latest-ref pattern), and `npm run build` succeeds. All three check `prefers-reduced-motion`; Fade Content then skips the animation entirely.
- Verified in the local browser at desktop width: rows reveal on scroll, glare sweeps on the photo tiles, Dot Grid renders as a faint background behind the category rows. Mobile width, low-end device performance and an actual reduced-motion run were not checked.
- The toolkit photos have unverified provenance (see License register), so crops are labelled on the page as illustrative samples, not product listings.

## Store hero (2026-11-24)

- Three-slide crossfade hero checked in the local browser at desktop and 375px mobile widths: auto-rotation, dot navigation, real-hover pause and resume, touch-swipe both directions, both CTA types (scroll to catalogue; Toys & Play filter) and no horizontal overflow on mobile. Tablet width, an actual reduced-motion run and low-end device performance were not checked.
- Portrait and square sources are shown in a right-hand frame over a blurred copy of the same photo, so the left side stays free for text without upscaling small images.
- Noise is a canvas film-grain overlay running at 10 fps; it pauses itself offscreen and under reduced motion per the upstream code.

## Store product page (2026-11-24)

- Verified in the local browser: gallery thumbnails, arrows, keyboard (arrows/Home/End), crossfade, hover zoom, lightbox (open, arrows, zoom toggle, focus trap, Escape, scroll lock), deep link by `?product=`, related-product navigation with state reset, quantity and live total, wishlist, add-to-bag and cart badge, accordion, sold-out state, products with no photos (concept plate + details plate), desktop and 375px mobile layouts (no horizontal overflow, sticky buy bar appears after the main button scrolls away). `tsc`, eslint and `npm run build` pass.
- Not verified: tablet width, a real touch swipe on a device (swipe handlers were exercised with synthetic touch pointer events on the hero only), an actual reduced-motion run, screen-reader output, performance on low-end devices.
- Image quality: several crops are 200–350px regions of 1–1.5 MP source photos, so they are soft when zoomed in the lightbox. Replace with real product photography.

## Map interface and 3D Earth mode (2026-11-25)

- Verified in the local browser: 2D map with the redesigned dock, chips, live place count (Counter) and search results; pin hover cards; place preview with no visible scrollbar (cover or concept plate, actions, facts, reviews, bottom sheet on a phone); 3D mode on and off (state restored: tilt 0, north up, local zoom limit, flat projection, 3D layers removed); extruded buildings, terrain, hillshade and sky; tilt buttons, orbit start and stop; satellite imagery in 3D; Earth flight out to the globe and back home; Cozy, Dark and Satellite themes in 3D; 375px layout with an icon-only 3D bar. `tsc`, eslint (no warnings) and `npm run build` pass.
- Found and fixed while testing: far-away buildings without height properties rendered as black streaks at steep tilt; React root unmounts for pins now run after the current render; the attribution control starts collapsed.
- Not verified: tablet width, real touch gestures on a device, performance on low-end phones, reduced-motion behaviour end to end, screen readers, and the production terms of the Esri imagery and AWS terrain sources.
- Building heights are whatever OpenStreetMap holds; many buildings in the area have no height and show at the default.

## Game look-test preparation (2026-11-25)

- **Kenney Fantasy Town Kit:** all 72 staged GLBs parse (valid glTF container, magic number and JSON chunk) and every texture reference (`Textures/colormap.png`) resolves next to them. Preview image shows modular walls, roofs, stalls, carts, lanterns, roads and trees in a flat-shaded low-poly style that suits a pixelated or tilt-shift treatment. Rendered in a browser on 2026-11-25 (Phase 0 look test): scale, pivots and snapping were checked by building a street from them, and the grid, orientation and roof findings are in `LOOK_TEST.md`. Rear and interior faces are unchecked.
- **Packages:** `postprocessing` 6.39.6 (peer `three >=0.168 <0.188`) and `@react-three/postprocessing` 3.2.2 (peers React ^19, `@react-three/fiber` >=9.7) match the installed three 0.187, React 19 and R3F 9.8.2. `TiltShift`, `TiltShift2`, `Bloom`, `DepthOfField`, `Vignette`, `Pixelation` and `EffectComposer` exports exist. `npx tsc --noEmit` passes. Rendered and working in the Phase 0 look test: tilt-shift, bloom, vignette, noise and Khronos Neutral tone mapping. The `ColorDepth` posterize effect was tried and rejected (heavy banding). `RenderPixelatedPass` was not used. three's `RenderPixelatedPass` file is present; a forum report describes an R3F wrapper error with it, so it needs a test in the look-test.
- **Cat sprites:** the Shepardskin GIFs are walk/run only and very small, so they cannot cover the planned sit, sleep, groom and stretch states.
- **Round 2 (2026-11-25):** the stock pieces keep their Kenney colour map; pixel-art detail textures are multiplied over it in world space by dominant axis, chosen per piece name (plaster with a stone plinth and timber frame, wood planks, roof tiles, brick). Window panes are added as separate lit quads in front of the glass because the stock windows are glazed insets. The 48 px cat is lit with a generated normal map and casts a silhouette-shaped shadow.

## Game Phase 1 shell and render foundation (2026-11-25)

- **Packed town pieces:** `scripts/build-town-pieces.mjs` reads the 72 staged GLBs and writes `public/models/town/pieces.json`, `pieces.bin` and `colormap.png` (72 pieces, 19,134 vertices, 11,920 triangles; 683,808 bytes of geometry, 13,013 of manifest, 11,143 of colour map). Checked: the manifest and every offset parse (`features/game/world/town-pieces.test.ts` loads the real files and finds all 72 pieces; a wall panel is a one-unit-high slab on the +X edge of its cell); all five game files are served by `next start` and load in the browser; the packed UVs keep glTF's convention, so the colour map is loaded with `flipY = false`. Pieces are merged by `mergeGeometries` after each placement's transform is baked in (`static-batch.test.ts`: every triangle survives, normals stay unit length under non-uniform scale, the loaded pieces are not modified).
- **Size and transfer:** the first visit to `/play` in a production build transferred 580,477 bytes of JavaScript (1,780,449 decoded), 705,369 bytes of game files, 106,432 bytes of fonts and 7,867 bytes of CSS. `pieces.bin` goes over the wire uncompressed (about 684 KB, the largest single item); quantizing positions and normals or meshopt/Draco compression would shrink it and belongs to Phase 7.
- **Render result:** 144 placed pieces become 7 meshes (plaster 56 pieces, timber walls 40, two roof tints 14 and 10, wood 7, brick 4, plain 13). With code-built props, windows and halos the street draws in 56 calls across all passes (about 510 in Phase 0) and about 43,000 triangles. Frame cost at Full dropped from about 20 ms to about 7 ms; see `docs/phase1/bench-frame-cost-2026-11-25.json`.
- **Not verified:** a real phone or tablet, Safari and Firefox (WebGL 2 and half-float render targets are assumed), the cat and street at other densities than 1.25 and 2, rear and interior faces of the pieces, and three.js `PCFSoftShadowMap` (removed in three 0.187; the game uses the filtered `PCFShadowMap`).
- **Warning from a dependency:** react-three-fiber 9.8.2 still constructs `THREE.Clock`, and three 0.187 logs "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead." each time the game opens. It is the only console message in a production run. It is harmless and comes from the library, not the game.

## Candidate review

- Kenney source pack previews were extracted from the CC0 archives and visually inspected. Nature, road, and furniture art is a consistent stylized kit, but the Nature pack's saturated teal/orange palette may need material overrides to match Catopia. Building Kit is modular greybox architecture, not a campus building model.
- The Cube Pets cat preview was inspected. It is intentionally square/cube-shaped and too toy-like for the project's primary real-cat identity presentation; keep only as a possible playful UI illustration reference, not a primary cat model.
- Three Poly Haven 1K diffuse maps were downloaded and viewed. Their realistic texture detail conflicts with the cozy stylized environment; source copies are retained, but no production copy remains in `public/textures/`.
- Fonts are small Latin variable WOFF2 files with local SIL OFL notices; suitable for the chosen display/body roles.
- No individual orange, white, black, grey, calico, or brown-tabby mesh variants and no compatible sitting, sleeping, grooming, stretching, or tail clips are verified yet.
