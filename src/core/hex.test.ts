import { describe, expect, it } from "vitest";
import {
  CORNERS,
  S,
  center,
  fromCube,
  hexAt,
  hexPoints,
  nbrs,
  toCube,
} from "./hex";

describe("hex geometry", () => {
  it("has six corners", () => {
    expect(CORNERS).toHaveLength(6);
  });

  it("places hex 0 at (S, S)", () => {
    expect(center(0, 10)).toEqual([S, S]);
  });

  it("nbrs returns six neighbours regardless of parity", () => {
    expect(nbrs(3, 4)).toHaveLength(6); // even row
    expect(nbrs(3, 5)).toHaveLength(6); // odd row
  });

  it("hexPoints emits six 'x,y' pairs", () => {
    const pts = hexPoints(0, 10).split(" ");
    expect(pts).toHaveLength(6);
    for (const p of pts) expect(p).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
  });

  it("cube conversion round-trips offset coordinates", () => {
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 12; c++) {
        const [x, , z] = toCube(c, r);
        expect(fromCube(x, z)).toEqual([c, r]);
      }
    }
  });

  it("hexAt returns the hex whose center was sampled", () => {
    const w = 12;
    const h = 10;
    for (const i of [0, 5, 25, 37, 100, 119]) {
      const [x, y] = center(i, w);
      expect(hexAt(x, y, w, h)).toBe(i);
    }
  });

  it("hexAt returns null well outside the grid", () => {
    expect(hexAt(-500, -500, 12, 10)).toBeNull();
  });
});
