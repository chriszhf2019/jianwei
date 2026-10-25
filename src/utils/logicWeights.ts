/**
 * 核心论点权重：由文章自身的文本/结构信号派生（事实、风险、冲突、行业四维）。
 * 这是启发式归一化，不是模型评分、不是编辑预设、也不是校准概率。
 */
import type { NewsArticle } from '../types';
import { detectDomainTemplate, type DomainDimensionKey } from './domainTemplate';

export interface LogicWeightItem {
  name: string;
  weight: number;
  color: string;
  verdict: string;
}

const COLORS: Record<DomainDimensionKey, string> = {
  fact: '#0284c7',
  risk: '#E3120B',
  conflict: '#ca8a04',
  industry: '#16a34a',
};

function textOf(article: NewsArticle): string {
  const coreLogic = article.coreLogic
    ? `${article.coreLogic.essence || ''} ${(article.coreLogic.points || []).join(' ')} ${article.coreLogic.counterIntuitive || ''}`
    : '';
  const debate = article.bullBearDebate
    ? `${(article.bullBearDebate.bull || []).map((item) => item.point).join(' ')} ${(article.bullBearDebate.bear || []).map((item) => item.point).join(' ')} ${article.bullBearDebate.coreDispute || ''}`
    : '';
  return `${article.title || ''} ${article.summary || ''} ${article.subtitle || ''} ${article.category || ''} ${(article.tags || []).join(' ')} ${coreLogic} ${debate}`.toLowerCase();
}

function hitKeywords(text: string, keywords: string[]): string[] {
  const seen = new Set<string>();
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) seen.add(keyword);
  }
  return [...seen];
}

function countNumbers(text: string): number {
  return (text.match(/\d+(?:\.\d+)?%?/g) || []).length;
}

function normalize(raw: Record<DomainDimensionKey, number>): Record<DomainDimensionKey, number> {
  const keys: DomainDimensionKey[] = ['fact', 'risk', 'conflict', 'industry'];
  const total = keys.reduce((sum, key) => sum + raw[key], 0);
  if (total <= 0) return raw;
  const weights = {} as Record<DomainDimensionKey, number>;
  let used = 0;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      weights[key] = Math.max(0, 100 - used);
      return;
    }
    const value = Math.max(5, Math.round((raw[key] / total) * 100));
    weights[key] = value;
    used += value;
  });
  // 保证总和 100 且每项不小于 5
  const diff = 100 - keys.reduce((sum, key) => sum + weights[key], 0);
  weights.industry += diff;
  return weights;
}

/** 从文章信号派生四维权重；信号太少时返回空数组（前端不渲染热力图）。 */
export function deriveLogicWeights(article: NewsArticle): LogicWeightItem[] {
  const template = detectDomainTemplate(article);
  const text = textOf(article);
  const dims = Object.fromEntries(template.dimensions.map((dim) => [dim.key, dim])) as Record<
    DomainDimensionKey,
    (typeof template.dimensions)[number]
  >;

  const hits = {
    fact: hitKeywords(text, dims.fact.keywords),
    risk: hitKeywords(text, dims.risk.keywords),
    conflict: hitKeywords(text, dims.conflict.keywords),
    industry: hitKeywords(text, dims.industry.keywords),
  };

  const evidenceCount = Array.isArray(article.evidenceChain) ? article.evidenceChain.length : 0;
  const sevenFilled = article.sevenElements
    ? ['what', 'who', 'when', 'where', 'why', 'how', 'soWhat'].filter(
        (key) => typeof (article.sevenElements as any)?.[key] === 'string' && (article.sevenElements as any)[key].trim()
      ).length
    : 0;
  const hasRiskField = Boolean(article.riskReviewText);
  const bearCount = article.bullBearDebate?.bear?.length || 0;
  const hasTwist = Boolean(article.coreLogic?.counterIntuitive);
  const hasDispute = Boolean(article.bullBearDebate?.coreDispute);
  const signalCount = article.industrySignals?.length || 0;
  const stageCount = article.rippleEffect?.stages?.length || 0;
  const trendCount = Array.isArray((article.trendForecastText as any)?.trends)
    ? (article.trendForecastText as any).trends.length
    : 0;
  const numbers = countNumbers(text);

  const raw: Record<DomainDimensionKey, number> = {
    fact: 10 + evidenceCount * 3 + sevenFilled * 2 + hits.fact.length * 2,
    risk: 8 + hits.risk.length * 4 + (hasRiskField ? 6 : 0) + bearCount * 3 + Math.min(6, numbers * 1.5),
    conflict: 8 + hits.conflict.length * 4 + (hasTwist ? 8 : 0) + (hasDispute ? 5 : 0),
    industry: 8 + hits.industry.length * 3 + signalCount * 4 + stageCount * 3 + trendCount * 4,
  };

  const totalSignals =
    evidenceCount + sevenFilled + hits.fact.length + hits.risk.length + hits.conflict.length + hits.industry.length +
    bearCount + (hasRiskField ? 1 : 0) + (hasTwist ? 1 : 0) + (hasDispute ? 1 : 0) + signalCount + stageCount + trendCount;
  if (totalSignals < 4) return [];

  const weights = normalize(raw);
  const verdictFor = (key: DomainDimensionKey): string => {
    if (key === 'fact') {
      return evidenceCount > 0 || sevenFilled > 0
        ? `由 ${evidenceCount} 条证据链与 ${sevenFilled} 项 7W 字段派生`
        : `文本命中「${hits.fact.slice(0, 3).join('、')}」等事实信号`;
    }
    if (key === 'risk') {
      const parts: string[] = [];
      if (hits.risk.length) parts.push(`命中「${hits.risk.slice(0, 3).join('、')}」`);
      if (hasRiskField) parts.push('含风险模型');
      if (bearCount) parts.push(`${bearCount} 条反方论点`);
      if (numbers > 0) parts.push(`含 ${numbers} 个数字`);
      return parts.join(' · ') || '未命中风险信号';
    }
    if (key === 'conflict') {
      const parts: string[] = [];
      if (hits.conflict.length) parts.push(`命中「${hits.conflict.slice(0, 3).join('、')}」`);
      if (hasTwist) parts.push('含隐秘转折');
      if (hasDispute) parts.push('含分歧焦点');
      return parts.join(' · ') || '未命中冲突信号';
    }
    const parts: string[] = [];
    if (hits.industry.length) parts.push(`命中「${hits.industry.slice(0, 3).join('、')}」`);
    if (signalCount) parts.push(`${signalCount} 条行业信号`);
    if (stageCount) parts.push(`${stageCount} 阶涟漪`);
    if (trendCount) parts.push(`${trendCount} 条趋势`);
    return parts.join(' · ') || '未命中行业信号';
  };

  return (['fact', 'risk', 'conflict', 'industry'] as DomainDimensionKey[]).map((key) => ({
    name: dims[key].label,
    weight: weights[key],
    color: COLORS[key],
    verdict: verdictFor(key),
  }));
}
