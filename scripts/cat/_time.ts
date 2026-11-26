import { buildAtlas } from "../../features/game/cat/atlas";
import { DEFAULT_COAT } from "../../features/game/cat/coat";
for (let i = 0; i < 2; i++) { const t = performance.now(); const a = await buildAtlas(DEFAULT_COAT); console.log("atlas", a.frames.length, "frames", (performance.now() - t).toFixed(0), "ms"); }
