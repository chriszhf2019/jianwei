/**
 * 深度分析输出质量：完整性（缺哪些字段组）+ 证据接地（引句/数字是否来自输入材料）。
 * 纯函数，可单测；不调用 AI。
 */
import { normalizeComparable } from './sourceVerification';

const SEVEN_W_KEYS = ['what', 'who', 'when', 'where', 'why', 'how', 'soWhat'] as const;

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/**
 * 返回缺失的核心字段组（顶层键），用于定向补生成。
 * 数组型字段（evidenceChain / stakeholderImpact / backstoryTimeline）允许为空数组，
 * 只要键存在；其余核心组必须有内容。
 */
export function findMissingEnrichGroups(payload: any): string[] {
  const p = payload && typeof payload === 'object' ? payload : {};
  const missing: string[] = [];

  if (!hasText(p.oneSentenceVerdict)) missing.push('oneSentenceVerdict');
  if (!hasText(p.summary)) missing.push('summary');
  if (!hasText(p.tongsuSummary?.simpleSay)) missing.push('tongsuSummary');
  if (!hasText(p.dehydratedItems?.coreEntity) || !hasText(p.dehydratedItems?.keyAction)) {
    missing.push('dehydratedItems');
  }

  const se = p.sevenElements;
  const sevenFilled = se && typeof se === 'object'
    ? SEVEN_W_KEYS.filter((key) => hasText(se[key])).length
    : 0;
  if (sevenFilled < 5) missing.push('sevenElements');

  if (!p.logicTree || !hasText(p.logicTree.rootCause) || !hasArray(p.logicTree.nodes)) {
    missing.push('logicTree');
  }
  if (!hasArray(p.personaImpacts)) missing.push('personaImpacts');
  if (!hasArray(p.rippleEffect?.stages)) missing.push('rippleEffect');
  if (!p.bullBearDebate || !hasArray(p.bullBearDebate.bull) || !hasArray(p.bullBearDebate.bear)) {
    missing.push('bullBearDebate');
  }
  if (!hasText(p.coreLogic?.essence)) missing.push('coreLogic');
  if (!Array.isArray(p.evidenceChain)) missing.push('evidenceChain');
  if (!Array.isArray(p.stakeholderImpact)) missing.push('stakeholderImpact');
  if (!Array.isArray(p.backstoryTimeline)) missing.push('backstoryTimeline');

  return missing;
}

function normalizeNumber(raw: string): string {
  const noComma = raw.replace(/,/g, '');
  const pct = noComma.endsWith('%');
  const body = pct ? noComma.slice(0, -1) : noComma;
  const n = Number(body);
  const normalized = Number.isFinite(n) ? String(n) : body;
  return pct ? `${normalized}%` : normalized;
}

function numbersIn(text: string): string[] {
  return [...String(text || '').matchAll(/\d+(?:[.,]\d+)?%?/g)].map((m) => normalizeNumber(m[0]));
}

/** 找出输出里不在输入材料中出现的数字（用于提示可能的臆造硬数据）。 */
export function findUngroundedNumbers(value: unknown, corpus: string): string[] {
  const source = corpus || '';
  if (!source.trim()) return [];
  const sourceNums = new Set(numbersIn(source));
  const outNums = numbersIn(typeof value === 'string' ? value : JSON.stringify(value ?? ''));
  return [...new Set(outNums.filter((n) => !sourceNums.has(n)))];
}

export interface GroundingResult {
  payload: any;
  /** 引句不在输入材料中、已移除的条数 */
  discardedQuotes: number;
  /** sourceFact 含未出现数字、已标记待核验的条数 */
  ungroundedEvidence: number;
}

/**
 * 证据接地：quote 必须逐字（归一化后）出现在输入材料中，否则移除并标注；
 * sourceFact 含输入材料中未出现的数字时，标记为待核验。其余字段不动。
 */
export function groundEvidence(payload: any, corpus: string): GroundingResult {
  if (!payload || typeof payload !== 'object') {
    return { payload, discardedQuotes: 0, ungroundedEvidence: 0 };
  }
  let discardedQuotes = 0;
  let ungroundedEvidence = 0;
  const normalizedCorpus = normalizeComparable(corpus);
  const evidence = Array.isArray(payload.evidenceChain) ? payload.evidenceChain : [];

  for (const ev of evidence) {
    if (!ev || typeof ev !== 'object') continue;
    if (hasText(ev.quote)) {
      const quote = normalizeComparable(String(ev.quote));
      if (!quote || !normalizedCorpus.includes(quote)) {
        ev.quote = '';
        ev.verificationStatus = 'unlinked';
        ev.verificationNote = '引句未在输入材料中找到，已移除';
        discardedQuotes += 1;
      }
    }
    if (hasText(ev.sourceFact)) {
      const ungrounded = findUngroundedNumbers(String(ev.sourceFact), corpus);
      if (ungrounded.length > 0) {
        ev.verificationStatus = 'unlinked';
        ev.verificationNote = `事实依据含输入材料中未出现的数字：${ungrounded.slice(0, 3).join('、')}`;
        ungroundedEvidence += 1;
      }
    }
  }
  return { payload, discardedQuotes, ungroundedEvidence };
}
