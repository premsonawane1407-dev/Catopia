# The map data format (version 1)

An area of the game is one JSON document. `features/game/world/map/` checks it, builds what the game runs on from it, and the scene, the collision, the camera and the interactions all read the result. The market street is `features/game/world/map/maps/market-street.json`; its code is not in any `.ts` file any more.

## Files

| File | What it does |
|---|---|
| `map-schema.ts` | The format as a zod schema (`strictObject`, so a misspelt or unknown field is an error) and the types made from it |
| `load-map.ts` | `loadMap(raw)`: schema check, then the checks a schema cannot make, then builds a `LoadedMap`. Throws `MapError` with every problem listed |
| `build-house.ts` | Expands a house (footprint + a letter per wall panel) into wall, roof and chimney placements and its window positions |
| `collision-profiles.ts` | How solid each piece or prop is (footprint, height); a property of the thing, shared by every map |
| `market-street.ts` | `MARKET_STREET = loadMap(<the JSON>)`, loaded once |
| `market-street.test.ts` | The street's data and the loader's refusals |

## What a map holds

`format` (1), `id`, `name`, `sample` (true for an invented or approximate place: the game must say so), `camera` (fov, pitch, distance, target, and the area the focus may drift over), `terrain` (a tiled surface over a rectangle), `walkBounds`, `spawn`, `houses`, `watcher` (the window with a cat in it), `pieces` (single model pieces; `layer: "framing"` for objects that ride with the camera in the screen's corners and are never solid; `solid: false` to walk through), `lamps` (a head position: the post, the light and the halo all come from it), `glows`, `props` (crates, barrels, produce, pots built in code), `bunting`, `posters`, `sign`, `colliders` (extra solid things), `interactables`.

## What the loader refuses

Beyond the schema (types, ranges, known piece names, house rows with one letter per column): a spawn outside the walkable area or inside something solid; an interaction whose spot is outside the walkable area or inside something solid, a repeated interaction id, a "look" with no text; a watcher in a window that does not exist; pieces or lamps off the terrain; a walkable area past the terrain; two colliders with one id. A bad map fails on load with a readable list and never half-loads.

## What it does not cover yet

Per-cell terrain materials (the ground is one tiled surface); triggers and doors that move the player to another map (scene transitions); a day/night clock stored in the map (the clock lives in the shell and applies to any map); a second map to prove the format (the tests load a tiny second map, but no second area exists).

## How it was checked

Before the hand-coded street data was deleted, a test compared everything the loader builds with what the old code produced: every model placement (all, world and framing), windows, lamp heads, glows, props (world and framing), bunting, posters, sign, all 27 colliders, the five interactions, the walkable area, the camera drift area, the spawn and the camera preset were identical. Then the old modules (`stage-data.ts`, `greybox.ts`) were removed and the game was run from the data: it draws the same street, the cat walks, stops at the stall, and the greybox overlay (`/play?greybox=1`) shows the colliders and interaction circles from the map.

## Day/night clock (started 2026-11-28)

`render/day-clock.ts` (pure, 19 tests) blends the key looks (night, dawn, day, golden hour, blue hour) by the hour; `render/day-cycle.tsx` advances the clock and rewrites one live look every frame, which the lights, windows, glows, post effects, cat glow and fireflies read. A day takes 480 real seconds (`DAY_SECONDS`), opening at the blue hour. The pause menu has a "Time of day" row (let the day pass, or hold dawn, day, golden hour, blue hour, night); `/play?time=night` and `/play?hour=14.5` open the game at a moment. Stills from the running game, one per moment: `stills/dawn.jpg`, `day.jpg`, `golden.jpg`, `dusk.jpg`, `night.jpg` (Full tier, 1600 x 900, taken with `/play?time=...`). Seen: the lamps and windows light up and the fireflies come out as the day ends, and the day look has no lamp light. Checked: the clock advanced in the running game, the pause menu's "Time of day" row cycles through all six choices and the clock goes to the chosen moment while paused, the choice is saved in the settings. Not checked: the transitions by eye in real time (the browser pane was hidden, which pauses the game, so the clock was driven by drawing frames on demand), the cost per quality tier, a real device. The dawn and day looks are first guesses and look hazy and a little dark (the fog colour is strong): to be tuned by you.
