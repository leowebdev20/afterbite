"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

export default function InsightsPage() {
  const topTriggers = api.insight.getTopTriggers.useQuery();
  const unknownCulprits = api.insight.getUnknownCulprits.useQuery();
  const recompute = api.insight.recomputeSnapshots.useMutation();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-5">
      <PageHeader title="Food Impact Insights" subtitle="Correlations ranked by confidence and symptom intensity." />

      <section className="rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Top negative triggers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Foods most linked to worse symptoms in your logs.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => recompute.mutate()}
              className="rounded-full border bg-card/90 px-3 py-1 text-xs font-semibold text-muted-foreground"
            >
              {recompute.isPending ? "Recomputing..." : "Recompute"}
            </button>
            <span className="rounded-full border bg-card/90 px-3 py-1 text-xs font-semibold text-muted-foreground">Watchlist</span>
          </div>
        </div>
        <ul className="mt-3 space-y-3">
          {(topTriggers.data ?? []).map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card/90 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold">
                    <Link href={`/ingredient/${item.ingredient.id}`}>{item.ingredient.name}</Link>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Suggested action: reduce or isolate</p>
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
                <span>Based on recent logs</span>
              </div>
            </li>
          ))}
          {(topTriggers.data?.length ?? 0) === 0 ? (
            <li className="rounded-2xl border bg-card/90 p-4 text-sm text-muted-foreground">
              No trigger data yet. Log a few meals and symptoms first to build the baseline.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Possible new culprits</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingredients with limited history that appear before bad symptom days.
            </p>
          </div>
          <span className="rounded-full border bg-card/90 px-3 py-1 text-xs font-semibold text-muted-foreground">Investigate</span>
        </div>
        <ul className="mt-3 space-y-3">
          {(unknownCulprits.data ?? []).map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card/90 p-4">
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
              <p className="mt-2 text-xs text-muted-foreground">Suggested action: tag and track in the next 2–3 meals.</p>
            </li>
          ))}
          {(unknownCulprits.data?.length ?? 0) === 0 ? (
            <li className="rounded-2xl border bg-card/90 p-4 text-sm text-muted-foreground">
              No unusual culprits detected yet. Keep logging to surface weak signals.
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
