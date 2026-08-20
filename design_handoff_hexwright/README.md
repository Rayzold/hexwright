# Handoff: Hexwright — TTRPG World Map Generator

## Overview
Hexwright is a hexcrawl world-map tool for tabletop RPG referees. It does two jobs in one workspace:
generating a procedural hex overworld that the referee can then hand-edit, and using that map at the
table to plot party travel and compute distances, travel days, terrain costs, and encounter checks.

The app has two modes toggled in the header — **Forge** (generate and edit the world) and
**Table** (plot routes, march the party, advance the calendar) — plus a **Warden / Party** sight
toggle that hides unexplored hexes behind fog for player-facing display.

## About the Design Files
`Hexwright.dc.html` in this bundle is a **design reference created in HTML** — a working prototype
that shows the intended look, layout, and behavior. It is not production code to copy directly.

The task is to **recreate this design in the target codebase's existing environment** (React, Vue,
Svelte, native, etc.) using that project's established patterns, state management, and component
library. If no environment exists yet, choose an appropriate framework and implement there. A
reasonable stack for this app: React + TypeScript, Zustand or Redux for world state, and a Canvas 2D
layer for terrain with an SVG overlay for interactive marks (the prototype uses exactly this split
and it works well — see "Rendering Architecture").

The prototype's *algorithms* — noise terrain generation, biome classification, river tracing,
settlement placement, realm flood-fill, A* pathfinding, cube-coordinate hex lines, travel math — are
the substantive part of this design and should be ported closely. They are documented below and are
directly readable in the file's logic class.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions. Recreate the UI faithfully
using the codebase's existing primitives. Every hex value, font size, and spacing value used is
listed under "Design Tokens".

---

## Rendering Architecture

The map is a two-layer stack inside a scrolling container, and this split matters:

1. **`<canvas>` (bottom)** — all static cartography, repainted only when its inputs change:
   biome fills (batched into one path per biome for speed), hex grid, coastline strokes, realm
   borders, rivers, roads, the unsurveyed edge band, and fog. At 70x50 = 3,500 hexes, repainting on
   every React render is far too slow, so the prototype computes a cache key from
   `[theme, view, fogVersion, paintVersion, edge, seed, hexCount, hexMiles, layer toggles, object positions]`
   and returns early when unchanged. **Keep this optimization.**
2. **`<svg>` (top, absolutely positioned, same viewBox as canvas pixel size)** — everything
   interactive or frequently changing: the route polyline, waypoint pins, settlement/site marks,
   place labels, the selected-hex outline, and the hover outline. Pointer events land here.

The canvas is rendered at `devicePixelRatio` 2 and scaled down via CSS for crisp lines.

### Hex geometry
Pointy-top hexes in **odd-row offset** layout. With hex radius `S = 11`:
- Hex center: `x = S * sqrt(3) * (col + 0.5 * (row & 1)) + S`, `y = S * 1.5 * row + S`
- Corner `k` (0-5): angle `= 60k - 90` degrees, at radius `S`
- Neighbors differ by row parity (see `nbrs()` in the prototype — the odd/even offset neighbor tables)
- Pixel-to-hex: candidate-scan the 3x3 offset block around the rounded row/col and take the nearest
  center. Simple, exact enough, and cheap.
- Straight hex lines (manual route legs) use **cube coordinates**: convert offset to cube, lerp,
  `cubeRound`, convert back. Do not try to do this in offset space.

---

## Screens / Views

### 1. Header (fixed, 54px tall)
- Background `#1b1712`, bottom border `1px solid #322a20`, horizontal padding 18px, items gap 22px.
- **Wordmark**: "HEXWRIGHT", Cormorant Garamond 600, 25px, letter-spacing 0.16em, `#f0e7d6`.
  Beside it, baseline-aligned: "survey & passage", IBM Plex Mono, 9px, letter-spacing 0.22em,
  uppercase, `#8a7f6c`.
- **Mode toggle** (Forge / Table): segmented control. Wrapper `background #100d0a`,
  `1px solid #322a20`, radius 3px, padding 3px, gap 2px. Each button: padding 6px 15px, radius 2px,
  IBM Plex Mono 10px, letter-spacing 0.14em, uppercase. Active: `background #3a3025`, `color #f0e7d6`.
  Inactive: transparent, `#8a7f6c`.
