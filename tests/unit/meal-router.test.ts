import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { mealRouter } from "@/server/api/routers/meal";

function makeCaller(overrides?: Partial<Record<string, unknown>>) {
  const db = {
    ingredient: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn()
    },
    meal: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn().mockResolvedValue([])
    }
  } as const;

  const ctx = {
    db,
    userId: "demo-user",
    timeZone: "UTC",
    ...(overrides ?? {})
  } as never;

  return { caller: mealRouter.createCaller(ctx), db };
}

describe("mealRouter failure paths", () => {
  it("throws NOT_FOUND when updating unknown meal", async () => {
    const { caller } = makeCaller();
    try {
      await caller.updateMeal({
        id: "missing-meal",
        name: "Dinner",
        ingredientIds: ["ing-a"]
      });
      throw new Error("Expected NOT_FOUND");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  it("throws NOT_FOUND when deleting unknown meal", async () => {
    const { caller } = makeCaller();
    try {
      await caller.deleteMeal({ id: "missing-meal" });
      throw new Error("Expected NOT_FOUND");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });
});
