"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { BarChart3, Home, Lightbulb, Plus, Settings } from "lucide-react";

const navItems = [
  { href: "/" as Route, label: "Home", icon: Home },
  { href: "/insights" as Route, label: "Insights", icon: Lightbulb },
  { href: "/log-meal" as Route, label: "Log", icon: Plus, primary: true },
  { href: "/summary" as Route, label: "History", icon: BarChart3 },
  { href: "/settings" as Route, label: "Settings", icon: Settings }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[min(100%-1rem,28rem)] -translate-x-1/2 rounded-[1.75rem] border bg-card/95 p-2 shadow-[0_16px_40px_rgba(54,72,98,0.26)] backdrop-blur">
      <ul className="grid grid-cols-5 items-end gap-1">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          if (item.primary) {
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-label="Quick log meal"
                  className="inline-flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(243_45%_52%),hsl(215_68%_58%))] text-white shadow-[0_10px_22px_rgba(70,90,160,0.42)] transition-transform active:scale-95"
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium ${
                  active ? "text-[hsl(239_35%_35%)]" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[hsl(239_35%_45%)]" : ""}`} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
