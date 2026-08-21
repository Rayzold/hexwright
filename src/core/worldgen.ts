// World generation — noise terrain, biomes, rivers, settlements, realms, sites,
// roads. Ported closely from the prototype's build() method.

import { BIOMES } from "./biomes";
import { Heap } from "./heap";
import { S, SQ3, nbrs } from "./hex";
import { placeName, realmName, siteName } from "./names";
import { fbm, hashStr, mulberry } from "./rng";
import { path } from "./travel";
import type {
  BiomeKey,
  MapObject,
  Params,
  Realm,
  Road,
  SizeKey,
  World,
} from "./types";

export const SIZES: Record<SizeKey, [number, number]> = {
  small: [30, 22],
  medium: [46, 32],
  large: [70, 50],
  huge: [100, 72],
};

export interface KeepEdits {
  paint: Record<number, BiomeKey>;
  realmNames: Record<number, string>;
  objects: MapObject[];
}

export interface BuildResult {
  world: World;
  objects: MapObject[];
}

/**
 * Generate a world from params. When `keep` is provided, painted terrain,
 * hand-placed objects, and renamed realms are preserved (a reforge).
 */
export function buildWorld(params: Params, keep?: KeepEdits): BuildResult {
  const p = params;
  const [w, h] = SIZES[p.size];
  const seed = hashStr(p.seed) >>> 0;
  const rng = mulberry(seed);
  const n = w * h;
  const el = new Float32Array(n);
  const mo = new Float32Array(n);
  const tp = new Float32Array(n);
  const sea = p.sea / 100;
  const climate = p.climate / 100;
  const wet = p.wet / 100;
  const mtn = p.mountains / 100;
  const fx = 5.5 / w;
  const fy = 5.5 / w;

  // --- elevation, moisture, temperature ---
  for (let i = 0; i < n; i++) {
    const c = i % w;
    const r = (i - c) / w;
    const nx = (c + 0.5 * (r & 1)) * fx;
    const ny = r * 0.87 * fy;
    let e = fbm(nx, ny, seed, 6, 0.52);
    const dx = (c / (w - 1) - 0.5) * 2;
    const dy = (r / (h - 1) - 0.5) * 2.05;
    const d = Math.sqrt(dx * dx * 0.95 + dy * dy);
    e =
      p.edge === "open"
        ? e * 1.14 - 0.06
        : e * 1.12 - Math.pow(Math.max(0, d), 2.5) * 0.62;
    e += (fbm(nx * 2.6 + 40, ny * 2.6 + 40, seed + 11, 3, 0.5) - 0.5) * 0.16;
    el[i] = Math.max(0, Math.min(1, e));
    mo[i] = Math.min(
      1,
      Math.max(
        0,
        fbm(nx * 1.5 + 90, ny * 1.5 + 90, seed + 3301, 4, 0.55) * 0.85 +
          (wet - 0.5) * 0.7 +
          0.12
      )
    );
    const lat = Math.abs(r / (h - 1) - 0.5) * 2;
    tp[i] = Math.max(
      0,
      Math.min(1, (1 - Math.pow(lat, 1.35)) * 0.95 + (climate - 0.5) * 0.55)
    );
  }

  // --- land/water + biomes ---
  const biome: BiomeKey[] = new Array(n);
  const land = new Uint8Array(n);
  for (let i = 0; i < n; i++) land[i] = el[i] >= sea ? 1 : 0;
  const mtnT = 0.86 - mtn * 0.34;
  const hillT = 0.6 - mtn * 0.2;

  for (let i = 0; i < n; i++) {
    if (!land[i]) {
      const dep = (sea - el[i]) / Math.max(0.001, sea);
      biome[i] = dep > 0.55 ? "deep" : dep > 0.2 ? "ocean" : "shallow";
      continue;
    }
    const hh = (el[i] - sea) / Math.max(0.001, 1 - sea);
    const t = tp[i] - hh * 0.35;
    const m = mo[i];
    if (hh > mtnT) biome[i] = t < 0.3 ? "snow" : "mountains";
    else if (hh > hillT) biome[i] = t < 0.16 ? "snow" : "hills";
    else if (t < 0.2) biome[i] = m > 0.5 ? "taiga" : "tundra";
    else if (t < 0.46)
      biome[i] = m > 0.62 ? "taiga" : m > 0.3 ? "forest" : "grass";
    else if (t < 0.74)
      biome[i] =
        hh < 0.16 && m > 0.74
          ? "swamp"
          : m > 0.52
            ? "forest"
            : m > 0.28
              ? "grass"
              : "savanna";
    else
      biome[i] =
        m > 0.68 ? "jungle" : m > 0.44 ? "savanna" : m > 0.24 ? "grass" : "desert";
  }

  // --- reapply painted terrain over the fresh biome array ---
  const painted = keep ? keep.paint : {};
  for (const k in painted) {
    const i = +k;
    if (i < 0 || i >= n) continue;
    biome[i] = painted[k];
    land[i] = BIOMES[painted[k]].water ? 0 : 1;
  }

  // --- strand ---
  for (let i = 0; i < n; i++) {
    if (
      !land[i] ||
      biome[i] === "mountains" ||
      biome[i] === "snow" ||
      biome[i] === "hills"
    )
      continue;
    const hh = (el[i] - sea) / Math.max(0.001, 1 - sea);
    if (hh > 0.1) continue;
    const c = i % w;
    const r = (i - c) / w;
    for (const [nc, nr] of nbrs(c, r)) {
      if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
      if (!land[nr * w + nc]) {
        biome[i] = "beach";
        break;
      }
    }
  }

  // --- rivers ---
  const flow = new Float32Array(n);
  const next = new Int32Array(n).fill(-1);
  const srcCount = Math.floor(14 + (p.rivers / 100) * 110);
  const highs: number[] = [];
  for (let i = 0; i < n; i++)
    if (land[i] && (el[i] - sea) / (1 - sea) > 0.42) highs.push(i);
  for (let k = 0; k < srcCount && highs.length; k++) {
    let cur = highs[Math.floor(rng() * highs.length)];
    for (let step = 0; step < 400; step++) {
      flow[cur] += 1;
      if (!land[cur]) break;
      const c = cur % w;
      const r = (cur - c) / w;
      let bi = -1;
      let be = el[cur];
      for (const [nc, nr] of nbrs(c, r)) {
        if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
        const j = nr * w + nc;
        if (el[j] < be) {
          be = el[j];
          bi = j;
        }
      }
      if (bi < 0) break;
      next[cur] = bi;
      cur = bi;
    }
  }
  const river = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (land[i] && flow[i] >= 3) river[i] = 1;

  // --- settlements ---
  const target = Math.floor(6 + (p.settlements / 100) * 46);
  const cand: [number, number, boolean][] = [];
  for (let i = 0; i < n; i++) {
    if (!land[i]) continue;
    const b = biome[i];
    if (b === "mountains" || b === "snow") continue;
    const c = i % w;
    const r = (i - c) / w;
    let coastal = false;
    for (const [nc, nr] of nbrs(c, r)) {
      if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
      if (!land[nr * w + nc]) {
        coastal = true;
        break;
      }
    }
    const hh = (el[i] - sea) / (1 - sea);
    let sc = 1 - Math.abs(hh - 0.2) * 1.4;
    if (coastal) sc += 1.5;
    if (river[i]) sc += 1.7;
    if (b === "grass" || b === "savanna" || b === "forest") sc += 0.6;
    if (b === "desert" || b === "swamp" || b === "jungle" || b === "tundra")
      sc -= 0.8;
    sc += rng() * 0.9;
    cand.push([sc, i, coastal]);
  }
  cand.sort((a, b) => b[0] - a[0]);
  let landTotal = 0;
  for (let i = 0; i < n; i++) if (land[i]) landTotal++;
  const chosen: number[] = [];
  const minGap = Math.max(2, Math.sqrt(landTotal / Math.max(4, target)) * 0.72);
  for (const [, i] of cand) {
    if (chosen.length >= target) break;
    const c = i % w;
    const r = (i - c) / w;
    let ok = true;
    for (const j of chosen) {
      const jc = j % w;
      const jr = (j - jc) / w;
      const ax = c + 0.5 * (r & 1);
      const ay = r * 0.87;
      const bx = jc + 0.5 * (jr & 1);
      const by = jr * 0.87;
      if (Math.hypot(ax - bx, ay - by) < minGap) {
        ok = false;
        break;
      }
    }
    if (ok) chosen.push(i);
  }

  const generated: MapObject[] = [];
  chosen.forEach((i, k) => {
    const t: MapObject["type"] =
      k < Math.max(1, Math.round(chosen.length * 0.14))
        ? "city"
        : k < Math.round(chosen.length * 0.45)
          ? "town"
          : "village";
    const pop =
      t === "city"
        ? 6000 + Math.floor(rng() * 34000)
        : t === "town"
          ? 900 + Math.floor(rng() * 4200)
          : 60 + Math.floor(rng() * 640);
    generated.push({
      id: "g" + k,
      gen: true,
      type: t,
      name: placeName(rng),
      hex: i,
      pop,
      notes: "",
    });
  });

  // --- realms ---
  const wantFactions = Math.max(2, Math.round(2 + (p.settlements / 100) * 5));
  const realmPalette = [
    "#a35a34", "#4b6d7a", "#6a6a3c", "#7a4a63", "#3f6b56", "#8a6a3a", "#5b5b8a",
  ];
  const realms: Realm[] = [];
  const owner = new Int16Array(n).fill(-1);
  const seats = generated
    .filter((o) => o.type === "city")
    .concat(generated.filter((o) => o.type === "town"));
  const spread: MapObject[] = [];
  for (const cand2 of seats) {
    if (spread.length >= wantFactions) break;
    const cc = cand2.hex % w;
    const cr = (cand2.hex - cc) / w;
    let ok = true;
    for (const other of spread) {
      const oc = other.hex % w;
      const or = (other.hex - oc) / w;
      if (
        Math.hypot(
          cc + 0.5 * (cr & 1) - (oc + 0.5 * (or & 1)),
          (cr - or) * 0.87
        ) <
        minGap * 2.2
      ) {
        ok = false;
        break;
      }
    }
    if (ok) spread.push(cand2);
  }
  for (const extra of seats) {
    if (spread.length >= Math.min(3, seats.length)) break;
    if (spread.indexOf(extra) < 0) spread.push(extra);
  }
  const cities = spread;
  for (let k = 0; k < cities.length; k++) {
    const cap0 = cities[k];
    realms.push({
      id: k,
      name: realmName(rng),
      color: realmPalette[k % realmPalette.length],
      seat: cap0.name,
      seatHex: cap0.hex,
      hexes: 0,
    });
  }
  floodRealms(w, h, land, biome, owner, realms);
  const keptNames = keep ? keep.realmNames : {};
  for (const k in keptNames) if (realms[+k]) realms[+k].name = keptNames[k];

  // --- wild sites ---
  const poiCount = Math.floor(3 + (p.pois / 100) * 30);
  const siteTypes: MapObject["type"][] = ["ruin", "dungeon", "camp", "keep"];
  for (let k = 0; k < poiCount; k++) {
    let tries = 0;
    let i = -1;
    while (tries++ < 200) {
      const t = Math.floor(rng() * n);
      if (!land[t]) continue;
      let near = false;
      const c = t % w;
      const r = (t - c) / w;
      for (const o of generated) {
        const oc = o.hex % w;
        const or = (o.hex - oc) / w;
        if (Math.abs(oc - c) + Math.abs(or - r) < 3) {
          near = true;
          break;
        }
      }
      if (near) continue;
      i = t;
      break;
    }
    if (i < 0) continue;
    const t = siteTypes[Math.floor(rng() * siteTypes.length)];
    generated.push({
      id: "s" + k,
      gen: true,
      type: t,
      name: t === "keep" ? placeName(rng) + " Keep" : siteName(rng),
      hex: i,
      pop: t === "keep" ? 40 + Math.floor(rng() * 300) : 0,
      notes: "",
    });
  }

  // --- concat hand-placed objects (survive reforging) ---
  // A generated holding that was edited is promoted to gen:false and kept here;
  // drop the freshly regenerated one with the same (deterministic) id so the
  // edited version replaces it rather than duplicating it.
  const manual = keep ? keep.objects.filter((o) => !o.gen && o.hex < n) : [];
  const manualIds = new Set(manual.map((o) => o.id));
  const objects = generated
    .filter((g) => !manualIds.has(g.id))
    .concat(manual);

  // --- roads (hoisted out of the paint pass; always on-foot pathing) ---
  const world: World = {
    w,
    h,
    n,
    el,
    mo,
    tp,
    biome,
    land,
    river,
    flow,
    next,
    owner,
    realms,
    roads: [],
    sea,
    edge: p.edge,
    seedName: p.seed,
    hexMiles: p.hexMiles,
    px: [S * SQ3 * (w + 0.5) + S, S * 1.5 * h + S * 0.5],
  };
  world.roads = computeRoads(world, objects);

  return { world, objects };
}

