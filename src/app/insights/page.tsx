"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function InsightsPage() {
  const [symptom, setSymptom] = useState<SymptomFilter>("all");
  const topTriggers = api.insight.getTopTriggers.useQuery(
    symptom === "all" ? undefined : { symptom }
  );
  const unknownCulprits = api.insight.getUnknownCulprits.useQuery();
  const recompute = api.insight.recomputeSnapshots.useMutation();

  return (
    <main className="min-h-dvh px-2 py-3">
      <PageHeader title="Food Impact Insights" subtitle="Correlations ranked by confidence and symptom intensity." />

      <section className="rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Top negative triggers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Start with the top 1-2 foods and test smaller portions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => recompute.mutate()}
              className="rounded-full border bg-white/92 px-3 py-1 text-xs font-semibold text-muted-foreground"
            >
              {recompute.isPending ? "Recomputing..." : "Recompute"}
            </button>
            <span className="rounded-full border bg-white/92 px-3 py-1 text-xs font-semibold text-muted-foreground">Watchlist</span>
          </div>
        </div>
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
        <ul className="mt-3 space-y-3">
          {(topTriggers.data ?? []).map((item) => (
            <li key={item.id} className="rounded-3xl border bg-white/92 p-4 shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold">
                    <Link href={`/ingredient/${item.ingredient.id}?symptom=${item.symptom}`}>{item.ingredient.name}</Link>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Why: linked with higher {item.symptom} across {item.evidenceCount} correlated logs.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{item.impactScore.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">impact / 10</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="rounded-full border bg-accent/70 px-3 py-1 text-accent-foreground">
                  {item.confidence.toLowerCase()} confidence
                </span>
                <span>
                  Example days: {item.exampleDays.length > 0 ? item.exampleDays.join(", ") : "Not enough days"}
                </span>
              </div>
            </li>
          ))}
          {(topTriggers.data?.length ?? 0) === 0 ? (
            <li className="rounded-2xl border bg-white/92 p-4 text-sm text-muted-foreground">
              No trigger data yet. Log a few meals and symptoms first to build the baseline.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Possible new culprits</h2>
            <p className="mt-1 text-sm text-muted-foreground">Low-history ingredients showing up before bad days.</p>
          </div>
          <span className="rounded-full border bg-white/92 px-3 py-1 text-xs font-semibold text-muted-foreground">Investigate</span>
        </div>
        <ul className="mt-3 space-y-3">
          {(unknownCulprits.data ?? []).map((item) => (
            <li key={item.id} className="rounded-3xl border bg-white/92 p-4 shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  <Link href={`/ingredient/${item.id}`}>{item.name}</Link>
                </p>
                <span className="rounded-full border bg-[hsl(35_100%_92%)] px-3 py-1 text-xs font-semibold text-[hsl(24_57%_26%)]">
                  suspicion {item.suspicion}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Evidence: {item.sampleSize} logs</span>
                <span>Confidence: {item.confidence}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Action: keep it in watch mode and log symptoms next morning.</p>
            </li>
          ))}
          {(unknownCulprits.data?.length ?? 0) === 0 ? (
            <li className="rounded-2xl border bg-white/92 p-4 text-sm text-muted-foreground">
              No unusual culprits detected yet. Keep logging to surface weak signals.
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
