"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Clock3, Moon, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusMessage } from "@/components/common/status-message";
import { api } from "@/trpc/client";
import { DEFAULT_REMINDERS, normalizeReminderEntries, scheduleReminderNotifications } from "@/lib/reminders";

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
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
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
    const normalized = normalizeReminderEntries(settings.data?.reminders ?? settings.data?.reminderTimes ?? DEFAULT_REMINDERS);
    setReminders(normalized);
    if (settings.data?.age) setAge(String(settings.data.age));
    if (settings.data?.heightCm) setHeight(String(settings.data.heightCm));
    if (settings.data?.weightKg) setWeight(String(settings.data.weightKg));
    if (settings.data?.caloriesGoal) setCalories(String(settings.data.caloriesGoal));
  }, [settings.data]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      scheduleReminderNotifications(reminders);
    }
  }, [reminders]);

  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    if (permission === "granted") {
      scheduleReminderNotifications(reminders);
    }
  };

  const onSave = async () => {
    setSaveState("saving");
    const reminderTimes = reminders.filter((item) => item.enabled).map((item) => item.time);
    try {
      await Promise.all([
        updateTimeZone.mutateAsync({
          timeZone: value
        }),
        updateReminderTimes.mutateAsync({
          reminderTimes,
          reminders
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

  const toggleReminder = (id: string) => {
    setReminders((current) => current.map((entry) => (entry.id === id ? { ...entry, enabled: !entry.enabled } : entry)));
  };

  const updateReminderTime = (id: string, time: string) => {
    setReminders((current) => current.map((entry) => (entry.id === id ? { ...entry, time } : entry)));
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Reminders</h2>
            <p className="mt-1 text-sm text-muted-foreground">3 daily prompts to stay consistent.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-[hsl(243_44%_96%)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(243_36%_34%)]">
            <Bell className="h-3.5 w-3.5" />
            Active
          </div>
        </div>

        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="rounded-2xl border bg-background/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(223_60%_95%)] text-[hsl(223_52%_40%)]">
                    {reminder.label.toLowerCase().includes("symptom") ? <Moon className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{reminder.label}</p>
                    <p className="text-[11px] text-muted-foreground">{reminder.label.toLowerCase().includes("symptom") ? "Morning check-in" : "Meal log prompt"}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleReminder(reminder.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    reminder.enabled
                      ? "bg-[hsl(145_42%_91%)] text-[hsl(145_48%_22%)]"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {reminder.enabled ? "On" : "Off"}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="time"
                  value={reminder.time}
                  onChange={(event) => updateReminderTime(reminder.id, event.target.value)}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        {!notificationsEnabled ? (
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,hsl(245_58%_62%),hsl(218_64%_61%))] px-3 py-2 text-xs font-semibold text-white"
            onClick={() => void enableNotifications()}
          >
            <Bell className="h-3.5 w-3.5" />
            Enable notifications
          </button>
        ) : null}
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
            className="flex-1 rounded-full border border-[hsl(354_61%_65%)] bg-[hsl(354_71%_96%)] px-4 py-2 text-sm font-semibold text-[hsl(354_58%_32%)] disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              {deleteAll.isPending ? "Deleting..." : "Delete all"}
            </span>
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
