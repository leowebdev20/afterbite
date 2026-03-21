"use client";

import Link from "next/link";
import Image from "next/image";
import { Activity, ChevronRight, Clock3, Sparkles, TriangleAlert, Utensils } from "lucide-react";
import { api } from "@/trpc/client";

function scoreTone(score: number) {
  if (score <= 3) return "Low";
  if (score <= 6) return "Moderate";
  return "High";
}

export default function HomePage() {
  const daily = api.forecast.getDailyImpactScore.useQuery();
  const tomorrow = api.forecast.getTomorrowPrediction.useQuery();
  const todayMeals = api.meal.listTodayMeals.useQuery();
  const todaySymptoms = api.symptom.listTodaySymptoms.useQuery();
  const topTriggers = api.insight.getTopTriggers.useQuery();

  const score = daily.data?.score ?? 0;
  const circle = Math.max(0, Math.min(100, score * 10));
  const mealsCount = todayMeals.data?.length ?? 0;
  const symptomCount = todaySymptoms.data?.length ?? 0;
  const triggerCount = topTriggers.data?.length ?? 0;

  return (
    <main className="min-h-dvh px-2 py-3">
      <section className="rounded-[2rem] border bg-white/95 p-4 shadow-[0_10px_30px_rgba(75,94,140,0.16)]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border bg-white p-1">
            <Image src="/logo.png" alt="AfterBite logo" width={36} height={36} className="h-9 w-9 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AfterBite</h1>
            <p className="text-sm text-muted-foreground">Welcome Leo</p>
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-[2rem] border bg-card/85 p-4 shadow-[0_10px_30px_rgba(75,94,140,0.16)] backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold">Today&apos;s Impact</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Lower is better</p>
          </div>
          <span className="rounded-full bg-[hsl(153_42%_92%)] px-2.5 py-1 text-xs font-semibold text-[hsl(157_55%_24%)]">
            {daily.data?.confidence ?? "low"} confidence
          </span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div
            className="grid h-28 w-28 place-items-center rounded-full"
            style={{
              background: `conic-gradient(
                from 210deg,
                hsl(197 78% 46%) 0%,
                hsl(166 58% 48%) ${Math.max(10, circle * 0.72)}%,
                hsl(45 93% 63%) ${circle}%,
                hsl(215 26% 89%) ${circle}% 100%
              )`
            }}
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-card text-2xl font-semibold shadow-[inset_0_0_18px_rgba(88,107,145,0.08)]">
              {daily.data ? daily.data.score : "--"}
              <span className="text-xs font-medium text-muted-foreground">/10</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Impact level</p>
            <p className="text-2xl font-semibold">{scoreTone(score)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              1-3 low impact, 4-6 moderate, 7-10 high negative impact
            </p>
          </div>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <article className="rounded-3xl border bg-card/85 p-4 shadow-[0_8px_20px_rgba(75,94,140,0.12)]">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(154_45%_90%)]">
            <Utensils className="h-4 w-4 text-[hsl(158_58%_28%)]" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{mealsCount}</p>
          <p className="text-sm text-muted-foreground">Meals logged today</p>
        </article>
        <article className="rounded-3xl border bg-card/85 p-4 shadow-[0_8px_20px_rgba(75,94,140,0.12)]">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(190_58%_90%)]">
            <Activity className="h-4 w-4 text-[hsl(197_70%_37%)]" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{symptomCount}</p>
          <p className="text-sm text-muted-foreground">Symptom logs today</p>
        </article>
        <article className="rounded-3xl border bg-card/85 p-4 shadow-[0_8px_20px_rgba(75,94,140,0.12)]">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(355_55%_92%)]">
            <TriangleAlert className="h-4 w-4 text-[hsl(354_62%_43%)]" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{triggerCount}</p>
          <p className="text-sm text-muted-foreground">Foods to watch</p>
        </article>
        <article className="rounded-3xl border bg-card/85 p-4 shadow-[0_8px_20px_rgba(75,94,140,0.12)]">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(245_62%_91%)]">
            <Sparkles className="h-4 w-4 text-[hsl(245_44%_47%)]" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{tomorrow.data?.impactScore ?? "--"}</p>
          <p className="text-sm text-muted-foreground">Tomorrow predicted impact</p>
        </article>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/log-symptoms"
          className="rounded-3xl border bg-card/85 px-4 py-3 text-center text-sm font-semibold shadow-[0_8px_20px_rgba(75,94,140,0.12)]"
        >
          Log symptoms now
        </Link>
        <Link
          href="/recipes"
          className="rounded-3xl border bg-card/85 px-4 py-3 text-center text-sm font-semibold shadow-[0_8px_20px_rgba(75,94,140,0.12)]"
        >
          Open recipes
        </Link>
      </section>

      <section className="mt-3 rounded-[2rem] border bg-card/85 p-4 shadow-[0_10px_30px_rgba(75,94,140,0.16)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recent meals</h2>
            <p className="text-sm text-muted-foreground">Tap to continue tracking</p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" />
        </div>
        <ul className="mt-3 space-y-2">
          {(todayMeals.data ?? []).slice(0, 4).map((meal) => (
            <li key={meal.id}>
              <Link
                href="/log-symptoms"
                className="flex items-center gap-3 rounded-2xl border bg-white/92 px-3 py-3 shadow-[0_4px_14px_rgba(75,94,140,0.10)]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(153_40%_92%)] text-xs font-semibold text-[hsl(157_55%_24%)]">
                  {Math.max(1, meal.items.length)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{meal.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(meal.eatenAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ·{" "}
                    {meal.items.map((item) => item.ingredient.name).join(", ")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {(todayMeals.data?.length ?? 0) === 0 ? (
            <li className="rounded-2xl border bg-white/92 px-3 py-4 text-sm text-muted-foreground">
              No meals yet today. Use the center + button to log your first one.
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
