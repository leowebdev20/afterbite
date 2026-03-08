import { describe, expect, it } from "vitest";
import { computeImpactScore } from "@/server/services/scoring/impact";

describe("computeImpactScore", () => {
  it("returns low score for mostly positive metrics", () => {
    const score = computeImpactScore({
      bloating: 2,
      stomachPain: 1,
      inflammation: 2,
      fatigue: 2,
      brainFog: 1,
      headache: 1,
      digestionQuality: 8,
      mood: 8,
      energy: 8
    });

    expect(score).toBeLessThan(4);
  });

  it("returns high score for mostly negative metrics", () => {
    const score = computeImpactScore({
      bloating: 9,
      stomachPain: 8,
      inflammation: 8,
      fatigue: 8,
      brainFog: 7,
      headache: 6,
      digestionQuality: 2,
      mood: 3,
      energy: 2
    });

    expect(score).toBeGreaterThan(7);
  });
});
