import type { PredictionContract } from '../types';
import { expectedCalibrationError } from './evaluationMetrics';

export const MIN_CALIBRATION_SAMPLE = 20;

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

export interface DatedForecastPoint extends ForecastPoint {
  month: string | null;
}

export interface CalibrationSample {
  user: DatedForecastPoint[];
  ai: DatedForecastPoint[];
  missingEvidence: number;
  awaitingTwoPersonReview: number;
  undatedCount: number;
}

export interface MonthlyCalibrationRow {
  month: string;
  user: { count: number; brier: number | null; logLoss: number | null };
  ai: { count: number; brier: number | null; logLoss: number | null };
  userEce: number | null;
  aiEce: number | null;
}

function resolutionMonth(value?: string): string | null {
  const match = String(value || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${match[2]}`;
}

function roundEce(points: ForecastPoint[]): number | null {
  if (points.length < MIN_CALIBRATION_SAMPLE) return null;
  return Math.round(expectedCalibrationError(points) * 1000) / 1000;
}

/** 与校准面板同一门槛：服务端存证、完整性通过、双人复核确认，且有结果证据。 */
export function collectCalibrationSample(
  contracts: PredictionContract[],
  excludeIds: Set<string> = new Set(),
): CalibrationSample {
  const user: DatedForecastPoint[] = [];
  const ai: DatedForecastPoint[] = [];
  let missingEvidence = 0;
  let awaitingTwoPersonReview = 0;
  let undatedCount = 0;
  for (const contract of contracts) {
    if (excludeIds.has(contract.id)) continue;
    if (contract.status !== 'pending' && !String(contract.actualOutcome || '').trim()) missingEvidence += 1;
    if (contract.status !== 'pending' && contract.reviewStatus !== 'confirmed') awaitingTwoPersonReview += 1;
    if (
      contract.ledger !== 'server' ||
      contract.integrityValid !== true ||
      contract.reviewStatus !== 'confirmed'
    ) continue;
    const hit = predictionOutcomes(contract);
    if (!hit) continue;
    const month = resolutionMonth(contract.resolutionDate);
    if (!month) undatedCount += 1;
    user.push({ probability: contract.userPred.confidence / 100, outcome: hit.user, month });
    ai.push({ probability: contract.aiPred.confidence / 100, outcome: hit.ai, month });
  }
  return { user, ai, missingEvidence, awaitingTwoPersonReview, undatedCount };
}

/** 按回测时间的 UTC 月份汇总。没有回测日期的记录不编入任何月份。样本不足时不计算 ECE。 */
export function monthlyCalibration(sample: CalibrationSample): MonthlyCalibrationRow[] {
  const months = new Set<string>();
  for (const point of sample.user) if (point.month) months.add(point.month);
  return [...months].sort((a, b) => b.localeCompare(a)).map((month) => {
    const user = sample.user.filter((point) => point.month === month);
    const ai = sample.ai.filter((point) => point.month === month);
    return {
      month,
      user: forecastMetrics(user),
      ai: forecastMetrics(ai),
      userEce: roundEce(user),
      aiEce: roundEce(ai),
    };
  });
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
