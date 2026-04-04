import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  mealDateRangeSchema,
  mealTypeSchema,
  quickAddMealInputSchema,
  updateMealInputSchema
} from "@/server/schemas/meal";
import { TRPCError } from "@trpc/server";
import { getTodayUtcRange } from "@/server/services/timezone";

const mealOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  mealType: mealTypeSchema,
  eatenAt: z.date(),
  items: z.array(
    z.object({
      id: z.string(),
      ingredientId: z.string(),
      quantity: z.number().nullable(),
      ingredient: z.object({ id: z.string(), name: z.string() })
    })
  )
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
    .input(quickAddMealInputSchema)
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
          name: input.name.trim(),
          mealType: input.mealType ?? "OTHER",
          eatenAt: input.eatenAt ?? new Date(),
          items: {
            create: itemInputs
          }
        }
      });
    }),
  updateMeal: protectedProcedure
    .input(updateMealInputSchema)
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        mealType: mealTypeSchema,
        eatenAt: z.date()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const meal = await ctx.db.meal.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true }
      });
      if (!meal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found" });
      }

      const itemInputs =
        input.items?.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity ?? null
        })) ??
        input.ingredientIds?.map((ingredientId) => ({ ingredientId, quantity: null })) ??
        [];

      return ctx.db.meal.update({
        where: { id: meal.id },
        data: {
          name: input.name.trim(),
          mealType: input.mealType ?? "OTHER",
          eatenAt: input.eatenAt ?? new Date(),
          items: {
            deleteMany: {},
            create: itemInputs
          }
        },
        select: {
          id: true,
          name: true,
          mealType: true,
          eatenAt: true
        }
      });
    }),
  deleteMeal: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const meal = await ctx.db.meal.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true }
      });
      if (!meal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found" });
      }

      return ctx.db.meal.delete({ where: { id: meal.id }, select: { id: true } });
    }),
  listMeals: protectedProcedure
    .input(mealDateRangeSchema.optional())
    .output(z.array(mealOutputSchema))
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const where = {
        userId: ctx.userId,
        ...(input?.from || input?.to
          ? {
              eatenAt: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {})
              }
            }
          : {})
      };

      return ctx.db.meal.findMany({
        where,
        select: {
          id: true,
          name: true,
          mealType: true,
          eatenAt: true,
          items: {
            select: {
              id: true,
              ingredientId: true,
              quantity: true,
              ingredient: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { eatenAt: "desc" },
        take: limit
      });
    }),
  listTodayMeals: protectedProcedure
    .output(z.array(mealOutputSchema))
    .query(async ({ ctx }) => {
      const { start, end } = getTodayUtcRange(ctx.timeZone);

      return ctx.db.meal.findMany({
        where: { userId: ctx.userId, eatenAt: { gte: start, lt: end } },
        select: {
          id: true,
          name: true,
          mealType: true,
          eatenAt: true,
          items: {
            select: {
              id: true,
              ingredientId: true,
              quantity: true,
              ingredient: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { eatenAt: "desc" }
      });
    })
});
