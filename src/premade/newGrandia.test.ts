import { describe, expect, it } from "vitest";
import { deserialize } from "../store/persist";
import { buildNewGrandiaSave } from "./newGrandia";

describe("New Grandia premade", () => {
  const save = buildNewGrandiaSave();

  it("paints every hex of the 70x50 map", () => {
    expect(Object.keys(save.paint)).toHaveLength(100 * 72);
    // the Scar band exists down column 3
    const has = (biome: string) => Object.values(save.paint).includes(biome as never);
    expect(has("scar")).toBe(true);
    expect(has("swamp")).toBe(true); // the Bog
    expect(has("snow")).toBe(true); // frozen north
  });

  it("places the named locations within the map", () => {
    const names = save.objects.map((o) => o.name);
    for (const n of ["Thundermount", "New Grandia", "Wyldermoore", "Memento", "Fur Wehn"]) {
      expect(names).toContain(n);
    }
    for (const o of save.objects) {
      expect(o.hex).toBeGreaterThanOrEqual(0);
      expect(o.hex).toBeLessThan(100 * 72);
    }
    // ids are unique
    const ids = save.objects.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships hand-painted realm borders", () => {
    expect(save.realms).toBeTruthy();
    expect(save.realms!.length).toBe(6);
    expect(Object.keys(save.realmPaint || {}).length).toBeGreaterThan(1000);
  });

  it("deserializes into a world carrying the painted terrain and realms", () => {
    const patch = deserialize(save);
    expect(patch.world).toBeTruthy();
    // every painted hex should survive into the world's biome array
    for (const key of [0, 1785, 1798, 3185, 100 * 72 - 1]) {
      expect(patch.world!.biome[key]).toBe(save.paint[key]);
    }
    expect(patch.objects?.some((o) => o.name === "New Grandia")).toBe(true);
    // realm ownership is applied and counted
    let owned = 0;
    for (let i = 0; i < patch.world!.n; i++) if (patch.world!.owner[i] >= 0) owned++;
    expect(owned).toBeGreaterThan(1000);
    expect(patch.world!.realms.some((r) => r.name === "The Free City of New Grandia")).toBe(true);
  });
});
