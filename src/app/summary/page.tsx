"use client";

import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

const SYMPTOM_LABELS: Record<string, string> = {
  bloating: "Bloating",
  stomachPain: "Stomach pain",
  inflammation: "Inflammation",
  fatigue: "Fatigue",
  brainFog: "Brain fog",
  headache: "Headache",
  digestionQuality: "Digestion",
  mood: "Mood",
  energy: "Energy"
};

function formatDayLabel(date: string) {
  const [month, day] = date.slice(5).split("-");
  return `${day}.${month}`;
}

export default function SummaryPage() {
  const daily = api.forecast.getDailyImpactScore.useQuery();
  const weekly = api.forecast.getWeeklyImpactSummary.useQuery();
  const todaySymptoms = api.symptom.listTodaySymptoms.useQuery();
  const todayMeals = api.meal.listTodayMeals.useQuery();

  const weekScores = (weekly.data?.days ?? []).map((d) => d.score).filter((s): s is number => s !== null);
  const avgImpact = weekScores.length ? weekScores.reduce((a, b) => a + b, 0) / weekScores.length : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-5">
      <PageHeader title="Daily Summary" subtitle="Daily impact score and key food-symptom patterns." />

      <section className="rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <p className="text-sm text-muted-foreground">Today&apos;s Impact</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-semibold">{daily.data ? daily.data.score : "--"}</span>
          <span className="text-lg text-muted-foreground">/ 10</span>
          <span className="ml-auto rounded-full border bg-accent/70 px-3 py-1 text-xs font-semibold text-accent-foreground">
            {daily.data?.confidence ?? "--"} confidence
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Lower is better: 1 = minimal impact, 10 = strongest negative impact.</p>
      </section>

      <section className="mt-4 rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Last 7 days</h2>
          <span className="text-xs text-muted-foreground">
            Avg impact {avgImpact !== null ? avgImpact.toFixed(1) : "--"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {(weekly.data?.days ?? []).map((day) => {
            const height = day.score !== null ? Math.max(18, day.score * 7.2) : 18;
            return (
              <div key={day.date} className="flex flex-col items-center gap-2">
                <div className="relative h-20 w-8 rounded-full bg-[hsl(196_28%_90%)]">
                  <div
                    className="absolute bottom-1 left-1 right-1 rounded-full bg-gradient-to-b from-[hsl(191_75%_44%)] via-[hsl(169_55%_48%)] to-[hsl(42_92%_62%)]"
                    style={{ height }}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{formatDayLabel(day.date)}</span>
              </div>
            );
          })}
          {(weekly.data?.days?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet for the last week.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card/85 p-4 text-center shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
          <p className="text-sm text-muted-foreground">Meals logged</p>
          <p className="mt-1 text-3xl font-semibold">{todayMeals.data?.length ?? 0}</p>
        </div>
        <div className="rounded-2xl border bg-card/85 p-4 text-center shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
          <p className="text-sm text-muted-foreground">Symptom logs</p>
          <p className="mt-1 text-3xl font-semibold">{todaySymptoms.data?.length ?? 0}</p>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-xl font-semibold">Latest symptoms</h2>
        <ul className="mt-3 space-y-3">
          {(todaySymptoms.data ?? []).slice(0, 3).map((log) => {
            const entries = log.entries.slice(0, 6);
            const extra = Math.max(0, log.entries.length - entries.length);
            const total = log.entries.reduce((sum, entry) => sum + entry.severity, 0);
            const avg = log.entries.length > 0 ? total / log.entries.length : 0;
            return (
              <li key={log.id} className="rounded-2xl border bg-card/85 p-4 shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{new Date(log.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  <span className="rounded-full border bg-accent/70 px-2 py-1 text-[10px] font-semibold text-accent-foreground">
                    Impact {avg.toFixed(1)} / 10
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entries.map((entry) => (
                    <span key={entry.id} className="rounded-full border bg-card/90 px-3 py-1 text-xs font-medium text-foreground">
                      {SYMPTOM_LABELS[entry.symptom] ?? entry.symptom}: {entry.severity}
                    </span>
                  ))}
                  {extra > 0 ? (
                    <span className="rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">+{extra} more</span>
                  ) : null}
                </div>
              </li>
            );
          })}
          {(todaySymptoms.data?.length ?? 0) === 0 ? (
            <li className="text-sm text-muted-foreground">No symptoms logged yet today.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-5">
        <h2 className="text-xl font-semibold">Meals logged</h2>
        <ul className="mt-2 space-y-2">
          {(todayMeals.data ?? []).slice(0, 3).map((meal) => (
            <li key={meal.id} className="rounded-2xl border bg-card/85 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{meal.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(meal.eatenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {meal.items.map((item) => item.ingredient.name).join(", ") || "No ingredients"}
              </p>
            </li>
          ))}
          {(todayMeals.data?.length ?? 0) === 0 ? (
            <li className="text-sm text-muted-foreground">No meals logged yet today.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