- **Right cluster** (margin-left auto): the label "Sight" (Mono 9px, 0.16em, uppercase, `#7d7361`),
  a second identical segmented control (**Warden / Party**), a 1px x 22px `#322a20` divider, the zoom
  percentage (Mono 11px, `#9a8f7c`, min-width 44px, right-aligned), and two 26x26 zoom buttons
  (`background #241f19`, `1px solid #3a3025`, radius 3px, `color #cfc4b0`; hover `#302920`).

### 2. Left panel (268px fixed, scrolls)
Background `#1b1712`, right border `1px solid #322a20`, padding `16px 15px 28px`.
Section headers throughout both panels: IBM Plex Mono 9px, letter-spacing 0.2em, uppercase, `#7d7361`.
Field labels: 11px, `#9a8f7c`, 5px bottom margin.
Inputs and selects: `background #100d0a`, `1px solid #3a3025`, radius 3px, `color #e6ddcd`,
12px, padding 6px 8px; focus `outline: 1px solid #c05a2b`. Number inputs are right-aligned.
Dividers: `1px` `#2b241c`.

**Forge mode — "THE FORGE":**
- *Seed word*: text input + a 26px reroll button (`&#8635;`) that generates a new fantasy place name.
- *Extent* select: Region 30x22 / Kingdom 46x32 / Continent 70x50. Default Continent.
- *Edge of the map* select: "Sea-girt — ocean all round" / "Unsurveyed — land runs off the edge".
  Changing it regenerates immediately (preserving hand edits). Default Sea-girt.
- *Miles per hex*: number input, 1-60, default 6, 62px wide, right-aligned.
- Seven sliders, each with a right-aligned qualitative readout in Mono `#c9bda7` rather than a raw
  number. Track: 3px tall, `#3a3025`, radius 2px. Thumb: 13px circle, `#e6ddcd`, `2px solid #16120e`.
  | Slider | Range | Default | Readout words |
  |---|---|---|---|
  | Sea level | 15-70 | 42 | raw percent |
  | Climate | 0-100 | 52 | frigid / cool / temperate / warm / torrid (<30/<46/<62/<80/else) |
  | Wetness | 0-100 | 50 | arid / moderate / lush / drenched (<30/<55/<78/else) |
  | Uplift | 0-100 | 55 | worn / rolling / jagged (<30/<60/else) |
  | Watercourses | 0-100 | 50 | sparse / many / braided (<30/<65/else) |
  | Habitation | 0-100 | 46 | wilderness / frontier / settled (<25/<55/else) |
  | Wild sites | 0-100 | 40 | few / scattered / haunted (<25/<60/else) |
- *Forge the world* button: full width, padding 10px, `background #b8511f` (hover `#c95e28`),
  `color #fdf3e2`, no border, radius 3px, Mono 11px, letter-spacing 0.14em, uppercase. Helper text
  below at 10px `#6f6656`, line-height 1.5: reforging redraws terrain and generated holdings but
  keeps hand-placed objects, painted terrain, and renamed realms.
- *Layers*: five toggle chips in a wrapping flex row, gap 6px — Hex grid, Rivers, Roads, Realms,
  Names, all on by default. Chip: padding 5px 9px, radius 3px, 10px. On: `1px solid #5c4a33`,
  `background #2f2720`, `color #e6ddcd`. Off: `1px solid #2f281f`, transparent, `#7d7361`.

**Table mode — "THE PARTY":**
- *Pace* select: On foot 24 mi/day / Mounted 36 / By ship 48.
- *Season* and *Weather* selects side by side (flex, gap 8px, each `flex: 1 1 0`).
  Seasons: Spring, Summer, Autumn, Winter. Weather: Clear, Rain, Storm, Snow, Fog.
- *Forced march* toggle: full-width left-aligned button, "Forced march — +25% pace, exhaustion at
  dusk". Off: `1px solid #3a3025`, `background #241f19`, `color #9a8f7c`.
  On: `1px solid #8a4a24`, `background #3a2016`, `color #f0c9a8`.
