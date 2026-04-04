import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { settingsRouter } from "@/server/api/routers/settings";

function makeCaller() {
  const db = {
    userSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn()
    },
    meal: { findMany: vi.fn().mockResolvedValue([]) },
    symptomLog: { findMany: vi.fn().mockResolvedValue([]) },
    recipe: { findMany: vi.fn().mockResolvedValue([]) },
    symptomEntry: { deleteMany: vi.fn() },
    mealItem: { deleteMany: vi.fn() },
    recipeItem: { deleteMany: vi.fn() },
    ingredientImpactSnapshot: { deleteMany: vi.fn() }
  } as const;

  const ctx = {
    db,
    userId: "demo-user",
    timeZone: "UTC"
  } as never;

  return { caller: settingsRouter.createCaller(ctx), db };
}

describe("settingsRouter validation", () => {
  it("rejects profile update below calories lower bound", async () => {
    const { caller } = makeCaller();
    try {
      await caller.updateProfile({
        age: 30,
        heightCm: 180,
        weightKg: 75,
        caloriesGoal: 700
      });
      throw new Error("Expected BAD_REQUEST");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});
