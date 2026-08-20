import { describe, expect, it } from "vitest";
import { nbrs } from "./hex";
import { dateStr, line, pace, path, route } from "./travel";
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
  edge: "sea",
};

const PARTY: Party = { speed: "foot", march: false, season: "summer", weather: "clear" };

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
    expect(dateStr(63)).toBe("4 Ches, 1492 DR");
  });
  it("rolls over years", () => {
    expect(dateStr(360)).toBe("1 Hammer, 1493 DR");
  });
});

describe("pace", () => {
  it("multiplies base pace by season, weather, and forced march", () => {
    expect(pace(PARTY)).toBeCloseTo(24 * 1.05, 5);
    expect(pace({ ...PARTY, march: true })).toBeCloseTo(24 * 1.05 * 1.25, 5);
    expect(pace({ ...PARTY, speed: "ship", season: "winter", weather: "storm" })).toBeCloseTo(
      48 * 0.78 * 0.6,
      5
    );
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