/**
 * Dijkstra flood-fill of realm territory from each realm's seat over terrain
 * cost + 0.2, capped at cost 46. Fills `owner` and each realm's `hexes` count.
 */
function floodRealms(
  w: number,
  h: number,
  land: Uint8Array,
  biome: BiomeKey[],
  owner: Int16Array,
  realms: Realm[]
): void {
  owner.fill(-1);
  const heap = new Heap();
  for (const realm of realms) {
    const seat = realm.seatHex;
    if (seat < 0 || seat >= w * h || !land[seat]) continue;
    owner[seat] = realm.id;
    heap.push([0, seat, realm.id]);
  }
  while (heap.size) {
    const [d, i, k] = heap.pop();
    if (owner[i] !== k && owner[i] !== -1) continue;
    const c = i % w;
    const r = (i - c) / w;
    for (const [nc, nr] of nbrs(c, r)) {
      if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
      const j = nr * w + nc;
      if (!land[j] || owner[j] !== -1) continue;
      const cost = (BIOMES[biome[j]].cost || 4) + 0.2;
      const nd = d + cost;
      if (nd > 46) continue;
      owner[j] = k;
      heap.push([nd, j, k]);
    }
  }
  for (const realm of realms) realm.hexes = 0;
  for (let i = 0; i < w * h; i++)
    if (owner[i] >= 0 && realms[owner[i]]) realms[owner[i]].hexes++;
}

