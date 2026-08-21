import { create } from "zustand";
import { BIOMES } from "../core/biomes";
import { nbrs } from "../core/hex";
import { placeName, siteName } from "../core/names";
import { OBJECT_TYPES, hostileThreatMap } from "../core/objectTypes";
import { regionById } from "../core/regions";
import { hashStr, mulberry } from "../core/rng";
import {
  CAMPAIGN_START_DAY,
  dateStr,
  pace,
  rollWeather as rollWeatherFor,
  route,
} from "../core/travel";
import { computeRoads, recomputeRealms } from "../core/worldgen";
import { generate } from "../workers/gen";
import type {
  BiomeKey,
  Drag,
  JournalEntry,
  Layers,
  MapObject,
  Mode,
  ObjectType,
  Params,
  Party,
  Road,
  RouteMode,
  Selected,
  ThemeKey,
  ViewKey,
  World,
} from "../core/types";

export const ACCENT = "#c05a2b";

const DEFAULT_PARAMS: Params = {
  seed: "Aurelmoor",
  size: "large",
  hexMiles: 6,
  sea: 42,
  climate: 52,
  wet: 50,
  mountains: 55,
  rivers: 50,
  settlements: 46,
  pois: 40,
  menace: 30,
  edge: "sea",
  nameStyle: "scarred",
};

