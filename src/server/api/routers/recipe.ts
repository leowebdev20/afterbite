import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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
  listRecipes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.recipe.findMany({
      where: { userId: ctx.userId },
      include: { items: { include: { ingredient: true } } },
      orderBy: { updatedAt: "desc" }
    });
  })
});
