import { create } from "zustand";
import { BIOMES } from "../core/biomes";
import { nbrs } from "../core/hex";
import { placeName, siteName } from "../core/names";
import { hashStr, mulberry } from "../core/rng";
import { dateStr, pace, route } from "../core/travel";
import { buildWorld, computeRoads } from "../core/worldgen";
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
  edge: "sea",
};

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

  // --- actions ---
  build: (keepManual: boolean) => void;
  setParam: <K extends keyof Params>(k: K, v: Params[K]) => void;
  setHexMiles: (v: number | string) => void;
  setEdge: (v: Params["edge"]) => void;
  reroll: () => void;
  regenerate: () => void;

  setMode: (m: Mode) => void;
  setView: (v: ViewKey) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (z: number) => void;
  toggleLayer: (k: keyof Layers) => void;
  pickTool: (name: string) => void;

  setRouteMode: (m: RouteMode) => void;
  setParty: <K extends keyof Party>(k: K, v: Party[K]) => void;
  toggleMarch: () => void;
  clearRoute: () => void;
  popWaypoint: () => void;
  revealAll: () => void;
  hideAll: () => void;
  march: () => void;

  onRealmName: (k: number, v: string) => void;
  patchSel: (patch: Partial<MapObject>) => void;
  deleteSel: () => void;

  // map interactions (component computes hex index)
  hoverHex: (i: number | null) => void;
  brushHex: (i: number) => void;
  beginBrush: (i: number) => void;
  mapClick: (i: number) => void;
  pointerMove: (i: number) => void;
  selectObject: (id: string) => void;
  objectDown: (id: string) => void;
  waypointDown: (n: number) => void;
  endDrag: () => void;

  refreshRoads: () => void;
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
  routeMode: "manual",
  waypoints: [],
  party: { speed: "foot", march: false, season: "summer", weather: "clear" },
  day: 63,
  journal: [],
  revealed: null,
  fogV: 0,
  zoom: 1,
  hover: null,
  drag: null,
  fitV: 0,

  build: (keepManual) => {
    const s = get();
    const keep = keepManual
      ? { paint: s.paint, realmNames: s.realmNames, objects: s.objects }
      : undefined;
    const { world, objects } = buildWorld(s.params, keep);
    set({
      world,
      objects,
      selected: null,
      waypoints: [],
      revealed: new Set<number>(),
      paint: keepManual ? s.paint : {},
      fogV: s.fogV + 1,
      fitV: s.fitV + 1,
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
    get().setParam("seed", placeName(rng));
  },

  regenerate: () => get().build(true),

  setMode: (m) => set(m === "table" ? { mode: m, tool: "" } : { mode: m }),
  setView: (v) => set({ view: v }),
  zoomIn: () => set((s) => ({ zoom: Math.min(2.4, +(s.zoom + 0.2).toFixed(2)) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.5, +(s.zoom - 0.2).toFixed(2)) })),
  setZoom: (z) => set({ zoom: z }),
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  pickTool: (name) => set({ tool: name }),

  setRouteMode: (m) => set({ routeMode: m }),
  setParty: (k, v) => set((s) => ({ party: { ...s.party, [k]: v } })),
  toggleMarch: () => set((s) => ({ party: { ...s.party, march: !s.party.march } })),
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
    const r = route(world, s.waypoints, s.routeMode, s.party.speed);
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
    world.realms[k].name = v;
    set((s) => ({
      realmNames: { ...s.realmNames, [k]: v },
      paintV: s.paintV + 1,
    }));
  },

  patchSel: (patch) => {
    const sel = get().selected;
    if (!sel || sel.kind !== "object") return;
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === sel.id ? { ...o, ...patch } : o
      ),
    }));
  },

  deleteSel: () => {
    const sel = get().selected;
    if (!sel || sel.kind !== "object") return;
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
    const b = s.tool.slice(2) as BiomeKey;
    const world = s.world;
    if (!world || !BIOMES[b] || world.biome[i] === b) return;
    world.biome[i] = b;
    world.land[i] = BIOMES[b].water ? 0 : 1;
    if (BIOMES[b].water) world.river[i] = 0;
    set((st) => ({
      paint: { ...st.paint, [i]: b },
      paintV: st.paintV + 1,
    }));
  },

  beginBrush: (i) => {
    const s = get();
    if (s.mode !== "forge" || !s.tool.startsWith("t:")) return;
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
      get().brushHex(i);
      return;
    }
    if (tool) {
      const rng = mulberry(hashStr(world.seedName + i + tool));
      const isSite = tool === "ruin" || tool === "dungeon" || tool === "camp";
      const type = tool as ObjectType;
      const obj: MapObject = {
        id: "m" + Date.now().toString(36),
        gen: false,
        type,
        name: isSite
          ? siteName(rng)
          : tool === "keep"
            ? placeName(rng) + " Keep"
            : placeName(rng),
        hex: i,
        pop:
          tool === "city"
            ? 12000
            : tool === "town"
              ? 2200
              : tool === "village"
                ? 320
                : tool === "keep"
                  ? 120
                  : 0,
        notes: "",
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
        set((st) => ({
          objects: st.objects.map((o) =>
            o.id === drag.id ? { ...o, hex: i } : o
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
    if (get().mode === "forge")
      set({ drag: { kind: "obj", id }, selected: { kind: "object", id }, tool: "" });
  },

  waypointDown: (n) => set({ drag: { kind: "wp", n } }),

  endDrag: () => {
    if (get().drag) {
      // moving an object can change road connectivity; refresh on release.
      const wasObj = get().drag?.kind === "obj";
      set({ drag: null });
      if (wasObj) get().refreshRoads();
    }
  },

  refreshRoads: () => {
    const s = get();
    if (!s.world) return;
    s.world.roads = computeRoads(s.world, s.objects);
    set((st) => ({ paintV: st.paintV + 1 }));
  },

  hydrate: (patch) => set(patch),
}));
