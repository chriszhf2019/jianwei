import type { PredictionContract } from '../types';

export interface ForecastPoint {
  probability: number;
  outcome: 0 | 1;
}

export function predictionOutcomes(
  contract: PredictionContract
): { user: 0 | 1; ai: 0 | 1 } | null {
  if (contract.status === 'pending') return null;
  if (!String(contract.actualOutcome || '').trim()) return null;
  if (contract.status === 'verified_hit_user') return { user: 1, ai: 0 };
  if (contract.status === 'verified_hit_ai') return { user: 0, ai: 1 };
  if (contract.status === 'verified_both_win') return { user: 1, ai: 1 };
  return { user: 0, ai: 0 };
}

export function forecastMetrics(points: ForecastPoint[]): {
  count: number;
  brier: number | null;
  logLoss: number | null;
} {
  if (points.length === 0) return { count: 0, brier: null, logLoss: null };
  const eps = 1e-6;
  const brier = points.reduce((sum, p) => sum + (p.probability - p.outcome) ** 2, 0) / points.length;
  const logLoss =
    -points.reduce((sum, p) => {
      const prob = Math.max(eps, Math.min(1 - eps, p.probability));
      return sum + p.outcome * Math.log(prob) + (1 - p.outcome) * Math.log(1 - prob);
    }, 0) / points.length;
  return {
    count: points.length,
    brier: Math.round(brier * 1000) / 1000,
    logLoss: Math.round(logLoss * 1000) / 1000,
  };
}

export function calibrationBuckets(userPoints: ForecastPoint[], aiPoints: ForecastPoint[]) {
  return Array.from({ length: 5 }, (_, index) => {
    const inBucket = (p: ForecastPoint) => Math.min(4, Math.floor(p.probability * 5)) === index;
    const user = userPoints.filter(inBucket);
    const ai = aiPoints.filter(inBucket);
    const observed = (points: ForecastPoint[]) =>
      points.length ? Math.round((points.reduce((sum, p) => sum + p.outcome, 0) / points.length) * 100) : null;
    return {
      label: `${index * 20}-${index * 20 + 20}%`,
      userCount: user.length,
      userObserved: observed(user),
      aiCount: ai.length,
      aiObserved: observed(ai),
    };
  });
}