- *"RECKONING"*: the in-world date in Cormorant Garamond 20px `#f0e7d6` (`white-space: nowrap`),
  with "Campaign day N" below in Mono 10px `#7d7361`.
- *"PLOTTING"*: a hint paragraph (11px, `#8e8471`, line-height 1.65) whose text depends on routing
  mode, then a **By hand / Find the way** segmented control (same styling as the header toggles),
  then *Clear way* and *Undo leg* buttons side by side (padding 7px, `#241f19`, `1px solid #3a3025`,
  11px).
- *"FOG"*: *Reveal all* and *Shroud all* buttons, same styling, plus a count line at 10px `#6f6656`
  reading "N of M hexes charted — the Party view honours the fog".

### 3. Map stage (center, flex: 1, scrolls both axes)
Background `#100d0a`. The canvas/SVG stack sits in a wrapper with 18px margin, sized
`worldPixelWidth * zoom` x `worldPixelHeight * zoom`.

After every generation the view **auto-fits**: zoom is set to
`clamp(0.35, min(availW / mapW, availH / mapH), 1.4)` rounded to 2 decimals, then the container is
scrolled so the bounding box of *land* hexes is centered. Zoom buttons step by 0.2 within 0.5-2.4.

**Bottom-left overlay** (14px from both edges, `pointer-events: none`, two pills of
`rgba(16,13,10,0.9)`, `1px solid #322a20`, radius 3px, padding 8px 11px):
- A scale bar: a 3px-tall `#c9bda7` rule spanning exactly five hex widths at current zoom, with 1px
  end ticks, labeled "N mi · 1 hex = M mi" in Mono 10px `#c9bda7`.
- A hover readout in Mono 10px `#9a8f7c`: "`col.row` · Biome name · Object name" (zero-padded
  1-based coordinates, e.g. `14.09`), falling back to an em dash.

**SVG overlay contents, in paint order:**
- Route polyline drawn twice: a `#16120e` shadow at `stroke-width 4.2`, `opacity 0.5`, then the accent
  color at `stroke-width 2.2` with `stroke-dasharray "7 4"`. Both `round` joins and caps.
- Waypoint pins: `r=7.5` `#16120e` at `opacity 0.55`, then `r=5.2` accent fill with a
  `1.4` `#fdf3e2` stroke, then the 1-based leg number in Mono 6.4px 600 `#fdf3e2`, centered,
  `y=2.8`, `pointer-events: none`. Cursor `grab`; drag to move that waypoint.
- Object marks, each a `<g transform="translate(x,y)">` with a transparent `r=9` hit circle:
  - Settlements (city / town / village / keep): outer circle filled `theme.paper`, stroked
    `theme.ink` at 1.1, plus a solid inner dot in `theme.ink`. Radii — city 5 (inner 2),
    town and keep 3.8 (inner 1.3), village 2.7 (inner 1.3).
  - Sites: a polygon filled `theme.site`, stroked `theme.ink` at 1.1 — dungeon is a diamond
    `0,-5 4.4,0 0,5 -4.4,0`; camp is a triangle `0,-4.6 4.2,4 -4.2,4`; ruin is a square
    `-4,-4 4,-4 4,4 -4,4`.
  - Selected objects switch both fill and stroke to the accent color.
  - Labels (cities, towns, keeps, and dungeons only, when the Names layer is on): Cormorant Garamond
    600, 9.4px for cities and 7.8px otherwise, `x = radius + 3`, `y = 2.6`, anchored start, fill
    `theme.label`, with a `theme.halo` stroke at `stroke-width 2.4` and `paint-order: stroke` to
    knock the label out of the terrain behind it. `pointer-events: none`.
- Selected-hex outline: hex polygon, no fill, accent stroke at 1.8.
- Hover outline: hex polygon, `rgba(255,255,255,0.12)` fill, `theme.ink` stroke at 1.1.

### 4. Right panel (316px fixed, scrolls)
Same chrome as the left panel, with a left border instead of right.

