import { describe, expect, it } from "vitest";
import type { Params } from "../core/types";
import { buildWorld } from "../core/worldgen";
import { deserialize, serialize } from "./persist";
import type { HexState } from "./useStore";

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

/** Build a store-like state good enough for serialize()/deserialize(). */
function makeState(): HexState {
  const { world, objects } = buildWorld(PARAMS);
  return {
    params: PARAMS,
    paint: { 0: "mountains" },
    objects,
    realmNames: { 0: "Renamed Realm" },
    party: { speed: "mounted", march: true, season: "gloom", weather: "rain" },
    day: 128,
    journal: [{ when: "x", text: "y", note: "z", tone: "#5f8a72" }],
    revealed: new Set<number>([1, 2, 3]),
    layers: { grid: false, rivers: true, roads: false, borders: true, labels: false },
    theme: "dusk",
    world,
  } as unknown as HexState;
}

describe("persist round-trip", () => {
  it("serialize -> deserialize preserves the saved slice", () => {
    const state = makeState();
    const file = serialize(state);
    const restored = deserialize(file);

    expect(restored.day).toBe(128);
    expect(restored.theme).toBe("dusk");
    expect(restored.party).toEqual(state.party);
    expect(restored.realmNames).toEqual({ 0: "Renamed Realm" });
    expect(restored.layers).toEqual(state.layers);
    expect(restored.journal).toHaveLength(1);
    expect(restored.objects).toHaveLength(state.objects.length);
    expect(restored.revealed).toBeInstanceOf(Set);
    expect(Array.from(restored.revealed as Set<number>).sort()).toEqual([1, 2, 3]);
    // world is regenerated from params and reflects the painted hex
    expect(restored.world?.biome[0]).toBe("mountains");
  });

  it("serialize stores revealed as an array", () => {
    const file = serialize(makeState());
    expect(Array.isArray(file.revealed)).toBe(true);
    expect(file.version).toBe(1);
  });

  it("maps a legacy Gregorian season onto the Scarred Lands calendar", () => {
    const state = makeState();
    const file = serialize(state);
    // simulate an older save with pre-calendar season/weather
    (file.party as unknown as { season: string }).season = "winter";
    const restored = deserialize(file);
    expect(restored.party?.season).toBe("twilight");
  });
});
