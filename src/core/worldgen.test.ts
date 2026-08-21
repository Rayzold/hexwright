import { describe, expect, it } from "vitest";
import type { Params } from "./types";
import { BIOMES } from "./biomes";
import { buildWorld, recomputeRealms } from "./worldgen";

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

describe("buildWorld", () => {
  it("is deterministic for a given seed", () => {
    const a = buildWorld(PARAMS);
    const b = buildWorld(PARAMS);
    expect(a.world.biome.join(",")).toBe(b.world.biome.join(","));
    expect(a.objects.map((o) => o.name + o.hex)).toEqual(
      b.objects.map((o) => o.name + o.hex)
    );
    expect(Array.from(a.world.land)).toEqual(Array.from(b.world.land));
  });

  it("supports the huge extent", () => {
    const { world } = buildWorld({ ...PARAMS, size: "huge" });
    expect(world.n).toBe(100 * 72);
  });

  it("produces a plausible world", () => {
    const { world, objects } = buildWorld(PARAMS);
    expect(world.n).toBe(30 * 22);
    let land = 0;
    for (let i = 0; i < world.n; i++) land += world.land[i];
    expect(land).toBeGreaterThan(0);
    expect(land).toBeLessThan(world.n);
    expect(objects.length).toBeGreaterThan(0);
    expect(world.realms.length).toBeGreaterThanOrEqual(2);
  });

  it("sea-girt edge keeps the border under water", () => {
    const { world } = buildWorld(PARAMS);
    const { w, h } = world;
    // every corner hex should be water in a sea-girt map
    for (const i of [0, w - 1, (h - 1) * w, h * w - 1]) {
      expect(world.land[i]).toBe(0);
    }
  });

  it("reapplies painted terrain and hand-placed objects on reforge", () => {
    const first = buildWorld(PARAMS);
    // paint hex 0 as mountains, add a hand-placed object
    const paint = { 0: "mountains" as const };
    const manual = [
      {
        id: "m1",
        gen: false,
        type: "keep" as const,
        name: "Test Keep",
        hex: 5,
        pop: 100,
        notes: "",
      },
    ];
    const second = buildWorld(PARAMS, {
      paint,
      realmNames: {},
      objects: [...first.objects, ...manual],
    });
    expect(second.world.biome[0]).toBe("mountains");
    expect(second.objects.some((o) => o.id === "m1")).toBe(true);
    // generated objects are not duplicated by the reforge
    expect(second.objects.filter((o) => o.id === "m1")).toHaveLength(1);
  });

  it("an edited generated holding replaces (not duplicates) its reforged self", () => {
    const first = buildWorld(PARAMS);
    const gen = first.objects.find((o) => o.gen)!;
    // promote it to hand-placed with a new name, as the store does on edit
    const promoted = { ...gen, gen: false, name: "Edited Holding" };
    const kept = first.objects.map((o) => (o.id === gen.id ? promoted : o));
    const second = buildWorld(PARAMS, {
      paint: {},
      realmNames: {},
      objects: kept,
    });
    const matches = second.objects.filter((o) => o.id === gen.id);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe("Edited Holding");
    // no duplicate ids anywhere
    const ids = second.objects.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recomputeRealms reproduces the generated territory", () => {
    const { world } = buildWorld(PARAMS);
    const before = Array.from(world.owner);
    recomputeRealms(world);
    expect(Array.from(world.owner)).toEqual(before);
  });

  it("recomputeRealms reacts to terrain becoming impassable", () => {
    const { world } = buildWorld(PARAMS);
    let ownedBefore = 0;
    for (let i = 0; i < world.n; i++) if (world.owner[i] >= 0) ownedBefore++;
    // flood the whole map with deep water (no land -> no territory)
    for (let i = 0; i < world.n; i++) {
      world.biome[i] = "deep";
      world.land[i] = BIOMES.deep.water ? 0 : 1;
    }
    recomputeRealms(world);
    let ownedAfter = 0;
    for (let i = 0; i < world.n; i++) if (world.owner[i] >= 0) ownedAfter++;
    expect(ownedBefore).toBeGreaterThan(0);
    expect(ownedAfter).toBe(0);
  });
});
