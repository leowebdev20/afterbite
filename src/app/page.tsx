import Link from "next/link";

const links = [
  { href: "/log-meal", label: "Log Meal" },
  { href: "/log-symptoms", label: "Log Symptoms" },
  { href: "/summary", label: "Daily Summary" },
  { href: "/insights", label: "Food Insights" },
  { href: "/recipes", label: "Recipe Builder" }
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Today&apos;s Impact</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">4.9 / 10</h1>
        <p className="mt-3 text-sm text-muted-foreground">Recent insight: Wheat may increase bloating.</p>
      </section>
      <section className="mt-4 grid grid-cols-2 gap-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl bg-accent px-4 py-5 text-sm font-medium text-accent-foreground"
          >
            {item.label}
          </Link>
        ))}
      </section>
    </main>
  );
}
