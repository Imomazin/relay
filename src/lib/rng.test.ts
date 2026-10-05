import { describe, it, expect } from "vitest";
import { createRng, rngInt, rngPick, rngWeighted, rngChance } from "./rng";

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it("returns values in [0, 1)", () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("rng helpers", () => {
  it("rngInt stays within inclusive bounds", () => {
    const r = createRng(99);
    for (let i = 0; i < 500; i++) {
      const v = rngInt(r, 3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("rngPick returns an element of the array", () => {
    const r = createRng(5);
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 50; i++) expect(items).toContain(rngPick(r, items));
  });

  it("rngWeighted respects weights (heavy option dominates)", () => {
    const r = createRng(11);
    let heavy = 0;
    for (let i = 0; i < 1000; i++) {
      if (rngWeighted(r, [["heavy", 9], ["light", 1]]) === "heavy") heavy++;
    }
    expect(heavy).toBeGreaterThan(700);
  });

  it("rngChance(0) is never true and rngChance(1) is always true", () => {
    const r = createRng(3);
    for (let i = 0; i < 50; i++) {
      expect(rngChance(r, 0)).toBe(false);
      expect(rngChance(r, 1)).toBe(true);
    }
  });
});
