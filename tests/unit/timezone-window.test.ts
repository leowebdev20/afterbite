import { describe, expect, it } from "vitest";
import { addDaysToKey, dayKeyToUtcRange, isInNextDayWindow } from "@/server/services/timezone";

describe("isInNextDayWindow", () => {
  const tz = "UTC";
  const mealDay = "2026-03-10";

  it("includes day+1 and day+2 for full day", () => {
    expect(isInNextDayWindow(new Date("2026-03-11T23:59:00.000Z"), mealDay, tz)).toBe(true);
    expect(isInNextDayWindow(new Date("2026-03-12T00:01:00.000Z"), mealDay, tz)).toBe(true);
  });

  it("includes only morning of day+3", () => {
    expect(isInNextDayWindow(new Date("2026-03-13T11:59:00.000Z"), mealDay, tz)).toBe(true);
    expect(isInNextDayWindow(new Date("2026-03-13T12:00:00.000Z"), mealDay, tz)).toBe(false);
  });

  it("excludes same-day and day+4", () => {
    expect(isInNextDayWindow(new Date("2026-03-10T20:00:00.000Z"), mealDay, tz)).toBe(false);
    const day4 = addDaysToKey(mealDay, 4);
    expect(isInNextDayWindow(new Date(`${day4}T09:00:00.000Z`), mealDay, tz)).toBe(false);
  });
});

describe("dayKeyToUtcRange", () => {
  it("returns exact UTC boundaries for UTC timezone", () => {
    const range = dayKeyToUtcRange("2026-03-10", "UTC");
    expect(range.start.toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-03-11T00:00:00.000Z");
  });

  it("returns expected shifted boundaries for Europe/Berlin winter day", () => {
    const range = dayKeyToUtcRange("2026-01-15", "Europe/Berlin");
    expect(range.start.toISOString()).toBe("2026-01-14T23:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-01-15T23:00:00.000Z");
  });
});
