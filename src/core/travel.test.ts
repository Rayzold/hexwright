import { describe, expect, it } from "vitest";
import { nbrs } from "./hex";
import {
  WEATHER_WEIGHTS,
  cellCost,
  dateStr,
  line,
  pace,
  path,
  rollWeather,
  route,
  seasonOfDay,
  weekdayStr,
} from "./travel";
import type { Params, Party } from "./types";
import { buildWorld } from "./worldgen";

const PARAMS: Params = {
  seed: "Aurelmoor",
  size: "small",
  hexMiles: 6,
  sea: 42,
  climate: 52,
  wet: 50,
  mountains: 55,
  rivers: 50,
  settlements: 46,
  pois: 40,
  menace: 30,
  nameStyle: "scarred",
  edge: "sea",
};

const PARTY: Party = { speed: "foot", march: false, season: "embers", weather: "clear" };

/** find a land hex that has a land neighbour, return [i, j]. */
function adjacentLandPair(world: ReturnType<typeof buildWorld>["world"]): [number, number] {
  const { w, h } = world;
  for (let i = 0; i < world.n; i++) {
    if (!world.land[i]) continue;
    const c = i % w;
    const r = (i - c) / w;
    for (const [nc, nr] of nbrs(c, r)) {
      if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
      const j = nr * w + nc;
      if (world.land[j]) return [i, j];
    }
  }
  throw new Error("no adjacent land pair");
}

describe("calendar", () => {
  it("formats the campaign start day", () => {
    // campaign day 1 = 17 Firethorn, 1218 AC (absolute day 156)
    expect(dateStr(156)).toBe("17 Firethorn, 1218 AC");
    expect(weekdayStr(156)).toBe("Glimmerday");
    expect(seasonOfDay(156)).toBe("embers");
  });
  it("rolls over years after 336 days", () => {
    expect(dateStr(336)).toBe("1 Iceheart, 1219 AC");
  });
});

describe("pace", () => {
  it("multiplies base pace by season, weather, and forced march", () => {
    expect(pace(PARTY)).toBeCloseTo(24 * 1.05, 5); // embers
    expect(pace({ ...PARTY, march: true })).toBeCloseTo(24 * 1.05 * 1.25, 5);
    expect(pace({ ...PARTY, speed: "ship", season: "twilight", weather: "storm" })).toBeCloseTo(
      48 * 0.78 * 0.6,
      5
    );
  });
});

describe("airship travel", () => {
  const { world } = buildWorld(PARAMS);
  it("flies over every cell at a flat cost", () => {
    for (let i = 0; i < world.n; i++) {
      expect(cellCost(world, i, "air")).toBe(1);
    }
  });
  it("is the fastest pace", () => {
    expect(pace({ ...PARTY, speed: "air" })).toBeCloseTo(72 * 1.05, 5);
  });
});

describe("weather", () => {
  it("rolls only weather within the season's table", () => {
    const rng = (() => {
      let s = 1;
      return () => (s = (s * 9301 + 49297) % 233280) / 233280;
    })();
    const allowed = new Set(Object.keys(WEATHER_WEIGHTS.mists));
    for (let i = 0; i < 50; i++) {
      expect(allowed.has(rollWeather("mists", rng))).toBe(true);
    }
  });
});

describe("routing", () => {
  const { world } = buildWorld(PARAMS);

  it("line() returns a contiguous cube-line", () => {
    const [a, b] = adjacentLandPair(world);
    const seg = line(world, a, b);
    expect(seg).not.toBeNull();
    expect(seg![0]).toBe(a);
    expect(seg![seg!.length - 1]).toBe(b);
  });

  it("path() returns [a] for a self route and honours endpoints", () => {
    const [a, b] = adjacentLandPair(world);
    expect(path(world, a, a, "foot")).toEqual([a]);
    const p = path(world, a, b, "foot");
    if (p) {
      expect(p[0]).toBe(a);
      expect(p[p.length - 1]).toBe(b);
    }
  });

  it("route() computes pathMiles from cell count", () => {
    const [a, b] = adjacentLandPair(world);
    const r = route(world, [a, b], "manual", "foot");
    expect(r).not.toBeNull();
    expect(r!.cells).not.toBeNull();
    expect(r!.pathMiles).toBe((r!.cells!.length - 1) * world.hexMiles);
    expect(r!.wild).toBeGreaterThanOrEqual(0);
  });

  it("route() returns null for fewer than two waypoints", () => {
    expect(route(world, [5], "manual", "foot")).toBeNull();
  });
});
