import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { symptomRouter } from "@/server/api/routers/symptom";

function makeCaller() {
  const db = {
    symptomLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn().mockResolvedValue([])
    }
  } as const;

  const ctx = {
    db,
    userId: "demo-user",
    timeZone: "UTC"
  } as never;

  return { caller: symptomRouter.createCaller(ctx), db };
}

describe("symptomRouter failure paths", () => {
  it("throws NOT_FOUND when updating unknown symptom log", async () => {
    const { caller } = makeCaller();
    try {
      await caller.updateSymptomLog({
        id: "missing-log",
        entries: [{ symptom: "bloating", severity: 5 }]
      });
      throw new Error("Expected NOT_FOUND");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  it("throws NOT_FOUND when deleting unknown symptom log", async () => {
    const { caller } = makeCaller();
    try {
      await caller.deleteSymptomLog({ id: "missing-log" });
      throw new Error("Expected NOT_FOUND");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });
});
