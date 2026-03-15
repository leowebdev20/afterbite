import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { toConfidence } from "@/server/services/correlations/calculate";
import { TRPCError } from "@trpc/server";

export const recipeRouter = createTRPCRouter({
  createRecipe: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        ingredientIds: z.array(z.string()).min(1)
      })
    )
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        items: z.array(z.object({ ingredient: z.object({ id: z.string(), name: z.string() }) }))
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
        select: {
          id: true,
          name: true,
          items: { select: { ingredient: { select: { id: true, name: true } } } }
        }
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
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        items: z.array(z.object({ ingredient: z.object({ id: z.string(), name: z.string() }) }))
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
        select: {
          id: true,
          name: true,
          items: { select: { ingredient: { select: { id: true, name: true } } } }
        }
      });
    }),
  deleteRecipe: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true }
      });

      if (!recipe) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      }

      return ctx.db.recipe.delete({ where: { id: recipe.id }, select: { id: true } });
    }),
  predictRecipeImpact: protectedProcedure
    .input(z.object({ ingredientIds: z.array(z.string()).min(1) }))
    .output(
      z.object({
        score: z.number().nullable(),
        confidence: z.enum(["low", "medium", "high"]),
        knownCount: z.number(),
        totalCount: z.number()
      })
    )
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
  listRecipes: protectedProcedure
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          items: z.array(
            z.object({
              ingredient: z.object({ id: z.string(), name: z.string() })
            })
          )
        })
      )
    )
    .query(async ({ ctx }) => {
    return ctx.db.recipe.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        name: true,
        items: { select: { ingredient: { select: { id: true, name: true } } } }
      },
      orderBy: { updatedAt: "desc" }
    });
  })
});
