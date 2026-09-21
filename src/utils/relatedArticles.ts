// 本地相关文章匹配：BM25 字段化检索，标题权重高于摘要。
// 纯本地零 AI 成本；结果仍只代表词项相关性，不代表事实关联。

import { rankDocumentsBM25 } from './textRetrieval';

export interface ArticleLike {
  id: string;
  title?: string;
  summary?: string;
  sourceName?: string;
  sourceUrl?: string;
  publishedAt?: string | null;
  date?: string;
}

/** 找到与 article 最相关的其他文章（BM25，多余项由调用方截断）。 */
export function findRelatedArticles<T extends ArticleLike>(
  article: ArticleLike,
  pool: readonly T[],
  topN = 4
): T[] {
  const candidates = pool.filter((item) => item.id !== article.id);
  return rankDocumentsBM25(
    `${article.title || ''} ${article.summary || ''}`,
    candidates.map((item) => ({
      ...item,
      title: item.title || '',
      body: item.summary || '',
    })),
    topN,
    0.8
  ).map((item) => item.document);
}
