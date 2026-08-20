import { describe, expect, it } from "vitest";
import type { Params } from "./types";
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
});
