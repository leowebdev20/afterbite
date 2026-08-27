import { describe, expect, it } from "vitest";
import { shouldAutoRecompute } from "@/lib/daily-recompute";

describe("shouldAutoRecompute", () => {
  it("recomputes when no prior run exists", () => {
    expect(shouldAutoRecompute(null, 1_700_000_000_000)).toBe(true);
  });

  it("does not recompute during the same 24h window", () => {
    const now = 1_700_000_000_000;
    const lastRun = now - 10 * 60 * 60 * 1000;
    expect(shouldAutoRecompute(lastRun, now)).toBe(false);
  });

  it("recomputes after 24h has passed", () => {
    const now = 1_700_000_000_000;
    const lastRun = now - 30 * 60 * 60 * 1000;
    expect(shouldAutoRecompute(lastRun, now)).toBe(true);
  });
});
