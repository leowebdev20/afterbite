import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { toConfidence } from "@/server/services/correlations/calculate";
import { formatDayKey, getTodayKey } from "@/server/services/timezone";
import { symptomKeySchema } from "@/server/schemas/symptom";
import {
  average,
  buildIngredientTrend,
  buildSnapshotRows,
  buildSymptomBreakdown,
  buildUnknownCulpritStats,
  entriesFromLogs,
  getExampleDays
} from "@/server/services/insights/analytics";

const symptomSchema = symptomKeySchema;

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

      const entries = entriesFromLogs(logs);
      if (entries.length === 0 || meals.length === 0) return { updated: 0 };

      const rows = buildSnapshotRows({
        userId: ctx.userId,
        meals,
        entries,
        timeZone: ctx.timeZone,
        computedAt: new Date()
      });

      await ctx.db.$transaction(async (tx) => {
        await tx.ingredientImpactSnapshot.deleteMany({ where: { userId: ctx.userId } });
        if (rows.length > 0) {
          await tx.ingredientImpactSnapshot.createMany({ data: rows });
        }
      });

      return { updated: rows.length };
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
    .input(z.object({ symptom: symptomSchema.optional() }).optional())
    .output(
      z.array(
        z.object({
          id: z.string(),
          impactScore: z.number(),
          confidence: z.enum(["low", "medium", "high"]),
          symptom: z.string(),
          evidenceCount: z.number(),
          exampleDays: z.array(z.string()),
          ingredient: z.object({ id: z.string(), name: z.string() })
        })
      )
    )
    .query(async ({ ctx, input }) => {
      const lookbackDays = 90;
      const lookbackStart = new Date();
      lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);

      const snapshots = await ctx.db.ingredientImpactSnapshot.findMany({
        where: {
          userId: ctx.userId,
          computedAt: { gte: lookbackStart },
          ...(input?.symptom ? { symptom: input.symptom } : {})
        },
        orderBy: [{ impactScore: "desc" }, { sampleSize: "desc" }],
        take: 80,
        include: { ingredient: true }
      });

      const byIngredient = new Map<string, { best: (typeof snapshots)[number] }>();
      for (const snap of snapshots) {
        const current = byIngredient.get(snap.ingredientId);
        if (!current || snap.impactScore > current.best.impactScore) {
          byIngredient.set(snap.ingredientId, { best: snap });
        }
      }

      const top = Array.from(byIngredient.values())
        .filter((item) => item.best.sampleSize >= 3)
        .sort((a, b) => b.best.impactScore - a.best.impactScore)
        .slice(0, 5);

      if (top.length === 0) return [];

      const topIngredientIds = top.map((item) => item.best.ingredientId);

      const meals = await ctx.db.meal.findMany({
        where: {
          userId: ctx.userId,
          eatenAt: { gte: lookbackStart },
          items: { some: { ingredientId: { in: topIngredientIds } } }
        },
        select: { eatenAt: true, items: { select: { ingredientId: true } } }
      });
      const logs = await ctx.db.symptomLog.findMany({
        where: { userId: ctx.userId, loggedAt: { gte: lookbackStart } },
        include: { entries: true }
      });

      const entries = entriesFromLogs(logs);

      return top.map((item) => {
        return {
          id: item.best.ingredientId,
          impactScore: Number(item.best.impactScore.toFixed(1)),
          confidence: toConfidence(item.best.sampleSize),
          symptom: item.best.symptom,
          evidenceCount: item.best.sampleSize,
          exampleDays: getExampleDays({
            ingredientId: item.best.ingredientId,
            symptom: item.best.symptom,
            meals,
            entries,
            timeZone: ctx.timeZone
          }),
          ingredient: { id: item.best.ingredient.id, name: item.best.ingredient.name }
        };
      });
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

      const entries = await ctx.db.symptomLog
        .findMany({
          where: { userId: ctx.userId, loggedAt: { gte: lookbackStart } },
          include: { entries: true },
          orderBy: { loggedAt: "desc" }
        })
        .then(entriesFromLogs);

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

      const candidates = buildUnknownCulpritStats({
        meals,
        entries,
        timeZone: ctx.timeZone,
        baselineAvg
      });

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
    .input(z.object({ ingredientId: z.string(), symptom: symptomSchema.optional() }))
    .output(
      z.object({
        ingredientId: z.string(),
        selectedSymptom: z.string().nullable(),
        symptomBreakdown: z.array(
          z.object({
            symptom: z.string(),
            avgImpact: z.number(),
            sampleSize: z.number(),
            confidence: z.enum(["low", "medium", "high"])
          })
        ),
        trend: z.array(z.object({ date: z.string(), score: z.number().nullable() })),
        recent: z.array(z.object({ symptom: z.string(), severity: z.number(), loggedAt: z.date() })),
        averageImpact: z.number().nullable()
      })
    )
    .query(async ({ ctx, input }) => {
      const lookbackDays = 90;
      const lookbackStart = new Date();
      lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);

      const [meals, logs, snapshots] = await Promise.all([
        ctx.db.meal.findMany({
          where: {
            userId: ctx.userId,
            eatenAt: { gte: lookbackStart },
            items: { some: { ingredientId: input.ingredientId } }
          },
          include: { items: true },
          orderBy: { eatenAt: "desc" }
        }),
        ctx.db.symptomLog.findMany({
          where: { userId: ctx.userId, loggedAt: { gte: lookbackStart } },
          include: { entries: true },
          orderBy: { loggedAt: "desc" }
        }),
        ctx.db.ingredientImpactSnapshot.findMany({
          where: { userId: ctx.userId, ingredientId: input.ingredientId, computedAt: { gte: lookbackStart } },
          orderBy: { computedAt: "desc" }
        })
      ]);

      const symptomBreakdown = buildSymptomBreakdown(snapshots);
      const entries = entriesFromLogs(logs);
      const filteredEntries = input.symptom ? entries.filter((entry) => entry.symptom === input.symptom) : entries;

      if (filteredEntries.length === 0 || meals.length === 0) {
        return {
          ingredientId: input.ingredientId,
          selectedSymptom: input.symptom ?? null,
          symptomBreakdown,
          trend: [],
          recent: [],
          averageImpact: null
        };
      }

      const trend = buildIngredientTrend({ meals, entries: filteredEntries, timeZone: ctx.timeZone });

      const recent = filteredEntries.slice(0, 12).map((entry) => ({
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
        selectedSymptom: input.symptom ?? null,
        symptomBreakdown,
        trend,
        recent,
        averageImpact
      };
    })
});
