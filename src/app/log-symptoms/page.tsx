"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

const SYMPTOMS = [
  { key: "bloating", label: "Bloating" },
  { key: "stomachPain", label: "Stomach pain" },
  { key: "inflammation", label: "Inflammation" },
  { key: "fatigue", label: "Fatigue" },
  { key: "brainFog", label: "Brain fog" },
  { key: "headache", label: "Headache" },
  { key: "digestionQuality", label: "Digestion quality" },
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy level" }
] as const;

type SymptomKey = (typeof SYMPTOMS)[number]["key"];

const DEFAULT_VALUES: Record<SymptomKey, number> = {
  bloating: 5,
  stomachPain: 5,
  inflammation: 5,
  fatigue: 5,
  brainFog: 5,
  headache: 5,
  digestionQuality: 5,
  mood: 5,
  energy: 5
};

export default function LogSymptomsPage() {
  const utils = api.useUtils();
  const [values, setValues] = useState<Record<SymptomKey, number>>(DEFAULT_VALUES);
  const [touched, setTouched] = useState(false);

  const saveSymptoms = api.symptom.quickLogSymptoms.useMutation();
  const todaySymptoms = api.symptom.listTodaySymptoms.useQuery();

  const entries = useMemo(
    () => SYMPTOMS.map(({ key }) => ({ symptom: key, severity: values[key] })),
    [values]
  );

  const applyPreset = (preset: "good" | "neutral" | "bad") => {
    setTouched(true);
    if (preset === "neutral") {
      setValues(DEFAULT_VALUES);
      return;
    }

    const good: Record<SymptomKey, number> = {
      bloating: 2,
      stomachPain: 2,
      inflammation: 3,
      fatigue: 3,
      brainFog: 2,
      headache: 2,
      digestionQuality: 8,
      mood: 8,
      energy: 8
    };

    const bad: Record<SymptomKey, number> = {
      bloating: 8,
      stomachPain: 7,
      inflammation: 7,
      fatigue: 8,
      brainFog: 7,
      headache: 6,
      digestionQuality: 3,
      mood: 3,
      energy: 3
    };

    setValues(preset === "good" ? good : bad);
  };

  const onSave = async () => {
    await saveSymptoms.mutateAsync({ entries });
    setTouched(false);
    await Promise.all([
      utils.symptom.listTodaySymptoms.invalidate(),
      utils.forecast.getDailyImpactScore.invalidate(),
      utils.forecast.getTomorrowPrediction.invalidate()
    ]);
  };

  return (
    <main className="min-h-dvh px-2 py-3">
      <PageHeader title="Log Symptoms" subtitle="Capture body feedback in under 10 seconds." />

      <p className="mb-3 text-sm text-muted-foreground">Scale: 1 = low symptom (better), 10 = high symptom (worse).</p>

      <section className="rounded-[2rem] border bg-white/95 p-4 shadow-[0_10px_30px_rgba(75,94,140,0.16)] ">
        <div className="mb-3 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyPreset("good")}
            className="rounded-full border bg-[hsl(153_53%_89%)] px-3 py-1 font-semibold text-[hsl(154_55%_21%)]"
          >
            Feeling good
          </button>
          <button
            type="button"
            onClick={() => applyPreset("neutral")}
            className="rounded-full border bg-[hsl(210_35%_96%)] px-3 py-1 font-semibold text-[hsl(217_22%_28%)]"
          >
            Neutral
          </button>
          <button
            type="button"
            onClick={() => applyPreset("bad")}
            className="rounded-full border bg-[hsl(19_93%_90%)] px-3 py-1 font-semibold text-[hsl(17_57%_26%)]"
          >
            Feeling bad
          </button>
        </div>

        <div className="space-y-3">
          {SYMPTOMS.map((symptom) => (
            <label key={symptom.key} className="block">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{symptom.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">{values[symptom.key]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={values[symptom.key]}
                onChange={(event) => {
                  setTouched(true);
                  const next = Number(event.target.value);
                  setValues((prev) => ({ ...prev, [symptom.key]: next }));
                }}
                className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saveSymptoms.isPending || !touched}
          className="mt-4 w-full rounded-full bg-[linear-gradient(135deg,hsl(148_70%_41%),hsl(162_78%_37%))] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saveSymptoms.isPending ? "Saving..." : "Save Symptoms"}
        </button>
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-4 shadow-[0_10px_30px_rgba(75,94,140,0.16)] ">
        <h2 className="text-lg font-semibold">Today&apos;s symptom logs</h2>
        <ul className="mt-3 space-y-2">
          {(todaySymptoms.data ?? []).map((log) => (
            <li key={log.id} className="rounded-2xl border bg-white/92 p-3">
              <p className="text-xs text-muted-foreground">
                {new Date(log.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {log.entries.map((entry) => (
                  <span key={entry.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                    {entry.symptom}: {entry.severity}
                  </span>
                ))}
              </div>
            </li>
          ))}
          {(todaySymptoms.data?.length ?? 0) === 0 ? (
            <li className="text-sm text-muted-foreground">No symptom logs yet today.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
