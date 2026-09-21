import type { PredictionContract } from '../types';

export type PredictionDueState =
  | 'resolved'
  | 'overdue'
  | 'due_today'
  | 'due_soon'
  | 'upcoming'
  | 'invalid';

export interface PredictionDueInfo {
  state: PredictionDueState;
  daysUntilDue: number | null;
  label: string;
}

function localDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function predictionDueInfo(
  targetVerificationDate: string,
  status: PredictionContract['status'] = 'pending',
  now = new Date()
): PredictionDueInfo {
  if (status !== 'pending') {
    return { state: 'resolved', daysUntilDue: null, label: '已完成回测' };
  }
  const match = String(targetVerificationDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { state: 'invalid', daysUntilDue: null, label: '到期日无效' };
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    target.getFullYear() !== Number(match[1]) ||
    target.getMonth() !== Number(match[2]) - 1 ||
    target.getDate() !== Number(match[3])
  ) {
    return { state: 'invalid', daysUntilDue: null, label: '到期日无效' };
  }
  const daysUntilDue = localDayNumber(target) - localDayNumber(now);
  if (daysUntilDue < 0) {
    return { state: 'overdue', daysUntilDue, label: `逾期 ${Math.abs(daysUntilDue)} 天` };
  }
  if (daysUntilDue === 0) return { state: 'due_today', daysUntilDue, label: '今日到期' };
  if (daysUntilDue <= 7) return { state: 'due_soon', daysUntilDue, label: `${daysUntilDue} 天后到期` };
  return { state: 'upcoming', daysUntilDue, label: `${daysUntilDue} 天后到期` };
}
