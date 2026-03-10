"use client";

import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

export default function InsightsPage() {
  const topTriggers = api.insight.getTopTriggers.useQuery();
  const unknownCulprits = api.insight.getUnknownCulprits.useQuery();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-5">
      <PageHeader title="Food Impact Insights" subtitle="Correlations ranked by confidence and symptom intensity." />

      <section className="rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <h2 className="text-lg font-semibold">Top negative triggers</h2>
        <ul className="mt-3 space-y-3">
          {(topTriggers.data ?? []).map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card/90 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{item.ingredient.name}</p>
                <span className="rounded-full border bg-accent/70 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {item.confidence.toLowerCase()}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Impact score: {item.impactScore.toFixed(1)} / 10</p>
            </li>
          ))}
          {(topTriggers.data?.length ?? 0) === 0 ? (
            <li className="text-sm text-muted-foreground">No trigger data yet. Log a few meals and symptoms first.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <h2 className="text-lg font-semibold">Possible new culprits</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These ingredients have limited history but show up before bad symptom days.
        </p>
        <ul className="mt-3 space-y-3">
          {(unknownCulprits.data ?? []).map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card/90 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{item.name}</p>
                <span className="rounded-full border bg-[hsl(35_100%_92%)] px-3 py-1 text-xs font-semibold text-[hsl(24_57%_26%)]">
                  suspicion {item.suspicion}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Evidence: {item.sampleSize} logs · Confidence: {item.confidence}
              </p>
            </li>
          ))}
          {(unknownCulprits.data?.length ?? 0) === 0 ? (
            <li className="text-sm text-muted-foreground">No unusual culprits detected yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
