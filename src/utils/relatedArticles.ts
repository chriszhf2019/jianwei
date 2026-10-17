// 本地相关文章匹配：BM25 字段化检索 + 标题重合门槛。
// 纯本地零 AI 成本；结果仍只代表词项相关性，不代表事实关联。
// 弱匹配（如 Meta AI 模型 vs 英国自杀率）不得标「同题印证·高度契合」。

import { rankDocumentsBM25 } from './textRetrieval';

export interface ArticleLike {
  id: string;
  title?: string;
  summary?: string;
  sourceName?: string;
  sourceUrl?: string;
  publishedAt?: string | null;
  date?: string;
  category?: string;
  entityMentions?: Array<{ name?: string }>;
}

/** BM25 绝对分门槛：低于此分的候选一律丢弃（旧值 0.8 过松）。 */
export const RELATED_BM25_MIN_SCORE = 2.5;

/**
 * 标题 bigram Jaccard 最低重合：低于此视为异题弱词项命中，不展示为相关。
 * ~4% 量级重合不应进入「相关图 / 对比自动选 B」。
 */
export const RELATED_TITLE_OVERLAP_MIN = 0.08;

/** 对比模式：高度契合所需文本重合（Jaccard 比例）。 */
export const COMPARE_HIGH_SIMILARITY = 0.45;

/** 对比模式：低于此比例标「异题 / 弱关联」，不得宣称高度契合。 */
export const COMPARE_WEAK_SIMILARITY = 0.12;

function bigramMap(text: string): Map<string, number> {
  const t = String(text || '')
    .replace(/[\s\p{P}]/gu, '')
    .toLowerCase();
  const map = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i += 1) {
    const g = t.slice(i, i + 2);
    map.set(g, (map.get(g) || 0) + 1);
  }
  return map;
}

/** 标题（或任意短文本）字符二元组 Jaccard，0–1。 */
export function titleBigramJaccard(aText: string, bText: string): number {
  const a = bigramMap(aText);
  const b = bigramMap(bText);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  let union = 0;
  for (const [g, ca] of a) {
    const cb = b.get(g) || 0;
    inter += Math.min(ca, cb);
    union += Math.max(ca, cb);
  }
  for (const [g, cb] of b) {
    if (!a.has(g)) union += cb;
  }
  return union > 0 ? inter / union : 0;
}

function hasSharedEntity(article: ArticleLike, other: ArticleLike): boolean {
  const names = (article.entityMentions || [])
    .map((e) => (e.name || '').trim())
    .filter((n) => n.length >= 2);
  if (names.length === 0) return false;
  const hay = `${other.title || ''} ${other.summary || ''}`;
  return names.some((n) => hay.includes(n));
}

export interface RankedRelated<T extends ArticleLike> {
  document: T;
  score: number;
  titleOverlap: number;
  /** 仅 BM25、无实体共现且标题重合刚过线 → 弱关联 */
  weak: boolean;
}

/**
 * 带分数的相关召回。先按 BM25 取候选，再用标题重合 / 实体共现二次过滤。
 * 不过门槛则返回空：调用方应隐藏相关图或不开自动对比。
 */
export function findRelatedArticlesRanked<T extends ArticleLike>(
  article: ArticleLike,
  pool: readonly T[],
  topN = 4,
  minScore = RELATED_BM25_MIN_SCORE
): Array<RankedRelated<T>> {
  const candidates = pool.filter((item) => item.id !== article.id);
  const ranked = rankDocumentsBM25(
    `${article.title || ''} ${article.summary || ''}`,
    candidates.map((item) => ({
      ...item,
      title: item.title || '',
      body: item.summary || '',
    })),
    Math.max(topN * 4, 12),
    minScore
  );

  const gated: Array<RankedRelated<T>> = [];
  for (const item of ranked) {
    const doc = item.document as T;
    const titleOverlap = titleBigramJaccard(article.title || '', doc.title || '');
    const entityHit = hasSharedEntity(article, doc);
    // 门槛：标题重合达标，或共现实体且 BM25 明显高于下限
    if (titleOverlap < RELATED_TITLE_OVERLAP_MIN && !entityHit) continue;
    if (titleOverlap < RELATED_TITLE_OVERLAP_MIN && entityHit && item.score < minScore * 1.2) {
      continue;
    }
    const weak = !entityHit && titleOverlap < COMPARE_WEAK_SIMILARITY;
    gated.push({ document: doc, score: item.score, titleOverlap, weak });
    if (gated.length >= topN) break;
  }
  return gated;
}

/** 找到与 article 最相关的其他文章（BM25 + 标题重合门槛）。 */
export function findRelatedArticles<T extends ArticleLike>(
  article: ArticleLike,
  pool: readonly T[],
  topN = 4,
  minScore = RELATED_BM25_MIN_SCORE
): T[] {
  return findRelatedArticlesRanked(article, pool, topN, minScore).map((item) => item.document);
}

/**
 * 对比视角标签：禁止在低重合或「仅同源」时宣称高度契合。
 */
export function compareDivergenceLabel(input: {
  textSimilarity: number; // 0–100
  isSameSource: boolean;
  categoryA?: string;
  categoryB?: string;
  sharedEntities: string[];
}): { label: string; color: string; insight: string; weak: boolean } {
  const ratio = input.textSimilarity / 100;
  if (ratio < COMPARE_WEAK_SIMILARITY) {
    return {
      label: '异题弱关联 · 低重合',
      color: 'text-stone-600 bg-stone-100 border-stone-300',
      insight: `两文文本重合约 ${input.textSimilarity}%，未达同题门槛；请手动另选对比稿，勿当作印证。`,
      weak: true,
    };
  }
  // 高度契合：必须文本重合达标；同源 alone 不够
  if (ratio >= COMPARE_HIGH_SIMILARITY) {
    return {
      label: '同题印证 · 高度契合',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      insight: '两篇文章对核心事件事实描述高度重叠，主要论断基调基本一致。',
      weak: false,
    };
  }
  if (input.categoryA && input.categoryB && input.categoryA !== input.categoryB) {
    return {
      label: '跨界穿透 · 异构视角',
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      insight: `文章 A 聚焦于「${input.categoryA}」维度，而文章 B 则切入「${input.categoryB}」，展现事件在不同领域的连锁扩散效应。`,
      weak: false,
    };
  }
  if (input.sharedEntities.length > 0) {
    return {
      label: '同主体聚焦 · 观点分歧',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      insight: `两篇共同关注主体「${input.sharedEntities.slice(0, 2).join('、')}」，但侧重点和逻辑归因存在明显差异。`,
      weak: false,
    };
  }
  return {
    label: '中度关联 · 互补补充',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    insight: '两篇报道在事实层面形成有效信息拼图，建议交叉通读。',
    weak: false,
  };
}
