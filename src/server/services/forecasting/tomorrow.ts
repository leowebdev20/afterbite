import { computeImpactScore, type SymptomVector } from "@/server/services/scoring/impact";

export function predictTomorrow(base: SymptomVector, triggerBoost = 0) {
  const projected: SymptomVector = {
    ...base,
    bloating: Math.min(10, base.bloating + triggerBoost),
    fatigue: Math.min(10, base.fatigue + triggerBoost / 2),
    energy: Math.max(1, base.energy - triggerBoost / 2)
  };

  return {
    symptoms: projected,
    impactScore: computeImpactScore(projected)
  };
}
