// 面向语料的轻量“指标代理”工具：全部为透明可复核的统计口径（非黑盒模型）。
// 说明：情感词典法是基于中文财经情感词的朴素基线，仅作趋势代理，不构成投资依据。

import { detectSectors } from './sectorTaxonomy';
import { parseArticleDate } from './articleTime';

export const POSITIVE_WORDS = ['增长', '上涨', '突破', '创新', '新高', '超预期', '领先', '落地', '获批', '量产', '盈利', '加速', '回暖', '扩张', '胜', '赚'];
export const NEGATIVE_WORDS = ['下跌', '下滑', '亏损', '裁员', '违约', '召回', '风险', '处罚', '退市', '不及预期', '中止', '推迟', '承压', '腰斩', '暴雷', '砍单'];

export interface SentimentCounts {
  positive: number;
  negative: number;
  /** 同一篇同时命中正负词：不重复塞进正/负计数，避免三项之和超过样本量。 */
  mixed: number;
  scanned: number;
}

/** 词典法粗粒度情感计数（标题+摘要）；每篇只归入正/负/中性/交织其中一类。 */
export function sentimentCounts(
  articles: Array<{ title?: string; summary?: string }>
): SentimentCounts {
  let positive = 0;
  let negative = 0;
  let mixed = 0;
  let scanned = 0;
  for (const a of articles) {
    const text = `${a.title || ''} ${a.summary || ''}`.toLowerCase();
    if (!text.trim()) continue;
    scanned += 1;
    const hasPositive = POSITIVE_WORDS.some((w) => text.includes(w.toLowerCase()));
    const hasNegative = NEGATIVE_WORDS.some((w) => text.includes(w.toLowerCase()));
    if (hasPositive && !hasNegative) positive += 1;
    else if (hasNegative && !hasPositive) negative += 1;
    else if (hasPositive && hasNegative) mixed += 1;
  }
  return { positive, negative, mixed, scanned };
}

/** 净情绪 [-100,100]：(正向-负向)/(两者之和)*100，无两者时返回 null；逐篇唯一归类，不重复计数 */
export function netSentiment(c: SentimentCounts): number | null {
  const denom = c.positive + c.negative;
  if (denom === 0) return null;
  return Math.round(((c.positive - c.negative) / denom) * 100);
}

export interface KeywordHits {
  total: number;
  recent24h: number;
  prev24h: number;
  latestTitle: string | null;
  positive24h: number;
  negative24h: number;
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 关键词命中统计：最近/前一自然日窗口按 publishedAt（解析失败不计窗口，仅计入 total 以外的 any） */
export function keywordHits(
  keyword: string,
  articles: Array<{
    title?: string;
    summary?: string;
    publishedAt?: string;
    subtitle?: string;
    oneSentenceVerdict?: string;
    tags?: string[];
  }>
): KeywordHits {
  const q = keyword.toLowerCase();
  const hits: Array<{ a: (typeof articles)[number]; text: string; ts: number | null; dateKey: string | null }> = [];
  for (const a of articles) {
    const parts = [
      a.title || '',
      a.subtitle || '',
      a.summary || '',
      a.oneSentenceVerdict || '',
      (a.tags || []).join(' '),
    ];
    const text = parts.join(' ').toLowerCase();
    if (!text.trim()) continue;
    let matched = text.includes(q);
    if (!matched) {
      // 与 monitorKeywords.ts 同一匹配口径：短语监控词按“足够具体的组成词”兜底，
      // 避免 “NVIDIA 算力” 因只出现 “NVIDIA” 而漏报。
      const concrete = q
        .split(/\s+/)
        .filter(Boolean)
        .filter((p) =>
          /[\u4e00-\u9fa5]/.test(p)
            ? p.replace(/[^\u4e00-\u9fa5]/g, '').length >= 3
            : p.replace(/[^a-z0-9]/g, '').length >= 4
        );
      matched = concrete.some((p) => text.includes(p));
    }
    if (!matched) continue;
    let ts: number | null = null;
    if (a.publishedAt) {
      const t = new Date(a.publishedAt).getTime();
      if (!Number.isNaN(t)) ts = t;
    }
    hits.push({ a, text, ts, dateKey: ts !== null ? dayKey(ts) : null });
  }

  const today = dayKey(Date.now());
  const yestMs = Date.now() - 24 * 3600 * 1000;
  const yesterday = dayKey(yestMs);

  let recent24h = 0;
  let prev24h = 0;
  let positive24h = 0;
  let negative24h = 0;
  for (const h of hits) {
    if (h.dateKey === today) recent24h += 1;
    else if (h.dateKey === yesterday) prev24h += 1;
    // 词典情感（仅统计窗口内有时间的条目）
    if (h.dateKey === today || h.dateKey === yesterday) {
      if (POSITIVE_WORDS.some((w) => h.text.includes(w.toLowerCase()))) positive24h += 1;
      if (NEGATIVE_WORDS.some((w) => h.text.includes(w.toLowerCase()))) negative24h += 1;
    }
  }

  return {
    total: hits.length,
    recent24h,
    prev24h,
    positive24h,
    negative24h,
    latestTitle:
      hits.length > 0
        ? [...hits].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))[0].a.title || null
        : null,
  };
}

export interface CorpusDerived {
  net: number | null; // 净情绪 [-100,100]
  optimismRatio: number | null; // 正向占比 %
  positive: number;
  negative: number;
  neutral: number; // 无正负词典词命中
  mixed: number; // 同篇正负词均有命中
  negativeHits: number; // 命中负向词的文章数（同 negative）
  sectorHits: number; // 覆盖到的赛道数
  /** 窗口内实际参与扫描的样本数（有标题/摘要且非空），用于展示“统计样本量/可信度” */
  scanned: number;
}

/** 对给定文章列表直接出词典统计（不做任何时间窗口过滤；窗口由调用方决定） */
export function deriveFromList(list: NewsArticleLike[]): CorpusDerived {
  const c = sentimentCounts(list);
  const denom = c.positive + c.negative;
  const ratio = denom === 0 ? null : Math.round((c.positive / denom) * 100);
  const sectors = new Set<string>();
  for (const a of list) for (const id of detectSectors(a)) sectors.add(id);
  return {
    net: netSentiment(c),
    optimismRatio: ratio,
    positive: c.positive,
    negative: c.negative,
    neutral: Math.max(0, c.scanned - c.positive - c.negative - c.mixed),
    mixed: c.mixed,
    negativeHits: c.negative,
    sectorHits: sectors.size,
    scanned: c.scanned,
  };
}

/**
 * 面向“首页/顶栏/市场卡”的语料词典代理指标（公式见 netSentiment；透明可复核）。
 * windowDays：默认只看近 30 天真实发布条目（避免一年前旧闻稀释“今日”情绪）；
 * 无 publishedAt 的站内/深度文章保留（它们按创建时点参与）。
 */
export function corpusDerived(
  articles: NewsArticleLike[],
  windowDays = 30
): CorpusDerived {
  const now = Date.now();
  const windowMs = windowDays * 24 * 3600 * 1000;
  const recent = articles.filter((a) => {
    if (!a.publishedAt) return true; // 站内/用户投递文章无真实发布时刻：保留
    const ts = parseArticleDate(a.publishedAt);
    if (ts === null) return true; // 解析失败：不武断剔除
    return now - ts <= windowMs;
  });
  return deriveFromList(recent);
}

type NewsArticleLike = { title?: string; summary?: string; publishedAt?: string | null };