**Forge mode:**
- *"TERRAIN BRUSH"*: eight buttons in a 2-column grid, gap 6px — Grassland, Forest, Hills,
  Mountains, Marsh, Desert, Snowcap, Water. Button: padding 8px 6px, radius 3px, 11px.
  Unselected `1px solid #3a3025` / `#241f19` / `#cfc4b0`; selected `1px solid #8a4a24` /
  `#3a2016` / `#f0c9a8`. Below, a 10px `#6f6656` hint that names the active brush.
  Clicking or dragging across the map repaints hexes. Painting water clears any river in that hex.
- *"STAMPS"*: the same grid style, eight buttons — City, Town, Village, Keep, Ruin, Dungeon, Camp,
  and **Select** (which clears the active tool). With a stamp active, clicking a hex creates a
  named object there; with Select active, clicking an object selects it and dragging moves it.
- *"INSPECTOR"*, three states:
  - *Nothing selected*: a `1px dashed #3a3025` box, radius 3px, padding 18px 14px, centered 11px
    `#7d7361` text — "Nothing selected. Click a holding to name it, or a hex to read the ground."
  - *Object selected*: Name text input (13px, padding 7px 9px); Kind select and a 104px-wide Souls
    number input side by side; a "Warden's notes" textarea (4 rows, vertical resize only,
    line-height 1.5); a 2x2 stat grid; a realm sentence; and a destructive
    **Raze this holding** button (transparent, `1px solid #4a3428`, `color #b06a4a`; hover
    `background #2a1c15`, `color #cf8562`).
  - *Hex selected*: the biome name as a Cormorant Garamond 26px `#f0e7d6` heading, "Hex `col.row`"
    beneath in Mono 11px `#7d7361`, then five key/value rows (label 11px `#8e8471` left, value
    Mono 11px `#d6cab4` right, each with a `1px solid #241f19` bottom rule): Movement cost,
    Encounter odds, Elevation, Water, Charted.
- The 2x2 stat grid pattern used in both panels: `display: grid`, 2 columns, `gap: 1px` over a
  `#2b241c` background with a matching 1px border and radius 3px so the gap reads as hairlines.
  Each cell `background #201b15`, padding 9px 11px; caption Mono 8px letter-spacing 0.16em uppercase
  `#7d7361`; value Mono 15px `#e6ddcd`.
- *"GAZETTEER"*: one row per realm — a 9x9px color swatch (radius 2px), an **editable name field**
  (transparent background, no border except a `1px solid #2b241c` bottom rule that turns `#5c4a33` on
  hover, Cormorant Garamond 15px `#d6cab4`), and "N hex · Seat" in Mono 10px `#7d7361`. Renames
  persist across reforging. Below, a tally line in Mono 10px `#6f6656`: land hex count, percent dry,
  and counts of cities, towns, villages, and wild sites.

**Table mode:**
- *"PASSAGE"*, empty state: dashed box, "No way plotted. Click a hex on the map to set the party down."
- *"PASSAGE"*, with a route:
  - Days as a Cormorant Garamond 42px `#f0e7d6` figure (one decimal under 10, whole above),
    with "days on the road" beside it in Mono 11px `#9a8f7c`, and "Arrives `date`" below in
    12px `#a8583a`.
  - The 2x2 stat grid: Hexes, Along the way (path miles), As the crow flies, Effective pace.
  - *"GROUND CROSSED"*: up to six rows sorted by frequency — a 9x9 biome-color swatch, the biome
    name (11px `#c9bda7`), and "N hex · xCOST · P%" in Mono 10px `#8e8471`.
  - An *encounter checks* box (`1px solid #2b241c`, radius 3px, padding 10px 11px): the count as
    "N x 2/day" in Mono 12px, and a sentence giving the x-in-6 odds for the wildest ground crossed.
  - When forced march is on, a warning box: `1px solid #4a3428`, `background #241610`, 11px
    `#c98a63` — one level of exhaustion per day beyond the first, save at dusk.
  - **March the way** primary button, with helper text: advances the calendar, lifts fog along the
    road, rolls the checks into the log.
  - If no path exists (auto mode, impassable): the days figure shows an em dash and the copy reads
    "no way through" with advice to travel by ship or route around.
