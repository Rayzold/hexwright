// Routing & travel math — pathfinding, straight hex lines, route stats, calendar.
// Ported from the prototype's routing methods.

import { BIOMES } from "./biomes";
import { Heap } from "./heap";
import {
  S,
  SQ3,
  center,
  cubeRound,
  fromCube,
  nbrs,
  toCube,
} from "./hex";
import type {
  BiomeKey,
  Party,
  RouteMode,
  SeasonKey,
  SpeedKey,
  WeatherKey,
  World,
} from "./types";

// --- Scarred Lands calendar (from Crystal Forge content/CalendarConfig.js) ---
// A 336-day year: 12 months of 28 days, a 7-day week, years suffixed "AC".
export const MONTHS = [
  "Iceheart", "Frostbloom", "Stormwatch", "Cloudbreak", "Winddance", "Firethorn",
  "Sunspark", "Starfall", "Emberfall", "Leafwilt", "Moonwhisper", "Snowshimmer",
];
export const WEEKDAYS = [
  "Moonday", "Tidesday", "Glimmerday", "Dreamday",
  "Soothingday", "Dazzleday", "Sunburstday",
];
export const DAYS_PER_MONTH = 28;
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS.length; // 336
export const YEAR_EPOCH = 1218; // absolute day 0 = 1 Iceheart, 1218 AC
/** Campaign day 1 = 17 Firethorn, 1218 AC (the sim's START_DATE). */
export const CAMPAIGN_START_DAY = 5 * DAYS_PER_MONTH + 16; // 156

/** Which of the four weather-named seasons a month index falls in. */
export function seasonOfMonth(monthIndex: number): SeasonKey {
  const m = ((monthIndex % 12) + 12) % 12;
  if (m === 0 || m === 1 || m === 11) return "twilight"; // Iceheart/Frostbloom/Snowshimmer
  if (m >= 2 && m <= 4) return "mists"; // Stormwatch/Cloudbreak/Winddance
  if (m >= 5 && m <= 7) return "embers"; // Firethorn/Sunspark/Starfall
  return "gloom"; // Emberfall/Leafwilt/Moonwhisper
}

export const SEASON_LABEL: Record<SeasonKey, string> = {
  twilight: "Season of the Twilight",
  mists: "Season of the Mists",
  embers: "Season of the Embers",
  gloom: "Season of the Gloom",
};

/** Notable holidays, keyed by day-of-year (see CalendarConfig HOLIDAYS). */
export interface Holiday {
  doy: number;
  name: string;
}
export const HOLIDAYS: Holiday[] = [
  [0, 1, "New Dawning"], [1, 14, "Love's Embrace"], [2, 12, "Mists' Equinox"],
  [3, 1, "The Renewal"], [3, 9, "The Ascension"], [4, 1, "Zephyr's Calling"],
  [5, 12, "Burning Solstice"], [6, 28, "Night of the Red Nanites"],
  [7, 15, "Doublemoon Alignment"], [8, 13, "Gloom Equinox"],
  [8, 20, "Harvest Moon Festival"], [9, 4, "The Great Scarring"],
  [9, 28, "Day of the Dead"], [10, 7, "Datasphere's Reach"],
  [11, 13, "End's Solstice"], [11, 28, "New Year's Eve"],
].map(([mi, d, name]) => ({
  doy: (mi as number) * DAYS_PER_MONTH + ((d as number) - 1),
  name: name as string,
}));

export const PACE: Record<SpeedKey, number> = { foot: 24, mounted: 36, ship: 48 };
// The season names are weather-coded, so the modifiers lean into that:
// Embers (fierce light) travels best; the Twilight cold is the harshest.
export const SEASON_MOD: Record<SeasonKey, number> = {
  twilight: 0.78,
  mists: 0.9,
  embers: 1.05,
  gloom: 0.92,
};
export const WEATHER_MOD: Record<WeatherKey, number> = {
  clear: 1,
  rain: 0.85,
  fog: 0.8,
  ashfall: 0.7,
  snow: 0.55,
  storm: 0.6,
  crystalstorm: 0.5,
};

/**
 * Movement cost of a cell for a given travel speed.
 * By ship: water costs 1, land is impassable. On foot/mounted: land cost +
 * river surcharge, water impassable. null means impassable.
 */
export function cellCost(
  world: World,
  i: number,
  speed: SpeedKey
): number | null {
  const b = BIOMES[world.biome[i]];
  const ship = speed === "ship";
  if (b.water) return ship ? 1 : null;
  if (ship) return null;
  let c = b.cost as number;
  if (world.river[i]) c += 0.4;
  return c;
}

/** A* over terrain cost with a Euclidean heuristic normalized by hex width. */
export function path(
  world: World,
  a: number,
  b: number,
  speed: SpeedKey
): number[] | null {
  if (a === b) return [a];
  const { w, h, n } = world;
  const dist = new Float32Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap = new Heap();
  dist[a] = 0;
  heap.push([0, a]);
  const [bx, by] = center(b, w);
  while (heap.size) {
    const [, i] = heap.pop();
    if (i === b) break;
    const c = i % w;
    const r = (i - c) / w;
    for (const [nc, nr] of nbrs(c, r)) {
      if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
      const j = nr * w + nc;
      const cost = cellCost(world, j, speed);
      if (cost === null) continue;
      const nd = dist[i] + cost;
      if (nd < dist[j]) {
        dist[j] = nd;
        prev[j] = i;
        const [jx, jy] = center(j, w);
        heap.push([nd + Math.hypot(jx - bx, jy - by) / (S * SQ3), j]);
      }
    }
  }
  if (dist[b] === Infinity) return null;
  const out: number[] = [];
  let cur = b;
  while (cur !== -1) {
    out.push(cur);
    cur = prev[cur];
  }
  return out.reverse();
}

