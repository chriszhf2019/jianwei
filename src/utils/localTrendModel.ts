// 本地「主线方向」共享引擎：由文章逻辑树驱动变量（logicTree.variableWeights）的
// 利好/利空权重净动量换算两侧强度。透明可复核、零 AI 成本、不是事实概率。
// 供「人机预测擂台」与「与我何干·双向预测」共用，保证同一篇文章两处口径一致。
// 仅当存在逻辑树变量时给出估计；否则诚实返回 none，不输出伪精确数字。

import { NewsArticle } from '../types';

export type LocalTrendDirection = 'positive' | 'negative' | 'mixed';

export interface LocalTrendWeights {
  kind: 'weights';
  /** 主线正向方向强度（0-100，与 pNeg 互补；不是发生概率） */
  pPos: number;
  /** 主线反向方向强度（0-100；不是发生概率） */
  pNeg: number;
  direction: LocalTrendDirection;
  upSum: number;
  downSum: number;
  totalWeight: number;
  momentum: number; // (up-down)/total ∈ [-1,1]
}

export type LocalTrendResult = LocalTrendWeights | { kind: 'none' };

export function localTrendModel(article: NewsArticle): LocalTrendResult {
  const weights = article?.logicTree?.variableWeights || [];
  const totalWeight = weights.reduce((s, w) => s + (w.weight || 0), 0);
  if (!weights.length || totalWeight <= 0) return { kind: 'none' };
  const upSum = weights
    .filter((w) => w.impactDirection === 'up')
    .reduce((s, w) => s + (w.weight || 0), 0);
  const downSum = weights
    .filter((w) => w.impactDirection === 'down')
    .reduce((s, w) => s + (w.weight || 0), 0);
  const momentum = (upSum - downSum) / totalWeight; // -1..1
  const pPos = Math.max(8, Math.min(92, Math.round(50 + momentum * 35)));
  const pNeg = 100 - pPos;
  const direction: LocalTrendDirection = pPos >= 56 ? 'positive' : pPos <= 44 ? 'negative' : 'mixed';
  return { kind: 'weights', pPos, pNeg, direction, upSum, downSum, totalWeight, momentum };
}

export const LOCAL_TREND_NOTE =
  '口径：本地线性加权引擎——由「逻辑树驱动变量」利好/利空权重换算方向强度（非 AI、不是概率）；事件也可能走中性路径。';
