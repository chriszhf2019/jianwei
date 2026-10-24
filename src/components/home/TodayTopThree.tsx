import React, { useMemo } from 'react';
import type { NewsArticle } from '../../types';
import { buildTopicClusters } from '../../utils/topicCluster';
import { articleSortTime } from '../../utils/articleTime';
import { Sparkles, ArrowRight } from 'lucide-react';

interface TodayTopThreeProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
}

/** 首页首屏：按「多源印证优先 + 最新」挑 3 个事件/报道，给读者一个明确的起点。 */
export const TodayTopThree: React.FC<TodayTopThreeProps> = ({ articles, onSelectArticle }) => {
  const picks = useMemo(() => {
    const clusters = buildTopicClusters(articles, 3);
    if (clusters.length > 0) {
      return clusters.slice(0, 3).map((cluster) => {
        const latest = cluster.articles[cluster.articles.length - 1];
        const sources = new Set(cluster.articles.map((a) => a.sourceName || '未知')).size;
        return {
          id: cluster.id,
          title: cluster.topicTitle,
          meta: `${cluster.articles.length} 篇报道 · ${sources} 家信源`,
          reason: sources >= 2 ? '多源印证' : '单源 · 待印证',
          verdict: latest?.oneSentenceVerdict || latest?.summary || '',
          article: latest,
        };
      });
    }
    // 没有可聚合事件时，退化为最新 3 篇，不编造事件
    return [...articles]
      .sort((a, b) => articleSortTime(b) - articleSortTime(a))
      .slice(0, 3)
      .map((article) => ({
        id: article.id,
        title: article.title,
        meta: article.sourceName || '外部信源',
        reason: articleSortTime(article) > 0 ? '最新报道' : '',
        verdict: article.oneSentenceVerdict || article.summary || '',
        article,
      }));
  }, [articles]);

  if (picks.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border-2 border-stone-900 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-stone-200 bg-[#FAF8F5]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E3120B]" />
          <h2 className="text-sm font-serif font-black text-stone-950">今天最值得看的 3 件事</h2>
        </div>
        <span className="text-[10px] font-mono text-stone-400">按多源印证与时间排序 · 非概率预测</span>
      </div>
      <div className="divide-y divide-stone-200">
        {picks.map((pick, index) => (
          <button
            key={pick.id}
            type="button"
            onClick={() => pick.article && onSelectArticle(pick.article)}
            className="w-full text-left px-5 py-3 hover:bg-stone-50 transition-colors flex items-start gap-3 cursor-pointer"
          >
            <span className="shrink-0 w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-mono font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono text-stone-500">{pick.meta}</span>
                {pick.reason && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      pick.reason === '多源印证'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {pick.reason}
                  </span>
                )}
              </div>
              <div className="text-sm font-serif font-bold text-stone-950 leading-snug line-clamp-2">
                {pick.title}
              </div>
              {pick.verdict && (
                <div className="text-[11px] text-stone-600 line-clamp-1">{pick.verdict}</div>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-stone-300 shrink-0 mt-1" />
          </button>
        ))}
      </div>
    </section>
  );
};
