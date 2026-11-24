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

## User-provided PAW preview imagery

Selected images from `references/paw/` are copied into `public/images/paw/` for the PAW prototype. They are used as visual references only, with collection images chosen to match each board's theme. They do not identify real Catopia cats or serve as evidence for the linked articles.

| Public file | Source file | Dimensions | Bytes | Intended use |
|---|---|---:|---:|---|
| `meet-cats-01.jpg` | `references/paw/meet the cats 1.jpg` | 1000×667 | 96,843 | Meet the Cats board |
| `meet-cats-03.jpg` | `references/paw/meet the cats 3.jpg` | 2048×1366 | 142,172 | PAW hero and Meet the Cats board |
| `meet-cats-05.jpg` | `references/paw/meet the cats 5.jpg` | 2048×1365 | 438,764 | Meet the Cats board |
| `curiosity-01.jpg` | `references/paw/cat curiosity 1.jpg` | 1100×1100 | 102,804 | Whiskers note and Cat Curiosities board |
| `curiosity-02.jpg` | `references/paw/cat curiosity 2.jpg` | 1200×1744 | 181,446 | PAW hero and Cat Curiosities board |
| `curiosity-03.jpg` | `references/paw/cat curiosity 3.jpg` | 230×360 | 13,379 | Cat Curiosities board thumbnail |
| `through-time-01.jpg` | `references/paw/Cat through time.jpg` | 800×533 | 98,492 | History note and Cat Through Time board |
| `through-time-02.jpg` | `references/paw/Cat through time 2.jpg` | 1222×711 | 173,878 | Cat Through Time board |
| `through-time-06.jpg` | `references/paw/Cat through time 6.jpg` | 1280×1255 | 342,471 | Cat Through Time board |
| `toolkit-01.jpg` | `references/paw/cat tool kit 1.jpg` | 1280×650 | 101,106 | The Cat Toolkit board |
| `toolkit-04.jpg` | `references/paw/cat tool kit 4.jpg` | 1388×995 | 207,524 | Care note and The Cat Toolkit board |
| `toolkit-06.jpg` | `references/paw/cat tool kit 6.jpg` | 640×640 | 63,402 | Enrichment note and The Cat Toolkit board |

All selected files are JPEGs. No conversion or compression was applied; original files remain in `references/paw/`.

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
