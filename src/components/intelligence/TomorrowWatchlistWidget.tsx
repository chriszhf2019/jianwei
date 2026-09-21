import React, { useMemo } from 'react';
import { NewsArticle } from '../../types';
import { CalendarClock, AlertTriangle, Info } from 'lucide-react';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { articleSortTime } from '../../utils/articleTime';

interface TomorrowWatchlistWidgetProps {
  articles: NewsArticle[];
}

export const TomorrowWatchlistWidget: React.FC<TomorrowWatchlistWidgetProps> = ({ articles }) => {
  const watchlist = useMemo(() => {
    // 按真实发布时间取最近 N 条；不能依赖数组首尾，因为语料合并来源不同。
    const recent = [...articles]
      .sort((a, b) => articleSortTime(b) - articleSortTime(a))
      .slice(0, Math.min(articles.length, 80));
    const counts = new Map<string, number>();
    for (const a of recent) {
      for (const id of detectSectors(a)) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    const totalWindow = recent.length || 1;
    const list = SECTOR_TAXONOMY.map((sector) => ({
      sector,
      count: counts.get(sector.id) || 0,
      share: Math.round(((counts.get(sector.id) || 0) / totalWindow) * 100),
    }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxCount = Math.max(...list.map((x) => x.count), 1);
    return { list, maxCount, totalWindow };
  }, [articles]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <CalendarClock className="w-5 h-5 text-[#E3120B]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              明日关注点名 · 语料热度跟踪
            </h3>
            <p className="text-xs text-stone-500">
              对最近 {watchlist.totalWindow} 条到达内容做赛道热度统计，排名靠前者为明日建议跟踪主题——非概率预测。
            </p>
          </div>
        </div>

        {/* Method Badge */}
        <div className="text-[10px] font-mono px-2.5 py-1 bg-stone-100 border border-stone-300 text-stone-600 rounded flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3 text-stone-500" />
          <span>热度口径 · 非概率预测</span>
        </div>
      </div>

      {articles.length === 0 || watchlist.list.length === 0 ? (
        <div className="py-8 text-center text-stone-400 text-xs">
          当前语料为空或未命中任何赛道关键词（请先配置 RSS 并摄取）。
        </div>
      ) : (
        <div className="space-y-3">
          {watchlist.list.map((item, idx) => (
            <div
              key={item.sector.id}
              className="p-4 bg-[#FAF8F5] border border-stone-300 hover:border-stone-800 rounded-xl transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-serif font-bold text-stone-950">
                    {item.sector.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-stone-500">窗口占比</span>
                  <span className="text-sm font-mono font-bold text-[#E3120B] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {item.share}%
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div style={{ width: `${(item.count / watchlist.maxCount) * 100}%` }} className="bg-stone-900 h-full" />
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                近 {watchlist.totalWindow} 条中命中 <strong>{item.count} 条</strong>（关键词：{item.sector.keywords.slice(0, 5).join('、')}）。
                建议明日持续跟踪该赛道的新增信号。
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] text-stone-500 border-t border-stone-200 pt-2 flex items-start space-x-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          真实“概率化明早点名”需要日历事件与历史基准率建模（见 DATA_PIPELINE_DESIGN.md §5/M2）；
          当前以语料热度口径提供可复核的明日跟踪候选，不编造概率。
        </span>
      </div>
    </div>
  );
};
