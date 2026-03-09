"use client";

import Link from "next/link";
import type { Route } from "next";
import { BookOpen, Lightbulb, Soup, Stethoscope, BarChart3 } from "lucide-react";
import { api } from "@/trpc/client";

const links = [
  { href: "/log-meal", label: "Log Meal", icon: Soup },
  { href: "/log-symptoms", label: "Log Symptoms", icon: Stethoscope },
  { href: "/summary", label: "Daily Summary", icon: BarChart3 },
  { href: "/insights", label: "Food Insights", icon: Lightbulb },
  { href: "/recipes", label: "Recipe Builder", icon: BookOpen, full: true }
] satisfies Array<{ href: Route; label: string; icon: React.ComponentType<{ className?: string }>; full?: boolean }>;

export default function HomePage() {
  const daily = api.forecast.getDailyImpactScore.useQuery();
  const score = daily.data?.score ?? 0;
  const circle = Math.max(0, Math.min(100, score * 10));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
      <section className="rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur">
        <p className="text-center text-4xl font-semibold tracking-tight">Today&apos;s Impact</p>
        <div className="mx-auto mt-4 grid h-44 w-44 place-items-center rounded-full" style={{ background: `conic-gradient(hsl(196 83% 38%) ${circle}%, hsl(199 22% 86%) ${circle}% 100%)` }}>
          <div className="grid h-36 w-36 place-items-center rounded-full bg-card text-5xl font-semibold tracking-tight">
            {daily.data ? `${daily.data.score}` : "--"}<span className="text-3xl">/10</span>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">Recent insight: Wheat may increase bloating.</p>
      </section>
      <section className="mt-4 grid grid-cols-2 gap-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-3xl border bg-card/85 px-4 py-5 text-center text-sm font-semibold text-foreground shadow-[0_8px_20px_rgba(78,98,125,0.10)] transition-transform active:scale-[0.98] ${
              item.full ? "col-span-2" : ""
            }`}
          >
            <item.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
            {item.label}
          </Link>
        ))}
      </section>
    </main>
  );
}
