export type ReminderEntry = {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
};

export const DEFAULT_REMINDERS: ReminderEntry[] = [
  { id: "meal-1", label: "Meal reminder", time: "09:00", enabled: true },
  { id: "meal-2", label: "Meal reminder", time: "19:00", enabled: true },
  { id: "symptom-1", label: "Symptom reminder", time: "08:30", enabled: true }
];

export function normalizeReminderEntries(value: unknown): ReminderEntry[] {
  if (!Array.isArray(value)) return DEFAULT_REMINDERS;

  if (value.every((item) => typeof item === "string")) {
    const providedTimes = value.filter((item): item is string => typeof item === "string");

    return DEFAULT_REMINDERS.map((defaultEntry, index) => ({
      ...defaultEntry,
      time:
        typeof providedTimes[index] === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(providedTimes[index])
          ? providedTimes[index]
          : defaultEntry.time,
      enabled: typeof providedTimes[index] === "string"
    }));
  }

  const entries = value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return { ...DEFAULT_REMINDERS[index % DEFAULT_REMINDERS.length], enabled: false };
    }

    const candidate = entry as Partial<ReminderEntry>;
    return {
      id: typeof candidate.id === "string" ? candidate.id : `reminder-${index + 1}`,
      label: typeof candidate.label === "string" ? candidate.label : "Reminder",
      time:
        typeof candidate.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.time)
          ? candidate.time
          : DEFAULT_REMINDERS[index % DEFAULT_REMINDERS.length].time,
      enabled: Boolean(candidate.enabled)
    };
  });

  if (entries.length === 0) return DEFAULT_REMINDERS;
  return entries.slice(0, 3);
}

export function getNextReminderTime(targetTime: string, now: Date = new Date()) {
  const [hours, minutes] = targetTime.split(":").map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

const activeTimers = new Set<number>();

function markReminderSent(reminderId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`afterbite:reminder-sent:${reminderId}`, new Date().toISOString().slice(0, 10));
}

function shouldSendToday(reminderId: string) {
  if (typeof window === "undefined") return true;
  const today = new Date().toISOString().slice(0, 10);
  return window.localStorage.getItem(`afterbite:reminder-sent:${reminderId}`) !== today;
}

export function fireReminder(reminder: ReminderEntry) {
  if (!reminder.enabled || typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!shouldSendToday(reminder.id)) return;

  markReminderSent(reminder.id);

  const body =
    reminder.label.toLowerCase().includes("symptom")
      ? "Log how you feel this morning."
      : "Log your latest meal to keep your insights up to date.";

  new Notification("AfterBite reminder", {
    body,
    tag: `afterbite-${reminder.id}`
  });
}

export function scheduleReminderNotifications(reminders: ReminderEntry[]) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  for (const timer of activeTimers) {
    window.clearTimeout(timer);
  }
  activeTimers.clear();

  const now = new Date();

  for (const reminder of reminders.filter((item) => item.enabled)) {
    const target = getNextReminderTime(reminder.time, now);
    const delay = Math.max(1000, target.getTime() - now.getTime());
    const timer = window.setTimeout(() => {
      fireReminder(reminder);
      scheduleReminderNotifications(reminders);
    }, delay);
    activeTimers.add(timer);
  }
}
