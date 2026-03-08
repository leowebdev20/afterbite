import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const mealRouter = createTRPCRouter({
  searchIngredients: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.ingredient.findMany({
        where: {
          name: {
            contains: input.query,
            mode: "insensitive"
          }
        },
        take: 10,
        orderBy: { name: "asc" }
      });
    }),
  createIngredient: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const normalized = input.name.trim();
      return ctx.db.ingredient.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized }
      });
    }),
  quickAddMeal: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        ingredientIds: z.array(z.string()).min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.meal.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          items: {
            create: input.ingredientIds.map((ingredientId) => ({ ingredientId }))
          }
        }
      });
    }),
  listTodayMeals: protectedProcedure.query(async ({ ctx }) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    return ctx.db.meal.findMany({
      where: { userId: ctx.userId, eatenAt: { gte: start } },
      include: { items: { include: { ingredient: true } } },
      orderBy: { eatenAt: "desc" }
    });
  })
});
