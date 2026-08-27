import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { normalizeReminderEntries } from "@/lib/reminders";
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

  it("rebuilds the full reminder list from partial enabled times", () => {
    const reminders = normalizeReminderEntries(["09:00", "19:00"]);

    expect(reminders).toHaveLength(3);
    expect(reminders[0]).toMatchObject({ id: "meal-1", time: "09:00", enabled: true });
    expect(reminders[1]).toMatchObject({ id: "meal-2", time: "19:00", enabled: true });
    expect(reminders[2]).toMatchObject({ id: "symptom-1", label: "Symptom reminder", enabled: false });
  });
});
