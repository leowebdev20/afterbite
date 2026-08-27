"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { StatusMessage } from "@/components/common/status-message";
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
type HistoryPreset = "today" | "7d" | "30d" | "all";

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

const HISTORY_PRESETS: Array<{ id: HistoryPreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All" }
];

function toDateTimeLocalValue(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  return value ? new Date(value) : new Date();
}

export default function LogSymptomsPage() {
  const utils = api.useUtils();
  const [historyPreset, setHistoryPreset] = useState<HistoryPreset>("today");
  const [values, setValues] = useState<Record<SymptomKey, number>>(DEFAULT_VALUES);
  const [loggedAt, setLoggedAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const saveSymptoms = api.symptom.quickLogSymptoms.useMutation();
  const updateSymptoms = api.symptom.updateSymptomLog.useMutation();
  const deleteLog = api.symptom.deleteSymptomLog.useMutation();

  const historyRange = useMemo(() => {
    if (historyPreset === "all") return undefined;
    if (historyPreset === "today") {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      return { from };
    }
    const days = historyPreset === "7d" ? 7 : 30;
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
    return { from };
  }, [historyPreset]);

  const logs = api.symptom.listSymptoms.useQuery(historyRange);

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
    if (editingLogId) {
      await updateSymptoms.mutateAsync({ id: editingLogId, entries, loggedAt: fromDateTimeLocalValue(loggedAt) });
    } else {
      await saveSymptoms.mutateAsync({ entries, loggedAt: fromDateTimeLocalValue(loggedAt) });
    }
    setTouched(false);
    setEditingLogId(null);
    setLoggedAt(toDateTimeLocalValue(new Date()));
    await Promise.all([
      utils.symptom.listSymptoms.invalidate(),
      utils.symptom.listTodaySymptoms.invalidate(),
      utils.forecast.getDailyImpactScore.invalidate(),
      utils.forecast.getTomorrowPrediction.invalidate()
    ]);
  };

  const onEditLog = (log: NonNullable<typeof logs.data>[number]) => {
    const nextValues = { ...DEFAULT_VALUES };
    for (const entry of log.entries) {
      nextValues[entry.symptom as SymptomKey] = entry.severity;
    }
    setValues(nextValues);
    setLoggedAt(toDateTimeLocalValue(new Date(log.loggedAt)));
    setEditingLogId(log.id);
    setTouched(true);
  };

  const onDeleteLog = async (logId: string) => {
    const confirmed = window.confirm("Delete this symptom log?");
    if (!confirmed) return;
    await deleteLog.mutateAsync({ id: logId });
    if (editingLogId === logId) {
      setEditingLogId(null);
      setValues(DEFAULT_VALUES);
      setLoggedAt(toDateTimeLocalValue(new Date()));
      setTouched(false);
    }
    await Promise.all([utils.symptom.listSymptoms.invalidate(), utils.symptom.listTodaySymptoms.invalidate()]);
  };

  return (
    <main className="min-h-dvh px-2 py-3">
      <PageHeader title="Log Symptoms" subtitle="Capture body feedback in under 10 seconds." />

      <p className="mb-3 text-sm text-muted-foreground">Scale: 1 = low symptom (better), 10 = high symptom (worse).</p>

      <section className="rounded-[2rem] border bg-white/95 p-4 shadow-[0_10px_30px_rgba(75,94,140,0.16)] ">
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-muted-foreground">Log time</span>
          <input
            type="datetime-local"
            className="w-full rounded-2xl border bg-background/85 px-4 py-3 text-base outline-none ring-primary/30 focus:ring-2"
            value={loggedAt}
            onChange={(event) => {
              setTouched(true);
              setLoggedAt(event.target.value);
            }}
          />
        </label>

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
          disabled={saveSymptoms.isPending || updateSymptoms.isPending || !touched}
          className="mt-4 w-full rounded-full bg-[linear-gradient(135deg,hsl(148_70%_41%),hsl(162_78%_37%))] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saveSymptoms.isPending || updateSymptoms.isPending
            ? "Saving..."
            : editingLogId
              ? "Update Symptoms"
              : "Save Symptoms"}
        </button>
        {editingLogId ? (
          <button
            type="button"
            onClick={() => {
              setEditingLogId(null);
              setValues(DEFAULT_VALUES);
              setLoggedAt(toDateTimeLocalValue(new Date()));
              setTouched(false);
            }}
            className="mt-2 w-full rounded-full border px-4 py-3 text-sm font-semibold"
          >
            Cancel editing
          </button>
        ) : null}
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-4 shadow-[0_10px_30px_rgba(75,94,140,0.16)] ">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Symptom history</h2>
          <div className="flex flex-wrap gap-1">
            {HISTORY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setHistoryPreset(preset.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  historyPreset === preset.id
                    ? "bg-[hsl(243_44%_92%)] text-[hsl(243_35%_35%)]"
                    : "bg-white/92 text-muted-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {logs.isLoading ? (
            <li>
              <StatusMessage tone="loading" title="Loading symptom history" />
            </li>
          ) : null}
          {logs.error ? (
            <li>
              <StatusMessage tone="error" title="Could not load symptom logs" body="Your saved entries are temporarily unavailable." />
            </li>
          ) : null}
          {(logs.data ?? []).map((log) => (
            <li key={log.id} className="rounded-2xl border bg-white/92 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(log.loggedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEditLog(log)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteLog(log.id)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {log.entries.map((entry) => (
                  <span key={entry.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                    {entry.symptom}: {entry.severity}
                  </span>
                ))}
              </div>
            </li>
          ))}
          {!logs.isLoading && !logs.error && (logs.data?.length ?? 0) === 0 ? (
            <li>
              <StatusMessage title="No symptom logs in this period" body="Change the filter or save a new symptom entry above." />
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
