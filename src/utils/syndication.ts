import type { NewsArticle } from '../types';
import { articleSortTime } from './articleTime';
import { headlineSimilarity, normalizeHeadline } from './evidenceProfile';
import { sourceGroupInfo, sourceGroupKey } from './sourceGrouping';

export type SyndicationSignal =
  | 'duplicate_url'
  | 'known_same_group'
  | 'same_headline'
  | 'likely_text_reuse';

export interface SyndicationCandidate {
  id: string;
  signal: SyndicationSignal;
  confirmed: boolean;
  articleA: { id: string; title: string; sourceName: string; sourceUrl?: string };
  articleB: { id: string; title: string; sourceName: string; sourceUrl?: string };
  titleSimilarity: number;
  textSimilarity: number;
  timeDeltaHours: number | null;
  note: string;
}

function canonicalUrl(raw?: string | null): string {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|spm|from|source|ref|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString().toLowerCase();
  } catch {
    return '';
  }
}

function normalizedText(article: NewsArticle): string {
  return normalizeHeadline(`${article.title || ''}${article.subtitle || ''}${article.summary || ''}`);
}

function bigrams(text: string): Map<string, number> {
  const map = new Map<string, number>();
  if (text.length < 2) return map;
  for (let i = 0; i < text.length - 1; i += 1) {
    const gram = text.slice(i, i + 2);
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return map;
}

export function textOverlap(a: string, b: string): number {
  const left = normalizedText({ title: a, summary: '' } as NewsArticle);
  const right = normalizedText({ title: b, summary: '' } as NewsArticle);
  if (!left || !right) return 0;
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
  return union ? intersection / union : 0;
}

function signalPriority(signal: SyndicationSignal): number {
  if (signal === 'duplicate_url') return 4;
  if (signal === 'known_same_group') return 3;
  if (signal === 'same_headline') return 2;
  return 1;
}

export function findSyndicationCandidates(
  articles: NewsArticle[],
  limit = 20
): SyndicationCandidate[] {
  const pool = articles
    .filter((article) => article.isExternal !== false && article.title && article.sourceUrl)
    .slice(0, 500);
  const out: SyndicationCandidate[] = [];
  for (let i = 0; i < pool.length; i += 1) {
    for (let j = i + 1; j < pool.length; j += 1) {
      const a = pool[i];
      const b = pool[j];
      const groupA = sourceGroupKey(a.sourceName, a.sourceUrl);
      const groupB = sourceGroupKey(b.sourceName, b.sourceUrl);
      const urlA = canonicalUrl(a.sourceUrl);
      const urlB = canonicalUrl(b.sourceUrl);
      const titleSimilarity = headlineSimilarity(a.title, b.title);
      const textSimilarity = textOverlap(
        `${a.title || ''}${a.subtitle || ''}${a.summary || ''}`,
        `${b.title || ''}${b.subtitle || ''}${b.summary || ''}`
      );
      let signal: SyndicationSignal | null = null;
      let confirmed = false;
      let note = '';

      if (urlA && urlA === urlB) {
        signal = 'duplicate_url';
        confirmed = true;
        note = '规范化 URL 完全相同。';
      } else if (groupA === groupB && sourceGroupInfo(a.sourceName, a.sourceUrl).known) {
        if (titleSimilarity < 0.65 && textSimilarity < 0.7) continue;
        signal = 'known_same_group';
        confirmed = true;
        note = `已登记为同一来源集团：${sourceGroupInfo(a.sourceName, a.sourceUrl).label}。`;
      } else if (titleSimilarity >= 0.9) {
        signal = 'same_headline';
        note = '标题高度一致，可能为同题报道、转载或同源稿件，尚未确认授权关系。';
      } else if (titleSimilarity >= 0.45 && textSimilarity >= 0.78) {
        signal = 'likely_text_reuse';
        note = '标题和摘要文本高度重合，可能存在复用，不能据此认定转载或版权关系。';
      }

      if (!signal) continue;
      const timeA = articleSortTime(a);
      const timeB = articleSortTime(b);
      out.push({
        id: `${a.id}:${b.id}`,
        signal,
        confirmed,
        articleA: { id: a.id, title: a.title, sourceName: a.sourceName, sourceUrl: a.sourceUrl },
        articleB: { id: b.id, title: b.title, sourceName: b.sourceName, sourceUrl: b.sourceUrl },
        titleSimilarity: Math.round(titleSimilarity * 100),
        textSimilarity: Math.round(textSimilarity * 100),
        timeDeltaHours: timeA && timeB ? Math.round(Math.abs(timeA - timeB) / 360000) / 10 : null,
        note,
      });
    }
  }
  return out
    .sort((a, b) =>
      signalPriority(b.signal) - signalPriority(a.signal) ||
      b.textSimilarity - a.textSimilarity ||
      b.titleSimilarity - a.titleSimilarity
    )
    .slice(0, limit);
}

/** 传播图节点 */
export interface SyndicationNode {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl?: string;
  publishedAt: number;
  sourceGroup?: string;
}

/** 传播图边（有向：from=首发，to=跟进） */
export interface SyndicationEdge {
  from: string;
  to: string;
  signal: SyndicationSignal;
  confirmed: boolean;
  titleSimilarity: number;
  textSimilarity: number;
  timeDeltaHours: number;
  note: string;
}

/** 传播链（首尾相连的路径） */
export interface SyndicationChain {
  nodes: string[];
  earliestAt: number;
  latestAt: number;
  spanHours: number;
  sourceCount: number;
}

export interface SyndicationGraph {
  nodes: SyndicationNode[];
  edges: SyndicationEdge[];
  chains: SyndicationChain[];
}

/**
 * 从语料构建通讯社/转载传播图。
 * 按发布时间确定传播方向（早→晚），聚合为传播链。
 * 局限：文本相似不等于授权转载；时间早不一定是首发（可能是不同信源同时报道）。
 */
export function buildSyndicationGraph(articles: NewsArticle[], limit = 50): SyndicationGraph {
  const candidates = findSyndicationCandidates(articles, limit);
  const nodeMap = new Map<string, SyndicationNode>();
  const edges: SyndicationEdge[] = [];

  for (const c of candidates) {
    const timeA = articleSortTime(articles.find((a) => a.id === c.articleA.id) as NewsArticle);
    const timeB = articleSortTime(articles.find((a) => a.id === c.articleB.id) as NewsArticle);
    if (!timeA || !timeB) continue;

    // 确定方向：时间早的为 from（疑似首发），时间晚的为 to（跟进）
    const aFirst = timeA <= timeB;
    const fromArticle = aFirst ? c.articleA : c.articleB;
    const toArticle = aFirst ? c.articleB : c.articleA;
    const fromTime = aFirst ? timeA : timeB;
    const toTime = aFirst ? timeB : timeA;
    const deltaHours = Math.round(Math.abs(toTime - fromTime) / 360) / 10;

    const fromFull = articles.find((a) => a.id === fromArticle.id);
    const toFull = articles.find((a) => a.id === toArticle.id);
    if (fromFull) {
      nodeMap.set(fromArticle.id, {
        id: fromArticle.id, title: fromArticle.title, sourceName: fromArticle.sourceName,
        sourceUrl: fromArticle.sourceUrl, publishedAt: fromTime,
        sourceGroup: sourceGroupInfo(fromArticle.sourceName, fromArticle.sourceUrl).label,
      });
    }
    if (toFull) {
      nodeMap.set(toArticle.id, {
        id: toArticle.id, title: toArticle.title, sourceName: toArticle.sourceName,
        sourceUrl: toArticle.sourceUrl, publishedAt: toTime,
        sourceGroup: sourceGroupInfo(toArticle.sourceName, toArticle.sourceUrl).label,
      });
    }

    edges.push({
      from: fromArticle.id, to: toArticle.id,
      signal: c.signal, confirmed: c.confirmed,
      titleSimilarity: c.titleSimilarity, textSimilarity: c.textSimilarity,
      timeDeltaHours: deltaHours, note: c.note,
    });
  }

  // 聚合传播链：用并查集找连通分量，再按时间排序为路径
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const e of edges) union(e.from, e.to);

  const groups = new Map<string, string[]>();
  for (const node of nodeMap.keys()) {
    const root = find(node);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(node);
  }

  const chains: SyndicationChain[] = [];
  for (const [root, members] of groups) {
    if (members.length < 2) continue;
    const sorted = members
      .map((id) => nodeMap.get(id)!)
      .filter((n) => n)
      .sort((a, b) => a.publishedAt - b.publishedAt);
    const sourceSet = new Set(sorted.map((n) => n.sourceGroup || n.sourceName));
    chains.push({
      nodes: sorted.map((n) => n.id),
      earliestAt: sorted[0].publishedAt,
      latestAt: sorted[sorted.length - 1].publishedAt,
      spanHours: Math.round((sorted[sorted.length - 1].publishedAt - sorted[0].publishedAt) / 360) / 10,
      sourceCount: sourceSet.size,
    });
  }
  chains.sort((a, b) => b.sourceCount - a.sourceCount || b.spanHours - a.spanHours);

  return {
    nodes: [...nodeMap.values()].sort((a, b) => a.publishedAt - b.publishedAt),
    edges,
    chains: chains.slice(0, 20),
  };
}
