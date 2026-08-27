"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { StatusMessage } from "@/components/common/status-message";
import { api } from "@/trpc/client";

const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo"
];

export default function SettingsPage() {
  const settings = api.settings.getSettings.useQuery();
  const updateTimeZone = api.settings.updateTimeZone.useMutation();
  const updateReminderTimes = api.settings.updateReminderTimes.useMutation();
  const updateProfile = api.settings.updateProfile.useMutation();
  const exportData = api.settings.exportData.useQuery(undefined, { enabled: false });
  const deleteAll = api.settings.deleteAllData.useMutation();
  const [timeZones, setTimeZones] = useState<string[]>(FALLBACK_TIMEZONES);
  const [value, setValue] = useState<string>(settings.data?.timeZone ?? "UTC");
  const [reminder1, setReminder1] = useState("09:00");
  const [reminder2, setReminder2] = useState("20:00");
  const [age, setAge] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [calories, setCalories] = useState<string>("");
  const [exportJson, setExportJson] = useState<string>("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      const zones = (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf(
        "timeZone"
      );
      if (zones.length > 0) setTimeZones(zones);
    }
  }, []);

  useEffect(() => {
    if (settings.data?.timeZone) setValue(settings.data.timeZone);
    if (settings.data?.reminderTimes?.[0]) setReminder1(settings.data.reminderTimes[0]);
    if (settings.data?.reminderTimes?.[1]) setReminder2(settings.data.reminderTimes[1]);
    if (settings.data?.age) setAge(String(settings.data.age));
    if (settings.data?.heightCm) setHeight(String(settings.data.heightCm));
    if (settings.data?.weightKg) setWeight(String(settings.data.weightKg));
    if (settings.data?.caloriesGoal) setCalories(String(settings.data.caloriesGoal));
  }, [settings.data]);

  const onSave = async () => {
    setSaveState("saving");
    const reminderTimes = [reminder1, reminder2].filter(Boolean);
    try {
      await Promise.all([
        updateTimeZone.mutateAsync({
          timeZone: value
        }),
        updateReminderTimes.mutateAsync({
          reminderTimes
        }),
        updateProfile.mutateAsync({
          age: age ? Number(age) : null,
          heightCm: height ? Number(height) : null,
          weightKg: weight ? Number(weight) : null,
          caloriesGoal: calories ? Number(calories) : null
        })
      ]);
      await settings.refetch();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  };

  const onExport = async () => {
    const result = await exportData.refetch();
    if (result.data?.json) setExportJson(result.data.json);
  };

  const onDeleteAll = async () => {
    const confirmed = window.confirm("Delete all meals, symptoms, recipes and snapshots? This cannot be undone.");
    if (!confirmed) return;
    await deleteAll.mutateAsync();
  };

  return (
    <main className="min-h-dvh px-2 py-3">
      <PageHeader title="Settings" subtitle="Personalize how AfterBite interprets your logs." />

      {settings.isLoading ? (
        <div className="mb-4">
          <StatusMessage tone="loading" title="Loading settings" />
        </div>
      ) : null}
      {settings.error ? (
        <div className="mb-4">
          <StatusMessage tone="error" title="Could not load settings" body="You can refresh and try again." />
        </div>
      ) : null}

      <section className="rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <label className="block text-sm">
          <span className="mb-2 block text-lg font-medium">Time zone</span>
          <select
            className="w-full rounded-2xl border bg-background/80 px-4 py-3 text-base"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            {timeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <h2 className="text-lg font-semibold">Reminders</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose 1–2 daily times to log meals or symptoms.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Reminder 1</span>
            <input
              type="time"
              className="w-full rounded-2xl border bg-background/80 px-3 py-2"
              value={reminder1}
              onChange={(e) => setReminder1(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Reminder 2</span>
            <input
              type="time"
              className="w-full rounded-2xl border bg-background/80 px-3 py-2"
              value={reminder2}
              onChange={(e) => setReminder2(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <h2 className="text-lg font-semibold">Profile info</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Age</span>
            <input
              type="number"
              className="w-full rounded-2xl border bg-background/80 px-3 py-2"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Height (cm)</span>
            <input
              type="number"
              className="w-full rounded-2xl border bg-background/80 px-3 py-2"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Weight (kg)</span>
            <input
              type="number"
              className="w-full rounded-2xl border bg-background/80 px-3 py-2"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Daily calories goal</span>
            <input
              type="number"
              className="w-full rounded-2xl border bg-background/80 px-3 py-2"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <button
          type="button"
          onClick={onSave}
          disabled={
            saveState === "saving" ||
            updateTimeZone.isPending ||
            updateReminderTimes.isPending ||
            updateProfile.isPending
          }
          className="w-full rounded-full bg-[linear-gradient(135deg,hsl(246_38%_61%),hsl(222_63%_59%))] px-4 py-3 text-base font-semibold text-white"
        >
          {saveState === "saving" ? "Saving..." : "Save Settings"}
        </button>
      </section>

      {saveState !== "idle" ? (
        <div className="fixed bottom-24 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 rounded-2xl border bg-card/95 px-4 py-3 text-center text-sm shadow-[0_12px_30px_rgba(78,98,125,0.20)]">
          {saveState === "saving" ? "Saving settings..." : null}
          {saveState === "saved" ? "Settings saved" : null}
          {saveState === "error" ? "Save failed. Try again." : null}
        </div>
      ) : null}

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <h2 className="text-lg font-semibold">Data</h2>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={exportData.isFetching}
            className="flex-1 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {exportData.isFetching ? "Exporting..." : "Export data"}
          </button>
          <button
            type="button"
            onClick={onDeleteAll}
            disabled={deleteAll.isPending}
            className="flex-1 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {deleteAll.isPending ? "Deleting..." : "Delete all"}
          </button>
        </div>
        {exportData.error ? (
          <div className="mt-3">
            <StatusMessage tone="error" title="Export failed" body="Try again in a moment." />
          </div>
        ) : null}
        {deleteAll.error ? (
          <div className="mt-3">
            <StatusMessage tone="error" title="Delete failed" body="No data was removed. Try again." />
          </div>
        ) : null}
        {exportJson ? (
          <textarea
            className="mt-3 h-40 w-full rounded-2xl border bg-background/80 p-3 text-xs"
            readOnly
            value={exportJson}
          />
        ) : null}
      </section>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.16)] ">
        <h2 className="text-lg font-semibold">Legal and safety</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          <Link className="rounded-2xl border bg-background/70 px-3 py-2" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="rounded-2xl border bg-background/70 px-3 py-2" href="/terms">
            Terms of Use
          </Link>
          <Link className="rounded-2xl border bg-background/70 px-3 py-2" href="/medical-disclaimer">
            Medical Disclaimer
          </Link>
        </div>
      </section>
    </main>
  );
}
