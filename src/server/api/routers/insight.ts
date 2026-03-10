import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { toConfidence } from "@/server/services/correlations/calculate";

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
    return ctx.db.ingredientImpactSnapshot.findMany({
      where: { userId: ctx.userId },
      orderBy: [{ impactScore: "desc" }, { confidence: "desc" }],
      take: 5,
      include: { ingredient: true }
    });
  }),
  getUnknownCulprits: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const since = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const meals = await ctx.db.meal.findMany({
      where: { userId: ctx.userId, eatenAt: { gte: since } },
      include: { items: { include: { ingredient: true } } },
      orderBy: { eatenAt: "desc" }
    });

    const baselineLogs = await ctx.db.symptomLog.findMany({
      where: { userId: ctx.userId, loggedAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
      include: { entries: true }
    });

    const todayLogs = baselineLogs.filter((log) => {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      return log.loggedAt >= dayStart;
    });

    const baselineAvg =
      baselineLogs.flatMap((log) => log.entries).reduce((sum, entry) => sum + entry.severity, 0) /
      Math.max(1, baselineLogs.flatMap((log) => log.entries).length);

    const todayAvg =
      todayLogs.flatMap((log) => log.entries).reduce((sum, entry) => sum + entry.severity, 0) /
      Math.max(1, todayLogs.flatMap((log) => log.entries).length);

    const unexpectedBad = todayAvg - baselineAvg >= 1.5;
    if (!unexpectedBad) return [];

    const ingredientIds = Array.from(
      new Set(meals.flatMap((meal) => meal.items.map((item) => item.ingredientId)))
    );

    const snapshots = await ctx.db.ingredientImpactSnapshot.findMany({
      where: { userId: ctx.userId, ingredientId: { in: ingredientIds } },
      orderBy: { computedAt: "desc" }
    });

    const snapshotMap = new Map<string, { impactScore: number; sampleSize: number }>();
    for (const snap of snapshots) {
      if (!snapshotMap.has(snap.ingredientId)) {
        snapshotMap.set(snap.ingredientId, { impactScore: snap.impactScore, sampleSize: snap.sampleSize });
      }
    }

    const candidates = ingredientIds
      .map((id) => {
        const meta = snapshotMap.get(id);
        const sampleSize = meta?.sampleSize ?? 0;
        const impactScore = meta?.impactScore ?? 0;
        const suspicion =
          (sampleSize === 0 ? 60 : sampleSize < 3 ? 45 : 20) +
          Math.min(20, Math.round((todayAvg - baselineAvg) * 10)) +
          (impactScore <= 3 ? 10 : 0);
        return { id, sampleSize, impactScore, suspicion };
      })
      .filter((item) => item.sampleSize < 5)
      .sort((a, b) => b.suspicion - a.suspicion)
      .slice(0, 5);

    if (candidates.length === 0) return [];

    const ingredients = await ctx.db.ingredient.findMany({
      where: { id: { in: candidates.map((c) => c.id) } }
    });

    return candidates.map((candidate) => {
      const ingredient = ingredients.find((i) => i.id === candidate.id);
      return {
        id: candidate.id,
        name: ingredient?.name ?? "Unknown ingredient",
        suspicion: candidate.suspicion,
        confidence: toConfidence(candidate.sampleSize),
        sampleSize: candidate.sampleSize
      };
    });
  })
});
