import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: April 4, 2026</p>

      <section className="mt-6 space-y-3 rounded-3xl border bg-white/95 p-5">
        <p className="text-sm">
          AfterBite stores meal, symptom, and settings data so you can track patterns over time. We only collect data
          you enter in the app.
        </p>
        <p className="text-sm">
          Your data is used to generate insights and forecasts inside the app. We do not sell personal health data.
        </p>
        <p className="text-sm">
          You can export or delete your data from Settings at any time. If you have questions, contact the app owner
          before sharing sensitive data.
        </p>
      </section>

      <p className="mt-5 text-sm text-muted-foreground">
        See also <Link className="underline" href="/terms">Terms</Link> and{" "}
        <Link className="underline" href="/medical-disclaimer">Medical Disclaimer</Link>.
      </p>
    </main>
  );
}
