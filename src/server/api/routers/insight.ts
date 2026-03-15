import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { toConfidence } from "@/server/services/correlations/calculate";
import { addDaysFromKey, formatDayKey, getLocalHour, getTodayKey } from "@/server/services/timezone";

type SymptomEntry = { symptom: string; severity: number; loggedAt: Date };

type EntryBuckets = Map<string, { all: number[]; morning: number[] }>;

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildEntryBuckets(entries: SymptomEntry[], timeZone: string): EntryBuckets {
  const buckets: EntryBuckets = new Map();
  for (const entry of entries) {
    const dayKey = formatDayKey(entry.loggedAt, timeZone);
    const hour = getLocalHour(entry.loggedAt, timeZone);
    const bucket = buckets.get(dayKey) ?? { all: [], morning: [] };
    bucket.all.push(entry.severity);
    if (hour < 12) bucket.morning.push(entry.severity);
    buckets.set(dayKey, bucket);
  }
  return buckets;
}

export const insightRouter = createTRPCRouter({
  recomputeSnapshots: protectedProcedure
    .output(z.object({ updated: z.number() }))
    .mutation(async ({ ctx }) => {
      const lookbackDays = 90;
      const lookbackStart = new Date();
      lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);

      const meals = await ctx.db.meal.findMany({
        where: { userId: ctx.userId, eatenAt: { gte: lookbackStart } },
        include: { items: true },
        orderBy: { eatenAt: "desc" }
      });
      const logs = await ctx.db.symptomLog.findMany({
        where: { userId: ctx.userId, loggedAt: { gte: lookbackStart } },
        include: { entries: true },
        orderBy: { loggedAt: "desc" }
      });

      const entries: SymptomEntry[] = logs.flatMap((log) =>
        log.entries.map((entry) => ({ ...entry, loggedAt: log.loggedAt }))
      );
      if (entries.length === 0 || meals.length === 0) return { updated: 0 };

      const entryBuckets = buildEntryBuckets(entries, ctx.timeZone);
      const ingredientWindows = new Map<string, { allKeys: Set<string>; morningKeys: Set<string> }>();

      for (const meal of meals) {
        const mealKey = formatDayKey(meal.eatenAt, ctx.timeZone);
        const day1 = addDaysFromKey(mealKey, 1);
        const day2 = addDaysFromKey(mealKey, 2);
        const day3 = addDaysFromKey(mealKey, 3);
        for (const item of meal.items) {
          const current = ingredientWindows.get(item.ingredientId) ?? {
            allKeys: new Set<string>(),
            morningKeys: new Set<string>()
          };
          current.allKeys.add(day1);
          current.allKeys.add(day2);
          current.morningKeys.add(day3);
          ingredientWindows.set(item.ingredientId, current);
        }
      }

      let updated = 0;
      for (const [ingredientId, window] of ingredientWindows.entries()) {
        const severities: Array<{ symptom: string; severity: number }> = [];
        for (const key of window.allKeys) {
          const bucket = entryBuckets.get(key);
          if (bucket) {
            // use all symptoms from that day
            const dayEntries = entries.filter((entry) => formatDayKey(entry.loggedAt, ctx.timeZone) === key);
            severities.push(...dayEntries.map((entry) => ({ symptom: entry.symptom, severity: entry.severity })));
          }
        }
        for (const key of window.morningKeys) {
          const bucket = entryBuckets.get(key);
          if (bucket) {
            const dayEntries = entries.filter((entry) => formatDayKey(entry.loggedAt, ctx.timeZone) === key);
            severities.push(
              ...dayEntries
                .filter((entry) => getLocalHour(entry.loggedAt, ctx.timeZone) < 12)
                .map((entry) => ({ symptom: entry.symptom, severity: entry.severity }))
            );
          }
        }

        const grouped = new Map<string, number[]>();
        for (const entry of severities) {
          const list = grouped.get(entry.symptom) ?? [];
          list.push(entry.severity);
          grouped.set(entry.symptom, list);
        }

        for (const [symptom, values] of grouped.entries()) {
          const impactScore = clamp(1, average(values), 10);
          await ctx.db.ingredientImpactSnapshot.create({
            data: {
              userId: ctx.userId,
              ingredientId,
              impactScore,
              confidence: values.length >= 12 ? "HIGH" : values.length >= 4 ? "MEDIUM" : "LOW",
              sampleSize: values.length,
              symptom
            }
          });
          updated += 1;
        }
      }

      return { updated };
    }),
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
  getTopTriggers: protectedProcedure
    .output(
      z.array(
        z.object({
          id: z.string(),
          impactScore: z.number(),
          confidence: z.enum(["low", "medium", "high"]),
          ingredient: z.object({ id: z.string(), name: z.string() })
        })
      )
    )
    .query(async ({ ctx }) => {
      const lookbackDays = 90;
      const lookbackStart = new Date();
      lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);

    const snapshots = await ctx.db.ingredientImpactSnapshot.findMany({
      where: { userId: ctx.userId, computedAt: { gte: lookbackStart } },
      orderBy: [{ impactScore: "desc" }, { sampleSize: "desc" }],
      take: 50,
      include: { ingredient: true }
    });

    const byIngredient = new Map<string, { best: typeof snapshots[number] }>();
    for (const snap of snapshots) {
      const current = byIngredient.get(snap.ingredientId);
      if (!current || snap.impactScore > current.best.impactScore) {
        byIngredient.set(snap.ingredientId, { best: snap });
      }
    }

    return Array.from(byIngredient.values())
      .filter((item) => item.best.sampleSize >= 3)
      .sort((a, b) => b.best.impactScore - a.best.impactScore)
      .slice(0, 5)
      .map((item) => ({
        id: item.best.ingredientId,
        impactScore: Number(item.best.impactScore.toFixed(1)),
        confidence: toConfidence(item.best.sampleSize),
        ingredient: { id: item.best.ingredient.id, name: item.best.ingredient.name }
      }));
  }),
  getUnknownCulprits: protectedProcedure
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          suspicion: z.number(),
          confidence: z.enum(["low", "medium", "high"]),
          sampleSize: z.number()
        })
      )
    )
    .query(async ({ ctx }) => {
      const now = new Date();
      const lookbackStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const entries: SymptomEntry[] = await ctx.db.symptomLog
      .findMany({
        where: { userId: ctx.userId, loggedAt: { gte: lookbackStart } },
        include: { entries: true },
        orderBy: { loggedAt: "desc" }
      })
      .then((logs) => logs.flatMap((log) => log.entries.map((entry) => ({ ...entry, loggedAt: log.loggedAt }))));

    const meals = await ctx.db.meal.findMany({
      where: { userId: ctx.userId, eatenAt: { gte: lookbackStart } },
      include: { items: true },
      orderBy: { eatenAt: "desc" }
    });

    if (entries.length === 0 || meals.length === 0) return [];

    const baselineAvg = average(entries.map((entry) => entry.severity));
    const todayKey = getTodayKey(ctx.timeZone);
    const todayAvg = average(
      entries.filter((entry) => formatDayKey(entry.loggedAt, ctx.timeZone) === todayKey).map((e) => e.severity)
    );
      const unexpectedBad = todayAvg - baselineAvg >= 1.5;
      if (!unexpectedBad) return [];

    const entryBuckets = buildEntryBuckets(entries, ctx.timeZone);
    const ingredientWindows = new Map<string, { allKeys: Set<string>; morningKeys: Set<string> }>();
    const ingredientCounts = new Map<string, number>();

    for (const meal of meals) {
      const mealKey = formatDayKey(meal.eatenAt, ctx.timeZone);
      const day1 = addDaysFromKey(mealKey, 1);
      const day2 = addDaysFromKey(mealKey, 2);
      const day3 = addDaysFromKey(mealKey, 3);
      for (const item of meal.items) {
        const current = ingredientWindows.get(item.ingredientId) ?? {
          allKeys: new Set<string>(),
          morningKeys: new Set<string>()
        };
        current.allKeys.add(day1);
        current.allKeys.add(day2);
        current.morningKeys.add(day3);
        ingredientWindows.set(item.ingredientId, current);
        ingredientCounts.set(item.ingredientId, (ingredientCounts.get(item.ingredientId) ?? 0) + 1);
      }
    }

    const candidateStats = Array.from(ingredientWindows.entries()).map(([ingredientId, window]) => {
      const severities: number[] = [];
      for (const key of window.allKeys) {
        const bucket = entryBuckets.get(key);
        if (bucket) severities.push(...bucket.all);
      }
      for (const key of window.morningKeys) {
        const bucket = entryBuckets.get(key);
        if (bucket) severities.push(...bucket.morning);
      }
      const score = average(severities);
      const sampleSize = severities.length;
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
    .output(
      z.object({
        ingredientId: z.string(),
        trend: z.array(z.object({ date: z.string(), score: z.number().nullable() })),
        recent: z.array(z.object({ symptom: z.string(), severity: z.number(), loggedAt: z.date() })),
        averageImpact: z.number().nullable()
      })
    )
    .query(async ({ ctx, input }) => {
      const lookbackDays = 90;
      const lookbackStart = new Date();
      lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);

      const meals = await ctx.db.meal.findMany({
        where: {
          userId: ctx.userId,
          eatenAt: { gte: lookbackStart },
          items: { some: { ingredientId: input.ingredientId } }
        },
        include: { items: true },
        orderBy: { eatenAt: "desc" }
      });
      const logs = await ctx.db.symptomLog.findMany({
        where: { userId: ctx.userId, loggedAt: { gte: lookbackStart } },
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

      const entryBuckets = buildEntryBuckets(entries, ctx.timeZone);
      const windows = meals.map((meal) => {
        const mealKey = formatDayKey(meal.eatenAt, ctx.timeZone);
        return {
          day1: addDaysFromKey(mealKey, 1),
          day2: addDaysFromKey(mealKey, 2),
          day3: addDaysFromKey(mealKey, 3),
          eatenAt: meal.eatenAt
        };
      });

      const trend = windows.slice(0, 10).map((window) => {
        const severities: number[] = [];
        const day1 = entryBuckets.get(window.day1);
        const day2 = entryBuckets.get(window.day2);
        const day3 = entryBuckets.get(window.day3);
        if (day1) severities.push(...day1.all);
        if (day2) severities.push(...day2.all);
        if (day3) severities.push(...day3.morning);
        const score = severities.length ? average(severities) : null;
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
