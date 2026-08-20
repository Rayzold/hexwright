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

export const MONTHS = [
  "Hammer", "Alturiak", "Ches", "Tarsakh", "Mirtul", "Kythorn",
  "Flamerule", "Eleasis", "Eleint", "Marpenoth", "Uktar", "Nightal",
];

export const PACE: Record<SpeedKey, number> = { foot: 24, mounted: 36, ship: 48 };
export const SEASON_MOD: Record<SeasonKey, number> = {
  spring: 1,
  summer: 1.05,
  autumn: 0.95,
  winter: 0.78,
};
export const WEATHER_MOD: Record<WeatherKey, number> = {
  clear: 1,
  rain: 0.85,
  storm: 0.6,
  snow: 0.55,
  fog: 0.8,
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
  speed: SpeedKey
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
    wildSum += BIOMES[b].wild;
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

/** Format an absolute day as an in-world date, e.g. "14 Flamerule, 1492 DR". */
export function dateStr(day: number): string {
  const d = ((day % 360) + 360) % 360;
  const m = Math.floor(d / 30);
  const dd = (d % 30) + 1;
  const yr = 1492 + Math.floor(day / 360);
  return dd + " " + MONTHS[m] + ", " + yr + " DR";
}
