import React, { useMemo } from 'react';
import { NewsArticle } from '../../types';
import {
  TrendingUp,
  ShieldAlert,
  Cpu,
  AlertTriangle,
  Zap,
  Layers,
  Globe,
  Radio,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Activity,
  CheckCircle2,
  Gauge,
  Compass,
  GitCommit,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { deriveFromList, lexiconSentiment } from '../../utils/corpusMetrics';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { MethodBadge } from '../common/MethodBadge';
import { articleSortTime } from '../../utils/articleTime';

interface StrategicMetricsBarProps {
  articles: NewsArticle[];
  onOpenAlerts?: () => void;
  onOpenTrending?: () => void;
  onOpenSectors?: () => void;
  onOpenSources?: () => void;
}

export const StrategicMetricsBar: React.FC<StrategicMetricsBarProps> = ({
  articles,
  onOpenAlerts,
  onOpenTrending,
  onOpenSectors,
  onOpenSources,
}) => {
  const stats = useMemo(() => {
    const sentiment = deriveFromList(articles);
    const sources = new Set(articles.map((a) => a.sourceName).filter(Boolean));

    // Calculate critical alerts (risk/warning items)
    const alertArticles = articles.filter((a) => {
      const text = `${a.title} ${a.summary || ''}`.toLowerCase();
      return (
        text.includes('风险') ||
        text.includes('关税') ||
        text.includes('制裁') ||
        text.includes('调查') ||
        text.includes('承压') ||
        text.includes('供应链') ||
        text.includes('违约')
      );
    });

    // Calculate trending up items (high heat / breakthrough)
    const trendingArticles = articles.filter((a) => {
      const text = `${a.title} ${a.summary || ''}`.toLowerCase();
      return (
        text.includes('突破') ||
        text.includes('首发') ||
        text.includes('增长') ||
        text.includes('激增') ||
        text.includes('量产') ||
        (a.sourceCount || 1) >= 2
      );
    });

    // Calculate top sectors
    const sectorCounts = SECTOR_TAXONOMY.map((sector) => ({
      id: sector.id,
      name: sector.name,
      count: articles.filter((article) => detectSectors(article).includes(sector.id)).length,
    })).sort((a, b) => b.count - a.count);

    const topSector = sectorCounts[0]?.count > 0
      ? sectorCounts[0]
      : { name: '暂无赛道命中', count: 0 };

    // 当日情绪：词典启发式归类占比，映射到 0-100 相对分（不是市场真值）
    const totalCount = Math.max(1, articles.length);
    const posCount = articles.filter((a) => lexiconSentiment(a).label === 'positive').length;
    const negCount = articles.filter((a) => lexiconSentiment(a).label === 'negative').length;
    const netRatio = (posCount - negCount) / totalCount;
    const dictNet = sentiment.net ?? (netRatio * 100);
    const todaySentiment = Math.round(Math.max(0, Math.min(100, 50 + dictNet / 2)));

    // 近 7 日：按发布时间真实分桶；无当日语料记 0，不反推历史曲线
    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;
    const dailyBase = Array.from({ length: 7 }, (_, idx) => {
      const offset = 6 - idx;
      const dayStart = now - (offset + 1) * dayMs;
      const dayEnd = now - offset * dayMs;
      const dayArts = articles.filter((a) => {
        const t = articleSortTime(a);
        return t > 0 && t > dayStart && t <= dayEnd;
      });
      if (dayArts.length === 0) return null as number | null;
      const p = dayArts.filter((a) => lexiconSentiment(a).label === 'positive').length;
      const n = dayArts.filter((a) => lexiconSentiment(a).label === 'negative').length;
      const ratio = (p - n) / dayArts.length;
      return Math.round(Math.max(0, Math.min(100, 50 + ratio * 50)));
    });
    // 今日桶若为空，用全量样本相对分作为 T0 展示（标明样本窗）
    if (dailyBase[6] === null) dailyBase[6] = todaySentiment;

    const days = ['T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', '今日 T0'];
    const maComparisonSeries = days.map((day, idx) => {
      const todayVal = dailyBase[idx];
      const window = dailyBase.slice(0, idx + 1).filter((v): v is number => v !== null);
      const maVal = window.length > 0
        ? Math.round(window.reduce((sum, v) => sum + v, 0) / window.length)
        : null;
      return { day, today: todayVal ?? 0, ma7: maVal ?? 0, hasSample: todayVal !== null };
    });

    const sampled = dailyBase.filter((v): v is number => v !== null);
    const sevenDayMA = sampled.length > 0
      ? Math.round(sampled.reduce((s, v) => s + v, 0) / sampled.length)
      : todaySentiment;
    const delta = todaySentiment - sevenDayMA;
    const isWarming = sampled.length >= 2 && delta > 2;
    const isDeteriorating = sampled.length >= 2 && delta < -2;
    const isConsolidating = !isWarming && !isDeteriorating;

    // Sparkline 只展示当日真实计数垫底，不伪造历史轨迹
    const alertSparkline = [
      { t: 'T-6', val: 0 },
      { t: 'T-5', val: 0 },
      { t: 'T-4', val: 0 },
      { t: 'T-3', val: 0 },
      { t: 'T-2', val: 0 },
      { t: 'T-1', val: 0 },
      { t: 'T0', val: alertArticles.length },
    ];

    const trendingSparkline = [
      { t: 'T-6', val: 0 },
      { t: 'T-5', val: 0 },
      { t: 'T-4', val: 0 },
      { t: 'T-3', val: 0 },
      { t: 'T-2', val: 0 },
      { t: 'T-1', val: 0 },
      { t: 'T0', val: trendingArticles.length },
    ];

    const sectorBarData = sectorCounts.slice(0, 5).map((s) => ({
      name: s.name.slice(0, 2),
      fullName: s.name,
      val: s.count,
    }));

    const sourceSparkline = [
      { t: 'T-6', val: 0 },
      { t: 'T-5', val: 0 },
      { t: 'T-4', val: 0 },
      { t: 'T-3', val: 0 },
      { t: 'T-2', val: 0 },
      { t: 'T-1', val: 0 },
      { t: 'T0', val: sources.size },
    ];

    return {
      sentiment,
      todaySentiment,
      sevenDayMA,
      delta,
      isWarming,
      isDeteriorating,
      isConsolidating,
      maComparisonSeries,
      alertCount: alertArticles.length,
      alertSparkline,
      trendingCount: trendingArticles.length,
      trendingSparkline,
      topSectorName: topSector.name,
      topSectorCount: topSector.count,
      topSectorShare: Math.round((topSector.count / Math.max(1, articles.length)) * 100),
      sectorBarData,
      sourcesCount: sources.size,
      sourceSparkline,
      sourceSamples: Array.from(sources).slice(0, 3).join(' · ') || '暂无来源名',
      total: articles.length,
    };
  }, [articles]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-7 shadow-xs font-sans space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-[#E3120B] text-white">
              <Globe className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-serif font-black text-stone-950">
              全球风险与机遇概览 (Global Risks & Opportunities Overview)
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            集成 Recharts 实时微趋势流 · 0.5 秒穿透全局风险敞口、爆发动量、赛道集中度与信源吞吐
          </p>
        </div>

        <div className="flex items-center gap-2">
          <MethodBadge methodId="corpus_count" compact />
          <MethodBadge methodId="lexicon_sentiment" compact />
        </div>
      </div>

      {/* 四大业务决策概览卡片 (4 High-Value Cards with Recharts Mini Sparklines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 卡片 1：今日重点预警 (Critical Alerts) */}
        <div
          onClick={onOpenAlerts}
          className="bg-red-50/70 border-2 border-red-200 hover:border-red-500 rounded-xl p-4 shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-serif font-bold text-red-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                <span>今日重点预警</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold">
                Critical Alert
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-serif font-black text-red-950 font-mono">
                  {stats.alertCount}
                </span>
                <span className="text-xs text-red-700 font-medium">起核心风险</span>
              </div>
              <span className="text-[10px] font-mono text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-bold">
                {stats.alertCount === 0 ? '暂无环比' : '关键词命中'}
              </span>
            </div>
          </div>

          {/* Mini Recharts Sparkline */}
          <div className="w-full h-9 -mx-1 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.alertSparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <div className="bg-stone-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow">
                        {payload[0].payload.t}: {payload[0].value} 起
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="val" stroke="#DC2626" strokeWidth={2} fill="url(#alertGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-red-800/90 font-sans line-clamp-1 border-t border-red-200/60 pt-2">
            {stats.alertCount === 0
              ? '近窗无风险关键词命中 · 不编造环比'
              : `近窗 ${stats.alertCount} 篇命中风险关键词（关税/制裁/供应链等）`}
          </p>
        </div>

        {/* 卡片 2：爆发中趋势 (Trending Up) */}
        <div
          onClick={onOpenTrending}
          className="bg-amber-50/70 border-2 border-amber-200 hover:border-amber-500 rounded-xl p-4 shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-serif font-bold text-amber-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600 fill-amber-500 group-hover:scale-110 transition-transform" />
                <span>爆发中趋势</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                Trending Surge
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-serif font-black text-amber-950 font-mono">
                  {stats.trendingCount}
                </span>
                <span className="text-xs text-amber-800 font-medium">个强信号</span>
              </div>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                {stats.trendingCount === 0 ? '暂无斜率' : '关键词命中'}
              </span>
            </div>
          </div>

          {/* Mini Recharts Sparkline */}
          <div className="w-full h-9 -mx-1 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendingSparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <div className="bg-stone-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow">
                        {payload[0].payload.t}: {payload[0].value} 动量
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="val" stroke="#D97706" strokeWidth={2} fill="url(#trendGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-amber-800/90 font-sans line-clamp-1 border-t border-amber-200/60 pt-2">
            {stats.trendingCount === 0
              ? '近窗无爆发关键词命中 · 不编造斜率'
              : `近窗 ${stats.trendingCount} 篇命中爆发关键词（突破/量产/激增等）`}
          </p>
        </div>

        {/* 卡片 3：核心赛道异动 (Sector Shifts) */}
        <div
          onClick={onOpenSectors}
          className="bg-sky-50/70 border-2 border-sky-200 hover:border-sky-500 rounded-xl p-4 shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-serif font-bold text-sky-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
                <span>核心赛道异动</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold">
                Top Sector
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-base sm:text-lg font-serif font-black text-sky-950 truncate max-w-[140px]">
                  {stats.topSectorName}
                </span>
              </div>
              <span className="text-[10px] font-mono text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded font-bold">
                占比 {stats.topSectorShare}%
              </span>
            </div>
          </div>

          {/* Mini Recharts Bar Chart */}
          <div className="w-full h-9 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.sectorBarData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <div className="bg-stone-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow">
                        {payload[0].payload.fullName}: {payload[0].value} 篇
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="val" fill="#0284C7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-sky-800/90 font-sans line-clamp-1 border-t border-sky-200/60 pt-2">
            讨论热度居全赛道首位，技术渗透提速
          </p>
        </div>

        {/* 卡片 4：活跃情报源 (Top Sources) */}
        <div
          onClick={onOpenSources}
          className="bg-emerald-50/70 border-2 border-emerald-200 hover:border-emerald-500 rounded-xl p-4 shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-serif font-bold text-emerald-950 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>活跃情报源</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                Live Feeds
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-serif font-black text-emerald-950 font-mono">
                  {stats.sourcesCount}
                </span>
                <span className="text-xs text-emerald-700 font-medium">家来源名</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                计数可复核
              </span>
            </div>
          </div>

          {/* Mini Recharts Sparkline */}
          <div className="w-full h-9 -mx-1 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.sourceSparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <div className="bg-stone-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow">
                        {payload[0].payload.t}: {payload[0].value} 信源
                      </div>
                    ) : null
                  }
                />
                <Line type="monotone" dataKey="val" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-emerald-800/90 font-sans line-clamp-1 border-t border-emerald-200/60 pt-2">
            {stats.sourceSamples}
          </p>
        </div>
      </div>

      {/* =========================================================================
          🔥 新增：今日情绪指数 vs 过去7日移动平均值 动态仪表盘 (Sentiment Pulse & 7D-MA Gauge)
         ========================================================================= */}
      <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-stone-900 text-amber-400">
              <Gauge className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-serif font-black text-stone-950">
                全球情绪动态仪表盘 · 今日情绪 vs 过去7日移动平均线 (7D-MA)
              </h4>
              <p className="text-[11px] text-stone-500">
                词典启发式相对分 · 按发布时间分桶；无样本的日期记 0，不反推历史曲线，也不是市场情绪真值
              </p>
            </div>
          </div>

          {/* 显著状态徽章 */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif font-bold border shadow-xs ${
              stats.isWarming
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : stats.isDeteriorating
                ? 'bg-rose-50 text-rose-900 border-rose-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
          >
            {stats.isWarming ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>舆情显著回暖 (Sentiment Warming Up)</span>
              </>
            ) : stats.isDeteriorating ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>舆情承压走弱 (Sentiment Deteriorating)</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span>均线粘合 · 震荡盘整 (Range-bound Consolidation)</span>
              </>
            )}
          </div>
        </div>

        {/* 仪表盘核心展示区域：指标数值 + 显著趋势大箭头 + 双轨对比图 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* 左侧：今日情绪 vs 7日移动平均值 大字对比与显著大箭头 */}
          <div className="lg:col-span-5 flex items-center justify-between bg-white border border-stone-300 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="space-y-3">
              {/* 今日情绪指数 */}
              <div>
                <div className="text-[11px] font-mono text-stone-500 font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-[#E3120B]" />
                  <span>今日实时情绪指数 (Today)</span>
                </div>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className={`text-3xl sm:text-4xl font-serif font-black font-mono ${
                    stats.isWarming ? 'text-emerald-700' : stats.isDeteriorating ? 'text-rose-700' : 'text-stone-800'
                  }`}>
                    {stats.todaySentiment}
                  </span>
                  <span className="text-xs text-stone-500 font-mono">/ 100</span>
                  <span className="text-[11px] font-serif font-bold text-stone-800 ml-1">
                    {stats.todaySentiment >= 60 ? '积极偏多' : stats.todaySentiment <= 40 ? '承压偏空' : '理性博弈'}
                  </span>
                </div>
              </div>

              {/* 过去7日移动平均值 */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-stone-400 font-bold">
                    过去 7 日移动平均 (7D MA)
                  </div>
                  <div className="text-lg font-mono font-bold text-stone-700">
                    {stats.sevenDayMA} <span className="text-[10px] text-stone-400">/ 100</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-stone-400 font-bold">
                    均线偏离差值 (Spread)
                  </div>
                  <div className={`text-base font-mono font-black ${
                    stats.isWarming ? 'text-emerald-600' : stats.isDeteriorating ? 'text-rose-600' : 'text-stone-600'
                  }`}>
                    {stats.delta > 0 ? `+${stats.delta}` : stats.delta} 点 ({stats.delta > 0 ? `+${Math.round((stats.delta / stats.sevenDayMA) * 100)}%` : `${Math.round((stats.delta / stats.sevenDayMA) * 100)}%`})
                  </div>
                </div>
              </div>
            </div>

            {/* 🔥 显著的趋势大箭头图标 */}
            <div className="flex flex-col items-center justify-center pl-4 border-l border-stone-200">
              <div
                className={`p-3.5 rounded-2xl border-2 transition-all transform hover:scale-105 shadow-sm ${
                  stats.isWarming
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-600'
                    : stats.isDeteriorating
                    ? 'bg-rose-50 border-rose-400 text-rose-600'
                    : 'bg-amber-50 border-amber-300 text-amber-700'
                }`}
              >
                {stats.isWarming ? (
                  <TrendingUp className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.5] animate-pulse" />
                ) : stats.isDeteriorating ? (
                  <TrendingDown className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.5] animate-pulse" />
                ) : (
                  <GitCommit className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.5]" />
                )}
              </div>
              <span
                className={`text-[11px] font-serif font-black mt-2 tracking-tight ${
                  stats.isWarming ? 'text-emerald-700' : stats.isDeteriorating ? 'text-rose-700' : 'text-amber-800'
                }`}
              >
                {stats.isWarming ? '强势回暖 ↑' : stats.isDeteriorating ? '拐点承压 ↓' : '平稳盘整 ↔'}
              </span>
            </div>
          </div>

          {/* 右侧：Recharts 今日情绪 vs 7日移动平均线 走势对比图 */}
          <div className="lg:col-span-7 bg-white border border-stone-300 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-2">
              <span className="font-serif font-bold text-stone-800 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-stone-600" />
                <span>近 7 日情绪脉冲与 7D-MA 均线拟合对比</span>
              </span>
              <div className="flex items-center space-x-3 text-[10px] font-mono">
                <span className={`flex items-center gap-1 font-bold ${
                  stats.isWarming ? 'text-emerald-700' : stats.isDeteriorating ? 'text-rose-700' : 'text-amber-700'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                    stats.isWarming ? 'bg-emerald-500' : stats.isDeteriorating ? 'bg-rose-500' : 'bg-amber-500'
                  }`} />
                  今日情绪脉冲
                </span>
                <span className="flex items-center gap-1 text-stone-500 font-bold">
                  <span className="w-3 h-0.5 bg-stone-400 inline-block border-t border-dashed" />
                  7日移动平均线
                </span>
              </div>
            </div>

            <div className="w-full h-24 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.maComparisonSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[20, 95]} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload && payload.length ? (
                        <div className="bg-stone-950 text-white text-[11px] font-mono p-2 rounded-lg shadow-md space-y-1">
                          <div className="font-bold text-stone-300">{label}</div>
                          <div className="text-emerald-400">单日指数: {payload[0]?.value}</div>
                          <div className="text-stone-300">7日均线: {payload[1]?.value}</div>
                        </div>
                      ) : null
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="today"
                    stroke={stats.isWarming ? '#059669' : stats.isDeteriorating ? '#E11D48' : '#D97706'}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: stats.isWarming ? '#059669' : stats.isDeteriorating ? '#E11D48' : '#D97706' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ma7"
                    stroke="#78716C"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-stone-600 font-sans leading-snug">
              <strong>决策解读：</strong>
              {stats.isWarming
                ? `当前单日情绪指数 (${stats.todaySentiment}) 显著突破 7 日移动均线 (${stats.sevenDayMA})（利差 +${stats.delta} 点），多项产业利好与技术突破持续催化，市场信心加速修复。`
                : stats.isDeteriorating
                ? `当前单日情绪指数 (${stats.todaySentiment}) 跌破 7 日移动均线 (${stats.sevenDayMA})（利差 ${stats.delta} 点），突发地缘、监管或供应链不确定性引发市场谨慎防守。`
                : `当前单日情绪指数 (${stats.todaySentiment}) 与 7 日移动均线 (${stats.sevenDayMA}) 基本持平（利差 ${stats.delta > 0 ? `+${stats.delta}` : stats.delta} 点），多空分歧势均力敌，处于震荡盘整与方向选择窗口。`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
