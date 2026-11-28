# Detailing the street (plan, 2026-11-28)

The owner's direction: build the street with the density and charm of the reference picture (a pixel-art town with a fountain plaza, a bakery stall with striped awning, a café terrace with an umbrella and tables, notice board, benches, flower beds, ivy, flower boxes, stone steps, a bridge and water), with no loss of quality, and download whatever resources make that possible. Route chosen by the owner: **keep HD-2D** (3D scenery through the tilted camera, pixel textures, lights, day/night) and add detail.

## What an experiment showed

A first attempt added stock Kenney pieces already in the packed kit (a fountain, door overhangs, rocks) as data only. It looked worse, so it was reverted:

- the fountain's stock water is mapped through the colour map and the "stone" surface profile, so the inside rendered as dark and red blocks instead of water, and at its stock size it dominated the lower middle of the picture;
- the small rocks read as grey gravestones;
- the door overhangs were not visible at the camera distance.

Lesson: adding more stock pieces is not detail. The reference gets its richness from many small, coloured, purposeful things (striped awnings, flowers, ivy, signs, chalkboards, crates of goods, tables), each drawn with pixel-art care. The street needs a **prop kit made for this look**, not just more models.

## Plan, in order (each step is data plus a small piece of code, verified in the running game)

1. **Surface and water fixes.** Give pieces their right material (a water surface drawn in code with a gentle animated pixel pattern; stone for rims). Fixes the fountain and enables a stream and bridge.
2. **Code-built detail props** (like the crates and barrels already built in code, merged into few draw calls): striped awnings (cream and terracotta, green and cream) over stalls and shop fronts, flower boxes under windows, ivy and climbing roses on walls, hanging shop signs, chalkboards, shop-front goods (bread, fruit, jars), a notice board, string lights, cafe umbrella.
3. **Flowers and greenery** from the Kenney Nature Kit (CC0, already downloaded and licence-verified in `assets/source-packs/`; 329 models, 12 staged): flower beds, bushes, tall grass, small trees. Needs the second pack packed and drawn (the loader packs only the town kit today).
4. **Furniture** from the Kenney Furniture Kit (CC0, downloaded): café tables, chairs, benches. Check each piece's look against the palette before use.
5. **More building variety** from the Fantasy Town kit that is already packed (balconies, stairs, arches, wall-half, pillars, roof windows), different footprints, shop fronts, a lane, steps down to a waterside.
6. **Layout.** Widen the map beyond the one strip (a plaza with a fountain, a café terrace, a bridge and the water's edge), extend the walkable area and camera bounds, collision profiles for each new piece (all in the map data and `collision-profiles.ts`).
7. **Colour and light pass** per time of day (the dawn and day looks are still first guesses).

## Licences

Only CC0 packs already downloaded and recorded in `docs/ASSET_LICENSES.md` are planned for steps 3 to 5. If a further pack is wanted (for example more pixel-art props or tilesets), its page, licence file, author, format and size are checked and added to the register before it is used. Nothing from the owner's reference picture is traced or copied: it is a mood reference.

## Honest limits

The reference is a flat hand-drawn picture; this game draws 3D shapes with pixel textures under a tilted camera with blur. It can match its warmth and density but not its drawn-by-hand look everywhere, and the cat is about 11.5% of the screen height, so small details only read when they are boldly coloured.

## Progress

**Step 1 done (2026-11-28), in the running game (`stills/detail-step1-day.jpg`):**
- **Water:** the fountain's water was packed with the colour map by mistake. The packer (`scripts/build-town-pieces.mjs`) now splits any "Water" mesh into its own piece (`fountain-round-water`, 73 pieces), drawn with a new animated pixel-water material (`render/water-material.ts`: three blue bands on a 40-texel-a-unit grid, slow ripples, rare glints, a little self-glow for night; still with reduced motion). The fountain (scale 0.7, solid, 0.2 high so the cat can jump onto its rim) stands south of the spawn with a "Watch the water" interaction.
- **Awnings:** striped canvas awnings (`props.awnings` in the map data; cream and terracotta, cream and green) over the two shop fronts, built in code from stripes, valance and poles.
- **Window flower boxes:** `windowBoxes: true` on a house puts a trough with soil, leaves and blooms under every shuttered or glazed window (generated from the house's windows).
- **Checks:** tsc, eslint, 431 tests, build all pass; the new props merge into the existing two prop meshes (no new draw calls).

**Still to do, against the reference (the owner asked for everything to reach its level of detail: roads, buildings, water and trees):**
- **Roads and ground:** the whole ground is one cobble plane. The reference has paths of different stones, kerbs, steps, grass verges, flower beds and a canal edge: needs per-cell terrain (surface per area) plus road/kerb/stairs pieces (already packed).
- **Buildings:** only two house types, flat roofs, no dormers, chimneys on two, no ivy, no balconies, no shop signs on walls. Plan: dormers (`roof-window`), balconies (`balcony-wall`), ivy and roses (code), hanging and wall signs, more footprints and colours, a café with terrace.
- **Water:** a fountain only. Needs a canal or harbour edge with a stone bridge and a boat, using the same water material over a larger surface.
- **Trees and greenery:** four stock low-poly trees. Needs fuller, layered canopies, bushes, flower beds and grass (Kenney Nature Kit, CC0, already downloaded) and a code-built tree with pixel-textured foliage.
- **Props:** bench and café furniture (Furniture Kit), chalkboards, goods on the stalls, a notice board, a bicycle, boats, planters at doors.
- **Layout:** widen the map beyond one strip into a plaza, lane, café terrace and waterside.

**Roads and ground done (2026-11-28), in the running game (`stills/ground-dusk-west.jpg`, `ground-dusk-east.jpg`):**
- **Terrain grid:** the map's `terrain` is now a base surface plus painted rectangles and discs (`paint`), rasterized to a grid of 0.25-unit squares (`world/map/terrain.ts`, 6 tests plus 3 on the street). Seven surfaces: cobbles, paved road (cool grey setts), flagstone paving, grass, bare earth, flower bed, water.
- **Ground shader** (`render/ground-material.ts`): one plane; each pixel looks up its square's surface and draws that surface's 128-texel pixel tile (new tiles in `render/ground-textures.ts`), then draws the edges to the four neighbouring squares by hand in whole texels: stone kerbs where built ground meets grass or earth, a wide kerb and dark wet line at the water, ragged tufts where grass meets stone, a muddy bank.
- **Water:** the same pixel water as the fountain's, over a canal on the east side (walled off for the cat: water squares become collision boxes, merged into few). The walkable area now stops at x = 6.4, short of the quay.
- **Street painted:** a paved lane between the houses, flagstone aprons along the shop fronts and around the fountain, a quay beside the canal, a garden on the left with grass, a bare-earth path and flower beds.
- **Checks:** tsc, eslint, 440 tests, build pass; seen in the running game at golden hour and blue hour; the cat stops at the walkable edge before the canal.
- **Not done:** a bridge over the canal, steps, a boat, a harbour wall; per-surface footstep sounds (Phase 4); diagonal corner pieces of kerbs are plain (the edges follow the four neighbours only); the circle-painted ring around the fountain is a little jagged; the flower bed reads dark at game size.

**Roads and ground done (2026-11-28), in the running game (`stills/ground-dusk-west.jpg`, `ground-dusk-east.jpg`):**
- **Terrain grid:** the map's `terrain` is now a base surface plus painted rectangles and discs (`paint`), rasterized to a grid of 0.25-unit squares (`world/map/terrain.ts`, 6 tests plus 3 on the street). Seven surfaces: cobbles, paved road (cool grey setts), flagstone paving, grass, bare earth, flower bed, water.
- **Ground shader** (`render/ground-material.ts`): one plane; each pixel looks up its square's surface and draws that surface's 128-texel pixel tile (new tiles in `render/ground-textures.ts`), then draws the edges to the four neighbouring squares by hand in whole texels: stone kerbs where built ground meets grass or earth, a wide kerb and dark wet line at the water, ragged tufts where grass meets stone, a muddy bank.
- **Water:** the same pixel water as the fountain's, over a canal on the east side (walled off for the cat: water squares become collision boxes, merged into few). The walkable area now stops at x = 6.4, short of the quay.
- **Street painted:** a paved lane between the houses, flagstone aprons along the shop fronts and around the fountain, a quay beside the canal, a garden on the left with grass, a bare-earth path and flower beds.
- **Checks:** tsc, eslint, 440 tests, build pass; seen in the running game at golden hour and blue hour; the cat stops at the walkable edge before the canal.
- **Not done:** a bridge over the canal, steps, a boat, a harbour wall; per-surface footstep sounds (Phase 4); kerb corners are plain (the edges follow the four neighbours only); the flower bed reads dark at game size.

## What the reference really is (a careful reading, 2026-11-28) and what replicating it takes

The owner pointed out that the reference is not a flat rectangle. Reading it carefully:

- **It is built on several levels.** The cobbled plaza is a raised terrace held by stone retaining walls along its south edge and the canal; wide stone stairs go down at the bottom centre and bottom right to a lower level of trees and bushes; steps go up at the top centre (a lane north) and up the left side to a park on a higher grassy terrace with big oaks, a bench and a fence. A stone bridge arches over the canal on the right.
- **It has a coast.** A canal along the east edge with stone quay walls, lily pads, a moored rowing boat, and a bridge.
- **Buildings are packed close, each different:** a bakery with a paw sign, striped awning and a bread stall with a chalkboard; a house with a balcony and a blue roof; a café with a coffee-cup sign, an orange-and-cream awning and a fenced terrace with an umbrella and tables; houses with red and blue roofs, dormers, chimneys, ivy and rose climbers, flower boxes on almost every window; stone cottages at the left edge.
- **Centre piece:** a round fountain topped by a cat statue, ringed by flower beds and four benches. Lamp posts with warm lanterns at the corners of the plaza, a notice board with flowers, a signpost, a bicycle, crates and baskets, hedges, many flowers.
- **HUD:** a quest card top left ("Little Errand"), a round minimap top right, the cat's portrait with five hearts bottom left, key hints bottom right (Tab Map, E Interact, Shift Run). These belong to Phase 5 (the HUD) and are not part of the map.
- **Camera:** it is higher and flatter than the game's tilted, blurred camera (about 50 degrees, no depth blur, the whole plaza in view). The map's camera preset is data, so a higher pitch and a wider view can be set for this map; whether to drop the blur for it is a look decision for the owner.

## Multi-level ground built (2026-11-28), in the running game (`stills/level-spawn.jpg`, `level-lower.jpg`, `level-garden.jpg`, `level-quay.jpg`)

- **Heights:** terrain strokes can set a `height` (with or without a surface) and make **stairs** (`stairs: { axis, from, to, tread }`: equal treads rising from one level to another). The grid keeps a height per square (`world/map/terrain.ts`).
- **Drawing:** raised ground gets flat tops and stone walls wherever a square stands higher than its neighbour (`world/map/terrain-mesh.ts`): terrace walls, quay faces and every riser of every stair. Everything in the data (houses, lamps, props, awnings, windows, flower boxes, bunting, signs) is placed at floor level and is lifted by the ground under it (framing objects excepted).
- **Walking:** the cat walks up and down steps of up to 0.18 without jumping (`STEP_UP`), its feet follow the stair smoothly, the camera rises and falls with its floor, a taller block is a wall from below (jump up to it) and a fall from above (a drop of more than a step is a jump-down).
- **The street now:** the plaza is a terrace 0.8 high with a retaining wall to the south and the canal's quay to the east, six stairs down at the south centre to a lower grass level, and a raised garden (1.3) up three steps on the west. Walkable area extended south to the lower level.
- **Checks:** tsc, eslint, 450 tests (new: terrain heights and stairs, the mesh, the cat walking down and up the stairs without falling, held back by a wall from below, falling from the edge above, reachability of the lower level and the garden), build pass.
- **Not done / limits:** the lower level is only grass; no railings or parapets on the terrace edge (the cat can jump off); the stairs have no side walls; the garden terrace's own walls are plain stone; only the first of the reference's levels and stairs.

## Remaining work to match the reference (in the order I plan to build it)

1. **Layout rebuilt to the reference:** a big round plaza with the cat-statue fountain, benches and flower rings; the lane north with stairs up; the park terrace; the café terrace fenced by a low stone wall; the quay and the arched bridge; the lower level with trees, bushes and a bicycle.
2. **Buildings:** more house kinds (dormers, balconies, bay fronts, blue and red roofs, stone cottages), every window with flower boxes or shutters, ivy and roses, wall and hanging signs (a paw, a coffee cup), awnings in other colours, a bakery stall and a fruit stall with goods and chalkboards.
3. **Trees and greenery:** a code-built broad-leaved tree with layered pixel foliage (oaks), bushes, flower beds with real bloom sprites, hedges, grass tufts, ivy.
4. **Water and the coast:** lily pads, a rowing boat, the arched stone bridge, a stone harbour wall.
5. **Props:** benches, café tables, chairs and parasol, notice board, signpost, bicycle, crates and baskets.
6. **Camera and look:** a higher, flatter camera preset for this map, less blur, a colour pass against the reference.

## Layout step 1: the village square, laid out from the reference (2026-11-28)

The street's map file (`maps/market-street.json`; the id is unchanged, the name is now "Village Square (prototype)") was rewritten to follow the reference's composition, measured from its screenshot (x = (px - 836) x 0.01257, z = (py - 470) x 0.0166). The **camera preset is unchanged** (FOV 28, pitch 34, distance 14, target [0, 0.9, -0.9], the cat at 11.5% of the window); only the area it may drift over was widened (`follow`: x -8 to 6.2, z -4.2 to 7.2) so it follows the cat across the whole village. The village is therefore seen by walking, not all at once.

What is in the map now (still: `stills/village-golden-spawn.jpg`, `village-south.jpg`):
- **Terrace and levels:** the village stands on a terrace 0.8 high with a retaining wall to the south and a quay wall along the canal on the east; nine stairs go down at the bottom centre to a lower grass level with trees.
- **The plaza:** a big cobbled square with the fountain (scaled 1.45, the landmark) in a ring of flower bed and a paved apron, two benches lower left and lower right, six lamp posts, a lane (paved road) running north between the bakery and the produce house, with festive flags across it.
- **Buildings, each different:** the bakery (upper left; terracotta roof, striped cream-and-terracotta awning, counters with produce, paw sign, chimney), the produce house (upper right; slate-blue roof, watching cat in a window) with a green-and-cream striped canopy over three counters, a tall slate-roofed wooden house by the canal, the café (middle right; terracotta roof, long cream-and-orange awning, flower boxes), the red house and small slate cottage on the lower left, a far-left cottage, and the far rows closing the street to the north. Flower boxes under every glazed or shuttered window.
- **Roof colours:** a house can now have a `roofColor` (terracotta, slate, moss); they are separate merged meshes (one more draw call each).
- **Park (west):** lawn, an earth path, flower beds along a fence, a bench under a tall tree, more trees, a lamp.
- **East:** the canal (animated pixel water, walled off for the cat) beside a paved quay; the café terrace to the south of the café, fenced with a gap at the entrance.
- **Collision and walking:** everything solid is solid (houses, fountain, counters, fences, trees, lamp posts, barrels, the canal); the cat can reach every interaction, the park, the café terrace, the quay and the lower level (a search over the map is in the tests), walk the stairs both ways, and drop off the terrace edge.

**Not matched yet** (next steps, in order): a round fountain cat statue; the notice board, signpost and bicycle; café tables, chairs, umbrella and chalkboards (code-built props); the stone arch bridge and boat; bigger leafy oaks and bushes in place of the stock low-poly trees; ivy, dormers, balconies and shop signs; more flower clusters; the stairs' side walls and railings; the lane's stairs up to the north; a colour pass at every time of day (the dusk and night looks have not been checked on the new layout).

## Café furniture and the fountain statue (2026-11-28)

Built as code-built props (new map data `props.tables`, `chairs`, `umbrellas`, `chalkboards`, `statues`; merged into the two existing prop meshes, so no new draw calls) and placed by measuring the reference (x = (px - 836) x 0.01257, z = (py - 470) x 0.0166):
- **Fountain cat statue:** a round stone pedestal with a sitting pale cat (body, haunches, front paws, head with upright ears, muzzle, eyes, curled tail) standing in the basin at the fountain's centre (0.8, -1.2), 1.3 times its model size; stills `statue-fountain.jpg`.
- **Benches:** moved to the reference's spots left and right of the basin, on the paved ring, angled in toward the fountain.
- **Café terrace:** the terrace now runs from x 0.8 to 7.4 as in the reference (paved, fenced along the south with an opening on the west); a large cream-and-beige striped parasol (12 wedges, a hanging rim, a finial, 1.7 high, radius 1.25) on a pole at (2.6, 3.95) in the middle of three round tables; two more tables to the east; ten slat-backed chairs turned in to their tables; each table has a cup of coffee on a saucer, a plate with a pastry and a small vase with a bloom; an A-frame chalkboard with chalk lines at the terrace entrance (4.1, 4.65) and another beside the bakery counters; the bakery and produce counters moved back under their awnings. Still: `cafe-terrace-golden.jpg` (seen from the lower level).
- **Collision:** tables are solid (0.43 high, jumpable), chairs are low enough to jump onto, the parasol's pole and the chalkboards are solid; the canopy is above the cat and does not block. The cat reaches the terrace and the interaction spot there (search test).
- **Checks:** tsc, eslint, 453 tests (new: the props exist in the street, each builds geometry that stands on the ground, a parasol is as wide and tall as asked, the furniture is solid), build pass; seen in the running game at day and golden hour.
- **Not matched exactly:** the parasol hides most of the tables from this camera angle more than in the reference (its canopy is larger in proportion), chairs are plain boxes, the statue is simple, the cups and plates are tiny at game size, and there are no flowers or pots round the terrace edge yet.

## Round village, centred fountain, depth blur, taller lamps, stone bridge and boat (2026-11-28)

Requested by the owner after the café step; the camera preset is unchanged throughout (FOV 28, pitch 34, distance 14, target [0, 0.9, -0.9], cat 11.5%).

- **Fountain at the centre of the map, with space round it:** the fountain stands at (0, 0). Round it, in order outward: a paved apron, a wide ring of flower bed (radius 3.05) planted with 23 clusters of leafy shrubs in bloom (pink, white, yellow, red, lavender: `props.flowers`, code-built, not solid), then open cobbles. The nearest wall of any house is more than 5 units from the fountain's centre (a test checks it). Benches sit outside the flower ring, lower left and lower right, turned in to it. More flower clusters line the park fence, the terrace fence, the stairs, the shop fronts and the quay.
- **A round map:** the terrace is an oval (14.2 by 11.4 units, `ellipse` strokes in the terrain data): an oval rim of grass and trees, the cobbled square inside it, a retaining wall following the curve all the way round (the corners of the map fall away to the lower grass level), and the canal curving round the lower right. The terrain grid is now 0.2 units a square, so the curve is edged in small pixel-sized steps. The village was re-laid on the oval: the bakery, the produce house and the tall house along the north, the café on the east, the red house and slate cottage on the south-west, the park on the west, and the stairs at the bottom centre.
- **Depth-based blur, less grain:** the miniature blur is now driven by distance from the camera along the view direction (read from the depth buffer) instead of a band across the screen: sharp at the cat's distance, then blurred more and more the farther a thing is (the far houses, the sky), or the nearer (roof tops, lamp heads). Each blur tap is weighted by its own blur size so the sharp cat does not smear into the background. The sample pattern is rotated only slightly per pixel and the strongest blur is smaller (24 px at 1080 rows, was 30), which removes the grain. Numbers: `LOOK.blur` in `render/look.ts`.
- **Taller lamps:** posts scaled 1.35 (2.1 units, were 1.25), the light at 1.95 (was 1.15), a bigger halo; seven lamps (the tier still lights as many as it allows).
- **Stone bridge:** a pale-stone arch bridge over the canal at the middle right (as in the reference): two walls with a round arch cut through them over the water, a vault, a gently humped roadway, parapets with caps and corner posts, a lighter ring of stones round the arch's edge. It is built from faces in code (`buildBridges` in `world/props-geometry.ts`, `world/stone-geometry.ts`) and drawn with the street's stone pattern. The cat walks over it a step at a time from the quay to the far bank (a search test checks the whole route); its parapets are solid and the water under the roadway is open.
- **Rowing boat:** a wooden boat with a pointed bow and blunt stern, a plank hull with an inside, a rim, three seats and a bow ring, moored in the lower canal.
- **Camera framing fix:** the cat is framed by the preset as always; the follow offset now uses the preset's own cat position instead of the spawn point, so the cat stays where the approved framing puts it wherever in the map it starts.
- **Checks:** tsc, eslint, 459 tests (new: the bridge and its roadway steps, the open water under it, the boat, the fountain's distance and flowers, the oval, the lamps), build pass. Seen in the running game at day and golden hour; stills `round-golden.jpg`, `boat-canal.jpg`.
- **Not matched yet:** the boat's seats and the bridge's masonry are plain at game size; no lily pads; the canal is a plain strip north of the bridge; the oval's wall steps are visible as pixel steps; no ivy, dormers, balconies, wall signs, notice board, signpost or bicycle; the oaks are still the stock low-poly trees; dusk and night, other tiers and a real device have not been checked on this layout.
