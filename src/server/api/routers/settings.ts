import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const settingsRouter = createTRPCRouter({
  getSettings: protectedProcedure
    .output(
      z.object({
        timeZone: z.string(),
        reminderTimes: z.array(z.string()).nullable(),
        age: z.number().nullable(),
        heightCm: z.number().nullable(),
        weightKg: z.number().nullable(),
        caloriesGoal: z.number().nullable()
      })
    )
    .query(async ({ ctx }) => {
      const settings = await ctx.db.userSettings.findUnique({ where: { userId: ctx.userId } });
      return {
        timeZone: settings?.timeZone ?? ctx.timeZone,
        reminderTimes: (settings?.reminderTimes as string[] | null) ?? null,
        age: settings?.age ?? null,
        heightCm: settings?.heightCm ?? null,
        weightKg: settings?.weightKg ?? null,
        caloriesGoal: settings?.caloriesGoal ?? null
      };
    }),
  updateTimeZone: protectedProcedure
    .input(
      z.object({
        timeZone: z.string().min(1),
        reminderTimes: z.array(z.string()).max(2).optional(),
        age: z.number().int().min(10).max(120).nullable().optional(),
        heightCm: z.number().int().min(80).max(250).nullable().optional(),
        weightKg: z.number().int().min(30).max(300).nullable().optional(),
        caloriesGoal: z.number().int().min(800).max(6000).nullable().optional()
      })
    )
    .output(
      z.object({
        timeZone: z.string(),
        reminderTimes: z.array(z.string()).nullable(),
        age: z.number().nullable(),
        heightCm: z.number().nullable(),
        weightKg: z.number().nullable(),
        caloriesGoal: z.number().nullable()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.userSettings.upsert({
        where: { userId: ctx.userId },
        update: {
          timeZone: input.timeZone,
          reminderTimes: input.reminderTimes ?? undefined,
          age: input.age ?? undefined,
          heightCm: input.heightCm ?? undefined,
          weightKg: input.weightKg ?? undefined,
          caloriesGoal: input.caloriesGoal ?? undefined
        },
        create: {
          userId: ctx.userId,
          timeZone: input.timeZone,
          reminderTimes: input.reminderTimes ?? [],
          age: input.age ?? null,
          heightCm: input.heightCm ?? null,
          weightKg: input.weightKg ?? null,
          caloriesGoal: input.caloriesGoal ?? null
        }
      });
      return {
        timeZone: settings.timeZone,
        reminderTimes: (settings.reminderTimes as string[] | null) ?? null,
        age: settings.age ?? null,
        heightCm: settings.heightCm ?? null,
        weightKg: settings.weightKg ?? null,
        caloriesGoal: settings.caloriesGoal ?? null
      };
    }),
  exportData: protectedProcedure
    .output(z.object({ json: z.string() }))
    .query(async ({ ctx }) => {
      const [meals, symptomLogs, recipes, settings] = await Promise.all([
        ctx.db.meal.findMany({ where: { userId: ctx.userId }, include: { items: true } }),
        ctx.db.symptomLog.findMany({ where: { userId: ctx.userId }, include: { entries: true } }),
        ctx.db.recipe.findMany({ where: { userId: ctx.userId }, include: { items: true } }),
        ctx.db.userSettings.findUnique({ where: { userId: ctx.userId } })
      ]);

      const payload = { meals, symptomLogs, recipes, settings };
      return { json: JSON.stringify(payload, null, 2) };
    }),
  deleteAllData: protectedProcedure
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      await ctx.db.symptomEntry.deleteMany({ where: { symptomLog: { userId: ctx.userId } } });
      await ctx.db.symptomLog.deleteMany({ where: { userId: ctx.userId } });
      await ctx.db.mealItem.deleteMany({ where: { meal: { userId: ctx.userId } } });
      await ctx.db.meal.deleteMany({ where: { userId: ctx.userId } });
      await ctx.db.recipeItem.deleteMany({ where: { recipe: { userId: ctx.userId } } });
      await ctx.db.recipe.deleteMany({ where: { userId: ctx.userId } });
      await ctx.db.ingredientImpactSnapshot.deleteMany({ where: { userId: ctx.userId } });
      return { success: true };
    })
});
