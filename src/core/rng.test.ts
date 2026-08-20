import { describe, expect, it } from "vitest";
import { fbm, hashStr, mulberry, vnoise } from "./rng";

describe("hashStr", () => {
  it("is deterministic", () => {
    expect(hashStr("Aurelmoor")).toBe(hashStr("Aurelmoor"));
  });
  it("returns an unsigned 32-bit integer", () => {
    const h = hashStr("some seed");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });
  it("differs for different inputs", () => {
    expect(hashStr("a")).not.toBe(hashStr("b"));
  });
});

describe("mulberry", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry(1234);
    const b = mulberry(1234);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it("stays within [0, 1)", () => {
    const r = mulberry(99);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("noise", () => {
  it("vnoise stays within [0, 1]", () => {
    for (let i = 0; i < 200; i++) {
      const v = vnoise(i * 0.3, i * 0.7, 42);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it("fbm stays within [0, 1] and is deterministic", () => {
    const v1 = fbm(1.5, 2.5, 7, 6, 0.52);
    const v2 = fbm(1.5, 2.5, 7, 6, 0.52);
    expect(v1).toBe(v2);
    expect(v1).toBeGreaterThanOrEqual(0);
    expect(v1).toBeLessThanOrEqual(1);
  });
});
