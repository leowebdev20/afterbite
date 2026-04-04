import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const settingsOutputSchema = z.object({
  timeZone: z.string(),
  reminderTimes: z.array(z.string()).nullable(),
  age: z.number().nullable(),
  heightCm: z.number().nullable(),
  weightKg: z.number().nullable(),
  caloriesGoal: z.number().nullable()
});

function toSettingsOutput(
  settings:
    | {
        timeZone: string;
        reminderTimes: unknown;
        age: number | null;
        heightCm: number | null;
        weightKg: number | null;
        caloriesGoal: number | null;
      }
    | null
    | undefined,
  fallbackTimeZone: string
) {
  return {
    timeZone: settings?.timeZone ?? fallbackTimeZone,
    reminderTimes: (settings?.reminderTimes as string[] | null) ?? null,
    age: settings?.age ?? null,
    heightCm: settings?.heightCm ?? null,
    weightKg: settings?.weightKg ?? null,
    caloriesGoal: settings?.caloriesGoal ?? null
  };
}

export const settingsRouter = createTRPCRouter({
  getSettings: protectedProcedure
    .output(settingsOutputSchema)
    .query(async ({ ctx }) => {
      const settings = await ctx.db.userSettings.findUnique({ where: { userId: ctx.userId } });
      return toSettingsOutput(settings, ctx.timeZone);
    }),
  updateTimeZone: protectedProcedure
    .input(
      z.object({
        timeZone: z.string().min(1)
      })
    )
    .output(settingsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.userSettings.upsert({
        where: { userId: ctx.userId },
        update: {
          timeZone: input.timeZone
        },
        create: {
          userId: ctx.userId,
          timeZone: input.timeZone,
          reminderTimes: [],
          age: null,
          heightCm: null,
          weightKg: null,
          caloriesGoal: null
        }
      });
      return toSettingsOutput(settings, ctx.timeZone);
    }),
  updateReminderTimes: protectedProcedure
    .input(
      z.object({
        reminderTimes: z.array(z.string()).max(2)
      })
    )
    .output(settingsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.userSettings.upsert({
        where: { userId: ctx.userId },
        update: {
          reminderTimes: input.reminderTimes
        },
        create: {
          userId: ctx.userId,
          timeZone: ctx.timeZone,
          reminderTimes: input.reminderTimes,
          age: null,
          heightCm: null,
          weightKg: null,
          caloriesGoal: null
        }
      });
      return toSettingsOutput(settings, ctx.timeZone);
    }),
  updateProfile: protectedProcedure
    .input(
      z.object({
        age: z.number().int().min(10).max(120).nullable(),
        heightCm: z.number().int().min(80).max(250).nullable(),
        weightKg: z.number().int().min(30).max(300).nullable(),
        caloriesGoal: z.number().int().min(800).max(6000).nullable()
      })
    )
    .output(settingsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.userSettings.upsert({
        where: { userId: ctx.userId },
        update: {
          age: input.age,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          caloriesGoal: input.caloriesGoal
        },
        create: {
          userId: ctx.userId,
          timeZone: ctx.timeZone,
          reminderTimes: [],
          age: input.age,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          caloriesGoal: input.caloriesGoal
        }
      });
      return toSettingsOutput(settings, ctx.timeZone);
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
