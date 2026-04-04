export type ZonedParts = { year: number; month: number; day: number; hour: number };

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23"
});

function formatParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour)
  };
}

export function toDayKey(date: Date, timeZone: string): string {
  const parts = formatParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day
    .toString()
    .padStart(2, "0")}`;
}

export function getLocalHour(date: Date, timeZone: string): number {
  return formatParts(date, timeZone).hour;
}

export function addDaysToKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function isInNextDayWindow(entryDate: Date, mealDayKey: string, timeZone: string): boolean {
  const entryKey = toDayKey(entryDate, timeZone);
  const hour = getLocalHour(entryDate, timeZone);
  const day1 = addDaysToKey(mealDayKey, 1);
  const day2 = addDaysToKey(mealDayKey, 2);
  const day3 = addDaysToKey(mealDayKey, 3);

  if (entryKey === day1 || entryKey === day2) return true;
  if (entryKey === day3 && hour < 12) return true;
  return false;
}

export function formatDayKey(date: Date, timeZone: string): string {
  return toDayKey(date, timeZone);
}

export function getTodayKey(timeZone: string): string {
  return toDayKey(new Date(), timeZone);
}

export function addDaysFromKey(dayKey: string, days: number): string {
  return addDaysToKey(dayKey, days);
}

function getOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(at);

  const tzPart = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+00";
  const match = tzPart.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const sign = hours >= 0 ? 1 : -1;
  return hours * 60 + sign * minutes;
}

export function dayKeyToUtcRange(dayKey: string, timeZone: string): { start: Date; end: Date } {
  const [year, month, day] = dayKey.split("-").map(Number);
  const nextKey = addDaysToKey(dayKey, 1);

  let startMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const offsetMinutes = getOffsetMinutes(new Date(startMs), timeZone);
    startMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMinutes * 60_000;
  }

  const [nextYear, nextMonth, nextDay] = nextKey.split("-").map(Number);
  let endMs = Date.UTC(nextYear, nextMonth - 1, nextDay, 0, 0, 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const offsetMinutes = getOffsetMinutes(new Date(endMs), timeZone);
    endMs = Date.UTC(nextYear, nextMonth - 1, nextDay, 0, 0, 0, 0) - offsetMinutes * 60_000;
  }

  return { start: new Date(startMs), end: new Date(endMs) };
}

export function getTodayUtcRange(timeZone: string): { start: Date; end: Date } {
  const today = getTodayKey(timeZone);
  return dayKeyToUtcRange(today, timeZone);
}
