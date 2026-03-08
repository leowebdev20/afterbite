import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const insightRouter = createTRPCRouter({
  getIngredientImpact: protectedProcedure
    .input(z.object({ ingredientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ingredientImpactSnapshot.findFirst({
        where: {
          userId: ctx.userId,
          ingredientId: input.ingredientId
        },
        orderBy: { computedAt: "desc" }
      });
    }),
  getTopTriggers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.ingredientImpactSnapshot.findMany({
      where: { userId: ctx.userId },
      orderBy: [{ impactScore: "desc" }, { confidence: "desc" }],
      take: 5,
      include: { ingredient: true }
    });
  })
});