- *"LOG"*: newest first, max 24 entries. Each is a `2px solid #3a3025` left rule with 10px padding:
  a date range in Mono 9px `#7d7361`, the march summary in 12px `#c9bda7`, and an outcome line in
  11px — `#b06a4a` when there were encounters, `#5f8a72` when the road was quiet.
  Empty state: "Nothing yet. Marches are recorded here."

---

## Generation Algorithm

Everything is seeded from a hash of the seed word (FNV-1a), so a given seed always produces the same
world. The RNG is mulberry32. Noise is value noise with smoothstep interpolation, summed as fBm.

1. **Elevation** — `fbm(6 octaves, gain 0.52)` sampled at `5.5 / width` frequency, with rows
   compressed by 0.87 to correct for hex row spacing. Then:
   - *Sea-girt edge*: `e = e * 1.12 - pow(radialDistance, 2.5) * 0.62`, where radial distance is
     computed from normalized center offsets with a slight vertical stretch (0.95 / 2.05). This is
     the island mask that guarantees ocean at the borders.
   - *Unsurveyed edge*: `e = e * 1.14 - 0.06` — no mask, so landmasses run off the edge.
   - Plus a fine detail octave at 2.6x frequency, amplitude 0.16, then clamp to 0-1.
2. **Moisture** — `fbm(4, 0.55)` at 1.5x frequency, biased by the Wetness slider.
3. **Temperature** — latitude-driven: `(1 - pow(|latitude|, 1.35)) * 0.95`, biased by Climate.
4. **Land/water** — `land = elevation >= seaLevel`. Water depth splits into deep (>0.55 of the way
   down), ocean (>0.2), shoal (else).
5. **Biomes** — from normalized height above sea level `hh`, temperature adjusted down by
   `hh * 0.35`, and moisture. Mountain threshold `0.86 - uplift * 0.34`, hill threshold
   `0.60 - uplift * 0.20`. Cold-and-high becomes snowcap. Below that it is a temperature ladder
   (tundra/taiga, then forest/grass, then swamp/forest/grass/savanna, then jungle/savanna/grass/desert)
   with moisture picking within each band. Full thresholds are in the `build()` biome pass.
6. **Strand** — any low land hex (`hh <= 0.1`) that is not hill, mountain, or snow and touches water
   becomes beach.
7. **Rivers** — pick `14 + watercourses * 1.1` sources among land hexes above 0.42 relief, then walk
   steepest-descent to the sea (max 400 steps), accumulating flow. Hexes with flow >= 3 are rivers.
   Rivers draw as segments from each hex to its downstream neighbor, with
   `lineWidth = min(3.4, 0.7 + sqrt(flow) * 0.42)`.
8. **Settlements** — score every non-mountain land hex: coastal +1.5, river +1.7, grass/savanna/forest
   +0.6, desert/swamp/jungle/tundra -0.8, a penalty for deviating from `hh ~ 0.2`, plus jitter.
   Sort descending and greedily accept while respecting a minimum spacing of
   `max(2, sqrt(landHexCount / targetCount) * 0.72)` — **derive spacing from land area, not total map
   area**, or settlements come out far too sparse. Target count is `6 + habitation * 0.46`.
   The top 14% become cities, the next 31% towns, the rest villages. Populations: city
   6,000-40,000; town 900-5,100; village 60-700.
9. **Realms** — seats are chosen from cities first, then towns, spread at least `2.2x` the settlement
   spacing apart, with a floor of three seats so borders always exist. Territory grows by
   Dijkstra flood-fill from each seat over terrain cost + 0.2, capped at cost 46. Palette:
   `#a35a34 #4b6d7a #6a6a3c #7a4a63 #3f6b56 #8a6a3a #5b5b8a`.
10. **Wild sites** — `3 + wildSites * 0.3` of them, rejection-sampled onto land at least 3 hexes
    (Manhattan, in offset space) from any settlement. Type is uniform among ruin, dungeon, camp, keep.
11. **Roads** — for each settlement, connect to its two nearest neighbors within 18 hexes by
    on-foot A*, skipping paths longer than 46 hexes and de-duplicating pairs.
12. **Hand edits survive** — painted terrain is reapplied over the fresh biome array (and re-derives
    land/water) before the strand pass; hand-placed objects are concatenated onto the generated set;
    renamed realms are restored by index.

