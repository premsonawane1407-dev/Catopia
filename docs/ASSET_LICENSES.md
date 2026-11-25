# Catopia asset license register

Assets are now downloaded. The following records include the source-page license and, for Kenney packs and Google Fonts, the downloaded pack/font license files. Recheck terms before release.

| Source / candidate | License evidence | Attribution | Current use |
|---|---|---|---|
| [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) | Asset page identifies CC0; `nature-License.txt` retained | Not required per [Kenney support](https://kenney.nl/support) | 12 GLB props staged |
| [Kenney Building Kit](https://kenney.nl/assets/building-kit) | Asset page identifies CC0; `building-License.txt` retained | Not required per [Kenney support](https://kenney.nl/support) | Modular source only; not a campus model |
| [Poly Haven](https://polyhaven.com/license) | Site states HDRIs, textures and 3D models are CC0 | Not required; appreciated | Three 1K diffuse maps retained as source |
| [ambientCG](https://docs.ambientcg.com/license/) | Site states downloadable assets are CC0 1.0 Universal | Not required; appreciated | Source researched; no files acquired |
| [Kenney City Kit (Roads)](https://kenney.nl/assets/city-kit-roads) | CC0; included `roads-License.txt` extracted from the downloaded archive | Not required | Selected road/prop models staged |
| [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) | CC0; included `furniture-License.txt` extracted from the downloaded archive | Not required | Bench model staged |
| [Kenney Cube Pets](https://kenney.nl/assets/cube-pets) | CC0; included `cube-pets-License.txt` extracted from the downloaded archive | Not required | Archive and preview retained; cat model not selected for production |
| Original Catopia mark | Authored in `assets/website/logo/catopia-mark.svg` | Not applicable | Copied to `public/images/catopia-mark.svg` and `public/favicon.svg` |
| [Quaternius Cat on Poly Pizza](https://poly.pizza/m/2f54vbV0In) | Model page identifies Public Domain (CC0) | Not required | One GLB acquired; candidate pending rendered review |
| [Nunito](https://fonts.google.com/specimen/Nunito) | SIL Open Font License; local `Nunito-OFL.txt` | OFL notice retained with source font | Latin variable WOFF2 served from `public/fonts/` |
| [Fraunces](https://fonts.google.com/specimen/Fraunces) | SIL Open Font License; local `Fraunces-OFL.txt` | OFL notice retained with source font | Latin variable WOFF2 served from `public/fonts/` |
| [Poly Haven grass/stone textures](https://polyhaven.com/license) | CC0; downloaded using the public API with 1K diffuse option | Not required | Source-only; photorealistic appearance is not approved for production styling yet |
| User-provided PAW reference images | Supplied in `references/paw/`; individual creator and license terms were not included or independently verified | Unknown; obtain any required credit before release | Selected images are used only in the local design prototype; production use is pending rights confirmation |
| [React Bits](https://github.com/DavidHDev/react-bits) — Glare Hover, Fade Content, Dot Grid, Counter, Magnet, Click Spark, Star Border, Gradual Blur, Shiny Text | MIT + Commons Clause per the source snapshots in `references/React Bits Components/` and `references/Web Assets/` (official repository LICENSE.md not re-checked in this session) | Not required; Commons Clause forbids selling the components themselves, not using them inside an app | Vendored verbatim into `app/community-preview/react-bits/`; used only in the Store category rows |
| Store hero photographs (`public/images/store/hero-*.webp`) | Derived from user-supplied `references/paw/meet the cats 3.jpg`, `references/paw/cat tool kit 6.jpg` and `references/cat/11.jpg`; creator and license were not supplied or verified (the toolkit image looks AI-generated) | Unknown; obtain any required credit before release | Prototype only. Replace with rights-cleared photography before public release |
| React Bits Noise | MIT + Commons Clause per `references/React Bits Components/Noise.txt` | Not required | Vendored verbatim into `app/community-preview/react-bits/`; film-grain overlay on the Store hero |
| Store product gallery images (`public/images/store/gallery/*.webp`, 43 crops × 3 sizes) | Cropped from user-supplied `references/paw/cat tool kit 1.jpg` to `cat tool kit 6.jpg`; creators and licenses were not supplied or verified (the toolkit images look AI-generated) | Unknown; obtain any required credit before release | Prototype only. Shown on product pages as sample imagery and labelled "Illustrative sample". Replace with rights-cleared product photography (via `Product.images`) before public release |
| Map data and imagery sources | OpenFreeMap vector tiles and styles (OpenStreetMap data, OpenMapTiles schema); AWS Terrain Tiles (Terrarium elevation, derived from Mapzen, NASA SRTM, USGS and others); Esri World Imagery raster tiles | OpenStreetMap/OpenFreeMap/OpenMapTiles and the terrain tile credits are shown in the map's attribution control; Esri imagery credit is set on its source | **Not verified for production.** The Esri World Imagery tile endpoint and the AWS terrain tile bucket are used as public, key-less sources in this prototype; confirm their current terms, rate limits and attribution rules (or switch to a licensed provider) before a public release |

## Rules

- Record the exact asset page and the license that accompanies the downloaded files. Current Kenney license copies are in `assets/3d/*-KENNEY-LICENSE.txt` and `assets/source-packs/*-License.txt`.
- Do not infer that a preview image, avatar, logo, or site content carries the same license as a repository's model/texture downloads.
- For Sketchfab, itch.io, Figma Community, Freesound, and Pixabay, verify the individual asset's creator and license; repository membership alone is not sufficient.
- Do not include paid assets or use account-gated downloads without explicit approval.
- Keep required attribution alongside the production asset and in the user-facing credits if required.
