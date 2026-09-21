export interface LabeledPrediction {
  expected: string;
  predicted: string;
}

export function macroF1(samples: LabeledPrediction[], labels: string[]): number {
  if (labels.length === 0) return 0;
  const scores = labels.map((label) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const sample of samples) {
      if (sample.expected === label && sample.predicted === label) tp += 1;
      else if (sample.expected !== label && sample.predicted === label) fp += 1;
      else if (sample.expected === label && sample.predicted !== label) fn += 1;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  });
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function expectedCalibrationError(
  points: Array<{ probability: number; outcome: 0 | 1 }>,
  bins = 10
): number {
  if (points.length === 0) return 0;
  let error = 0;
  for (let index = 0; index < bins; index += 1) {
    const bucket = points.filter((point) => {
      const bucketIndex = Math.min(bins - 1, Math.floor(point.probability * bins));
      return bucketIndex === index;
    });
    if (bucket.length === 0) continue;
    const averageProbability = bucket.reduce((sum, point) => sum + point.probability, 0) / bucket.length;
    const observed = bucket.reduce((sum, point) => sum + point.outcome, 0) / bucket.length;
    error += (bucket.length / points.length) * Math.abs(averageProbability - observed);
  }
  return error;
}

export function precisionAtK(relevant: Set<string>, ranked: string[], k: number): number {
  const sliced = ranked.slice(0, Math.max(0, k));
  if (sliced.length === 0) return 0;
  return sliced.filter((id) => relevant.has(id)).length / sliced.length;
}

export function recallAtK(relevant: Set<string>, ranked: string[], k: number): number {
  if (relevant.size === 0) return 0;
  return ranked.slice(0, Math.max(0, k)).filter((id) => relevant.has(id)).length / relevant.size;
}

export function ndcgAtK(relevant: Set<string>, ranked: string[], k: number): number {
  const dcg = ranked
    .slice(0, Math.max(0, k))
    .reduce((sum, id, index) => sum + (relevant.has(id) ? 1 / Math.log2(index + 2) : 0), 0);
  const idealCount = Math.min(relevant.size, Math.max(0, k));
  const ideal = Array.from({ length: idealCount }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, value) => sum + value, 0);
  return ideal > 0 ? dcg / ideal : 0;
}

/**
 * Krippendorff's alpha for nominal labels.
 * 缺失值用空字符串表示；至少需要 2 个标注者和 2 个有效单元。
 */
export function krippendorffAlphaNominal(units: string[][]): number | null {
  const valid = units
    .map((unit) => unit.filter((label) => label !== ''))
    .filter((unit) => unit.length >= 2);
  if (valid.length < 2) return null;

  let observedDisagreements = 0;
  let observedPairs = 0;
  const allValues: string[] = [];
  for (const unit of valid) {
    const n = unit.length;
    observedPairs += n * (n - 1);
    for (let i = 0; i < n; i += 1) {
      allValues.push(unit[i]);
      for (let j = i + 1; j < n; j += 1) {
        if (unit[i] !== unit[j]) observedDisagreements += 2;
      }
    }
  }

  const totalValues = allValues.length;
  if (observedPairs === 0 || totalValues < 2) return null;
  const valueCounts = new Map<string, number>();
  for (const value of allValues) valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  const expectedDisagreements = [...valueCounts.values()]
    .reduce((sum, count) => sum + count * (count - 1), 0) / (totalValues * (totalValues - 1));
  const observed = observedDisagreements / observedPairs;
  const expected = expectedDisagreements;
  return expected === 0 ? 1 : 1 - observed / expected;
}
