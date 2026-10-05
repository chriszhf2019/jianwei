import React, { useMemo } from 'react';
import { NewsArticle, type PredictionContract } from '../../types';
import { CalendarClock, AlertTriangle, Info } from 'lucide-react';
import { deriveTomorrowHeat, type TomorrowHeatSnapshot } from '../../utils/corpusSnapshot';
import { dueWatchItems } from '../../utils/forecastReference';

interface TomorrowWatchlistWidgetProps {
  articles: NewsArticle[];
  tomorrowWatch?: TomorrowHeatSnapshot | null;
  predictionContracts?: PredictionContract[];
  onOpenArticleById?: (articleId: string) => void;
}

export const TomorrowWatchlistWidget: React.FC<TomorrowWatchlistWidgetProps> = ({
  articles,
  tomorrowWatch,
  predictionContracts = [],
  onOpenArticleById,
}) => {
  const watchlist = useMemo(
    () => tomorrowWatch ?? deriveTomorrowHeat(articles),
    [articles, tomorrowWatch],
  );
  const dueItems = useMemo(() => dueWatchItems(predictionContracts), [predictionContracts]);

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

      <div className="space-y-2">
        <h4 className="text-sm font-serif font-bold text-stone-950">核验日程</h4>
        <p className="text-xs text-stone-500">
          只列出未回测、且到期日是今天、明天或已经逾期的契约。日程没有发生概率。
        </p>
        {dueItems.length === 0 ? (
          <p className="text-xs text-stone-400">没有今日、明日或逾期未回测的契约。</p>
        ) : (
          <div className="space-y-2">
            {dueItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenArticleById?.(item.articleId)}
                className="w-full text-left p-3 bg-[#FAF8F5] border border-stone-300 rounded-lg hover:border-stone-800"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-stone-500">
                  <span>{item.targetVerificationDate}</span>
                  <span className="text-[#E3120B]">{item.label}</span>
                </div>
                <p className="mt-1 text-sm font-serif font-bold text-stone-950">{item.question}</p>
                <p className="mt-0.5 text-[11px] text-stone-500 truncate">{item.articleTitle}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {watchlist.corpusSize === 0 || watchlist.list.length === 0 ? (
        <div className="py-8 text-center text-stone-400 text-xs">
          当前语料为空或未命中任何赛道关键词（请先配置 RSS 并摄取）。
        </div>
      ) : (
        <div className="space-y-3">
          {watchlist.list.map((item, idx) => (
              <div
              key={item.sectorId}
              className="p-4 bg-[#FAF8F5] border border-stone-300 hover:border-stone-800 rounded-xl transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-serif font-bold text-stone-950">
                    {item.name}
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
                近 {watchlist.totalWindow} 条中命中 <strong>{item.count} 条</strong>（关键词：{item.keywords.join('、')}）。
                建议明日持续跟踪该赛道的新增信号。
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] text-stone-500 border-t border-stone-200 pt-2 flex items-start space-x-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          赛道排名是最近窗口的热度占比。核验日程来自已保存契约的到期日。某一分类已确认且能判定正负的回测不足 20 条时，不计算基准率。
        </span>
      </div>
    </div>
  );
};
