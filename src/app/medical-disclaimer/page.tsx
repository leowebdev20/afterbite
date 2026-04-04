import Link from "next/link";

export default function MedicalDisclaimerPage() {
  return (
    <main className="min-h-dvh px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">Medical Disclaimer</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: April 4, 2026</p>

      <section className="mt-6 space-y-3 rounded-3xl border bg-white/95 p-5">
        <p className="text-sm">
          AfterBite does not provide medical advice, diagnosis, or treatment. The app is not a medical device.
        </p>
        <p className="text-sm">
          Any scores, trends, or suggested triggers are estimates based on your inputs and may be incomplete or wrong.
        </p>
        <p className="text-sm">
          Always seek qualified medical guidance for health concerns, medication changes, and persistent or severe
          symptoms.
        </p>
      </section>

      <p className="mt-5 text-sm text-muted-foreground">
        See also <Link className="underline" href="/privacy">Privacy Policy</Link> and{" "}
        <Link className="underline" href="/terms">Terms of Use</Link>.
      </p>
    </main>
  );
}
