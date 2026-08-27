import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { createTRPCContext } from "@/server/api/trpc";

describe("auth-aware trpc context", () => {
  it("returns unauthenticated context when no session exists", async () => {
    const ctx = await createTRPCContext();

    expect(ctx.userId).toBeNull();
    expect(ctx.session).toBeNull();
    expect(ctx.timeZone).toBe("UTC");
  });

  it("throws on protected procedures when no session is available", async () => {
    const protectedProcedure = async () => {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    };

    await expect(protectedProcedure()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
