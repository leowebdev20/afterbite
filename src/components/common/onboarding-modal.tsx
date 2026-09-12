"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Activity, ArrowRight, Check, Clock3, MapPin, Sparkles, Utensils, X } from "lucide-react";
import { api } from "@/trpc/client";
import { DEFAULT_REMINDERS } from "@/lib/reminders";

const STORAGE_KEY = "afterbite-onboarding-complete-v1";

type ReminderDraft = {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
};

function getDefaultTimeZone() {
  if (typeof Intl === "undefined") return "UTC";

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Rome",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo"
];

export function OnboardingModal({ userName }: { userName?: string }) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const settings = api.settings.getSettings.useQuery(undefined, { enabled: isAuthenticated });
  const updateTimeZone = api.settings.updateTimeZone.useMutation();
  const updateReminderTimes = api.settings.updateReminderTimes.useMutation();
  const updateProfile = api.settings.updateProfile.useMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [timeZone, setTimeZone] = useState(getDefaultTimeZone());
  const [reminders, setReminders] = useState<ReminderDraft[]>(DEFAULT_REMINDERS);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeZones, setTimeZones] = useState<string[]>(FALLBACK_TIMEZONES);

  useEffect(() => {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      const zones = (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf(
        "timeZone"
      );
      if (zones.length > 0) {
        setTimeZones(zones);
      }
    }
  }, []);

  useEffect(() => {
    if (!settings.data) return;

    if (settings.data.timeZone) setTimeZone(settings.data.timeZone);

    const normalized = settings.data.reminders ?? DEFAULT_REMINDERS;
    setReminders(normalized);

    if (settings.data.age) setAge(String(settings.data.age));
    if (settings.data.heightCm) setHeight(String(settings.data.heightCm));
    if (settings.data.weightKg) setWeight(String(settings.data.weightKg));
    if (settings.data.caloriesGoal) setCalories(String(settings.data.caloriesGoal));
  }, [settings.data]);

  useEffect(() => {
    if (!isAuthenticated || settings.isLoading) return;

    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setIsOpen(true);
    }
  }, [isAuthenticated, settings.isLoading]);

  const totalSteps = 4;

  const nextButtonLabel = useMemo(() => {
    if (step === totalSteps - 1) return loading ? "Saving..." : "Start tracking";
    return "Continue";
  }, [loading, step]);

  const toggleReminder = (id: string) => {
    setReminders((current) => current.map((entry) => (entry.id === id ? { ...entry, enabled: !entry.enabled } : entry)));
  };

  const updateReminderTime = (id: string, time: string) => {
    setReminders((current) => current.map((entry) => (entry.id === id ? { ...entry, time } : entry)));
  };

  const finishOnboarding = async () => {
    setLoading(true);

    try {
      await Promise.all([
        updateTimeZone.mutateAsync({ timeZone }),
        updateReminderTimes.mutateAsync({ reminders }),
        updateProfile.mutateAsync({
          age: age ? Number(age) : null,
          heightCm: height ? Number(height) : null,
          weightKg: weight ? Number(weight) : null,
          caloriesGoal: calories ? Number(calories) : null
        })
      ]);

      window.localStorage.setItem(STORAGE_KEY, "true");
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const canContinue = step === 1 ? reminders.some((entry) => entry.enabled) : true;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_24px_80px_rgba(32,43,72,0.22)] backdrop-blur-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Setup</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Welcome{userName ? `, ${userName}` : ""}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, "true");
              setIsOpen(false);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="Close onboarding"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={`h-2 flex-1 rounded-full ${index === step ? "bg-[linear-gradient(135deg,hsl(246_38%_61%),hsl(222_63%_59%))]" : "bg-slate-200"}`}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <div className="rounded-[1.7rem] border border-[hsl(152_33%_87%)] bg-[linear-gradient(135deg,hsl(145_52%_96%),hsl(220_70%_97%))] p-4">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Sparkles className="h-5 w-5 text-[hsl(246_38%_61%)]" />
              </div>
              <h3 className="text-xl font-semibold">Build your personal rhythm</h3>
              <p className="mt-2 text-sm text-slate-600">
                Track meals, symptoms, and patterns in one simple place so the app can spot what really matters.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border bg-slate-50 p-2.5">
                <Utensils className="mx-auto h-4 w-4 text-[hsl(158_58%_28%)]" />
                <p className="mt-2 text-[11px] font-medium text-slate-700">Meals</p>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-2.5">
                <Activity className="mx-auto h-4 w-4 text-[hsl(197_70%_37%)]" />
                <p className="mt-2 text-[11px] font-medium text-slate-700">Symptoms</p>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-2.5">
                <Clock3 className="mx-auto h-4 w-4 text-[hsl(245_44%_47%)]" />
                <p className="mt-2 text-[11px] font-medium text-slate-700">Patterns</p>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-[hsl(246_38%_61%)]" />
                Time zone
              </label>
              <select
                value={timeZone}
                onChange={(event) => setTimeZone(event.target.value)}
                className="w-full rounded-2xl border bg-slate-50 px-3 py-2.5 text-sm outline-none ring-0"
              >
                {timeZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Reminders</p>
              <div className="space-y-2.5">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-2xl border bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[hsl(246_38%_61%)] shadow-sm">
                          {reminder.label.toLowerCase().includes("symptom") ? <Activity className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{reminder.label}</p>
                          <p className="text-[11px] text-slate-500">{reminder.label.toLowerCase().includes("symptom") ? "Morning check-in" : "Meal prompt"}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleReminder(reminder.id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          reminder.enabled ? "bg-[hsl(145_42%_91%)] text-[hsl(145_48%_22%)]" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {reminder.enabled ? "On" : "Off"}
                      </button>
                    </div>

                    <input
                      type="time"
                      value={reminder.time}
                      onChange={(event) => updateReminderTime(reminder.id, event.target.value)}
                      className="mt-2.5 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-[1.4rem] border bg-[hsl(246_46%_97%)] p-3">
              <p className="text-sm text-slate-600">Optional details help personalize your score and recommendations.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-slate-700">
                <span className="mb-1.5 block">Age</span>
                <input
                  type="number"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className="w-full rounded-2xl border bg-slate-50 px-3 py-2.5"
                  placeholder="30"
                />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-1.5 block">Height (cm)</span>
                <input
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  className="w-full rounded-2xl border bg-slate-50 px-3 py-2.5"
                  placeholder="172"
                />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-1.5 block">Weight (kg)</span>
                <input
                  type="number"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className="w-full rounded-2xl border bg-slate-50 px-3 py-2.5"
                  placeholder="68"
                />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-1.5 block">Calories goal</span>
                <input
                  type="number"
                  value={calories}
                  onChange={(event) => setCalories(event.target.value)}
                  className="w-full rounded-2xl border bg-slate-50 px-3 py-2.5"
                  placeholder="2200"
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-[hsl(145_42%_89%)] bg-[hsl(145_41%_96%)] p-4">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[hsl(145_48%_22%)] shadow-sm">
                <Check className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">You’re ready to track</h3>
              <p className="mt-1 text-sm text-slate-600">AfterBite will start with your current setup and keep prompting you only when it matters.</p>
            </div>

            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2">
                <Check className="h-4 w-4 text-[hsl(145_48%_22%)]" />
                Daily reminders will fit your time zone.
              </li>
              <li className="flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2">
                <Check className="h-4 w-4 text-[hsl(145_48%_22%)]" />
                Your meal and symptom history will build patterns.
              </li>
              <li className="flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2">
                <Check className="h-4 w-4 text-[hsl(145_48%_22%)]" />
                Your insights will get more personal as you log more.
              </li>
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="rounded-full border bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(STORAGE_KEY, "true");
                setIsOpen(false);
              }}
              className="rounded-full border bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700"
            >
              Skip
            </button>
          )}

          <button
            type="button"
            disabled={loading || !canContinue}
            onClick={() => {
              if (step === totalSteps - 1) {
                void finishOnboarding();
                return;
              }
              setStep((current) => Math.min(totalSteps - 1, current + 1));
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,hsl(246_38%_61%),hsl(222_63%_59%))] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nextButtonLabel}
            {step < totalSteps - 1 ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
