import React, { useMemo } from 'react';
import { NewsArticle } from '../../types';
import { TrendingUp, ShieldAlert, Cpu, Info } from 'lucide-react';
import { deriveFromList } from '../../utils/corpusMetrics';
import { detectSectors } from '../../utils/sectorTaxonomy';
import { MethodBadge } from '../common/MethodBadge';

interface StrategicMetricsBarProps {
  articles: NewsArticle[];
}

export const StrategicMetricsBar: React.FC<StrategicMetricsBarProps> = ({ articles }) => {
  const stats = useMemo(() => {
    const sentiment = deriveFromList(articles);
    let policy = 0;
    let technology = 0;
    for (const article of articles) {
      const sectors = detectSectors(article);
      if (sectors.includes('gov')) policy += 1;
      if (sectors.includes('ai') || sectors.includes('semi')) technology += 1;
    }
    return { sentiment, policy, technology, total: articles.length };
  }, [articles]);

  const percent = (count: number) =>
    stats.total > 0 ? `${Math.round((count / stats.total) * 100)}%` : '暂无';

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center gap-2 text-[11px] leading-relaxed bg-stone-50 border border-stone-300 text-stone-700 rounded-lg px-3 py-2">
        <Info className="w-3.5 h-3.5 text-stone-500 shrink-0" />
        <span>以下只展示当前运行时语料的真实计数与词典结果。没有样本时显示“暂无”，不提供静态市场分或伪造环比。</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <MethodBadge methodId="corpus_count" />
        <MethodBadge methodId="lexicon_sentiment" />
        <MethodBadge methodId="keyword_signal" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-stone-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>语料词典净情绪</span>
            </span>
            <span className="text-stone-500 font-mono">N={stats.sentiment.scanned}</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-serif font-black text-stone-950 font-mono">
              {stats.sentiment.net == null ? '暂无' : stats.sentiment.net > 0 ? `+${stats.sentiment.net}` : stats.sentiment.net}
            </span>
            {stats.sentiment.net != null && <span className="text-xs text-stone-500 font-mono">/ ±100</span>}
          </div>
          <p className="text-xs text-stone-600 mt-2">
            正 {stats.sentiment.positive} · 负 {stats.sentiment.negative} · 交织 {stats.sentiment.mixed} · 中性 {stats.sentiment.neutral}
          </p>
        </div>

        <div className="bg-white border-2 border-stone-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>政策与监管覆盖</span>
            </span>
            <span className="text-stone-500 font-mono">{percent(stats.policy)}</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-serif font-black text-stone-950 font-mono">
              {stats.total > 0 ? stats.policy : '暂无'}
            </span>
            {stats.total > 0 && <span className="text-xs text-stone-500 font-mono">篇</span>}
          </div>
          <p className="text-xs text-stone-600 mt-2">依据赛道词典的政策词命中，仅代表当前语料覆盖。</p>
        </div>

        <div className="bg-white border-2 border-stone-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#E3120B]" />
              <span>AI 与半导体覆盖</span>
            </span>
            <span className="text-stone-500 font-mono">{percent(stats.technology)}</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-serif font-black text-stone-950 font-mono">
              {stats.total > 0 ? stats.technology : '暂无'}
            </span>
            {stats.total > 0 && <span className="text-xs text-stone-500 font-mono">篇</span>}
          </div>
          <p className="text-xs text-stone-600 mt-2">关键词覆盖计数，不推断产业突破数量或未来趋势。</p>
        </div>
      </div>
    </div>
  );
};
