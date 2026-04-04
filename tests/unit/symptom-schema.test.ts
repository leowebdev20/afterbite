import { describe, expect, it } from "vitest";
import { quickLogSymptomsInputSchema, symptomDateRangeSchema, updateSymptomLogInputSchema } from "@/server/schemas/symptom";

describe("symptom schemas", () => {
  it("accepts quick log payload with known symptoms", () => {
    const parsed = quickLogSymptomsInputSchema.parse({
      loggedAt: new Date("2026-04-03T18:00:00.000Z"),
      entries: [
        { symptom: "bloating", severity: 7 },
        { symptom: "energy", severity: 3 }
      ]
    });

    expect(parsed.entries).toHaveLength(2);
  });

  it("rejects unknown symptoms", () => {
    const result = quickLogSymptomsInputSchema.safeParse({
      entries: [{ symptom: "unknown", severity: 5 }]
    });

    expect(result.success).toBe(false);
  });

  it("accepts update payload with id", () => {
    const parsed = updateSymptomLogInputSchema.parse({
      id: "log-1",
      entries: [{ symptom: "mood", severity: 6 }]
    });

    expect(parsed.id).toBe("log-1");
  });

  it("validates history range input", () => {
    const parsed = symptomDateRangeSchema.parse({ limit: 75 });
    expect(parsed.limit).toBe(75);
  });
});
