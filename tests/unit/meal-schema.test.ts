import { describe, expect, it } from "vitest";
import { mealDateRangeSchema, quickAddMealInputSchema, updateMealInputSchema } from "@/server/schemas/meal";

describe("quickAddMealInputSchema", () => {
  it("accepts items payload with optional quantities", () => {
    const parsed = quickAddMealInputSchema.parse({
      name: "Test meal",
      mealType: "DINNER",
      eatenAt: new Date("2026-04-01T12:00:00.000Z"),
      items: [
        { ingredientId: "ing-a", quantity: 120 },
        { ingredientId: "ing-b", quantity: null }
      ]
    });

    expect(parsed.mealType).toBe("DINNER");
    expect(parsed.items?.length).toBe(2);
  });

  it("accepts legacy ingredientIds payload", () => {
    const parsed = quickAddMealInputSchema.parse({
      name: "Legacy meal",
      ingredientIds: ["ing-a", "ing-b"]
    });

    expect(parsed.ingredientIds).toEqual(["ing-a", "ing-b"]);
  });

  it("rejects payload with no ingredients", () => {
    const result = quickAddMealInputSchema.safeParse({
      name: "Bad meal"
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    const result = quickAddMealInputSchema.safeParse({
      name: "Invalid quantity",
      items: [{ ingredientId: "ing-a", quantity: 0 }]
    });

    expect(result.success).toBe(false);
  });

  it("accepts update payload with id", () => {
    const parsed = updateMealInputSchema.parse({
      id: "meal-1",
      name: "Updated meal",
      ingredientIds: ["ing-a"]
    });

    expect(parsed.id).toBe("meal-1");
  });

  it("validates bounded date range", () => {
    const parsed = mealDateRangeSchema.parse({
      from: new Date("2026-03-01T00:00:00.000Z"),
      to: new Date("2026-03-31T23:59:59.000Z"),
      limit: 100
    });

    expect(parsed.limit).toBe(100);
  });
});