/** Hexes within `size-1` rings of `center` (size 1 = just the center). */
function hexRegion(world: World, center: number, size: number): number[] {
  if (size <= 1) return [center];
  const { w, h } = world;
  const seen = new Set<number>([center]);
  let frontier = [center];
  for (let d = 1; d < size; d++) {
    const next: number[] = [];
    for (const cur of frontier) {
      const c = cur % w;
      const r = (cur - c) / w;
      for (const [nc, nr] of nbrs(c, r)) {
        if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
        const j = nr * w + nc;
        if (!seen.has(j)) {
          seen.add(j);
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return [...seen];
}

/** Connected hexes sharing `center`'s current biome (paint-bucket region). */
function floodRegion(world: World, center: number): number[] {
  const { w, h } = world;
  const target = world.biome[center];
  const seen = new Set<number>([center]);
  const stack = [center];
  const out: number[] = [];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur);
    const c = cur % w;
    const r = (cur - c) / w;
    for (const [nc, nr] of nbrs(c, r)) {
      if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
      const j = nr * w + nc;
      if (!seen.has(j) && world.biome[j] === target) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return out;
}

// ---------- undo/redo history ----------

const HISTORY_CAP = 60;
// module-level (non-reactive) flags so keystroke coalescing and drag detection
// don't trigger store re-renders.
let coalesceTag: string | null = null;
let dragEdited = false;

interface WorldSnap {
  biome: BiomeKey[];
  land: Uint8Array;
  river: Uint8Array;
  owner: Int16Array;
  roads: Road[];
  realms: { name: string; hexes: number }[];
}

export interface EditSnapshot {
  paint: Record<number, BiomeKey>;
  objects: MapObject[];
  realmNames: Record<number, string>;
  world: WorldSnap | null;
}

function snapshotWorld(w: World): WorldSnap {
  return {
    biome: w.biome.slice(),
    land: new Uint8Array(w.land),
    river: new Uint8Array(w.river),
    owner: new Int16Array(w.owner),
    roads: w.roads.map((r) => r.slice()),
    realms: w.realms.map((r) => ({ name: r.name, hexes: r.hexes })),
  };
}

function restoreWorld(w: World, snap: WorldSnap): void {
  w.biome = snap.biome.slice();
  w.land = new Uint8Array(snap.land);
  w.river = new Uint8Array(snap.river);
  w.owner = new Int16Array(snap.owner);
  w.roads = snap.roads.map((r) => r.slice());
  w.realms.forEach((r, k) => {
    if (snap.realms[k]) {
      r.name = snap.realms[k].name;
      r.hexes = snap.realms[k].hexes;
    }
  });
}

/**
 * Paint `b` onto `cells`, mutating the world's typed arrays in place. Returns a
 * paint delta ({ [hex]: biome }) for the hexes that actually changed, or null.
 */
function applyPaintCells(
  world: World,
  cells: number[],
  b: BiomeKey
): Record<number, BiomeKey> | null {
  const water = !!BIOMES[b].water;
  const delta: Record<number, BiomeKey> = {};
  let changed = false;
  for (const i of cells) {
    if (world.biome[i] === b) continue;
    world.biome[i] = b;
    world.land[i] = water ? 0 : 1;
    if (water) world.river[i] = 0;
    delta[i] = b;
    changed = true;
  }
  return changed ? delta : null;
}

export interface HexState {
  mode: Mode;
  view: ViewKey;
  theme: ThemeKey;
  params: Params;
  layers: Layers;
  paint: Record<number, BiomeKey>;
  paintV: number;
  realmNames: Record<number, string>;
  world: World | null;
  objects: MapObject[];
  selected: Selected;
  tool: string; // '' | 'city' | ... | 't:mountains'
  brushSize: number; // terrain brush radius in hexes (1 = single hex)
  fill: boolean; // flood-fill mode for the terrain brush
  routeMode: RouteMode;
  waypoints: number[];
  party: Party;
  day: number;
  journal: JournalEntry[];
  revealed: Set<number> | null;
  fogV: number;
  zoom: number;
  hover: number | null;
  drag: Drag;
  /** bumped on each build() so the map stage re-runs its auto-fit. */
  fitV: number;
  leftOpen: boolean;
  rightOpen: boolean;
  atlasOpen: boolean;
  undoStack: EditSnapshot[];
  redoStack: EditSnapshot[];

  // --- actions ---
  build: (keepManual: boolean) => void;
  setParam: <K extends keyof Params>(k: K, v: Params[K]) => void;
  setHexMiles: (v: number | string) => void;
  setEdge: (v: Params["edge"]) => void;
  reroll: () => void;
  regenerate: () => void;
  applyRegion: (id: string) => void;

  setMode: (m: Mode) => void;
  setView: (v: ViewKey) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (z: number) => void;
  toggleLayer: (k: keyof Layers) => void;
  pickTool: (name: string) => void;
  setTheme: (t: ThemeKey) => void;
  toggleTheme: () => void;
  setBrushSize: (n: number) => void;
  toggleFill: () => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setPanels: (left: boolean, right: boolean) => void;
  toggleAtlas: () => void;

  pushHistory: (tag?: string) => void;
  undo: () => void;
  redo: () => void;
  renameObject: (id: string, name: string) => void;

  setRouteMode: (m: RouteMode) => void;
  setParty: <K extends keyof Party>(k: K, v: Party[K]) => void;
  toggleMarch: () => void;
  rollWeather: () => void;
  clearRoute: () => void;
  popWaypoint: () => void;
  revealAll: () => void;
  hideAll: () => void;
  march: () => void;

  onRealmName: (k: number, v: string) => void;
  patchSel: (patch: Partial<MapObject>) => void;
  patchObject: (id: string, patch: Partial<MapObject>, tag?: string) => void;
  deleteObject: (id: string) => void;
  deleteSel: () => void;

  // map interactions (component computes hex index)
  hoverHex: (i: number | null) => void;
  brushHex: (i: number) => void;
  floodFill: (i: number) => void;
  beginBrush: (i: number) => void;
  mapClick: (i: number) => void;
  pointerMove: (i: number) => void;
  selectObject: (id: string) => void;
  objectDown: (id: string) => void;
  waypointDown: (n: number) => void;
  endDrag: () => void;

  refreshRoads: () => void;
  refreshRealms: () => void;
  hydrate: (patch: Partial<HexState>) => void;
}

export const useStore = create<HexState>((set, get) => ({
  mode: "forge",
  view: "gm",
  theme: "parchment",
  params: { ...DEFAULT_PARAMS },
  layers: { grid: true, rivers: true, roads: true, borders: true, labels: true },
  paint: {},
  paintV: 0,
  realmNames: {},
  world: null,
  objects: [],
  selected: null,
  tool: "",
  brushSize: 1,
  fill: false,
  routeMode: "manual",
  waypoints: [],
  party: { speed: "foot", march: false, season: "embers", weather: "clear" },
  day: CAMPAIGN_START_DAY,
  journal: [],
  revealed: null,
  fogV: 0,
  zoom: 1,
  hover: null,
  drag: null,
  fitV: 0,
  leftOpen: true,
  rightOpen: true,
  atlasOpen: false,
  undoStack: [],
  redoStack: [],

  build: (keepManual) => {
    const s = get();
    const keep = keepManual
      ? { paint: s.paint, realmNames: s.realmNames, objects: s.objects }
      : undefined;
    // generation runs in a worker; the store updates when it resolves
    generate(s.params, keep).then(({ world, objects }) => {
      coalesceTag = null;
      set((st) => ({
        world,
        objects,
        selected: null,
        waypoints: [],
        revealed: new Set<number>(),
        paint: keepManual ? st.paint : {},
        fogV: st.fogV + 1,
        fitV: st.fitV + 1,
        undoStack: [],
        redoStack: [],
      }));
    });
  },

  setParam: (k, v) => set((s) => ({ params: { ...s.params, [k]: v } })),

  setHexMiles: (raw) => {
    const v = Math.max(1, Math.min(60, Number(raw) || 1));
    set((s) => ({
      params: { ...s.params, hexMiles: v },
      world: s.world ? { ...s.world, hexMiles: v } : null,
    }));
  },

  setEdge: (v) => {
    set((s) => ({ params: { ...s.params, edge: v } }));
    get().build(true);
  },

  reroll: () => {
    const rng = mulberry((Math.random() * 1e9) | 0);
    get().setParam("seed", placeName(rng, get().params.nameStyle));
  },

  regenerate: () => get().build(true),

  applyRegion: (id) => {
    const preset = regionById(id);
    if (!preset) return;
    set((s) => ({ params: { ...s.params, ...preset.params } }));
    get().build(false); // fresh world in the region's image
  },

  setMode: (m) => set(m === "table" ? { mode: m, tool: "" } : { mode: m }),
  setView: (v) => set({ view: v }),
  zoomIn: () => set((s) => ({ zoom: Math.min(2.4, +(s.zoom + 0.2).toFixed(2)) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.5, +(s.zoom - 0.2).toFixed(2)) })),
  setZoom: (z) => set({ zoom: z }),
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  pickTool: (name) => set({ tool: name }),
  setTheme: (t) => set((s) => ({ theme: t, paintV: s.paintV + 1 })),
  toggleTheme: () =>
    set((s) => ({
      theme: s.theme === "parchment" ? "dusk" : "parchment",
      paintV: s.paintV + 1,
    })),
  setBrushSize: (n) => set({ brushSize: Math.max(1, Math.min(4, n)) }),
  toggleFill: () => set((s) => ({ fill: !s.fill })),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  setPanels: (left, right) => set({ leftOpen: left, rightOpen: right }),
  toggleAtlas: () => set((s) => ({ atlasOpen: !s.atlasOpen })),

  pushHistory: (tag) => {
    const s = get();
    if (!s.world) return;
    // coalesce consecutive edits to the same field (e.g. typing a name)
    if (tag && tag === coalesceTag) {
      if (s.redoStack.length) set({ redoStack: [] });
      return;
    }
    coalesceTag = tag ?? null;
    const snap: EditSnapshot = {
      paint: { ...s.paint },
      objects: s.objects.slice(),
      realmNames: { ...s.realmNames },
      world: s.world ? snapshotWorld(s.world) : null,
    };
    set({
      undoStack: s.undoStack.concat([snap]).slice(-HISTORY_CAP),
      redoStack: [],
    });
  },

  undo: () => {
    const s = get();
    if (!s.undoStack.length || !s.world) return;
    const cur: EditSnapshot = {
      paint: { ...s.paint },
      objects: s.objects.slice(),
      realmNames: { ...s.realmNames },
      world: snapshotWorld(s.world),
    };
    const snap = s.undoStack[s.undoStack.length - 1];
    if (snap.world) restoreWorld(s.world, snap.world);
    coalesceTag = null;
    set((st) => ({
      undoStack: st.undoStack.slice(0, -1),
      redoStack: st.redoStack.concat([cur]).slice(-HISTORY_CAP),
      paint: { ...snap.paint },
      objects: snap.objects.slice(),
      realmNames: { ...snap.realmNames },
      selected: null,
      paintV: st.paintV + 1,
    }));
  },

  redo: () => {
    const s = get();
    if (!s.redoStack.length || !s.world) return;
    const cur: EditSnapshot = {
      paint: { ...s.paint },
      objects: s.objects.slice(),
      realmNames: { ...s.realmNames },
      world: snapshotWorld(s.world),
    };
    const snap = s.redoStack[s.redoStack.length - 1];
    if (snap.world) restoreWorld(s.world, snap.world);
    coalesceTag = null;
    set((st) => ({
      redoStack: st.redoStack.slice(0, -1),
      undoStack: st.undoStack.concat([cur]).slice(-HISTORY_CAP),
      paint: { ...snap.paint },
      objects: snap.objects.slice(),
      realmNames: { ...snap.realmNames },
      selected: null,
      paintV: st.paintV + 1,
    }));
  },

  renameObject: (id, name) => {
    get().patchObject(id, { name }, "obj:" + id + ":name");
  },

  setRouteMode: (m) => set({ routeMode: m }),
  setParty: (k, v) => set((s) => ({ party: { ...s.party, [k]: v } })),
  toggleMarch: () => set((s) => ({ party: { ...s.party, march: !s.party.march } })),
  rollWeather: () =>
    set((s) => ({
      party: { ...s.party, weather: rollWeatherFor(s.party.season, Math.random) },
    })),
  clearRoute: () => set({ waypoints: [] }),
  popWaypoint: () => set((s) => ({ waypoints: s.waypoints.slice(0, -1) })),

  revealAll: () => {
    const w = get().world;
    if (!w) return;
    const r = new Set<number>();
    for (let i = 0; i < w.n; i++) r.add(i);
    set((s) => ({ revealed: r, fogV: s.fogV + 1 }));
  },
  hideAll: () => set((s) => ({ revealed: new Set<number>(), fogV: s.fogV + 1 })),

  march: () => {
    const s = get();
    const world = s.world;
    if (!world) return;
    const r = route(
      world,
      s.waypoints,
      s.routeMode,
      s.party.speed,
      hostileThreatMap(s.objects)
    );
    if (!r || !r.cells) return;
    const days = (r.cost as number) / pace(s.party);
    const whole = Math.max(1, Math.ceil(days));
    const rng = mulberry(
      hashStr(s.day + ":" + r.cells.length + ":" + world.seedName)
    );
    const checks = whole * 2;
    let hits = 0;
    for (let k = 0; k < checks; k++) if (rng() < (r.wild as number) * 0.42) hits++;
    const rev = new Set<number>(s.revealed || []);
    for (const i of r.cells) {
      rev.add(i);
      const c = i % world.w;
      const rr = (i - c) / world.w;
      for (const [nc, nr] of nbrs(c, rr))
        if (nc >= 0 && nr >= 0 && nc < world.w && nr < world.h)
          rev.add(nr * world.w + nc);
    }
    const nameAt = (i: number): string => {
      const o = s.objects.find((x) => x.hex === i);
      return o ? o.name : BIOMES[world.biome[i]].name.toLowerCase();
    };
    const march = s.party.march;
    const entry: JournalEntry = {
      when: dateStr(s.day) + " → " + dateStr(s.day + whole),
      text:
        "Marched from " +
        nameAt(r.cells[0]) +
        " to " +
        nameAt(r.cells[r.cells.length - 1]) +
        " — " +
        (r.cells.length - 1) +
        " hexes, " +
        Math.round(r.pathMiles as number) +
        " mi.",
      note: hits
        ? hits +
          " encounter" +
          (hits > 1 ? "s" : "") +
          " on the road." +
          (march ? " Party arrives exhausted." : "")
        : "The road was quiet." + (march ? " Party arrives exhausted." : ""),
      tone: hits ? "#b06a4a" : "#5f8a72",
    };
    set((st) => ({
      day: st.day + whole,
      revealed: rev,
      fogV: st.fogV + 1,
      journal: [entry].concat(st.journal).slice(0, 24),
      waypoints: [r.cells![r.cells!.length - 1]],
    }));
  },

  onRealmName: (k, v) => {
    const world = get().world;
    if (!world || !world.realms[k]) return;
    get().pushHistory("realm:" + k);
    world.realms[k].name = v;
    set((s) => ({
      realmNames: { ...s.realmNames, [k]: v },
      paintV: s.paintV + 1,
    }));
  },

  patchSel: (patch) => {
    const sel = get().selected;
    if (!sel || sel.kind !== "object") return;
    get().patchObject(sel.id, patch);
  },

  patchObject: (id, patch, tag) => {
    // coalesce by field so typing a name is a single undo step
    get().pushHistory(tag ?? "obj:" + id + ":" + Object.keys(patch).join(","));
    // Editing a generated holding promotes it to hand-placed so the edit
    // survives the next reforge.
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, ...patch, gen: false } : o
      ),
    }));
  },

  deleteObject: (id) => {
    get().pushHistory();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selected:
        s.selected && s.selected.kind === "object" && s.selected.id === id
          ? null
          : s.selected,
    }));
  },

  deleteSel: () => {
    const sel = get().selected;
    if (!sel || sel.kind !== "object") return;
    get().pushHistory();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== sel.id),
      selected: null,
    }));
  },

  hoverHex: (i) => {
    if (i !== get().hover) set({ hover: i });
  },

  brushHex: (i) => {
    const s = get();
    const world = s.world;
    if (!world || !s.tool.startsWith("t:")) return;
    const b = s.tool.slice(2) as BiomeKey;
    if (!BIOMES[b]) return;
    const cells = hexRegion(world, i, s.brushSize);
    const delta = applyPaintCells(world, cells, b);
    if (delta)
      set((st) => ({ paint: { ...st.paint, ...delta }, paintV: st.paintV + 1 }));
  },

  floodFill: (i) => {
    const s = get();
    const world = s.world;
    if (!world || !s.tool.startsWith("t:")) return;
    const b = s.tool.slice(2) as BiomeKey;
    if (!BIOMES[b] || world.biome[i] === b) return;
    get().pushHistory();
    const cells = floodRegion(world, i);
    const delta = applyPaintCells(world, cells, b);
    if (delta) {
      set((st) => ({ paint: { ...st.paint, ...delta }, paintV: st.paintV + 1 }));
      get().refreshRealms();
    }
  },

  beginBrush: (i) => {
    const s = get();
    if (s.mode !== "forge" || !s.tool.startsWith("t:")) return;
    if (s.fill) {
      // flood is click-only; don't start a paint drag
      get().floodFill(i);
      return;
    }
    // one history entry per paint stroke
    get().pushHistory();
    dragEdited = true;
    set({ drag: { kind: "brush" } });
    get().brushHex(i);
  },

  mapClick: (i) => {
    const s = get();
    const world = s.world;
    if (!world) return;
    if (s.mode === "table") {
      set((st) => ({ waypoints: st.waypoints.concat([i]) }));
      return;
    }
    const tool = s.tool;
    if (tool.startsWith("t:")) {
      // beginBrush already handled the paint/flood on mousedown
      return;
    }
    if (tool) {
      get().pushHistory();
      const rng = mulberry(hashStr(world.seedName + i + tool));
      const type = tool as ObjectType;
      const style = get().params.nameStyle;
      const isSite = OBJECT_TYPES[type].category === "site";
      const obj: MapObject = {
        id: "m" + Date.now().toString(36),
        gen: false,
        type,
        name: isSite
          ? siteName(rng, style)
          : tool === "keep"
            ? placeName(rng, style) + " Keep"
            : tool === "fort"
              ? placeName(rng, style) + " Fort"
              : placeName(rng, style),
        hex: i,
        pop:
          tool === "city"
            ? 12000
            : tool === "town"
              ? 2200
              : tool === "village"
                ? 320
                : tool === "keep" || tool === "fort"
                  ? 120
                  : tool === "tower"
                    ? 20
                    : 0,
        notes: "",
        allegiance: OBJECT_TYPES[type].defaultAllegiance,
        threat: OBJECT_TYPES[type].defaultAllegiance === "hostile" ? 2 : 0,
        cleared: false,
      };
      set((st) => ({
        objects: st.objects.concat([obj]),
        selected: { kind: "object", id: obj.id },
      }));
      get().refreshRoads();
      return;
    }
    set({ selected: { kind: "hex", i } });
  },

  pointerMove: (i) => {
    const s = get();
    const drag = s.drag;
    if (drag && i !== null) {
      if (drag.kind === "wp") {
        set((st) => {
          const wp = st.waypoints.slice();
          wp[drag.n] = i;
          return { waypoints: wp, hover: i };
        });
        return;
      }
      if (drag.kind === "brush") {
        get().brushHex(i);
        if (i !== s.hover) set({ hover: i });
        return;
      }
      if (drag.kind === "obj") {
        // capture one history entry on the first move of the drag
        if (!dragEdited) {
          get().pushHistory();
          dragEdited = true;
        }
        // moving a holding also promotes a generated one to hand-placed
        set((st) => ({
          objects: st.objects.map((o) =>
            o.id === drag.id ? { ...o, hex: i, gen: false } : o
          ),
          hover: i,
        }));
        return;
      }
    }
    if (i !== s.hover) set({ hover: i });
  },

  selectObject: (id) => {
    if (get().mode === "forge") set({ selected: { kind: "object", id }, tool: "" });
  },

  objectDown: (id) => {
    if (get().mode === "forge") {
      dragEdited = false; // history is captured on the first actual move
      set({ drag: { kind: "obj", id }, selected: { kind: "object", id }, tool: "" });
    }
  },

  waypointDown: (n) => set({ drag: { kind: "wp", n } }),

  endDrag: () => {
    const drag = get().drag;
    if (drag) {
      const kind = drag.kind;
      set({ drag: null });
      if (kind === "obj") {
        // moving a holding can change both road links and realm territory
        get().refreshRoads();
        get().refreshRealms();
      } else if (kind === "brush") {
        // a paint stroke can change terrain costs, so borders may shift
        get().refreshRealms();
      }
    }
  },

  refreshRoads: () => {
    const s = get();
    if (!s.world) return;
    s.world.roads = computeRoads(s.world, s.objects);
    set((st) => ({ paintV: st.paintV + 1 }));
  },

  refreshRealms: () => {
    const s = get();
    if (!s.world) return;
    recomputeRealms(s.world);
    set((st) => ({ paintV: st.paintV + 1 }));
  },

  hydrate: (patch) => set(patch),
}));
