import React, { useState, useEffect } from 'react';
import {
  Flame, TrendingUp, TrendingDown, Minus, RefreshCw,
  Sparkles, ChevronDown, ChevronUp, Layers, Activity
} from 'lucide-react';
import { NewsArticle } from '../../types';

export interface TrendItem {
  keyword: string;
  todayCount: number;
  prev3dCount: number;
  prev30dCount: number;
  heatIndex: number; // 0 - 100
  status: 'surge' | 'hot' | 'stable' | 'cooling';
  growthRate: string;
  insight: string;
}

interface TrendComparisonData {
  timeWindow?: {
    todayTotal: number;
    last3DaysTotal: number;
    last30DaysTotal: number;
  };
  trends: TrendItem[];
  aiSynthesis: string;
}

interface TrendComparisonCardProps {
  articles?: NewsArticle[];
  onSelectKeyword?: (keyword: string) => void;
}

export const TrendComparisonCard: React.FC<TrendComparisonCardProps> = ({
  articles,
  onSelectKeyword,
}) => {
  const [data, setData] = useState<TrendComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trend-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && Array.isArray(json.trends)) {
          setData(json);
        }
      }
    } catch (e) {
      console.error('Failed to fetch trend comparison:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [articles?.length]);

  if (!data && !loading) return null;

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
      {/* 标题栏 */}
      <div className="px-5 py-3.5 bg-stone-900 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-red-600/30 border border-red-500/40 rounded-lg text-red-400 shrink-0">
            <Flame className="w-4 h-4 animate-pulse text-red-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-black text-sm tracking-wide text-stone-100 truncate">
                今日词频速览
              </h3>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-stone-800 text-stone-300 font-mono text-[10px] rounded-full border border-stone-700">
                当日看板 · 词频启发式
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate mt-0.5">
              以今日为锚，对照近 3 日 / 近 30 日词频；更宽的「最近」态势请看情报中心
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={fetchTrends}
            disabled={loading}
            title="重新计算趋势"
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展开区域 */}
      {open && (
        <div className="p-5 space-y-4 bg-[#FAF9F6]">
          {/* 词频启发式摘要（模板拼接，不是模型核验） */}
          {data?.aiSynthesis && (
            <div className="p-3.5 bg-gradient-to-r from-red-50/80 via-amber-50/50 to-stone-50 border border-red-200/80 rounded-xl flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#E3120B] shrink-0 mt-0.5" />
              <div className="text-xs text-stone-800 leading-relaxed font-sans">
                <span className="font-serif font-bold text-stone-900 mr-1">词频摘要：</span>
                {data.aiSynthesis}
                <p className="mt-1.5 text-[10px] text-stone-500 font-mono">
                  由时间窗词频规则拼接，不是模型核验，也不是市场真值。
                </p>
              </div>
            </div>
          )}

          {/* Loading 状态 */}
          {loading && !data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 bg-white border border-stone-200 rounded-xl animate-pulse space-y-2">
                  <div className="h-4 bg-stone-200 rounded w-1/3" />
                  <div className="h-2 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* 趋势词云/热度列表 Grid */}
          {data?.trends && data.trends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.trends.map((item, idx) => {
                const statusCfg =
                  item.status === 'surge'
                    ? { label: '飙升 🔥', cls: 'bg-red-100 text-red-800 border-red-300', barCls: 'bg-red-600' }
                    : item.status === 'hot'
                    ? { label: '持续高热 📈', cls: 'bg-amber-100 text-amber-800 border-amber-300', barCls: 'bg-amber-500' }
                    : item.status === 'cooling'
                    ? { label: '热度回落 📉', cls: 'bg-sky-100 text-sky-800 border-sky-300', barCls: 'bg-sky-500' }
                    : { label: '保持平稳 ↔️', cls: 'bg-stone-100 text-stone-700 border-stone-300', barCls: 'bg-stone-400' };

                return (
                  <div
                    key={idx}
                    onClick={() => onSelectKeyword && onSelectKeyword(item.keyword)}
                    className="p-3 bg-white border border-stone-200 rounded-xl shadow-2xs hover:border-stone-400 transition-all cursor-pointer group flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-serif font-black text-sm text-stone-900 group-hover:text-[#E3120B] transition-colors truncate">
                          #{item.keyword}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${statusCfg.cls}`}>
                          {statusCfg.label} ({item.growthRate})
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-stone-900">
                          热度指数 {item.heatIndex}
                        </div>
                      </div>
                    </div>

                    {/* 热度条 */}
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${statusCfg.barCls}`}
                        style={{ width: `${Math.min(100, Math.max(10, item.heatIndex))}%` }}
                      />
                    </div>

                    {/* 频率明细 + 解读 */}
                    <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono border-t border-stone-100 pt-1.5">
                      <span>今日 {item.todayCount} 次 · 近3日 {item.prev3dCount} 次 · 近30日 {item.prev30dCount} 次</span>
                      <span className="text-[#0284C7] group-hover:underline font-sans">点击筛选语料 &rarr;</span>
                    </div>

                    {item.insight && (
                      <p className="text-[11px] text-stone-600 leading-snug line-clamp-1 font-sans">
                        {item.insight}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !loading && (
            <div className="py-6 text-center text-xs text-stone-400 font-serif">
              暂未检测到明显的异动词频，点击右上角刷新即可重新扫描最新语料。
            </div>
          )}

          <div className="text-right text-[10px] text-stone-400 font-mono">
            说明：按时间窗统计站内词频变动；热度指数是启发式相对分，不是市场热度真值。可点击关键词筛选语料。
          </div>
        </div>
      )}
    </div>
  );
};
