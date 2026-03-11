import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { toConfidence } from "@/server/services/correlations/calculate";

type SymptomEntry = { symptom: string; severity: number; loggedAt: Date };

function toDayStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inWindow(loggedAt: Date, start: Date, end: Date) {
  return loggedAt >= start && loggedAt <= end;
}

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
    const meals = await ctx.db.meal.findMany({
      where: { userId: ctx.userId },
      include: { items: true },
      orderBy: { eatenAt: "desc" }
    });
    const logs = await ctx.db.symptomLog.findMany({
      where: { userId: ctx.userId },
      include: { entries: true },
      orderBy: { loggedAt: "desc" }
    });

    const entries: SymptomEntry[] = logs.flatMap((log) =>
      log.entries.map((entry) => ({ ...entry, loggedAt: log.loggedAt }))
    );
    if (entries.length === 0 || meals.length === 0) return [];

    const baselineAvg = average(entries.map((entry) => entry.severity));

    const ingredientToWindows = new Map<string, Array<{ start: Date; end: Date }>>();
    for (const meal of meals) {
      const start = addDays(toDayStart(meal.eatenAt), 1);
      const end = addDays(toDayStart(meal.eatenAt), 2);
      end.setHours(12, 0, 0, 0);
      for (const item of meal.items) {
        const list = ingredientToWindows.get(item.ingredientId) ?? [];
        list.push({ start, end });
        ingredientToWindows.set(item.ingredientId, list);
      }
    }

    const ingredientStats = Array.from(ingredientToWindows.entries()).map(([ingredientId, windows]) => {
      const windowEntries = entries.filter((entry) =>
        windows.some((window) => inWindow(entry.loggedAt, window.start, window.end))
      );
      const score = average(windowEntries.map((entry) => entry.severity));
      const sampleSize = windowEntries.length;
      return {
        ingredientId,
        impactScore: clamp(1, score, 10),
        delta: score - baselineAvg,
        sampleSize
      };
    });

    const ingredients = await ctx.db.ingredient.findMany({
      where: { id: { in: ingredientStats.map((s) => s.ingredientId) } }
    });

    return ingredientStats
      .filter((stat) => stat.sampleSize >= 3)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5)
      .map((stat) => ({
        id: stat.ingredientId,
        impactScore: Number(stat.impactScore.toFixed(1)),
        confidence: toConfidence(stat.sampleSize),
        ingredient: ingredients.find((i) => i.id === stat.ingredientId) ?? { id: stat.ingredientId, name: "Unknown" }
      }));
  }),
  getUnknownCulprits: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const since = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const meals = await ctx.db.meal.findMany({
      where: { userId: ctx.userId, eatenAt: { gte: since } },
      include: { items: true },
      orderBy: { eatenAt: "desc" }
    });
    const logs = await ctx.db.symptomLog.findMany({
      where: { userId: ctx.userId, loggedAt: { gte: addDays(toDayStart(now), -14) } },
      include: { entries: true },
      orderBy: { loggedAt: "desc" }
    });
    const entries: SymptomEntry[] = logs.flatMap((log) =>
      log.entries.map((entry) => ({ ...entry, loggedAt: log.loggedAt }))
    );
    if (entries.length === 0 || meals.length === 0) return [];

    const baselineAvg = average(entries.map((entry) => entry.severity));
    const todayStart = toDayStart(now);
    const todayAvg = average(entries.filter((entry) => entry.loggedAt >= todayStart).map((e) => e.severity));
    const unexpectedBad = todayAvg - baselineAvg >= 1.5;
    if (!unexpectedBad) return [];

    const ingredientToWindows = new Map<string, Array<{ start: Date; end: Date }>>();
    const ingredientCounts = new Map<string, number>();
    for (const meal of meals) {
      const start = addDays(toDayStart(meal.eatenAt), 1);
      const end = addDays(toDayStart(meal.eatenAt), 2);
      end.setHours(12, 0, 0, 0);
      for (const item of meal.items) {
        const list = ingredientToWindows.get(item.ingredientId) ?? [];
        list.push({ start, end });
        ingredientToWindows.set(item.ingredientId, list);
        ingredientCounts.set(item.ingredientId, (ingredientCounts.get(item.ingredientId) ?? 0) + 1);
      }
    }

    const candidateStats = Array.from(ingredientToWindows.entries()).map(([ingredientId, windows]) => {
      const windowEntries = entries.filter((entry) =>
        windows.some((window) => inWindow(entry.loggedAt, window.start, window.end))
      );
      const score = average(windowEntries.map((entry) => entry.severity));
      const sampleSize = windowEntries.length;
      const freq = ingredientCounts.get(ingredientId) ?? 1;
      const suspicion =
        Math.max(0, score - baselineAvg) * 20 + Math.max(0, 6 - sampleSize) * 6 + Math.min(20, freq * 4);
      return { ingredientId, sampleSize, score, suspicion };
    });

    const candidates = candidateStats
      .filter((stat) => stat.sampleSize < 6)
      .sort((a, b) => b.suspicion - a.suspicion)
      .slice(0, 5);

    const ingredients = await ctx.db.ingredient.findMany({
      where: { id: { in: candidates.map((c) => c.ingredientId) } }
    });

    return candidates.map((candidate) => ({
      id: candidate.ingredientId,
      name: ingredients.find((i) => i.id === candidate.ingredientId)?.name ?? "Unknown ingredient",
      suspicion: Math.round(candidate.suspicion),
      confidence: toConfidence(candidate.sampleSize),
      sampleSize: candidate.sampleSize
    }));
  }),
  getIngredientDetail: protectedProcedure
    .input(z.object({ ingredientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const meals = await ctx.db.meal.findMany({
        where: { userId: ctx.userId, items: { some: { ingredientId: input.ingredientId } } },
        include: { items: true },
        orderBy: { eatenAt: "desc" }
      });
      const logs = await ctx.db.symptomLog.findMany({
        where: { userId: ctx.userId },
        include: { entries: true },
        orderBy: { loggedAt: "desc" }
      });

      const entries: SymptomEntry[] = logs.flatMap((log) =>
        log.entries.map((entry) => ({ ...entry, loggedAt: log.loggedAt }))
      );
      if (entries.length === 0 || meals.length === 0) {
        return {
          ingredientId: input.ingredientId,
          trend: [],
          recent: [],
          averageImpact: null
        };
      }

      const windows = meals.map((meal) => {
        const start = addDays(toDayStart(meal.eatenAt), 1);
        const end = addDays(toDayStart(meal.eatenAt), 2);
        end.setHours(12, 0, 0, 0);
        return { start, end, eatenAt: meal.eatenAt };
      });

      const trend = windows.slice(0, 10).map((window) => {
        const windowEntries = entries.filter((entry) => inWindow(entry.loggedAt, window.start, window.end));
        const score = windowEntries.length ? average(windowEntries.map((entry) => entry.severity)) : null;
        return {
          date: window.eatenAt.toISOString().slice(0, 10),
          score: score !== null ? Number(score.toFixed(2)) : null
        };
      });

      const recent = entries.slice(0, 12).map((entry) => ({
        symptom: entry.symptom,
        severity: entry.severity,
        loggedAt: entry.loggedAt
      }));

      const averageImpact =
        trend.filter((item) => item.score !== null).length > 0
          ? Number(average(trend.filter((item) => item.score !== null).map((item) => item.score ?? 0)).toFixed(2))
          : null;

      return {
        ingredientId: input.ingredientId,
        trend,
        recent,
        averageImpact
      };
    })
});
