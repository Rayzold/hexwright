import { describe, expect, it } from "vitest";
import {
  OBJECT_TYPES,
  hostileThreatMap,
  isSettlement,
  normalizeObject,
} from "./objectTypes";
import type { MapObject } from "./types";

describe("object type registry", () => {
  it("classifies settlements and sites", () => {
    expect(isSettlement("city")).toBe(true);
    expect(isSettlement("fort")).toBe(true);
    expect(isSettlement("lair")).toBe(false);
    expect(OBJECT_TYPES.lair.category).toBe("site");
  });

  it("gives lairs a hostile default allegiance", () => {
    expect(OBJECT_TYPES.lair.defaultAllegiance).toBe("hostile");
    expect(OBJECT_TYPES.city.defaultAllegiance).toBe("friendly");
  });
});

describe("normalizeObject", () => {
  it("fills missing extended fields from the type default", () => {
    const o = normalizeObject({ id: "x", type: "lair", name: "Den", hex: 3 });
    expect(o.allegiance).toBe("hostile");
    expect(o.threat).toBe(0);
    expect(o.cleared).toBe(false);
    expect(o.pop).toBe(0);
  });

  it("falls back to a safe type for unknown input", () => {
    const o = normalizeObject({ id: "y", type: "gibberish" as never });
    expect(OBJECT_TYPES[o.type]).toBeTruthy();
  });
});

describe("hostileThreatMap", () => {
  const mk = (over: Partial<MapObject>): MapObject =>
    normalizeObject({ id: "o", type: "lair", hex: 1, ...over });

  it("sums threat of active hostile objects by hex", () => {
    const m = hostileThreatMap([
      mk({ hex: 5, allegiance: "hostile", threat: 3 }),
      mk({ hex: 5, allegiance: "hostile", threat: 2 }),
      mk({ hex: 6, allegiance: "friendly", threat: 4 }),
      mk({ hex: 7, allegiance: "hostile", threat: 5, cleared: true }),
    ]);
    expect(m.get(5)).toBe(5);
    expect(m.get(6)).toBeUndefined(); // friendly
    expect(m.get(7)).toBeUndefined(); // cleared
  });
});
