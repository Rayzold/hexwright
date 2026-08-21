# Hexwright

A hexcrawl world-map tool for tabletop RPG referees, built from the
`design_handoff_hexwright` reference. It does two jobs in one workspace:

- **Forge** — generate a procedural hex overworld and hand-edit it (paint
  terrain, stamp settlements and sites, name realms).
- **Table** — plot party travel, compute distances / travel days / terrain
  costs / encounter checks, march the party, and advance the calendar.

A **Warden / Party** sight toggle hides unexplored hexes behind fog for
player-facing display.

## Stack

- **React 18 + TypeScript**, bundled with **Vite**
- **Zustand** for world state
- **Canvas 2D** for static cartography with an **SVG overlay** for interactive
  marks (the split the handoff recommends)
- **localStorage** for save/load (named world slots + a silent autosave) — the
  production requirement the prototype lacked

## Running

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build
```

## Layout

```
src/
  core/           pure, framework-free algorithms (ported from the prototype)
    rng.ts        FNV-1a hash, mulberry32, value noise, fBm
    hex.ts        pointy-top odd-row offset geometry, cube coords, pixel↔hex
    heap.ts       binary min-heap
    biomes.ts     terrain movement costs & encounter weights
    themes.ts     parchment / dusk map palettes
    names.ts      procedural place / realm / site names
    worldgen.ts   build(): elevation → biomes → rivers → settlements →
                  realms → sites → roads
    travel.ts     A* / cube-line routing, route stats, pace, calendar
  render/
    paint.ts      canvas cartography pass with a cache key that skips redraws
  store/
    useStore.ts   Zustand store mirroring the prototype's state tree
    persist.ts    serialize / deserialize + localStorage slots & autosave
  components/     Header, MapStage, and the Forge/Table left & right panels
```

## Notes on fidelity

The generation, routing, and travel algorithms are ported closely from the
prototype's logic class; the UI is rebuilt to the hex values and typography in
the handoff README. Two documented "known gaps" from the handoff were fixed in
the port:

- **Roads are computed in generation** (`worldgen.computeRoads`) and stored on
  the world, rather than recomputed inside the canvas paint pass.
- **Worlds persist.** A save only stores `params` + hand edits (paint, objects,
  realm names, party, day, journal, revealed); the world grids regenerate
  deterministically from `params` on load, and saved objects (with their edits)
  are restored verbatim.

The Forgotten Realms month names are carried over from the prototype; swap them
in `core/travel.ts` (`MONTHS`) for a commercial product.

## Beyond the prototype

Features added on top of the handoff:

- **Save / load** — named world slots plus a silent autosave (localStorage), and
  export/import of a portable `.hexwright.json` file
- **Shareable links** — "Copy share link" encodes the generation params in the URL
- **PNG export** of the composited map (terrain + overlay)
- **Undo / redo** — snapshot history for terrain painting, stamps, moves, deletes,
  and renames (`Ctrl+Z` / `Ctrl+Shift+Z`, or the header buttons)
- **Atlas** — a drawer listing every holding grouped by realm, with editable names
  for holdings and realms and a name filter
- **Allegiance & threat** — every holding/site is friendly, neutral, or hostile
  with a 0–5 threat rating; hostiles draw a crimson ring and raise encounter odds
  along a route
- **More site types** — Fort, Tower, Lair, Shrine, Cave, Monument, each with its
  own glyph, on top of the original city/town/village/keep/ruin/dungeon/camp
- **Adversaries** — a *Menace* slider seeds hostile lairs into the wilderness,
  their threat scaling with remoteness and terrain wildness
- **POI status** — mark a site cleared vs active; cleared sites dim on the map
- **Atlas** groups holdings by realm, filters by allegiance, and lets you rename
  or **remove** any establishment; a map **legend** keys the marker types
- **Map extents** up to **Expanse (100 × 72 ≈ 7,200 hexes)**
- **Pan & zoom** — drag-to-pan (middle mouse / space+drag) and cursor-anchored
  wheel zoom
- **Terrain brush** size (1–4 hex disk) and flood fill
- **Parchment / dusk** theme toggle
- **Live realm territory** — borders recompute after painting and settlement moves
- **Collapsible side panels** (auto-collapse on narrow screens)
- **Web Worker generation** and smoothed river curves

### Campaign theming (The Scarred Lands / New Grandia)

Adapted to a specific homebrew D&D campaign, drawing on its public Crystal Forge
sim config (no DM-secret material):

- **Calendar** — the campaign's own 336-day year (12 × 28-day months, "AC" era),
  weekdays, and holidays; the Reckoning shows weekday, season, and next holiday
- **Seasons** — the four weather-named seasons (Twilight / Mists / Embers / Gloom),
  auto-derived from the in-world date
- **Weather** — campaign weather (Ashfall, Crystal storm) with a season-weighted
  **Roll weather** and an Observatory-style forecast
- **The Scar** — a paintable blighted/arcane land biome
- **Airship travel** — a pace that flies over all terrain and water at flat cost
- **Naming** — a Scarred Lands place/realm/site name style (toggle to Classic)
- **Region presets** — generate a world in the image of any of the 14 regions
  (New Grandia, Thundermount, The Scar, The Bog, The Celestial Volcano, …), each
  biasing the flavour sliders and naming the world for the region
