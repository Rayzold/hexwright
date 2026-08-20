import { describe, expect, it } from "vitest";
import { parseShareParams } from "./shareUrl";

describe("parseShareParams", () => {
  it("returns null when there are no world params", () => {
    expect(parseShareParams("")).toBeNull();
    expect(parseShareParams("?foo=bar")).toBeNull();
  });

  it("parses seed, enums, and numbers", () => {
    const p = parseShareParams(
      "?seed=Kelbarrow&size=medium&edge=open&hexMiles=8&sea=40&climate=60"
    );
    expect(p).toMatchObject({
      seed: "Kelbarrow",
      size: "medium",
      edge: "open",
      hexMiles: 8,
      sea: 40,
      climate: 60,
    });
  });

  it("ignores invalid enum values", () => {
    const p = parseShareParams("?seed=X&size=huge&edge=lava");
    expect(p?.size).toBeUndefined();
    expect(p?.edge).toBeUndefined();
    expect(p?.seed).toBe("X");
  });
});