**Name generation** is two syllable tables joined (30 prefixes x 24 suffixes, e.g. "Kelbarrow"), realms
are a prefix plus one of Dominion / Reach / Marches / Concord / Hegemony / Freeholds / Protectorate /
League / Cantons / Suzerainty, and sites are "The " + adjective + noun (Sunken, Whispering, Broken,
Ashen... x Abbey, Barrow, Cairn, Cistern, Fane, Menhir, Obelisk, Sepulchre, Warren, Ziggurat...).

### Unsurveyed edge rendering
When the edge is open, three concentric rings of hexes at the map border are overlaid with the fog
color at `globalAlpha` 0.72 / 0.40 / 0.18 (outermost darkest), and the word "unsurveyed" is drawn in
italic 15px Cormorant Garamond at 0.5 alpha, centered at top and bottom. Coastline strokes are
suppressed on hex edges that face off-map, so land reads as continuing rather than ending.

---

## Travel & Distance Math

**Terrain movement costs and encounter weights** (cost `null` means impassable except by ship):

| Biome | Cost | Wildness |
|---|---|---|
| Deep water / Open sea / Shoal | null (1.0 by ship) | 0.30 / 0.30 / 0.25 |
| Strand | 1.0 | 0.20 |
| Grassland | 1.0 | 0.25 |
| Savanna | 1.1 | 0.30 |
| Tundra | 1.4 | 0.30 |
| Forest | 1.5 | 0.40 |
| Desert | 1.6 | 0.45 |
| Boreal wood | 1.6 | 0.40 |
| Hills | 1.9 | 0.35 |
| Marsh | 2.2 | 0.55 |
| Jungle | 2.4 | 0.60 |
| Snowcap | 2.8 | 0.50 |
| Mountains | 3.2 | 0.50 |

A river adds +0.4 to a land hex's cost. Travelling by ship inverts passability: water costs 1.0 and
all land is impassable.

**Routing.** Waypoints are an ordered list of hex indices. In *By hand* mode, consecutive waypoints
are joined by a cube-coordinate straight line (impassable hexes are traversed at a fallback cost of
4.0 — the party wades). In *Find the way* mode they are joined by **A*** over terrain cost with a
Euclidean-distance heuristic normalized by hex width. Route stats:
- `travelCost = sum over cells after the first of (cost * milesPerHex)`
- `pathMiles = (cellCount - 1) * milesPerHex`
- `crowMiles = pixelDistance(start, end) / hexWidth * milesPerHex`
- `wildness = mean wildness of cells after the first`
- `effectivePace = basePace * seasonMod * weatherMod * (forcedMarch ? 1.25 : 1)`
- `days = travelCost / effectivePace`

Base pace: foot 24, mounted 36, ship 48 mi/day. Season modifiers: spring 1.0, summer 1.05,
autumn 0.95, winter 0.78. Weather: clear 1.0, rain 0.85, fog 0.8, storm 0.6, snow 0.55.

**Encounter checks** are two per day, `ceil(days)` days, each succeeding at probability
`wildness * 0.42`. The panel presents this as `round(wildness * 0.42 * 6)`-in-6 to match table
convention.

**Marching** advances the calendar by `max(1, ceil(days))` days, adds every route cell *and its six
neighbors* to the revealed set, rolls the checks with a seeded RNG, prepends a log entry, and leaves
a single waypoint at the destination so the next leg continues from there.

**Calendar.** A 360-day year of twelve 30-day months named Hammer, Alturiak, Ches, Tarsakh, Mirtul,
Kythorn, Flamerule, Eleasis, Eleint, Marpenoth, Uktar, Nightal, formatted "14 Flamerule, 1492 DR".
The campaign starts on absolute day 63 and displays "Campaign day 1". *These month names are
Forgotten Realms nomenclature — if the target product ships commercially, substitute your own.*

---

## Interactions & Behavior

- **Mode toggle** — Forge shows brushes, stamps, inspector, and gazetteer; Table shows party
  settings, passage readout, and log. Switching to Table clears the active tool.
- **Warden / Party** — Party view overlays unrevealed hexes with the fog color and hides objects in
  them entirely.
