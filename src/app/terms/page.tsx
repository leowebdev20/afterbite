import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-dvh px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: April 4, 2026</p>

      <section className="mt-6 space-y-3 rounded-3xl border bg-white/95 p-5">
        <p className="text-sm">
          AfterBite is provided for personal tracking and informational use. You are responsible for how you interpret
          and act on app outputs.
        </p>
        <p className="text-sm">
          The app is not guaranteed to be uninterrupted or error free. Correlations and scores are heuristic estimates,
          not medical diagnoses.
        </p>
        <p className="text-sm">
          Do not use AfterBite for emergency decisions. If you believe you have a medical emergency, contact emergency
          services immediately.
        </p>
      </section>

      <p className="mt-5 text-sm text-muted-foreground">
        See also <Link className="underline" href="/privacy">Privacy Policy</Link> and{" "}
        <Link className="underline" href="/medical-disclaimer">Medical Disclaimer</Link>.
      </p>
    </main>
  );
}
