/**
 * 统一分析框架契约（切片 1）
 * 前后端共享：详情 enrich 与贴链 analyze 映射到同一产品口径，避免 schema 漂移。
 *
 * 产品话术 → 现有字段：
 * - 摘要 → summary
 * - 定性 → oneSentenceVerdict
 * - 7W → sevenElements / sevenWBrief
 * - 影响 → aiInterpretation.impact | dehydratedItems.impactHighlights | sevenElements.soWhat
 * - 风险 → riskReviewText | grayscale.reverseRisks | bullBearDebate.bear | personaImpacts.threatRisk
 * - 证据链 → evidenceChain
 */

import type {
  EvidenceItem,
  NewsArticle,
  RiskReviewData,
  SevenElementsData,
  SevenWSummary,
} from '../types';

/** 与 PROMPT_VERSIONS.enrich / analyze 对齐的统一框架版本号 */
export const ANALYSIS_FRAMEWORK_VERSION = 'analysis-framework-2026-10-25-v2';

/** 产品侧展示标签（框架总览卡） */
export const ANALYSIS_FRAMEWORK_LABELS = {
  summary: '摘要',
  verdict: '定性',
  sevenW: '7W',
  impact: '影响',
  risks: '风险',
  evidence: '证据链',
} as const;

export type AnalysisFrameworkLabelKey = keyof typeof ANALYSIS_FRAMEWORK_LABELS;

/** 单一 AnalysisFramework 契约：详情与贴链共用 */
export interface AnalysisFramework {
  /** 摘要（summary） */
  summary: string;
  /** 一句话定性（oneSentenceVerdict） */
  verdict: string;
  /** 7W 事实拆解 */
  sevenW: SevenWSummary | null;
  /** 主要影响（聚合后的可读文案） */
  impact: string;
  /** 风险要点列表 */
  risks: string[];
  /** 证据链（已清洗结构） */
  evidence: EvidenceItem[];
  /** 框架版本，便于审计 */
  frameworkVersion: string;
}

function asText(value: unknown, max = 800): string {
  return String(value ?? '').trim().slice(0, max);
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const text = (value as { text?: unknown }).text;
  return typeof text === 'string' ? text.trim() : '';
}

function sevenWFrom(raw: unknown): SevenWSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const data: SevenWSummary = {
    what: asText(source.what, 500),
    who: asText(source.who, 500),
    when: asText(source.when, 300),
    where: asText(source.where, 300),
    why: asText(source.why, 500),
    how: asText(source.how, 500),
    soWhat: asText(source.soWhat, 500),
  };
  return Object.values(data).some(Boolean) ? data : null;
}

function riskReviewLines(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    const t = value.trim();
    return t ? [t.slice(0, 400)] : [];
  }
  if (typeof value !== 'object' || Array.isArray(value)) return [];
  const source = value as RiskReviewData & { text?: string };
  const fromText = textOf(source);
  if (fromText) return [fromText.slice(0, 400)];
  return [
    asText(source.mainRisk, 300),
    asText(source.misread, 300),
    asText(source.blindSpot, 300),
    asText(source.watchMetrics, 300),
  ].filter(Boolean);
}

/**
 * 从文章或 enrich/analyze 原始 payload 提取统一框架视图。
 * 只读映射，不丢弃旧字段；缺失项返回空串/空数组。
 */