- **Map click** depends on mode and tool: Table mode appends a waypoint; a terrain brush repaints;
  a stamp creates an object; Select selects the hex.
- **Drag** has three kinds, distinguished by what was moused down on: `brush` (paint continuously
  as the pointer moves), `obj` (move a settlement to the hex under the pointer), `wp` (move a
  waypoint, live-recomputing the route). A window-level `mouseup` listener ends any drag, so
  releasing outside the map does not leave a stuck drag.
- **Hover** tracks the hex under the pointer for the outline and the bottom-left readout.
- **Object mousedown and click both `stopPropagation()`** so selecting a settlement does not also
  register as a map click.
- **Editing a generated object does not mark it hand-placed** — but hand-placed objects carry
  `gen: false` and survive reforging. (A reasonable improvement: promote any edited generated
  object to hand-placed so edits are never lost.)
- **Changing miles-per-hex** updates the live world in place without regenerating terrain.
- **Reroll** replaces the seed word with a freshly generated place name but does not regenerate;
  the user still presses Forge.

## State Management

```
mode          'forge' | 'table'
view          'gm' | 'players'
theme         'parchment' | 'dusk'
params        { seed, size, hexMiles, sea, climate, wet, mountains, rivers,
                settlements, pois, edge }
layers        { grid, rivers, roads, borders, labels }   // booleans
world         { w, h, n, el, mo, tp, biome[], land[], river[], flow[], next[],
                owner[], realms[], sea, edge, seedName, hexMiles, px }
objects       [{ id, gen, type, name, hex, pop, notes }]
paint         { [hexIndex]: biomeKey }        paintV: number  // repaint trigger
realmNames    { [realmIndex]: string }        // survives reforging
selected      null | { kind: 'object', id } | { kind: 'hex', i }
tool          '' | 'city' | ... | 't:mountains'   // 't:' prefix = terrain brush
routeMode     'manual' | 'auto'
waypoints     hexIndex[]
party         { speed, march, season, weather }
day           number (absolute)
journal       [{ when, text, note, tone }]
revealed      Set<hexIndex>                   fogV: number  // repaint trigger
zoom, hover, drag
```

Typed arrays (`Float32Array`, `Uint8Array`, `Int16Array`, `Int32Array`) hold the per-hex grids —
at 3,500+ hexes this matters. The `paintV` and `fogV` counters exist purely so the canvas cache key
changes when a `Set` or object is mutated in place; a port using immutable state can drop them.

No data fetching. No persistence in the prototype — **saving and loading worlds is the obvious first
production requirement**, and the state tree above is the thing to serialize (the world grids can be
regenerated from `params` alone, so a save file only needs params, paint, objects, realmNames,
party, day, journal, and revealed).

---

## Design Tokens

**Interface palette**
| Token | Value | Use |
|---|---|---|
| Void | `#16120e` | page background, label halos on dark |
| Panel | `#1b1712` | side panels, header |
| Stage | `#100d0a` | map background, input fields |
| Well | `#201b15` | stat cells |
| Rule | `#241f19` | faint dividers, button faces |
| Border | `#2b241c` / `#322a20` / `#3a3025` | hairline / chrome / control borders |
| Leather | `#5c4a33` | active chip border |
| Ink | `#e6ddcd` | body text |
| Ink bright | `#f0e7d6` | headings |
| Ink muted | `#cfc4b0` / `#c9bda7` / `#9a8f7c` / `#8e8471` / `#7d7361` / `#6f6656` | descending emphasis |
| Ember | `#b8511f` (hover `#c95e28`) | primary buttons |
| Accent | `#c05a2b` | selection, routes, focus rings (tweakable) |
| Accent warm | `#3a2016` / `#8a4a24` / `#f0c9a8` | active tool fill / border / text |
| Danger | `#b06a4a` / `#4a3428` / `#2a1c15` / `#cf8562` | destructive text / border / hover bg / hover text |
| Quiet good | `#5f8a72` | uneventful log entries |

