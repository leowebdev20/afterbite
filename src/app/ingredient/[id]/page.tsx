"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

const SYMPTOM_FILTERS = [
  { value: "all", label: "All symptoms" },
  { value: "bloating", label: "Bloating" },
  { value: "stomachPain", label: "Stomach pain" },
  { value: "inflammation", label: "Inflammation" },
  { value: "fatigue", label: "Fatigue" },
  { value: "brainFog", label: "Brain fog" },
  { value: "headache", label: "Headache" },
  { value: "digestionQuality", label: "Digestion" },
  { value: "mood", label: "Mood" },
  { value: "energy", label: "Energy" }
] as const;

type SymptomFilter = (typeof SYMPTOM_FILTERS)[number]["value"];

function labelForSymptom(symptom: string) {
  return SYMPTOM_FILTERS.find((entry) => entry.value === symptom)?.label ?? symptom;
}

export default function IngredientImpactPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialSymptom = (searchParams.get("symptom") as SymptomFilter | null) ?? "all";
  const [symptom, setSymptom] = useState<SymptomFilter>(initialSymptom);
  const ingredientId = typeof params?.id === "string" ? params.id : "";

  const detail = api.insight.getIngredientDetail.useQuery(
    {
      ingredientId,
      symptom: symptom === "all" ? undefined : symptom
    },
    { enabled: ingredientId.length > 0 }
  );

  const trend = detail.data?.trend ?? [];
  const recent = detail.data?.recent ?? [];
  const breakdown = detail.data?.symptomBreakdown ?? [];

  const selectedLabel = useMemo(() => {
    return symptom === "all" ? "All symptoms" : labelForSymptom(symptom);
  }, [symptom]);

  return (
    <main className="min-h-dvh px-2 py-3">
      <PageHeader title="Ingredient Impact" subtitle="Trend and symptom history after eating this ingredient." />

      <section className="rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Average impact</p>
          <span className="rounded-full border bg-white/92 px-3 py-1 text-xs font-semibold text-muted-foreground">
            Filter: {selectedLabel}
          </span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-semibold">{detail.data?.averageImpact ?? "--"}</span>
          <span className="text-lg text-muted-foreground">/ 10</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Lower is better. Scores reflect next-day and day+2/day+3 symptom windows.</p>
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)]">
        <h2 className="text-lg font-semibold">Related symptoms</h2>
        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {SYMPTOM_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSymptom(option.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  symptom === option.value
                    ? "bg-[hsl(243_44%_92%)] text-[hsl(243_35%_35%)]"
                    : "bg-white/92 text-muted-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-3 space-y-2">
          {breakdown.map((item) => (
            <li key={item.symptom} className="flex items-center justify-between rounded-2xl border bg-white/92 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">{labelForSymptom(item.symptom)}</p>
                <p className="text-xs text-muted-foreground">{item.sampleSize} evidence logs</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{item.avgImpact.toFixed(1)} / 10</p>
                <p className="text-[10px] text-muted-foreground">{item.confidence} confidence</p>
              </div>
            </li>
          ))}
          {breakdown.length === 0 ? (
            <li className="text-sm text-muted-foreground">No breakdown available yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent trend</h2>
          <span className="text-xs text-muted-foreground">Last 10 correlated windows</span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {trend.map((point) => (
            <div key={point.date} className="flex flex-col items-center gap-2">
              <div className="relative h-16 w-8 rounded-full bg-[hsl(206_30%_89%)]">
                <div
                  className="absolute bottom-1 left-1 right-1 rounded-full bg-gradient-to-b from-[hsl(191_75%_44%)] via-[hsl(169_55%_48%)] to-[hsl(42_92%_62%)]"
                  style={{ height: `${Math.max(12, (point.score ?? 0) * 6)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{point.date.slice(5)}</span>
            </div>
          ))}
          {trend.length === 0 ? <p className="text-sm text-muted-foreground">No trend data yet.</p> : null}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-xl font-semibold">Recent symptom entries</h2>
        <ul className="mt-3 space-y-3">
          {recent.map((entry, index) => (
            <li key={`${entry.symptom}-${index}`} className="rounded-3xl border bg-white/95 p-4 shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{labelForSymptom(entry.symptom)}</p>
                <span className="rounded-full border bg-accent/70 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {entry.severity} / 10
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(entry.loggedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </li>
          ))}
          {recent.length === 0 ? <li className="text-sm text-muted-foreground">No symptom entries yet.</li> : null}
        </ul>
      </section>
    </main>
  );
}
