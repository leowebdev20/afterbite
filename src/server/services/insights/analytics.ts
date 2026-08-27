import { toConfidence } from "@/server/services/correlations/calculate";
import { addDaysFromKey, formatDayKey, getLocalHour } from "@/server/services/timezone";

export type SymptomEntry = { symptom: string; severity: number; loggedAt: Date };
export type MealWithIngredientIds = { eatenAt: Date; items: Array<{ ingredientId: string }> };
export type SnapshotLike = { symptom: string; impactScore: number; sampleSize: number };

type EntryBuckets = Map<string, { all: number[]; morning: number[] }>;

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function buildEntryBuckets(entries: SymptomEntry[], timeZone: string): EntryBuckets {
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

export function buildIngredientWindows(meals: MealWithIngredientIds[], timeZone: string) {
  const ingredientWindows = new Map<string, { allKeys: Set<string>; morningKeys: Set<string> }>();
  for (const meal of meals) {
    const mealKey = formatDayKey(meal.eatenAt, timeZone);
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
  return ingredientWindows;
}

export function buildDaySymptomIndex(entries: SymptomEntry[], timeZone: string) {
  const byDay = new Map<string, { all: number[]; bySymptom: Map<string, number[]> }>();
  for (const entry of entries) {
    const day = formatDayKey(entry.loggedAt, timeZone);
    const dayData = byDay.get(day) ?? { all: [] as number[], bySymptom: new Map<string, number[]>() };
    dayData.all.push(entry.severity);
    const symptomValues = dayData.bySymptom.get(entry.symptom) ?? [];
    symptomValues.push(entry.severity);
    dayData.bySymptom.set(entry.symptom, symptomValues);
    byDay.set(day, dayData);
  }
  return byDay;
}

export function entriesFromLogs<TLog extends { loggedAt: Date; entries: Array<{ symptom: string; severity: number }> }>(
  logs: TLog[]
): SymptomEntry[] {
  return logs.flatMap((log) => log.entries.map((entry) => ({ ...entry, loggedAt: log.loggedAt })));
}

export function buildSnapshotRows(input: {
  userId: string;
  meals: MealWithIngredientIds[];
  entries: SymptomEntry[];
  timeZone: string;
  computedAt: Date;
}) {
  const entryBuckets = buildEntryBuckets(input.entries, input.timeZone);
  const ingredientWindows = buildIngredientWindows(input.meals, input.timeZone);
  const aggregated = new Map<string, number[]>();

  for (const [ingredientId, window] of ingredientWindows.entries()) {
    const grouped = new Map<string, number[]>();
    for (const key of window.allKeys) {
      for (const entry of input.entries.filter((entry) => formatDayKey(entry.loggedAt, input.timeZone) === key)) {
        const values = grouped.get(entry.symptom) ?? [];
        values.push(entry.severity);
        grouped.set(entry.symptom, values);
      }
    }
    for (const key of window.morningKeys) {
      for (const entry of input.entries.filter(
        (entry) => formatDayKey(entry.loggedAt, input.timeZone) === key && getLocalHour(entry.loggedAt, input.timeZone) < 12
      )) {
        const values = grouped.get(entry.symptom) ?? [];
        values.push(entry.severity);
        grouped.set(entry.symptom, values);
      }
    }

    for (const [symptom, values] of grouped.entries()) {
      const aggregateKey = `${ingredientId}::${symptom}`;
      const current = aggregated.get(aggregateKey) ?? [];
      current.push(...values);
      aggregated.set(aggregateKey, current);
    }
  }

  return Array.from(aggregated.entries()).flatMap(([key, values]) => {
    const [ingredientId, symptom] = key.split("::");
    if (!ingredientId || !symptom) return [];
    return {
      userId: input.userId,
      ingredientId,
      impactScore: clamp(1, average(values), 10),
      confidence: values.length >= 12 ? ("HIGH" as const) : values.length >= 4 ? ("MEDIUM" as const) : ("LOW" as const),
      sampleSize: values.length,
      symptom,
      computedAt: input.computedAt
    };
  });
}

export function getExampleDays(input: {
  ingredientId: string;
  symptom: string;
  meals: MealWithIngredientIds[];
  entries: SymptomEntry[];
  timeZone: string;
}) {
  const windows = buildIngredientWindows(input.meals, input.timeZone).get(input.ingredientId);
  const dayIndex = buildDaySymptomIndex(input.entries, input.timeZone);
  const scoredDays: Array<{ day: string; avg: number }> = [];

  for (const day of windows?.allKeys ?? []) {
    const values = dayIndex.get(day)?.bySymptom.get(input.symptom) ?? [];
    if (values.length > 0) scoredDays.push({ day, avg: average(values) });
  }
  for (const day of windows?.morningKeys ?? []) {
    const values = dayIndex.get(day)?.bySymptom.get(input.symptom) ?? [];
    if (values.length > 0) scoredDays.push({ day, avg: average(values) });
  }

  return scoredDays
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 2)
    .map((entry) => entry.day);
}

export function buildUnknownCulpritStats(input: {
  meals: MealWithIngredientIds[];
  entries: SymptomEntry[];
  timeZone: string;
  baselineAvg: number;
}) {
  const entryBuckets = buildEntryBuckets(input.entries, input.timeZone);
  const ingredientWindows = buildIngredientWindows(input.meals, input.timeZone);
  const ingredientCounts = new Map<string, number>();

  for (const meal of input.meals) {
    for (const item of meal.items) {
      ingredientCounts.set(item.ingredientId, (ingredientCounts.get(item.ingredientId) ?? 0) + 1);
    }
  }

  return Array.from(ingredientWindows.entries())
    .map(([ingredientId, window]) => {
      const severities: number[] = [];
      for (const key of window.allKeys) severities.push(...(entryBuckets.get(key)?.all ?? []));
      for (const key of window.morningKeys) severities.push(...(entryBuckets.get(key)?.morning ?? []));
      const score = average(severities);
      const sampleSize = severities.length;
      const freq = ingredientCounts.get(ingredientId) ?? 1;
      const suspicion =
        Math.max(0, score - input.baselineAvg) * 20 + Math.max(0, 6 - sampleSize) * 6 + Math.min(20, freq * 4);
      return { ingredientId, sampleSize, score, suspicion };
    })
    .filter((stat) => stat.sampleSize < 6)
    .sort((a, b) => b.suspicion - a.suspicion)
    .slice(0, 5);
}

export function buildSymptomBreakdown(snapshots: SnapshotLike[]) {
  const groupedSnapshots = new Map<string, SnapshotLike[]>();
  for (const snapshot of snapshots) {
    const values = groupedSnapshots.get(snapshot.symptom) ?? [];
    values.push(snapshot);
    groupedSnapshots.set(snapshot.symptom, values);
  }

  return Array.from(groupedSnapshots.entries())
    .map(([symptom, values]) => {
      const sampleSize = values.reduce((sum, value) => sum + value.sampleSize, 0);
      return {
        symptom,
        avgImpact: Number(average(values.map((value) => value.impactScore)).toFixed(2)),
        sampleSize,
        confidence: toConfidence(sampleSize)
      };
    })
    .sort((a, b) => b.avgImpact - a.avgImpact);
}

export function buildIngredientTrend(input: {
  meals: MealWithIngredientIds[];
  entries: SymptomEntry[];
  timeZone: string;
}) {
  const entryBuckets = buildEntryBuckets(input.entries, input.timeZone);
  return input.meals.slice(0, 10).map((meal) => {
    const mealKey = formatDayKey(meal.eatenAt, input.timeZone);
    const day1 = entryBuckets.get(addDaysFromKey(mealKey, 1));
    const day2 = entryBuckets.get(addDaysFromKey(mealKey, 2));
    const day3 = entryBuckets.get(addDaysFromKey(mealKey, 3));
    const severities = [...(day1?.all ?? []), ...(day2?.all ?? []), ...(day3?.morning ?? [])];
    const score = severities.length ? average(severities) : null;
    return {
      date: meal.eatenAt.toISOString().slice(0, 10),
      score: score !== null ? Number(score.toFixed(2)) : null
    };
  });
}
