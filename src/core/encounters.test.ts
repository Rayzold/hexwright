import { describe, expect, it } from "vitest";
import { ENCOUNTERS, rollEncounter } from "./encounters";

describe("encounters", () => {
  it("has a table for every biome", () => {
    for (const key of Object.keys(ENCOUNTERS)) {
      expect(ENCOUNTERS[key as keyof typeof ENCOUNTERS].length).toBeGreaterThan(0);
    }
  });

  it("rolls a result from the biome's own table", () => {
    const scar = new Set(ENCOUNTERS.scar);
    for (let i = 0; i < 30; i++) {
      expect(scar.has(rollEncounter("scar", Math.random))).toBe(true);
    }
  });
});
