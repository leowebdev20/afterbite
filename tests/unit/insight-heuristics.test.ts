import { describe, expect, it } from "vitest";

// These are light sanity checks on the heuristic math used by insight router.
// We replicate minimal logic to assert expected behavior without DB dependence.

describe("insight heuristics", () => {
  it("suspicion increases when score is above baseline and samples are low", () => {
    const baseline = 4;
    const score = 7;
    const sampleSize = 2;
    const freq = 2;

    const suspicion =
      Math.max(0, score - baseline) * 20 + Math.max(0, 6 - sampleSize) * 6 + Math.min(20, freq * 4);

    expect(suspicion).toBeGreaterThan(60);
  });

  it("suspicion stays low when score is near baseline and samples are higher", () => {
    const baseline = 5;
    const score = 5.3;
    const sampleSize = 8;
    const freq = 1;

    const suspicion =
      Math.max(0, score - baseline) * 20 + Math.max(0, 6 - sampleSize) * 6 + Math.min(20, freq * 4);

    expect(suspicion).toBeLessThan(30);
  });
});
