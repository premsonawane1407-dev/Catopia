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

## Candidate review

- Kenney source pack previews were extracted from the CC0 archives and visually inspected. Nature, road, and furniture art is a consistent stylized kit, but the Nature pack's saturated teal/orange palette may need material overrides to match Catopia. Building Kit is modular greybox architecture, not a campus building model.
- The Cube Pets cat preview was inspected. It is intentionally square/cube-shaped and too toy-like for the project's primary real-cat identity presentation; keep only as a possible playful UI illustration reference, not a primary cat model.
- Three Poly Haven 1K diffuse maps were downloaded and viewed. Their realistic texture detail conflicts with the cozy stylized environment; source copies are retained, but no production copy remains in `public/textures/`.
- Fonts are small Latin variable WOFF2 files with local SIL OFL notices; suitable for the chosen display/body roles.
- No individual orange, white, black, grey, calico, or brown-tabby mesh variants and no compatible sitting, sleeping, grooming, stretching, or tail clips are verified yet.
