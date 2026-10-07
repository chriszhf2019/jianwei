import React, { useState, useMemo } from 'react';
import { NewsArticle } from '../../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import {
  TrendingUp,
  Zap,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  Info,
  Flame,
  AlertTriangle,
  Radio,
  Filter,
} from 'lucide-react';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { formatArticleTime, articleSortTime } from '../../utils/articleTime';

interface TopicBreakoutForecastChartProps {
  articles: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
  onOpenArticleById?: (articleId: string) => void;
}

interface TopicTrendProfile {
  id: string;
  name: string;
  shortName: string;
  color: string;
  icon: string;
  historyScores: number[]; // 7 days (T-6 to T-0) [0 - 100 动量指数]
  forecastScores: number[]; // 3 days (T+1 to T+3) [0 - 100 动量指数]
  historyCounts: number[]; // 真实语料统计
  forecastCounts: number[]; // 真实外推篇数
  burstScore: number; // 0 - 100
  growthRate: string; // e.g. +65%
  status: 'critical_breakout' | 'surging' | 'steady';
  catalyst: string;
  actionGuidance: string;
  representativeArticle?: NewsArticle;
}

export const TopicBreakoutForecastChart: React.FC<TopicBreakoutForecastChartProps> = ({
  articles,
  onSelectArticleTitle,
  onOpenArticleById,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'momentum' | 'volume'>('momentum');
  const [forecastHorizon, setForecastHorizon] = useState<'3d' | '5d'>('3d');

  // Compute 7-day actual frequency + 3-day projected breakout frequency
  const topicProfiles: TopicTrendProfile[] = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;

    const topicsConfig = [
      {
        id: 'ai_semi',
        name: '人工智能与半导体算力',
        shortName: 'AI与算力',
        color: '#E3120B',
        icon: '🤖',
        keywords: ['ai', 'semi', '算力', '芯片', '大模型', 'gpu', 'moe', 'cpo', 'openai', 'agent', '封装', '台积电'],
        catalyst: '开源低成本架构爆发与超大规模算力集群供电采购提速',
        actionGuidance: '重点关注上下游光模块与端侧芯片模组供应链排产交付',
      },
      {
        id: 'battery_ev',
        name: '新能源与固态电池',
        shortName: '固态电池与新能源',
        color: '#059669',
        icon: '🔋',
        keywords: ['auto', 'battery', '固态电池', '锂电', '储能', '新能源', '出海', '整车', 'ckd'],
        catalyst: '车企海外散件本土化合资点火与下一代电池产业链深潜',
        actionGuidance: '防范液态锂电正负极旧产能减值风险，跟踪海外本土化代工厂订单',
      },
      {
        id: 'trade_tariff',
        name: '跨国经贸与出海关税',
        shortName: '关税与出海供应链',
        color: '#D97706',
        icon: '🌐',
        keywords: ['gov', '关税', '出海', '反补贴', '制裁', '贸易', 'ckd', '美联储', '流动性', '汇率'],
        catalyst: '原产地规则与跨境贸易监管重审，倒逼供应链散件化与多地代工',
        actionGuidance: '加速东南亚与拉美本地合资工厂备案，规避反规避审查',
      },
      {
        id: 'robotics',
        name: '具身智能与人形机器人',
        shortName: '具身智能与机器人',
        color: '#8B5CF6',
        icon: '🦾',
        keywords: ['机器人', '人形机器人', '具身智能', '灵巧手', '自动化', 'agent', '数字员工'],
        catalyst: '端到端自主 Agent 落地验证与工业级灵巧操作模块量产',
        actionGuidance: '跟踪工业自动化集成商与高精度减速器供应商订单拐点',
      },
    ];

    return topicsConfig.map((cfg) => {
      // Find matching articles
      const matchedArticles = articles.filter((a) => {
        const text = `${a.title} ${a.summary || ''} ${(a.tags || []).join(' ')}`.toLowerCase();
        const sectors = detectSectors(a);
        return cfg.keywords.some((kw) => text.includes(kw) || sectors.includes(kw));
      });

      // Calculate real daily counts for past 7 days using articleSortTime
      const historyCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
      for (const a of matchedArticles) {
        const ts = articleSortTime(a);
        if (ts > 0 && ts <= now) {
          const diffDays = Math.floor((now - ts) / dayMs);
          if (diffDays >= 0 && diffDays < 7) {
            historyCounts[6 - diffDays] += 1;
          }
        }
      }

      // 动量分：主要由真实日计数驱动；不再叠加虚构 baseTrend 地板
      const historyScores = historyCounts.map((dayCount, idx) => {
        const fromCount = Math.min(100, dayCount * 18);
        const prev = idx > 0 ? historyCounts[idx - 1] : dayCount;
        const slopeBoost = Math.max(-10, Math.min(10, (dayCount - prev) * 4));
        return Math.min(100, Math.max(0, Math.round(fromCount + slopeBoost)));
      });

      // 外推：仅基于计数斜率的启发式，不是校准预测
      const countSlope = (historyCounts[6] - historyCounts[3]) / 3;
      const recentTrend = (historyScores[6] - historyScores[3]) / 3;
      const f1 = Math.min(100, Math.max(0, Math.round(historyScores[6] + recentTrend * 0.9)));
      const f2 = Math.min(100, Math.max(0, Math.round(f1 + recentTrend * 0.7)));
      const f3 = Math.min(100, Math.max(0, Math.round(f2 + recentTrend * 0.5)));
      const forecastScores = [f1, f2, f3];

      const forecastCounts = [
        Math.max(0, Math.round(historyCounts[6] + countSlope)),
        Math.max(0, Math.round(historyCounts[6] + countSlope * 1.5)),
        Math.max(0, Math.round(historyCounts[6] + countSlope * 2)),
      ];

      const burstScore = historyScores[6];
      const momentumGain = historyScores[3] > 0
        ? Math.round(((historyScores[6] - historyScores[3]) / historyScores[3]) * 100)
        : historyScores[6] > 0 ? 100 : 0;
      const growthRate = `${momentumGain > 0 ? '+' : ''}${momentumGain}%`;
      const status: 'critical_breakout' | 'surging' | 'steady' =
        burstScore >= 80 ? 'critical_breakout' : burstScore >= 40 ? 'surging' : 'steady';

      return {
        id: cfg.id,
        name: cfg.name,
        shortName: cfg.shortName,
        color: cfg.color,
        icon: cfg.icon,
        historyScores,
        forecastScores,
        historyCounts,
        forecastCounts,
        burstScore,
        growthRate,
        status,
        catalyst: `编辑模板：${cfg.catalyst}`,
        actionGuidance: `编辑提示（非实时情报）：${cfg.actionGuidance}`,
        representativeArticle: matchedArticles[0] || undefined,
      };
    });
  }, [articles]);

  // Construct chart timeline array: [T-6, T-5, T-4, T-3, T-2, T-1, 今日(T0), 预测+1D, 预测+2D, 预测+3D]
  const timelineData = useMemo(() => {
    const daysLabels = ['T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', '今日(T0)', '预测+1D', '预测+2D', '预测+3D'];

    return daysLabels.map((label, idx) => {
      const isHistorical = idx <= 6;
      const isToday = idx === 6;

      const point: Record<string, any> = {
        name: label,
        isHistorical,
        isToday,
      };

      topicProfiles.forEach((tp) => {
        const histData = viewMode === 'momentum' ? tp.historyScores : tp.historyCounts;
        const foreData = viewMode === 'momentum' ? tp.forecastScores : tp.forecastCounts;
        if (isHistorical) {
          // Historical solid points
          point[tp.id] = histData[idx];
          // For continuous line at T0
          if (isToday) {
            point[`${tp.id}_forecast`] = histData[6];
          }
        } else {
          // Forecasted dashed points
          const fIdx = idx - 7;
          point[`${tp.id}_forecast`] = foreData[fIdx];
        }
      });

      return point;
    });
  }, [topicProfiles, viewMode]);

  // Custom Tooltip
  const CustomForecastTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isForecast = label.includes('预测');
      return (
        <div className="bg-stone-950/95 text-stone-100 border-2 border-stone-800 p-4 rounded-xl shadow-2xl max-w-xs font-sans text-xs space-y-2.5 z-50">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 font-mono text-[11px]">
            <span className="font-bold text-white flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{label} {isForecast ? '(未来爆发推演)' : '(实测发稿频次)'}</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isForecast ? 'bg-amber-900/80 text-amber-300' : 'bg-stone-800 text-stone-300'}`}>
              {isForecast ? 'AI 动量外推' : '历史真值'}
            </span>
          </div>

          <div className="space-y-1.5">
            {payload.map((entry: any, i: number) => {
              const tp = topicProfiles.find((p) => p.id === entry.dataKey || `${p.id}_forecast` === entry.dataKey);
              if (!tp || entry.value == null) return null;
              return (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1.5 font-serif font-medium" style={{ color: tp.color }}>
                    <span>{tp.icon}</span>
                    <span>{tp.shortName}</span>
                  </span>
                  <span className="font-mono font-black text-white">
                    {entry.value} {viewMode === 'momentum' ? '动量分' : '篇/日'}
                  </span>
                </div>
              );
            })}
          </div>

          {isForecast && (
            <div className="pt-2 border-t border-stone-800 text-[10px] text-amber-300/90 font-serif leading-relaxed">
              💡 <b>动量外推说明：</b>按近窗发稿加速度做本地相对外推，随时间衰减；不是经校准的置信度或全网热度预测。
            </div>
          )}

        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs font-sans space-y-6">
      {/* Top Header & Topic Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-[#E3120B]/10 text-[#E3120B]">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-serif font-black text-stone-950">
              话题短期爆发预测趋势图 (Topic Velocity & Breakout Forecast)
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            基于过去 7 天新闻发稿频率加速度与共振强度 · 智能推演未来 72 小时可能爆发的重点议题
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: 动量指数 vs 语料篇数 */}
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-100 p-0.5 text-xs font-serif font-bold">
            <button
              onClick={() => setViewMode('momentum')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'momentum' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
              }`}
              title="按 0-100 综合爆发动量指数展示"
            >
              动量指数 (0-100)
            </button>
            <button
              onClick={() => setViewMode('volume')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'volume' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
              }`}
              title="按实际语料发稿篇数展示"
            >
              真实篇数 (实际)
            </button>
          </div>

          {/* Filter / Focus Topic */}
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-100 p-0.5 text-xs font-serif font-bold">
            <button
              onClick={() => setSelectedTopicId('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                selectedTopicId === 'all' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              全话题对比
            </button>
            {topicProfiles.map((tp) => (
              <button
                key={tp.id}
                onClick={() => setSelectedTopicId(tp.id)}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  selectedTopicId === tp.id ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                <span>{tp.icon}</span>
                <span>{tp.shortName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Recharts Composed Forecast Chart */}
      <div className="w-full h-80 sm:h-96 select-none relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={timelineData}
            margin={{ top: 20, right: 25, left: -20, bottom: 5 }}
          >
            <defs>
              {topicProfiles.map((tp) => (
                <linearGradient key={`grad_${tp.id}`} id={`grad_${tp.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tp.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={tp.color} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#78716C', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#D6D3D1' }}
              tickLine={false}
            />
            <YAxis
              domain={viewMode === 'momentum' ? [0, 100] : [0, 'auto']}
              tick={{ fontSize: 11, fill: '#78716C', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#D6D3D1' }}
              tickLine={false}
              unit={viewMode === 'momentum' ? ' 分' : ' 篇'}
            />
            <Tooltip content={<CustomForecastTooltip />} />

            {/* Vertical Benchmark Dividing Line between Actual History & Forecast */}
            <ReferenceLine
              x="今日(T0)"
              stroke="#E3120B"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: '今日基准线 ➔ 未来推演',
                fill: '#E3120B',
                fontSize: 11,
                fontFamily: 'serif',
                position: 'top',
              }}
            />

            {/* Lines for each topic */}
            {topicProfiles.map((tp) => {
              const isVisible = selectedTopicId === 'all' || selectedTopicId === tp.id;
              if (!isVisible) return null;

              return (
                <React.Fragment key={tp.id}>
                  {/* Historical Solid Line */}
                  <Line
                    type="monotone"
                    dataKey={tp.id}
                    name={`${tp.name} (${viewMode === 'momentum' ? '历史动量' : '历史篇数'})`}
                    stroke={tp.color}
                    strokeWidth={selectedTopicId === tp.id ? 3.5 : 2.5}
                    dot={{ r: 4, fill: tp.color, stroke: '#FFFFFF', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: tp.color, stroke: '#FFFFFF', strokeWidth: 2 }}
                  />

                  {/* Future Forecasted Dashed Line */}
                  <Line
                    type="monotone"
                    dataKey={`${tp.id}_forecast`}
                    name={`${tp.name} (${viewMode === 'momentum' ? '动量外推' : '发稿推演'})`}
                    stroke={tp.color}
                    strokeWidth={selectedTopicId === tp.id ? 3.5 : 2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#FFFFFF', stroke: tp.color, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: tp.color, stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </React.Fragment>
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast Legend & Confidence Note */}
      <div className="flex flex-wrap items-center justify-between text-xs text-stone-500 font-serif border-t border-stone-200 pt-3 gap-2">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-stone-900" />
            <span>实线：过去 7 天{viewMode === 'momentum' ? '动态动量指数' : '真实发稿量'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-stone-500" />
            <span>虚线：未来 3 天{viewMode === 'momentum' ? '爆发动量预测' : '发稿动量推演'}</span>
          </span>
        </div>
        <div className="text-[11px] text-stone-400 font-mono">
          口径：历史段=站内发稿计数；虚线=计数线性外推（启发式，非权威加权、非市场预测）；催化剂文案为编辑模板
        </div>
      </div>

      {/* 4 Topic Breakout Potential Cards (爆发潜能榜) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-serif font-bold text-stone-800">
          <span className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-[#E3120B]" />
            <span>短期爆发预警排行榜 (Burst Potential Ranking)</span>
          </span>
          <span className="text-stone-400 font-mono text-[10px]">按未来 72 小时爆发动量排序</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topicProfiles.map((tp) => (
            <div
              key={tp.id}
              className={`p-4 rounded-xl border-2 space-y-3 transition-all ${
                tp.status === 'critical_breakout'
                  ? 'border-red-300 bg-red-50/40 hover:border-red-500'
                  : 'border-stone-200 bg-[#FAF8F5] hover:border-stone-400'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base">{tp.icon}</span>
                  <span className="font-serif font-black text-sm text-stone-950">
                    {tp.name}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="font-mono font-bold text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
                    72h动量 {tp.growthRate}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    tp.status === 'critical_breakout'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {tp.status === 'critical_breakout' ? `🔥 极高爆发 (${tp.burstScore}分)` : `⚡ 快速升温 (${tp.burstScore}分)`}
                  </span>
                </div>
              </div>

              {/* Catalyst & Guidance */}
              <div className="space-y-1.5 text-xs text-stone-700 font-sans">
                <p className="leading-snug">
                  <strong className="text-stone-900">核心催化剂：</strong>
                  {tp.catalyst}
                </p>
                <p className="text-[11px] text-stone-600 leading-snug bg-white p-2 rounded-lg border border-stone-200">
                  <strong className="text-stone-900">决策建议：</strong>
                  {tp.actionGuidance}
                </p>
              </div>

              {/* Action */}
              {tp.representativeArticle && (
                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-400 font-mono truncate max-w-[200px]">
                    代表性事件: 《{tp.representativeArticle.title}》
                  </span>
                  <button
                    onClick={() => onOpenArticleById ? onOpenArticleById(tp.representativeArticle!.id) : onSelectArticleTitle && onSelectArticleTitle(tp.representativeArticle!.title)}
                    className="text-[#0284C7] hover:text-[#0369A1] font-serif font-bold inline-flex items-center gap-0.5 text-[11px] hover:underline cursor-pointer"
                  >
                    <span>穿透分析</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
