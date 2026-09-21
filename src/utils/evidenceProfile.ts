import type { NewsArticle } from '../types';
import { articleSortTime } from './articleTime';
import { mediaProfile } from './mediaAuthority';
import { sourceGroupInfo, sourceGroupKey } from './sourceGrouping';

export type EvidenceStatus =
  | 'corroborated'
  | 'official-single'
  | 'single-source'
  | 'unverified';

export interface EvidenceProfile {
  status: EvidenceStatus;
  /** 按当前语料标题相似度聚合后，实际出现的不同发布方数量。 */
  independentSources: number;
  sourceNames: string[];
  occurrenceCount: number;
  corroboratingArticleIds: string[];
  hasOriginalLink: boolean;
  hasPublishedTime: boolean;
  /** AI 文本中列出的来源线索；仅用于提示，不参与独立来源计数。 */
  aiClaimedSources: number;
  title: string;
  note: string;
}

const COMMON_TITLE_WORDS = [
  '重磅',
  '最新',
  '突发',
  '快讯',
  '独家',
  '官方',
  '回应',
  '宣布',
  '消息',
  '报道',
];

const evidenceProfileCache = new WeakMap<
  object,
  WeakMap<object, Map<number, EvidenceProfile>>
>();

/** 归一化标题：只保留可用于事件匹配的字词，不把网址和标点当相似信号。 */
export function normalizeHeadline(input: string): string {
  let text = String(input || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
  for (const word of COMMON_TITLE_WORDS) {
    text = text.split(word).join('');
  }
  return text;
}

function bigrams(text: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!text) return out;
  if (text.length === 1) {
    out.set(text, 1);
    return out;
  }
  for (let i = 0; i < text.length - 1; i += 1) {
    const gram = text.slice(i, i + 2);
    out.set(gram, (out.get(gram) || 0) + 1);
  }
  return out;
}

/** 标题事件相似度：字符二元组重合度；包含关系需至少 8 个有效字符。 */
export function headlineSimilarity(a: string, b: string): number {
  const left = normalizeHeadline(a);
  const right = normalizeHeadline(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  if (shorter.length >= 8 && longer.includes(shorter)) return 0.88;

  const am = bigrams(left);
  const bm = bigrams(right);
  let intersection = 0;
  let union = 0;
  for (const [gram, count] of am) {
    const other = bm.get(gram) || 0;
    intersection += Math.min(count, other);
    union += Math.max(count, other);
  }
  for (const [gram, count] of bm) {
    if (!am.has(gram)) union += count;
  }
  return union > 0 ? intersection / union : 0;
}

function publisherKey(article: Pick<NewsArticle, 'sourceName' | 'sourceUrl'>): string {
  return sourceGroupKey(article.sourceName, article.sourceUrl);
}

function isWithinSevenDays(a: NewsArticle, b: NewsArticle): boolean {
  const at = articleSortTime(a);
  const bt = articleSortTime(b);
  if (!at || !bt) return false;
  return Math.abs(at - bt) <= 7 * 24 * 60 * 60 * 1000;
}

/**
 * 真实可追溯性档案。
 *
 * 这里不输出“真假分数”：标题相似只能证明报道可能指向同一事件，不能证明内容为真。
 * AI 生成的 multiSources 也不计入 sources，避免把模型记忆误当成独立新闻来源。
 */
export function buildEvidenceProfile(
  article: NewsArticle,
  corpus: readonly NewsArticle[] = [],
  similarityThreshold = 0.46
): EvidenceProfile {
  let corpusCache = evidenceProfileCache.get(article);
  if (!corpusCache) {
    corpusCache = new WeakMap<object, Map<number, EvidenceProfile>>();
    evidenceProfileCache.set(article, corpusCache);
  }
  let thresholdCache = corpusCache.get(corpus);
  if (!thresholdCache) {
    thresholdCache = new Map<number, EvidenceProfile>();
    corpusCache.set(corpus, thresholdCache);
  }
  const cached = thresholdCache.get(similarityThreshold);
  if (cached) return cached;

  const directMatches = corpus.filter((candidate) => {
    if (candidate.id === article.id) return false;
    if (publisherKey(candidate) === publisherKey(article)) return false;
    if (!isWithinSevenDays(article, candidate)) return false;
    return headlineSimilarity(article.title, candidate.title) >= similarityThreshold;
  });

  const candidates = [article, ...directMatches];
  const sourceKeys = new Set(
    candidates.flatMap((item) => [
      publisherKey(item),
      ...(item.sourceOccurrences || []).map((occurrence) => publisherKey(occurrence)),
    ]).filter(Boolean)
  );
  const sourceNames = [...new Set(
    candidates.flatMap((item) => [
      item.sourceName,
      ...(item.sourceOccurrences || []).map((occurrence) => occurrence.sourceName),
    ]).filter(Boolean)
  )];
  const occurrenceCount = candidates.reduce(
    (count, item) => count + 1 + (item.sourceOccurrences?.length || 0),
    0
  );
  const hasOriginalLink = Boolean(article.sourceUrl);
  const hasPublishedTime = articleSortTime(article) > 0;
  const aiClaimedSources = Array.isArray(article.rippleEffect?.multiSources)
    ? article.rippleEffect.multiSources.length
    : 0;
  const profile = mediaProfile(article.sourceName, article.sourceUrl);
  const groupInfos = candidates.map((item) => sourceGroupInfo(item.sourceName, item.sourceUrl));

  let status: EvidenceStatus = 'unverified';
  if (sourceKeys.size >= 2) status = 'corroborated';
  else if (profile?.tier === 'A' && hasOriginalLink) status = 'official-single';
  else if (hasOriginalLink) status = 'single-source';

  const title =
    status === 'corroborated'
      ? `${sourceKeys.size} 个独立来源`
      : status === 'official-single'
        ? '官方单源'
        : status === 'single-source'
          ? '单一来源'
          : '来源待核验';

  const note = [
    `独立来源按当前语料中 7 天内、标题事件相似度 ≥ ${Math.round(similarityThreshold * 100)}% 的不同来源集团聚合。`,
    groupInfos.some((group) => !group.known)
      ? '部分来源的母集团未登记，系统只按域名区分，不擅自判为独立或同源。'
      : '',
    hasOriginalLink ? '已附原文链接。' : '缺少原文链接。',
    hasPublishedTime ? '发布时间可解析。' : '缺少可解析发布时间。',
    aiClaimedSources > 0
      ? `另有 ${aiClaimedSources} 条 AI 列出的来源线索；它们不参与独立来源计数，也未经过联网核验。`
      : '',
    '该档案描述可追溯性，不判断报道内容真假。',
  ]
    .filter(Boolean)
    .join(' ');

  const result = {
    status,
    independentSources: Math.max(1, sourceKeys.size),
    sourceNames,
    occurrenceCount,
    corroboratingArticleIds: directMatches.map((item) => item.id),
    hasOriginalLink,
    hasPublishedTime,
    aiClaimedSources,
    title,
    note,
  };
  thresholdCache.set(similarityThreshold, result);
  return result;
}
