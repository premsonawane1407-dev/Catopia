# Catopia asset catalog

## Acquisition status

Source packs and a first small set of web assets are now acquired. Candidate files are separated from production assets. The 3D models have passed container/header and metadata inspection, but have not yet been loaded in a Three.js browser viewer because project dependencies are not installed.

| Asset group | Required items | Acquired | Candidate source / notes |
|---|---|---:|---|
| Cats | Orange, white, black, grey, calico, brown tabby | 1 source candidate / 6 | One Quaternius cat GLB acquired; no verified coat variants |
| Cat animations | Walk, run, sit, idle, sleep, groom, stretch, look, tail, jump, turn | 2 potentially relevant clips / 11 | The Quaternius GLB includes `Idle`, `Walk`, and `Jump` among nine clips; clip behavior and quadruped motion remain unverified |
| Campus environment | Buildings, library, cafeteria, paths, garden, trees, benches, lights, gate, signs, props | 18 selected GLBs staged in `public/models/environment/` | Kenney Nature, City Kit Roads, and Furniture source packs acquired; Building Kit retained as modular greybox source |
| Materials | Grass, soil, pavement, brick, wood, roof, stone, water, sky/lighting | 3 source textures acquired | Poly Haven 1K diffuse files were visually inspected; photorealistic appearance does not match the current stylized target, so they are excluded from `public/` pending an art-direction decision |
| Website | Logo, favicon, profile/empty states, map markers, badges, icons, loading art | 2 font families acquired | Nunito and Fraunces Latin variable WOFF2 files plus OFL texts are stored and served locally; remaining bespoke assets are not acquired |
| Audio | Meow, purr, footsteps, birds, wind, leaves, ambience, UI and reward sounds | 0 | No sound files acquired; each must have per-file license and attribution recorded |

## Acquired source packs and files

| Source | Archive / files | Size | Notes |
|---|---|---:|---|
| Kenney Nature Kit | `assets/source-packs/kenney-nature-kit.zip`; 12 selected source GLBs and license copy | 10,537,521 bytes | 3,626 entries; archive includes 329 GLBs and `License.txt` |
| Kenney Building Kit | `assets/source-packs/kenney-building-kit.zip`; license and preview copies | 1,598,905 bytes | Modular wall/roof/stair pieces; useful as greybox parts, not campus architecture |
| Kenney City Kit (Roads) | `assets/source-packs/kenney-city-kit-roads.zip`; 5 selected source GLBs and license copy | 2,852,289 bytes | Includes road, crossing, sign, light and barrier modules |
| Kenney Furniture Kit | `assets/source-packs/kenney-furniture-kit.zip`; bench GLB and license copy | 5,130,729 bytes | Bench is staged as a prop; the broader pack is mostly indoor furniture |
| Kenney Cube Pets | `assets/source-packs/kenney-cube-pets.zip`; preview and license copies | 2,812,444 bytes | Contains one highly blocky cat model among animal models; not selected for the main cat character |
| Quaternius via Poly Pizza | `assets/3d/cats/quaternius-cat.glb` | 111,948 bytes | One CC0 skinned mesh; one skin with four joints and nine clips. Candidate only until rendered/animation-tested |
| Poly Haven | 3 JPG diffuse maps under `assets/textures/` | 2,409,449 bytes | Three 1K, 1024×1024 maps; source files only, not in production `public/` |
| Google Fonts | Nunito/Fraunces WOFF2 under `assets/website/fonts/`, copied to `public/fonts/` | 106,432 bytes for the two WOFF2 files | Variable Latin subsets; OFL license text accompanies each source font |

The 18 selected Kenney environment GLBs are copied to `public/models/environment/` for later use. Their source copies remain under `assets/3d/`; no 3D component loads them yet.

## Candidate packs reviewed

- [Kenney Nature Kit](https://kenney.nl/assets/nature-kit): acquired; includes GLB files and an included CC0 license. Pack preview was inspected. Individual selected models still require a browser render check.
- [Kenney Building Kit](https://kenney.nl/assets/building-kit): acquired; modular pieces only, so it does not provide a ready campus, library, or cafeteria.
- [Kenney City Kit (Roads)](https://kenney.nl/assets/city-kit-roads) and [Furniture Kit](https://kenney.nl/assets/furniture-kit): acquired; previews inspected and selected road/bench parts staged for later integration.
- [Kenney Cube Pets](https://kenney.nl/assets/cube-pets): acquired and inspected. Its cat is a tiny cube-style figure and does not satisfy the current character direction on its own.
- [Quaternius Cat by Quaternius on Poly Pizza](https://poly.pizza/m/2f54vbV0In): acquired from the page's linked GLB; the page identifies the model as Public Domain (CC0). Mesh/rig metadata was inspected but not rendered.
- [Poly Haven](https://polyhaven.com/license): candidate source for HDRIs, textures, and models; prefer compact texture resolutions and verify the selected file metadata before use.
- [ambientCG](https://docs.ambientcg.com/license/): candidate source for materials; prefer web-sized texture sets.

## File register

For every later addition, record exact file path, source page, creator, license, source download date, original file size, optimized size, format, dimensions/poly count/texture resolution where applicable, and component usage. The Kenney ZIP archives retain the original pack files and included `License.txt` files; extracted files are enumerated in the compatibility report and retain copies of each pack license in `assets/3d/` or `assets/source-packs/`.
