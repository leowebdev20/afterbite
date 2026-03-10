import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { predictTomorrow } from "@/server/services/forecasting/tomorrow";
import { computeImpactScore, type SymptomVector } from "@/server/services/scoring/impact";

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
  getTomorrowPrediction: protectedProcedure.query(async ({ ctx }) => {
    const recent = await ctx.db.symptomLog.findFirst({
      where: { userId: ctx.userId },
      include: { entries: true },
      orderBy: { loggedAt: "desc" }
    });

    const base = toSymptomVector(recent?.entries ?? []);
    return predictTomorrow(base, 1.2);
  }),
  getDailyImpactScore: protectedProcedure.query(async ({ ctx }) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const logs = await ctx.db.symptomLog.findMany({
      where: { userId: ctx.userId, loggedAt: { gte: start } },
      include: { entries: true },
      orderBy: { loggedAt: "desc" }
    });

    const vector = toSymptomVector(logs.flatMap((log) => log.entries));
    const score = computeImpactScore(vector);

    return {
      score,
      confidence: logs.length >= 6 ? "high" : logs.length >= 2 ? "medium" : "low"
    };
  }),
  getWeeklyImpactSummary: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const logs = await ctx.db.symptomLog.findMany({
      where: { userId: ctx.userId, loggedAt: { gte: start } },
      include: { entries: true },
      orderBy: { loggedAt: "asc" }
    });

    const days: Array<{ date: string; score: number | null }> = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      const dayLogs = logs.filter((log) => log.loggedAt >= dayStart && log.loggedAt <= dayEnd);
      const vector = toSymptomVector(dayLogs.flatMap((log) => log.entries));
      const score = dayLogs.length > 0 ? computeImpactScore(vector) : null;
      days.push({ date: day.toISOString().slice(0, 10), score });
    }

    return { days };
  })
});
