import { describe, expect, it } from "vitest";
import { averageDelta, toConfidence } from "@/server/services/correlations/calculate";

describe("correlation utils", () => {
  it("maps sample thresholds to confidence levels", () => {
    expect(toConfidence(0)).toBe("low");
    expect(toConfidence(11)).toBe("low");
    expect(toConfidence(12)).toBe("medium");
    expect(toConfidence(29)).toBe("medium");
    expect(toConfidence(30)).toBe("high");
  });

  it("returns 0 average for empty arrays", () => {
    expect(averageDelta([])).toBe(0);
  });

  it("computes arithmetic average", () => {
    expect(averageDelta([2, 4, 6])).toBe(4);
  });
});
