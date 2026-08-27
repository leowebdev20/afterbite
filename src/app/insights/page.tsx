"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  BrainCircuit,
  CalendarDays,
  Sparkles,
  TriangleAlert,
  Wand2
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusMessage } from "@/components/common/status-message";
import { api } from "@/trpc/client";
import { readLastRecomputeAt, shouldAutoRecompute, writeLastRecomputeAt } from "@/lib/daily-recompute";

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
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const watchlistRef = useRef<HTMLElement | null>(null);
  const pullStartY = useRef<number | null>(null);
  const topTriggers = api.insight.getTopTriggers.useQuery(
    symptom === "all" ? undefined : { symptom }
  );
  const unknownCulprits = api.insight.getUnknownCulprits.useQuery();
  const recompute = api.insight.recomputeSnapshots.useMutation();

  const scrollToWatchlist = () => {
    watchlistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRecompute = async () => {
    await recompute.mutateAsync();
    writeLastRecomputeAt(Date.now());
  };

  useEffect(() => {
    const lastRun = readLastRecomputeAt();
    if (shouldAutoRecompute(lastRun, Date.now())) {
      void handleRecompute();
    }
  }, []);

  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (window.scrollY > 0) return;
    pullStartY.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (pullStartY.current == null || window.scrollY > 0) return;
    const nextDistance = Math.max(0, (event.touches[0]?.clientY ?? 0) - pullStartY.current);
    if (nextDistance > 0) {
      setIsPulling(true);
      setPullDistance(Math.min(nextDistance * 0.6, 120));
    }
  };

  const onTouchEnd = () => {
    if (pullDistance >= 80 && !recompute.isPending) {
      void handleRecompute();
    }
    setPullDistance(0);
    setIsPulling(false);
    pullStartY.current = null;
  };

  return (
    <main
      className="min-h-dvh px-2 py-3"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ transform: `translateY(${pullDistance}px)`, transition: isPulling ? "none" : "transform 0.2s ease-out" }}
    >
      <div className="mb-2 flex justify-center">
        <div
          className={`overflow-hidden transition-all duration-200 ${pullDistance > 0 ? "opacity-100" : "opacity-0"}`}
          style={{ height: `${Math.min(pullDistance, 32)}px` }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/90 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            <BrainCircuit className="h-3.5 w-3.5" />
            {recompute.isPending ? "Refreshing insights..." : pullDistance >= 80 ? "Release to refresh" : "Pull to refresh"}
          </div>
        </div>
      </div>

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
              onClick={() => void handleRecompute()}
              className="inline-flex items-center gap-2 rounded-full border border-[hsl(245_54%_62%)] bg-[linear-gradient(135deg,hsl(245_58%_62%),hsl(218_64%_61%))] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(92,101,184,0.26)] transition-transform active:scale-[0.98]"
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              {recompute.isPending ? "Recomputing..." : "Recompute"}
            </button>
            <button
              type="button"
              onClick={scrollToWatchlist}
              className="rounded-full border bg-white/90 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-slate-50"
            >
              Watchlist
            </button>
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
          {topTriggers.isLoading ? (
            <li>
              <StatusMessage tone="loading" title="Checking your strongest patterns" body="This usually takes a moment." />
            </li>
          ) : null}
          {topTriggers.error ? (
            <li>
              <StatusMessage tone="error" title="Could not load trigger insights" body="Try recomputing or refreshing the page." />
            </li>
          ) : null}
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
              <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[hsl(145_37%_82%)] bg-[hsl(146_42%_94%)] px-2.5 py-1 font-medium text-[hsl(145_48%_22%)]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {item.confidence.toLowerCase()} confidence
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="font-medium text-slate-700">Example days</span>
                  <span className="ml-0.5">{item.exampleDays.length > 0 ? item.exampleDays.join(", ") : "Not enough data"}</span>
                </span>
              </div>
            </li>
          ))}
          {!topTriggers.isLoading && !topTriggers.error && (topTriggers.data?.length ?? 0) === 0 ? (
            <li>
              <StatusMessage title="No trigger data yet" body="Log a few meals and symptom entries, then recompute insights." />
            </li>
          ) : null}
        </ul>
      </section>

      <section ref={watchlistRef} className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Possible new culprits</h2>
            <p className="mt-1 text-sm text-muted-foreground">Low-history ingredients showing up before bad days.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(35_100%_85%)] bg-[hsl(35_100%_96%)] px-2.5 py-1 text-[10px] font-semibold text-[hsl(28_48%_26%)]">
            <TriangleAlert className="h-3 w-3" />
            Investigate
          </span>
        </div>
        <ul className="mt-3 space-y-3">
          {unknownCulprits.isLoading ? (
            <li>
              <StatusMessage tone="loading" title="Scanning for weak signals" body="Looking for unusual ingredients before bad days." />
            </li>
          ) : null}
          {unknownCulprits.error ? (
            <li>
              <StatusMessage tone="error" title="Could not load the watchlist" body="Refresh and try again in a moment." />
            </li>
          ) : null}
          {(unknownCulprits.data ?? []).map((item) => (
            <li key={item.id} className="rounded-3xl border bg-white/92 p-4 shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  <Link href={`/ingredient/${item.id}`}>{item.name}</Link>
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(35_100%_85%)] bg-[hsl(35_100%_96%)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(24_57%_26%)]">
                  <Wand2 className="h-3 w-3" />
                  suspicion {item.suspicion}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Evidence: {item.sampleSize} logs
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Confidence: {item.confidence}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Action: keep it in watch mode and log symptoms next morning.</p>
            </li>
          ))}
          {!unknownCulprits.isLoading && !unknownCulprits.error && (unknownCulprits.data?.length ?? 0) === 0 ? (
            <li>
              <StatusMessage title="No unusual culprits detected" body="Keep logging. This section gets useful once new ingredients repeat around bad symptom days." />
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
