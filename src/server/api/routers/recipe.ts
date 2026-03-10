import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { toConfidence } from "@/server/services/correlations/calculate";

export const recipeRouter = createTRPCRouter({
  createRecipe: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        ingredientIds: z.array(z.string()).min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.recipe.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          items: {
            create: input.ingredientIds.map((ingredientId) => ({ ingredientId }))
          }
        },
        include: { items: { include: { ingredient: true } } }
      });
    }),
  updateRecipe: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        ingredientIds: z.array(z.string()).min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.recipe.update({
        where: { id: input.id, userId: ctx.userId },
        data: {
          name: input.name,
          items: {
            deleteMany: {},
            create: input.ingredientIds.map((ingredientId) => ({ ingredientId }))
          }
        },
        include: { items: { include: { ingredient: true } } }
      });
    }),
  deleteRecipe: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.recipe.delete({ where: { id: input.id, userId: ctx.userId } });
    }),
  predictRecipeImpact: protectedProcedure
    .input(z.object({ ingredientIds: z.array(z.string()).min(1) }))
    .query(async ({ ctx, input }) => {
      const snapshots = await ctx.db.ingredientImpactSnapshot.findMany({
        where: { userId: ctx.userId, ingredientId: { in: input.ingredientIds } },
        orderBy: { computedAt: "desc" }
      });

      const latestByIngredient = new Map<string, { impactScore: number; sampleSize: number }>();
      for (const snap of snapshots) {
        if (!latestByIngredient.has(snap.ingredientId)) {
          latestByIngredient.set(snap.ingredientId, { impactScore: snap.impactScore, sampleSize: snap.sampleSize });
        }
      }

      const scores = Array.from(latestByIngredient.values()).map((value) => value.impactScore);
      const knownCount = scores.length;
      const totalCount = input.ingredientIds.length;

      if (knownCount === 0) {
        return {
          score: null,
          confidence: "low",
          knownCount,
          totalCount
        };
      }

      const avg = scores.reduce((sum, value) => sum + value, 0) / knownCount;
      return {
        score: Number(avg.toFixed(2)),
        confidence: toConfidence(knownCount),
        knownCount,
        totalCount
      };
    }),
  listRecipes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.recipe.findMany({
      where: { userId: ctx.userId },
      include: { items: { include: { ingredient: true } } },
      orderBy: { updatedAt: "desc" }
    });
  })
});
