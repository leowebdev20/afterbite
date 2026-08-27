const LAST_RECOMPUTE_KEY = "afterbite:last-recompute-at";

export function shouldAutoRecompute(lastRunAt: number | null, now: number): boolean {
  if (lastRunAt == null) return true;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return now - lastRunAt >= twentyFourHours;
}

export function readLastRecomputeAt(): number | null {
  if (typeof window === "undefined") return null;
  const value = Number(window.localStorage.getItem(LAST_RECOMPUTE_KEY));
  return Number.isFinite(value) ? value : null;
}

export function writeLastRecomputeAt(timestamp: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_RECOMPUTE_KEY, String(timestamp));
}
