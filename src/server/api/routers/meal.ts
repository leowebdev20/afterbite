import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const mealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"]);

const mealItemInputSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive().max(5000).optional().nullable()
});

export const mealRouter = createTRPCRouter({
  searchIngredients: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(50) }))
    .output(z.array(z.object({ id: z.string(), name: z.string() })))
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
    .output(z.object({ id: z.string(), name: z.string() }))
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
        mealType: mealTypeSchema.optional(),
        ingredientIds: z.array(z.string()).min(1).optional(),
        items: z.array(mealItemInputSchema).min(1).optional()
      }).refine((value) => (value.items?.length ?? 0) > 0 || (value.ingredientIds?.length ?? 0) > 0, {
        message: "At least one ingredient is required."
      })
    )
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        mealType: mealTypeSchema,
        eatenAt: z.date()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const itemInputs =
        input.items?.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity ?? null
        })) ??
        input.ingredientIds?.map((ingredientId) => ({ ingredientId, quantity: null })) ??
        [];

      return ctx.db.meal.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          mealType: input.mealType ?? "OTHER",
          items: {
            create: itemInputs
          }
        }
      });
    }),
  listTodayMeals: protectedProcedure
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          mealType: mealTypeSchema,
          eatenAt: z.date(),
          items: z.array(
            z.object({
              quantity: z.number().nullable(),
              ingredient: z.object({ name: z.string() })
            })
          )
        })
      )
    )
    .query(async ({ ctx }) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      return ctx.db.meal.findMany({
        where: { userId: ctx.userId, eatenAt: { gte: start } },
        select: {
          id: true,
          name: true,
          mealType: true,
          eatenAt: true,
          items: { select: { quantity: true, ingredient: { select: { name: true } } } }
        },
        orderBy: { eatenAt: "desc" }
      });
    })
});