/**
 * Recompute realm territory on the live world after terrain painting or after a
 * seat has moved. Mutates `world.owner` and each realm's `hexes` in place.
 */
export function recomputeRealms(world: World): void {
  floodRealms(world.w, world.h, world.land, world.biome, world.owner, world.realms);
}

/**
 * Connect each settlement to its two nearest neighbours within 18 hexes by
 * on-foot A*, skipping paths longer than 46 hexes and de-duplicating pairs.
 */
export function computeRoads(world: World, objects: MapObject[]): Road[] {
  const { w } = world;
  const settle = objects.filter(
    (o) =>
      o.type === "city" ||
      o.type === "town" ||
      o.type === "village" ||
      o.type === "keep"
  );
  const seen = new Set<string>();
  const roads: Road[] = [];
  for (const a of settle) {
    const near = settle
      .filter((b) => b !== a)
      .map((b): [number, MapObject] => {
        const ac = a.hex % w;
        const ar = (a.hex - ac) / w;
        const bc = b.hex % w;
        const br = (b.hex - bc) / w;
        return [
          Math.hypot(
            ac + 0.5 * (ar & 1) - (bc + 0.5 * (br & 1)),
            (ar - br) * 0.87
          ),
          b,
        ];
      })
      .sort((x, y) => x[0] - y[0])
      .slice(0, 2);
    for (const [d, b] of near) {
      if (d > 18) continue;
      const key = a.hex < b.hex ? a.hex + ":" + b.hex : b.hex + ":" + a.hex;
      if (seen.has(key)) continue;
      seen.add(key);
      const seg = path(world, a.hex, b.hex, "foot");
      if (!seg || seg.length > 46) continue;
      roads.push(seg);
    }
  }
  return roads;
}
