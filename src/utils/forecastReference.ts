import type { PredictionContract } from '../types';
import { predictionDueInfo } from './predictionLedger';
import { predictionOutcomes } from './predictionCalibration';

/** 与校准面板同一门槛：不足 20 条已确认样本时不计算比率。 */
export const MIN_CATEGORY_BASE_RATE = 20;

export interface CategoryBaseRate {
  category: string;
  binaryCount: number;
  positiveCount: number;
  minimum: number;
  positiveRate: number | null;
  note: string;
}

export interface DueWatchItem {
  id: string;
  articleId: string;
  articleTitle: string;
  question: string;
  targetVerificationDate: string;
  state: 'overdue' | 'due_today' | 'due_tomorrow';
  label: string;
}

function categoryName(category: string): string {
  const name = String(category || '').trim();
  return name || '未分类';
}

/**
 * 从已确认契约还原结果方向。
 * 双方都未命中时，记录不能确定世界走向，因此不计入。
 */
function resolvedDirection(contract: PredictionContract): 'positive' | 'negative' | null {
  if (contract.ledger !== 'server' || contract.integrityValid !== true || contract.reviewStatus !== 'confirmed') {
    return null;
  }
  if (!predictionOutcomes(contract)) return null;
  if (contract.status === 'verified_both_miss') return null;
  const direction =
    contract.status === 'verified_hit_ai' ? contract.aiPred.direction : contract.userPred.direction;
  return direction === 'positive' || direction === 'negative' ? direction : null;
}

/** 某一文章分类里，已确认契约的正向结果占比。样本不足时不给百分比。 */
export function categoryBaseRate(
  contracts: PredictionContract[],
  category: string,
): CategoryBaseRate {
  const name = categoryName(category);
  const matched = contracts.filter((contract) => categoryName(contract.articleCategory) === name);
  let binaryCount = 0;
  let positiveCount = 0;
  for (const contract of matched) {
    const direction = resolvedDirection(contract);
    if (!direction) continue;
    binaryCount += 1;
    if (direction === 'positive') positiveCount += 1;
  }
  const positiveRate =
    binaryCount >= MIN_CATEGORY_BASE_RATE
      ? Math.round((positiveCount / binaryCount) * 100)
      : null;
  const note =
    positiveRate === null
      ? `「${name}」已确认且能判定正负结果的回测 ${binaryCount} 条，不足 ${MIN_CATEGORY_BASE_RATE} 条，不计算基准率。双方都未命中或方向为中性的契约不计入。`
      : `「${name}」已确认回测 ${binaryCount} 条里，正向结果 ${positiveCount} 条（${positiveRate}%）。这只统计本机该分类契约，不是外部历史基准，也不能直接当作新命题的先验。`;
  return {
    category: name,
    binaryCount,
    positiveCount,
    minimum: MIN_CATEGORY_BASE_RATE,
    positiveRate,
    note,
  };
}

/** 未回测契约里，今天、明天或已经逾期的到期日。不附带概率。 */
export function dueWatchItems(contracts: PredictionContract[], now = new Date()): DueWatchItem[] {
  const items: DueWatchItem[] = [];
  for (const contract of contracts) {
    if (contract.status !== 'pending') continue;
    const due = predictionDueInfo(contract.targetVerificationDate, contract.status, now);
    let state: DueWatchItem['state'] | null = null;
    if (due.state === 'overdue') state = 'overdue';
    else if (due.state === 'due_today') state = 'due_today';
    else if (due.state === 'due_soon' && due.daysUntilDue === 1) state = 'due_tomorrow';
    if (!state) continue;
    items.push({
      id: contract.id,
      articleId: contract.articleId,
      articleTitle: contract.articleTitle,
      question: contract.question,
      targetVerificationDate: contract.targetVerificationDate,
      state,
      label: state === 'due_tomorrow' ? '明日到期' : due.label,
    });
  }
  const rank = { overdue: 0, due_today: 1, due_tomorrow: 2 };
  return items.sort((a, b) => {
    const byState = rank[a.state] - rank[b.state];
    if (byState !== 0) return byState;
    return a.targetVerificationDate.localeCompare(b.targetVerificationDate);
  });
}
