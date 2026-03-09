"use client";

import Link from "next/link";
import type { Route } from "next";
import { api } from "@/trpc/client";

const links = [
  { href: "/log-meal", label: "Log Meal", tone: "bg-[hsl(190_80%_90%)] text-[hsl(197_62%_25%)]" },
  { href: "/log-symptoms", label: "Log Symptoms", tone: "bg-[hsl(31_100%_90%)] text-[hsl(24_57%_26%)]" },
  { href: "/summary", label: "Daily Summary", tone: "bg-[hsl(153_53%_89%)] text-[hsl(154_55%_21%)]" },
  { href: "/insights", label: "Food Insights", tone: "bg-[hsl(248_82%_93%)] text-[hsl(249_42%_28%)]" },
  { href: "/recipes", label: "Recipe Builder", tone: "bg-[hsl(339_78%_93%)] text-[hsl(338_46%_30%)]" }
] satisfies Array<{ href: Route; label: string; tone: string }>;

export default function HomePage() {
  const daily = api.forecast.getDailyImpactScore.useQuery();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
      <section className="rounded-3xl border bg-card/85 p-5 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">Today&apos;s Impact</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {daily.data ? `${daily.data.score} / 10` : "-- / 10"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Recent insight: Wheat may increase bloating.</p>
      </section>
      <section className="mt-4 grid grid-cols-2 gap-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-2xl border px-4 py-5 text-sm font-medium shadow-sm transition-transform active:scale-[0.98] ${item.tone}`}
          >
            {item.label}
          </Link>
        ))}
      </section>
    </main>
  );
}
