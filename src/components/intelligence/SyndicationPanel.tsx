import React, { useMemo } from 'react';
import type { NewsArticle } from '../../types';
import { Copy, Info } from 'lucide-react';
import { findSyndicationCandidates } from '../../utils/syndication';
import { MethodBadge } from '../common/MethodBadge';

interface SyndicationPanelProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

const SIGNAL_LABEL = {
  duplicate_url: '同一 URL',
  known_same_group: '已知同集团',
  same_headline: '高度同题',
  likely_text_reuse: '疑似文本复用',
} as const;

export const SyndicationPanel: React.FC<SyndicationPanelProps> = ({ articles, onOpenArticleById }) => {
  const candidates = useMemo(() => findSyndicationCandidates(articles, 20), [articles]);
  const occurrenceCount = useMemo(
    () => articles.reduce((sum, article) => sum + Math.max(0, (article.sourceOccurrences?.length || 1) - 1), 0),
    [articles]
  );

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Copy className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">转载与文本复用线索</h3>
            <p className="text-xs text-stone-500">
              仅使用真实 URL、已登记来源集团、标题和摘要重合度；疑似项不直接判定为转载。
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-stone-500">
          同题来源记录 {occurrenceCount} 条 · 候选 {candidates.length} 组
        </span>
        <MethodBadge methodId="title_similarity" />
        <MethodBadge methodId="source_grouping" />
      </div>

      {candidates.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">
          当前没有发现同 URL、已知同集团或高相似文本线索。
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  candidate.confirmed
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                    : 'text-amber-800 bg-amber-50 border-amber-300'
                }`}>
                  {SIGNAL_LABEL[candidate.signal]} · {candidate.confirmed ? '已确认关系' : '疑似'}
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  标题 {candidate.titleSimilarity}% · 文本 {candidate.textSimilarity}%
                  {candidate.timeDeltaHours != null ? ` · 时间差 ${candidate.timeDeltaHours}h` : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[candidate.articleA, candidate.articleB].map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => onOpenArticleById?.(article.id)}
                    disabled={!onOpenArticleById}
                    className="text-left p-2 rounded border border-stone-200 bg-white hover:border-purple-300 disabled:cursor-default"
                  >
                    <div className="text-[10px] text-stone-500 font-mono truncate">{article.sourceName}</div>
                    <div className="text-xs font-serif font-bold text-stone-900 line-clamp-2">{article.title}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-stone-500">{candidate.note}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-[10px] text-stone-400 border-t border-stone-100 pt-3">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>同一集团不等于同一篇稿件；文本相似也不等于转载授权。独立来源计数只在已知集团或相同 URL 时合并。</span>
      </div>
    </div>
  );
};
