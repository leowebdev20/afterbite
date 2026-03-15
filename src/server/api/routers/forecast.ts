import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { predictTomorrow } from "@/server/services/forecasting/tomorrow";
import { computeImpactScore, type SymptomVector } from "@/server/services/scoring/impact";
import { addDaysFromKey, formatDayKey, getTodayKey } from "@/server/services/timezone";

const SYMPTOM_KEYS: Array<keyof SymptomVector> = [
  "bloating",
  "stomachPain",
  "inflammation",
  "fatigue",
  "brainFog",
  "headache",
  "digestionQuality",
  "mood",
  "energy"
];

function toSymptomVector(entries: Array<{ symptom: string; severity: number }>): SymptomVector {
  const vector: SymptomVector = {
    bloating: 5,
    stomachPain: 5,
    inflammation: 5,
    fatigue: 5,
    brainFog: 5,
    headache: 5,
    digestionQuality: 5,
    mood: 5,
    energy: 5
  };

  for (const key of SYMPTOM_KEYS) {
    const matching = entries.filter((entry) => entry.symptom === key);
    if (matching.length === 0) continue;
    const avg = matching.reduce((sum, entry) => sum + entry.severity, 0) / matching.length;
    vector[key] = Number(avg.toFixed(2));
  }

  return vector;
}

export const forecastRouter = createTRPCRouter({
  getTomorrowPrediction: protectedProcedure
    .output(
      z.object({
        symptoms: z.object({
          bloating: z.number(),
          stomachPain: z.number(),
          inflammation: z.number(),
          fatigue: z.number(),
          brainFog: z.number(),
          headache: z.number(),
          digestionQuality: z.number(),
          mood: z.number(),
          energy: z.number()
        }),
        impactScore: z.number()
      })
    )
    .query(async ({ ctx }) => {
    const recent = await ctx.db.symptomLog.findFirst({
      where: { userId: ctx.userId },
      include: { entries: true },
      orderBy: { loggedAt: "desc" }
    });

    const base = toSymptomVector(recent?.entries ?? []);
    return predictTomorrow(base, 1.2);
  }),
  getDailyImpactScore: protectedProcedure
    .output(z.object({ score: z.number(), confidence: z.enum(["low", "medium", "high"]) }))
    .query(async ({ ctx }) => {
    const logs = await ctx.db.symptomLog.findMany({
      where: { userId: ctx.userId },
      include: { entries: true },
      orderBy: { loggedAt: "desc" }
    });

    const todayKey = getTodayKey(ctx.timeZone);
    const entries = logs.flatMap((log) =>
      log.entries.map((entry) => ({ ...entry, loggedAt: log.loggedAt }))
    );
    const todayEntries = entries.filter((entry) => formatDayKey(entry.loggedAt, ctx.timeZone) === todayKey);
    const vector = toSymptomVector(todayEntries);
    const score = computeImpactScore(vector);

    return {
      score,
      confidence: todayEntries.length >= 6 ? "high" : todayEntries.length >= 2 ? "medium" : "low"
    };
  }),
  getWeeklyImpactSummary: protectedProcedure
    .output(
      z.object({
        days: z.array(z.object({ date: z.string(), score: z.number().nullable() }))
      })
    )
    .query(async ({ ctx }) => {
    const logs = await ctx.db.symptomLog.findMany({
      where: { userId: ctx.userId },
      include: { entries: true },
      orderBy: { loggedAt: "asc" }
    });

    const entries = logs.flatMap((log) =>
      log.entries.map((entry) => ({ ...entry, loggedAt: log.loggedAt }))
    );
    const todayKey = getTodayKey(ctx.timeZone);
    const startKey = addDaysFromKey(todayKey, -6);

    const days: Array<{ date: string; score: number | null }> = [];
    for (let i = 0; i < 7; i += 1) {
      const dayKey = addDaysFromKey(startKey, i);
      const dayEntries = entries.filter((entry) => formatDayKey(entry.loggedAt, ctx.timeZone) === dayKey);
      const vector = toSymptomVector(dayEntries);
      const score = dayEntries.length > 0 ? computeImpactScore(vector) : null;
      days.push({ date: dayKey, score });
    }

    return { days };
  })
});