/** Straight hex line between two hexes via cube coordinates. */
export function line(world: World, a: number, b: number): number[] | null {
  const w = world.w;
  const ac = a % w;
  const ar = (a - ac) / w;
  const bc = b % w;
  const br = (b - bc) / w;
  const A = toCube(ac, ar);
  const B = toCube(bc, br);
  const steps = Math.max(
    Math.abs(A[0] - B[0]),
    Math.abs(A[1] - B[1]),
    Math.abs(A[2] - B[2])
  );
  const out: number[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = steps === 0 ? 0 : k / steps;
    const [rx, , rz] = cubeRound(
      A[0] + (B[0] - A[0]) * t,
      A[1] + (B[1] - A[1]) * t,
      A[2] + (B[2] - A[2]) * t
    );
    const [c, r] = fromCube(rx, rz);
    if (c < 0 || r < 0 || c >= world.w || r >= world.h) continue;
    const i = r * world.w + c;
    if (out[out.length - 1] !== i) out.push(i);
  }
  return out.length ? out : null;
}

export interface RouteResult {
  cells: number[] | null;
  blocked?: boolean;
  cost?: number;
  pathMiles?: number;
  crow?: number;
  counts?: Partial<Record<BiomeKey, number>>;
  wild?: number;
}

/**
 * Join waypoints into a route. `auto` uses A* over terrain cost; `manual` uses
 * straight cube lines (impassable cells traversed at fallback cost 4).
 */
export function route(
  world: World,
  waypoints: number[],
  routeMode: RouteMode,
  speed: SpeedKey,
  threatMap?: Map<number, number>
): RouteResult | null {
  if (!world || waypoints.length < 2) return null;
  const cells: number[] = [];
  for (let k = 0; k < waypoints.length - 1; k++) {
    const seg =
      routeMode === "auto"
        ? path(world, waypoints[k], waypoints[k + 1], speed)
        : line(world, waypoints[k], waypoints[k + 1]);
    if (!seg) return { cells: null, blocked: true };
    for (let j = k === 0 ? 0 : 1; j < seg.length; j++) cells.push(seg[j]);
  }
  let cost = 0;
  let wildSum = 0;
  const counts: Partial<Record<BiomeKey, number>> = {};
  for (let k = 1; k < cells.length; k++) {
    const i = cells[k];
    const b = world.biome[i];
    const cc = cellCost(world, i, speed);
    cost += (cc === null ? 4 : cc) * world.hexMiles;
    // hostile lairs along the way raise the odds of trouble
    const threat = threatMap ? threatMap.get(i) || 0 : 0;
    wildSum += Math.min(1, BIOMES[b].wild + threat * 0.05);
    counts[b] = (counts[b] || 0) + 1;
  }
  const pm = (cells.length - 1) * world.hexMiles;
  const [ax, ay] = center(cells[0], world.w);
  const [bx2, by2] = center(cells[cells.length - 1], world.w);
  const crow = (Math.hypot(bx2 - ax, by2 - ay) / (S * SQ3)) * world.hexMiles;
  return {
    cells,
    cost,
    pathMiles: pm,
    crow,
    counts,
    wild: cells.length > 1 ? wildSum / (cells.length - 1) : 0,
  };
}

/** Effective travel pace in miles/day given party settings. */
export function pace(party: Party): number {
  return (
    PACE[party.speed] *
    SEASON_MOD[party.season] *
    WEATHER_MOD[party.weather] *
    (party.march ? 1.25 : 1)
  );
}

/** Format an absolute day as an in-world date, e.g. "17 Firethorn, 1218 AC". */
export function dateStr(day: number): string {
  const d = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  const m = Math.floor(d / DAYS_PER_MONTH);
  const dd = (d % DAYS_PER_MONTH) + 1;
  const yr = YEAR_EPOCH + Math.floor(day / DAYS_PER_YEAR);
  return dd + " " + MONTHS[m] + ", " + yr + " AC";
}

/** Weekday name for an absolute day. */
export function weekdayStr(day: number): string {
  return WEEKDAYS[((day % 7) + 7) % 7];
}

/** The season a given absolute day falls in. */
export function seasonOfDay(day: number): SeasonKey {
  const d = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  return seasonOfMonth(Math.floor(d / DAYS_PER_MONTH));
}

/** The holiday on this day, if any. */
export function holidayOn(day: number): string | null {
  const doy = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  return HOLIDAYS.find((h) => h.doy === doy)?.name ?? null;
}

/** The next holiday from this day and how many days away it is. */
export function nextHoliday(day: number): { name: string; inDays: number } {
  const doy = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  let best: Holiday | null = null;
  let bestGap = Infinity;
  for (const h of HOLIDAYS) {
    const gap = (h.doy - doy + DAYS_PER_YEAR) % DAYS_PER_YEAR;
    if (gap > 0 && gap < bestGap) {
      bestGap = gap;
      best = h;
    }
  }
  best = best ?? HOLIDAYS[0];
  return { name: best.name, inDays: bestGap === Infinity ? 0 : bestGap };
}
