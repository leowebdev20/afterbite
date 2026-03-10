"use client";

import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

export default function SummaryPage() {
  const daily = api.forecast.getDailyImpactScore.useQuery();
  const todaySymptoms = api.symptom.listTodaySymptoms.useQuery();
  const todayMeals = api.meal.listTodayMeals.useQuery();

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
        <ul className="mt-2 space-y-2">
          {(todaySymptoms.data ?? []).slice(0, 3).map((log) => (
            <li key={log.id} className="rounded-2xl border bg-card/85 p-4">
              <p className="text-xs text-muted-foreground">
                {new Date(log.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {log.entries.map((entry) => `${entry.symptom}: ${entry.severity}`).join(" · ")}
              </p>
            </li>
          ))}
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