**Parchment map theme**
```
paper #e9dfc4   ink #4a3b28    grid rgba(74,59,40,0.16)   coast #5c4a33
river #7d9fae   road #8b6a44   border #a35a34   fog rgba(22,18,14,0.86)
label #3b2f22   halo rgba(233,223,196,0.85)
deep #9fb6c0   ocean #b3c7cd   shallow #c6d5d6   beach #eee2c1
grass #cdd3a2  savanna #dbcf99  desert #e7dca4   forest #a9bd8d
jungle #8fae7c  taiga #a0b49d   tundra #d0d1c3   swamp #a8ae86
hills #c5bb90  mountains #b2a78d  snow #efece2
```

**Dusk map theme**
```
paper #131a21   ink #c8d4dd    grid rgba(200,212,221,0.10)  coast #7b93a4
river #5c8ea8   road #9c8358   border #c4703f   fog rgba(4,7,10,0.88)
label #e7eef4   halo rgba(11,16,21,0.85)
deep #111b26   ocean #182734   shallow #213543   beach #4e4a38
grass #3d4f38  savanna #514c30  desert #5c5540   forest #2e4432
jungle #28432f  taiga #31453e   tundra #4a534f   swamp #38412e
hills #4a4636  mountains #555044  snow #8b8f8a
```

**Typography** — two families, loaded from Google Fonts.
- *Cormorant Garamond* (400/500/600/700 + italic 400): display and in-world text. Sizes used:
  42px (route days), 26px (inspector heading), 25px (wordmark), 21/20px (date), 15px (realm names),
  9.4 / 7.8px (map labels), italic 15px ("unsurveyed").
- *IBM Plex Mono* (400/500/600): all numbers, coordinates, section headers, and control labels.
  Sizes: 15px (stat values), 13/12/11/10px (fields and readouts), 9px (section headers, tracked
  0.2em), 8px (stat captions, tracked 0.16em), 6.4px (waypoint numbers).
- *IBM Plex Sans* (400/500/600): body copy, labels, helper text. Sizes: 13, 12, 11, 10px.
- Uppercase section headers always carry letter-spacing 0.16-0.22em.

**Spacing** — a 1 / 2 / 3 / 5 / 6 / 8 / 9 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 28px scale in
practice. Panel padding `16px 15px 28px`; control gaps 6-8px; section separation 14-20px with a
hairline rule.

**Radii** — 2px (segmented control inners), 3px (everything else: buttons, inputs, cards, chips,
swatches). No large radii anywhere; the aesthetic is drafting-table, not consumer app.

**Shadows** — none. Depth comes from value steps and hairline borders. The only shadow-like effect is
the route polyline's dark underlay and the map labels' halo stroke.

**Scrollbars** — 9px, track `#16120e`, thumb `#3a3025`, radius 5px.

## Tweakable Props

The prototype exposes three props, useful as configuration in a port:
- `accent` (color, default `#c05a2b`; alternates `#b8433f`, `#4b7d8c`, `#7a6a3a`)
- `mapTheme` (`parchment` | `dusk`)
- `startMode` (`forge` | `table`)

## Assets
None. No images, no icon fonts, no SVG illustrations — every mark on the map is drawn from
primitives, and the only external dependency is the Google Fonts stylesheet for Cormorant Garamond
and IBM Plex Mono / Sans. Self-host both families in production.

## Files
- `Hexwright.dc.html` — the complete prototype. Its logic class holds all the generation, routing,
  and travel math referenced above; read it alongside this document rather than reimplementing the
  algorithms from the prose.

## Known Gaps
Worth knowing before you scope the port:
1. **No persistence.** Nothing survives a reload.
2. **No brush size or flood fill** — terrain painting is one hex at a time, which is tedious for
   large regions.
3. **Editing a generated settlement does not protect it from the next reforge.**
4. **Realm territory does not recompute** after terrain painting or after settlements are moved.
5. **Roads are recomputed inside the canvas paint pass**, which briefly mutates `party.speed` to
   force on-foot pathing. This is a hack; hoist road computation into generation.
6. **Rivers are hex-centered polylines**, not edge-following — fine at this zoom, visibly coarse if
   you zoom further in.
7. **Pan is browser scroll only** — no drag-to-pan, no pinch zoom.
8. **Month names are Forgotten Realms**; swap them for a commercial product.
