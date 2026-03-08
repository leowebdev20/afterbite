export type CorrelationInsight = {
  ingredient: string;
  symptom: string;
  delta: number;
  confidence: "low" | "medium" | "high";
};

export function toConfidence(samples: number): CorrelationInsight["confidence"] {
  if (samples >= 30) return "high";
  if (samples >= 12) return "medium";
  return "low";
}

export function averageDelta(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
