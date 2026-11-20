# Asset source notes

This file records acquisition details for the first source batch. Kenney archives and preview images are retained under `assets/source-packs/`; preview images are internal inspection references and must not be copied into the product UI.

## Kenney environment models

Downloaded 2026-11-20 from the pages linked in `ASSET_CATALOG.md` through Kenney’s normal free download flow. Pack archives include a `License.txt` identifying CC0. The original archives are retained. Selected models were extracted as-is; no mesh or texture optimization has been applied.

Selected web copies are in `public/models/environment/` and corresponding source copies are in `assets/3d/`. They are staged for later scene integration and have not yet been loaded by the application.

## Quaternius cat

Downloaded 2026-11-20 from the GLB URL embedded by the [Poly Pizza model page](https://poly.pizza/m/2f54vbV0In). The model page identifies the model as Public Domain (CC0). Source file: `assets/3d/cats/quaternius-cat.glb`. The CDN GLB URL was `https://static.poly.pizza/7ccb71fe-dabb-4a6f-a98a-8992bb5e6bc7.glb`. The model is a candidate; no rendering or animation clip has been accepted yet.

## Poly Haven textures

Downloaded 2026-11-20 from the [Poly Haven public API](https://polyhaven.com/llms.txt), which requests a descriptive User-Agent and provides asset metadata and exact download sizes. Each source image is the `Diffuse` map at `1k` in JPG format. Files are kept under `assets/textures/`; they were viewed and excluded from `public/` due to realistic surface detail that conflicts with the current hand-stylized visual direction.

## Google Fonts

Downloaded 2026-11-20 from Google Fonts using its CSS2 API and Latin-subset WOFF2 URLs. OFL license texts were downloaded from the corresponding directories in `google/fonts` and are retained with the source font files. The production copies are in `public/fonts/`.

## Original mark

`assets/website/logo/catopia-mark.svg` is an original Catopia vector mark created for this workspace. It is not an external asset and does not require third-party attribution.
