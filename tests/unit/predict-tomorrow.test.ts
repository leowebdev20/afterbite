import { describe, expect, it } from "vitest";
import { predictTomorrow } from "@/server/services/forecasting/tomorrow";

describe("predictTomorrow", () => {
  it("applies trigger boost and clamps symptom limits", () => {
    const result = predictTomorrow(
      {
        bloating: 9.8,
        stomachPain: 4,
        inflammation: 4,
        fatigue: 9.8,
        brainFog: 3,
        headache: 2,
        digestionQuality: 7,
        mood: 7,
        energy: 1.2
      },
      2
    );

    expect(result.symptoms.bloating).toBe(10);
    expect(result.symptoms.fatigue).toBe(10);
    expect(result.symptoms.energy).toBe(1);
  });

  it("keeps impact score in 0..10 range", () => {
    const result = predictTomorrow(
      {
        bloating: 5,
        stomachPain: 5,
        inflammation: 5,
        fatigue: 5,
        brainFog: 5,
        headache: 5,
        digestionQuality: 5,
        mood: 5,
        energy: 5
      },
      0.5
    );

    expect(result.impactScore).toBeGreaterThanOrEqual(0);
    expect(result.impactScore).toBeLessThanOrEqual(10);
  });
});
