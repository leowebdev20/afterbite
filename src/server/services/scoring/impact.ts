export type SymptomVector = {
  bloating: number;
  stomachPain: number;
  inflammation: number;
  fatigue: number;
  brainFog: number;
  headache: number;
  digestionQuality: number;
  mood: number;
  energy: number;
};

const WEIGHTS: Record<keyof SymptomVector, number> = {
  bloating: 1.2,
  stomachPain: 1.2,
  inflammation: 1.1,
  fatigue: 1,
  brainFog: 1,
  headache: 0.9,
  digestionQuality: -1,
  mood: -0.8,
  energy: -1
};

export function computeImpactScore(symptoms: SymptomVector) {
  const weighted = (Object.keys(symptoms) as Array<keyof SymptomVector>).reduce((acc, key) => {
    return acc + symptoms[key] * WEIGHTS[key];
  }, 0);

  const normalized = ((weighted + 20) / 40) * 10;
  return Math.max(0, Math.min(10, Number(normalized.toFixed(2))));
}