export function extractAnalysisFramework(
  source: Partial<NewsArticle> | Record<string, unknown> | null | undefined
): AnalysisFramework {
  const article = (source && typeof source === 'object' ? source : {}) as Partial<NewsArticle> &
    Record<string, any>;

  const summary = asText(article.summary, 500);
  const verdict = asText(article.oneSentenceVerdict, 400) || summary;

  const sevenW =
    sevenWFrom(article.sevenWBrief) ||
    sevenWFrom(article.sevenElements);

  const impactFromInterpretation = asText(article.aiInterpretation?.impact, 400);
  const impactHighlights = Array.isArray(article.dehydratedItems?.impactHighlights)
    ? article.dehydratedItems!.impactHighlights.map((x) => asText(x, 200)).filter(Boolean)
    : [];
  const impactFromSoWhat = sevenW?.soWhat || asText(article.sevenElements?.soWhat, 400);
  const impact =
    impactFromInterpretation ||
    impactHighlights.slice(0, 2).join('；') ||
    impactFromSoWhat ||
    '';

  const risks: string[] = [];
  const fromRiskReview = riskReviewLines(article.riskReviewText);
  for (const line of fromRiskReview) {
    if (risks.length >= 6) break;
    risks.push(line);
  }
  const reverseRisks = article.aiInterpretation?.grayscale?.reverseRisks;
  if (Array.isArray(reverseRisks)) {
    for (const item of reverseRisks) {
      if (risks.length >= 6) break;
      const t = asText(item, 300);
      if (t && !risks.includes(t)) risks.push(t);
    }
  }
  const bear = article.bullBearDebate?.bear;
  if (Array.isArray(bear)) {
    for (const item of bear) {
      if (risks.length >= 6) break;
      const t = asText(item?.point, 300);
      if (t && !risks.includes(t)) risks.push(t);
    }
  }
  if (Array.isArray(article.personaImpacts)) {
    for (const p of article.personaImpacts) {
      if (risks.length >= 6) break;
      const t = asText(p?.threatRisk, 300);
      if (t && !risks.includes(t)) risks.push(t);
    }
  }

  const evidence = Array.isArray(article.evidenceChain)
    ? (article.evidenceChain as EvidenceItem[]).slice(0, 12)
    : [];

  return {
    summary,
    verdict,
    sevenW,
    impact,
    risks,
    evidence,
    frameworkVersion: ANALYSIS_FRAMEWORK_VERSION,
  };
}

/** 框架总览是否有可展示内容（避免空卡） */
export function hasFrameworkContent(fw: AnalysisFramework): boolean {
  return Boolean(
    fw.summary ||
      fw.verdict ||
      fw.impact ||
      fw.risks.length > 0 ||
      fw.sevenW ||
      fw.evidence.length > 0
  );
}

/**
 * 深度字段白名单：enrich 写回语料与详情合并共用，保证贴链/详情不漂移。
 * 旧字段全部保留；不在此列表的壳字段（title/tags 等）由各入口自行处理。
 */
export const ANALYSIS_DEEP_FIELD_KEYS = [
  'sevenElements',
  'logicTree',
  'personaImpacts',
  'rippleEffect',
  'spectrumLayers',
  'evidenceChain',
  'industrySignals',
  'oneSentenceVerdict',
  'subtitle',
  'summary',
  'coreQuote',
  'quoteAuthor',
  'tongsuSummary',
  'dehydratedItems',
  'backstoryTimeline',
  'stakeholderImpact',
  'coreLogic',
  'bullBearDebate',
  'aiInterpretation',
  'riskReviewText',
  'trendForecastText',
  'sevenWBrief',
  'fastReadPoints',
  'narrativeSections',
] as const;

export type AnalysisDeepFieldKey = (typeof ANALYSIS_DEEP_FIELD_KEYS)[number];

/** 把 payload 中的深度字段浅拷到目标（只覆盖已出现的键） */
export function mergeDeepAnalysisFields<T extends object>(
  target: T,
  payload: Record<string, unknown> | object | null | undefined
): T {
  if (!payload || typeof payload !== 'object') return target;
  const next: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  const src = payload as Record<string, unknown>;
  for (const key of ANALYSIS_DEEP_FIELD_KEYS) {
    if (src[key] !== undefined && src[key] !== null) {
      next[key] = src[key];
    }
  }
  return next as T;
}

/** aiVerdict.actionLevel 统一为类型契约：行动 | 关注 | 观望 */
export function normalizeAiVerdictActionLevel(raw: unknown): SevenElementsData['aiVerdict']['actionLevel'] {
  const s = String(raw || '').trim();
  if (s === '行动') return '行动';
  if (s === '关注' || s === '观察') return '关注';
  if (s === '观望' || s === '规避') return '观望';
  return '观望';
}
