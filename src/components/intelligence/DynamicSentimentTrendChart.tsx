import React, { useState, useMemo } from 'react';
import { NewsArticle } from '../../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Smile,
  Frown,
  HelpCircle,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { lexiconSentiment } from '../../utils/corpusMetrics';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { articleSortTime } from '../../utils/articleTime';

interface DynamicSentimentTrendChartProps {
  articles: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
  onOpenArticleById?: (articleId: string) => void;
}

type SentimentHorizon = '24h' | '7d' | '30d';

interface SentimentDataPoint {
  timeLabel: string;
  timestamp: number;
  sentimentNet: number; // -100 to +100
  positiveRatio: number; // 0 - 100%
  neutralRatio: number; // 0 - 100%
  negativeRatio: number; // 0 - 100%
  volatilityIndex: number; // 0 - 100
  dominantTone: 'bullish' | 'neutral' | 'bearish';
  keyTriggerEvent?: string;
  keyArticleId?: string;
  isTurningPoint?: boolean;
  turningPointReason?: string;
}

export const DynamicSentimentTrendChart: React.FC<DynamicSentimentTrendChartProps> = ({
  articles,
  onSelectArticleTitle,
  onOpenArticleById,
}) => {
  const [horizon, setHorizon] = useState<SentimentHorizon>('7d');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'net' | 'breakdown'>('net');

  // Filter articles based on sector
  const filteredArticles = useMemo(() => {
    if (selectedSector === 'all') return articles;
    return articles.filter((a) => detectSectors(a).includes(selectedSector));
  }, [articles, selectedSector]);

  // Aggregate time series sentiment data（词典启发式；空桶记 0，不编造波形）
  const chartData = useMemo(() => {
    const now = Date.now();
    const dataPoints: SentimentDataPoint[] = [];

    const slotSpec =
      horizon === '24h'
        ? { slots: 12, spanMs: 2 * 3600 * 1000, label: (d: Date) => `${String(d.getHours()).padStart(2, '0')}:00` }
        : horizon === '7d'
          ? { slots: 7, spanMs: 24 * 3600 * 1000, label: (d: Date) => `${d.getMonth() + 1}/${d.getDate()}` }
          : { slots: 10, spanMs: 3 * 24 * 3600 * 1000, label: (d: Date) => `${d.getMonth() + 1}/${d.getDate()}` };

    for (let i = slotSpec.slots - 1; i >= 0; i--) {
      const slotStart = now - (i + 1) * slotSpec.spanMs;
      const slotEnd = now - i * slotSpec.spanMs;
      const d = new Date(slotEnd);
      const timeLabel = slotSpec.label(d);
      const slotArticles = filteredArticles.filter((a) => {
        const t = articleSortTime(a);
        return t > slotStart && t <= slotEnd;
      });
      const n = slotArticles.length;
      let pos = 0;
      let neg = 0;
      let mixed = 0;
      for (const a of slotArticles) {
        const label = lexiconSentiment(a).label;
        if (label === 'positive') pos += 1;
        else if (label === 'negative') neg += 1;
        else if (label === 'mixed') mixed += 1;
      }
      const neu = Math.max(0, n - pos - neg - mixed);
      const posPct = n > 0 ? Math.round((pos / n) * 100) : 0;
      const negPct = n > 0 ? Math.round((neg / n) * 100) : 0;
      const neuPct = n > 0 ? Math.max(0, 100 - posPct - negPct) : 0;
      const net = n > 0 ? Math.round(((pos - neg) / n) * 100) : 0;
      const topArt = slotArticles[0];
      dataPoints.push({
        timeLabel,
        timestamp: slotEnd,
        sentimentNet: net,
        positiveRatio: posPct,
        neutralRatio: neuPct,
        negativeRatio: negPct,
        volatilityIndex: Math.abs(net),
        dominantTone: net > 20 ? 'bullish' : net < -20 ? 'bearish' : 'neutral',
        keyTriggerEvent: topArt?.title,
        keyArticleId: topArt?.id,
        isTurningPoint: false,
        turningPointReason: undefined,
      });
    }

    return dataPoints;
  }, [filteredArticles, horizon]);

  // Current latest sentiment metric
  const latestPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData[chartData.length - 1];
  }, [chartData]);

  // Custom Recharts Tooltip
  const CustomSentimentTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: SentimentDataPoint = payload[0].payload;
      return (
        <div className="bg-stone-950/95 text-stone-100 border-2 border-stone-800 p-4 rounded-xl shadow-2xl max-w-xs font-sans text-xs space-y-2.5 z-50">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 font-mono text-[11px]">
            <span className="font-bold text-white flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>{data.timeLabel} 舆论情绪采样</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                data.sentimentNet >= 30
                  ? 'bg-emerald-900/80 text-emerald-300'
                  : data.sentimentNet <= -10
                  ? 'bg-rose-900/80 text-rose-300'
                  : 'bg-amber-900/80 text-amber-300'
              }`}
            >
              {data.sentimentNet > 0 ? `+${data.sentimentNet} 积极` : `${data.sentimentNet} 承压`}
            </span>
          </div>

          {/* Ratios Breakdown */}
          <div className="grid grid-cols-3 gap-1.5 py-1 text-center font-mono text-[10px]">
            <div className="bg-emerald-950/60 border border-emerald-800/60 p-1 rounded">
              <div className="text-emerald-400 font-bold">{data.positiveRatio}%</div>
              <div className="text-stone-400 scale-90">乐观利好</div>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-1 rounded">
              <div className="text-stone-300 font-bold">{data.neutralRatio}%</div>
              <div className="text-stone-400 scale-90">谨慎中立</div>
            </div>
            <div className="bg-rose-950/60 border border-rose-800/60 p-1 rounded">
              <div className="text-rose-400 font-bold">{data.negativeRatio}%</div>
              <div className="text-stone-400 scale-90">风险恐慌</div>
            </div>
          </div>

          {/* Event Trigger */}
          {data.keyTriggerEvent && (
            <div className="space-y-1 pt-1 border-t border-stone-800">
              <div className="text-[10px] text-stone-400">💡 关键催化舆情：</div>
              <div className="text-stone-200 font-serif line-clamp-2 leading-snug">
                《{data.keyTriggerEvent}》
              </div>
            </div>
          )}

          {data.isTurningPoint && data.turningPointReason && (
            <div className="text-[10px] text-amber-300 font-serif bg-amber-950/40 border border-amber-800/60 p-1.5 rounded">
              ⚡ <b>转折点：</b>{data.turningPointReason}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs font-sans space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-serif font-black text-stone-950">
              站内词典情绪时序曲线
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            按时间槽统计标题/摘要词典倾向占比；空槽记 0，相对分不是市场情绪或全网舆论真值
          </p>
        </div>

        {/* Filters and Time Horizon */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sector Selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-300 text-xs">
            <Filter className="w-3.5 h-3.5 text-stone-500 ml-1" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-stone-800 font-serif font-medium text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">全赛道情绪</option>
              {SECTOR_TAXONOMY.slice(0, 5).map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Switcher */}
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-100 p-0.5 text-xs font-serif font-bold">
            <button
              onClick={() => setHorizon('24h')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                horizon === '24h' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              24小时脉冲
            </button>
            <button
              onClick={() => setHorizon('7d')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                horizon === '7d' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              7日周期
            </button>
            <button
              onClick={() => setHorizon('30d')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                horizon === '30d' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              30日大势
            </button>
          </div>
        </div>
      </div>

      {/* Main Sentiment Recharts Chart */}
      <div className="w-full h-80 sm:h-96 select-none relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 25, left: -20, bottom: 5 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                const pt = state.activePayload[0].payload as SentimentDataPoint;
                if (pt.keyArticleId && onOpenArticleById) {
                  onOpenArticleById(pt.keyArticleId);
                } else if (pt.keyTriggerEvent && onSelectArticleTitle) {
                  onSelectArticleTitle(pt.keyTriggerEvent);
                }
              }
            }}
          >
            <defs>
              <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E11D48" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#E11D48" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 11, fill: '#78716C', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#D6D3D1' }}
              tickLine={false}
            />
            <YAxis
              domain={[-60, 100]}
              tick={{ fontSize: 11, fill: '#78716C', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#D6D3D1' }}
              tickLine={false}
            />
            <Tooltip content={<CustomSentimentTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'serif', paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'sentimentNet') return '情绪净值指数 (Sentiment Net Score)';
                if (value === 'volatilityIndex') return '情绪波动率 (Volatility)';
                return value;
              }}
            />

            {/* Zero Neutral Baseline Reference Line */}
            <ReferenceLine
              y={0}
              stroke="#78716C"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{ value: '多空平衡线 (0)', fill: '#78716C', fontSize: 10, position: 'insideBottomRight' }}
            />

            {/* Bullish Overheating Alarm Line */}
            <ReferenceLine
              y={65}
              stroke="#059669"
              strokeDasharray="3 3"
              label={{ value: '极度乐观区 (>65)', fill: '#059669', fontSize: 10, position: 'insideTopLeft' }}
            />

            {/* Bearish Alarm Line */}
            <ReferenceLine
              y={-25}
              stroke="#E11D48"
              strokeDasharray="3 3"
              label={{ value: '恐慌承压区 (<-25)', fill: '#E11D48', fontSize: 10, position: 'insideBottomLeft' }}
            />

            {/* Main Sentiment Area */}
            <Area
              type="monotone"
              dataKey="sentimentNet"
              stroke="#059669"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#positiveGradient)"
              activeDot={{ r: 6, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
            />

            {/* Volatility Line */}
            <Line
              type="monotone"
              dataKey="volatilityIndex"
              stroke="#8B5CF6"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />

            {/* Turning Point Dots */}
            {chartData.filter((d) => d.isTurningPoint).map((pt, i) => (
              <ReferenceDot
                key={i}
                x={pt.timeLabel}
                y={pt.sentimentNet}
                r={6}
                fill="#F59E0B"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Summary Insights Card */}
      <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-serif font-black text-sm text-stone-950">
              当前词频情绪相对分：【{latestPoint ? `${latestPoint.dominantTone === 'bullish' ? '偏乐观' : latestPoint.dominantTone === 'bearish' ? '偏悲观' : '中性'} · 净值 ${latestPoint.sentimentNet > 0 ? '+' : ''}${latestPoint.sentimentNet}` : '样本不足'}】
            </span>
          </div>
          <p className="text-stone-700 leading-relaxed font-sans">
            口径：按时间槽统计标题/摘要词典倾向占比。空槽记 0，不编造波形或转折叙事；相对分不是市场情绪真值。
          </p>
        </div>

        {latestPoint?.keyArticleId && (
          <button
            onClick={() => onOpenArticleById && onOpenArticleById(latestPoint.keyArticleId!)}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-[#E3120B] text-white font-serif font-bold text-xs inline-flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <span>剖析关键舆论事件</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
