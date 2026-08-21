import { describe, expect, it } from "vitest";
import { REGION_PRESETS, regionById } from "./regions";

describe("region presets", () => {
  it("covers the 14 regions with unique ids and a seed each", () => {
    expect(REGION_PRESETS).toHaveLength(14);
    const ids = REGION_PRESETS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of REGION_PRESETS) {
      expect(r.params.seed).toBeTruthy();
    }
  });

  it("keeps slider params within their valid ranges", () => {
    for (const r of REGION_PRESETS) {
      const p = r.params;
      for (const k of ["climate", "wet", "mountains", "rivers", "settlements", "pois", "menace"] as const) {
        if (p[k] === undefined) continue;
        expect(p[k]).toBeGreaterThanOrEqual(0);
        expect(p[k]).toBeLessThanOrEqual(100);
      }
    }
  });

  it("looks up by id", () => {
    expect(regionById("scar")?.name).toBe("The Scar");
    expect(regionById("nope")).toBeUndefined();
  });
});
