// 监控雷达与新闻条目的“命中”工具：判断某条新闻是否被用户监控词命中，命中哪些词。
// 匹配范围：标题 + 摘要 + 标签；全部为可复核的关键词包含判断（小写、逐词），非 AI。
// 注：监控词可能带空格（如 “NVIDIA 算力”），同时按整体短语与首词两档匹配，
// 避免 “NVIDIA 算力” 因新闻只提 “NVIDIA” 而漏报。

export interface MonitorKw {
  id: string;
  keyword: string;
  level?: 'red' | 'orange' | 'green';
}

/** 返回命中该新闻的监控词列表（按用户添加顺序） */
export function monitorHits(
  article: { title?: string; summary?: string; tags?: string[]; oneSentenceVerdict?: string; subtitle?: string },
  keywords: MonitorKw[]
): MonitorKw[] {
  const text = [
    article.title || '',
    article.subtitle || '',
    article.summary || '',
    article.oneSentenceVerdict || '',
    (article.tags || []).join(' '),
  ]
    .join(' ')
    .toLowerCase();
  if (!text.trim()) return [];
  const hits: MonitorKw[] = [];
  for (const kw of keywords) {
    const q = kw.keyword.trim();
    if (!q) continue;
    const low = q.toLowerCase();
    if (text.includes(low)) {
      hits.push(kw);
      continue;
    }
    // 短语监控词（含空格）：要求“至少一个足够具体的组成词”在正文出现，避免首词过宽（如 AI）造成误报。
    // 具体词 = ≥3 个汉字的连续片段，或 ≥4 个拉丁字母的连续片段。
    const parts = low.split(/\s+/).filter(Boolean);
    const concrete = parts.filter((p) => /[\u4e00-\u9fa5]/.test(p) ? p.replace(/[^\u4e00-\u9fa5]/g, '').length >= 3 : p.replace(/[^a-z0-9]/g, '').length >= 4);
    if (concrete.length > 0 && concrete.some((p) => text.includes(p))) {
      hits.push(kw);
    }
  }
  return hits;
}

/** 统计某组文章中被监控命中的篇数与命中词合计（供雷达小入口显示） */
export function monitorSummary(
  articles: Array<{ title?: string; summary?: string; tags?: string[]; oneSentenceVerdict?: string; subtitle?: string }>,
  keywords: MonitorKw[]
): { hitCount: number; totalHits: number } {
  let hitCount = 0;
  let totalHits = 0;
  for (const a of articles) {
    const hs = monitorHits(a, keywords);
    if (hs.length > 0) {
      hitCount += 1;
      totalHits += hs.length;
    }
  }
  return { hitCount, totalHits };
}
