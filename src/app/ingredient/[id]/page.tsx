"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

export default function IngredientImpactPage({ params }: { params: Promise<{ id: string }> }) {
  const [ingredientId, setIngredientId] = useMemo(() => {
    let value = "";
    params.then((p) => {
      value = p.id;
    });
    return [value, () => {}] as const;
  }, [params]);

  const detail = api.insight.getIngredientDetail.useQuery(
    { ingredientId },
    { enabled: ingredientId.length > 0 }
  );

  const trend = detail.data?.trend ?? [];
  const recent = detail.data?.recent ?? [];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-5">
      <PageHeader title="Ingredient Impact" subtitle="Trend and recent symptom history after eating." />

      <section className="rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <p className="text-sm text-muted-foreground">Average impact</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-semibold">{detail.data?.averageImpact ?? "--"}</span>
          <span className="text-lg text-muted-foreground">/ 10</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Lower is better. Scores reflect next‑day symptoms after eating.</p>
      </section>

      <section className="mt-4 rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent trend</h2>
          <span className="text-xs text-muted-foreground">Last 10 meals</span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {trend.map((point) => (
            <div key={point.date} className="flex flex-col items-center gap-2">
              <div className="relative h-16 w-8 rounded-full bg-[hsl(196_28%_90%)]">
                <div
                  className="absolute bottom-1 left-1 right-1 rounded-full bg-gradient-to-b from-[hsl(191_75%_44%)] via-[hsl(169_55%_48%)] to-[hsl(42_92%_62%)]"
                  style={{ height: `${Math.max(12, (point.score ?? 0) * 6)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{point.date.slice(5)}</span>
            </div>
          ))}
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trend data yet.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-xl font-semibold">Recent symptom entries</h2>
        <ul className="mt-3 space-y-3">
          {recent.map((entry, index) => (
            <li key={`${entry.symptom}-${index}`} className="rounded-2xl border bg-card/85 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{entry.symptom}</p>
                <span className="rounded-full border bg-accent/70 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {entry.severity} / 10
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(entry.loggedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </li>
          ))}
          {recent.length === 0 ? (
            <li className="text-sm text-muted-foreground">No symptom entries yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
