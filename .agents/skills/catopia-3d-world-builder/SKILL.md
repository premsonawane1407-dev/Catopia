---
name: catopia-3d-world-builder
description: Build Catopia's data-driven React Three Fiber world, landmark interactions, camera behavior, and quadruped cat presentation.
---

# Catopia 3D world builder

## World data

- Render shared landmark, location, and cat records; do not encode individual identities into reusable scene components.
- Keep geographic coordinates separate from presentation coordinates.
- Use public landmarks or approximate sighting positions. Never publish precise sensitive cat locations.
- Preserve selected record IDs when switching between the 3D environment and 2D map.

## Assets and characters

- Read `docs/ASSET_CATALOG.md`, `docs/ASSET_LICENSES.md`, and `docs/ASSET_COMPATIBILITY_REPORT.md` before importing a model.
- Prefer optimized GLB assets with verified materials, scale and orientation.
- Use only animation clips confirmed on the model's quadruped rig. Do not use humanoid animations on cat models.
- Keep reusable components data-driven: cat model, landmark, building, tree and environment prop.

## Performance and accessibility

- Lazy-load the 3D scene; keep the rest of the app usable if WebGL is unavailable.
- Use instancing for repeated geometry when profiling supports it; avoid over-detailed scenes and oversized textures.
- Provide a lighter rendering mode or clear 2D fallback.
- Support touch, keyboard-accessible alternatives for scene selections, and reduced motion.
- Verify loading, camera controls, selection and rendering on desktop and mobile before claiming completion.
