import React, { useState, useMemo } from 'react';
import { UserPersona, NewsArticle, SnapshotResponse, type PredictionContract } from '../../types';
import { StrategicMetricsBar } from './StrategicMetricsBar';
import { SituationReadoutPanel } from './SituationReadoutPanel';
import { FrequentPatternPanel } from './FrequentPatternPanel';
import { SentimentHeatmap24h } from './SentimentHeatmap24h';
import { IntelligenceDensityCurve } from './IntelligenceDensityCurve';
import { DataSourceHealthPanel } from './DataSourceHealthPanel';
import { EntityCoveragePanel } from './EntityCoveragePanel';
import { SyndicationPanel } from './SyndicationPanel';
import { SourceArchivePanel } from './SourceArchivePanel';
import { MentionRegionAIPanel } from './MentionRegionAIPanel';
import { RegionDependenceWidget } from './RegionDependenceWidget';
import { RegionIntelligencePanel } from './RegionIntelligencePanel';
import { TodayBlindspotWidget } from './TodayBlindspotWidget';
import { TomorrowWatchlistWidget } from './TomorrowWatchlistWidget';
import { CrossEventNexusPanel } from './CrossEventNexusPanel';
import { AIStrategicAdvisor } from './AIStrategicAdvisor';
import { DynamicHeatTrendChart } from './DynamicHeatTrendChart';
import { DynamicSentimentTrendChart } from './DynamicSentimentTrendChart';
import { StrategicThreeTierCenter } from './StrategicThreeTierCenter';
import { TopicBreakoutForecastChart } from './TopicBreakoutForecastChart';
import { StrategicActionPlaybook } from './StrategicActionPlaybook';
import { SupplyChainStressSimulator } from './SupplyChainStressSimulator';
import { CompetitorDynamicRadar } from './CompetitorDynamicRadar';
import { Flame, ShieldCheck, ShieldAlert, Compass, HelpCircle, Activity, Info, Database, RefreshCw, MapPin, Bot, LineChart } from 'lucide-react';






import { useAIProvider } from '../../hooks/useAIProvider';
import { articleSortTime, filterRecentArticles } from '../../utils/articleTime';
import { FeatureSummary } from '../common/FeatureSummary';
import type { FeatureSummaryId } from '../../utils/featureSummaries';

type SnapshotStatus = 'loading' | 'ok' | 'error';
type HubSection = 'overview' | 'supply_stress' | 'competitor_radar' | 'signals' | 'sources' | 'regions' | 'advisor';

/** 情报中心默认「最近」窗口（含今天） */
const HUB_RECENT_DAYS = 7;

interface IntelligenceHubViewProps {
  selectedPersona: UserPersona;
  contextArticles: NewsArticle[];
  snapshot: SnapshotResponse | null;
  snapshotStatus: SnapshotStatus;
  onRefreshSnapshot: () => void;
  onOpenSettings?: () => void;
  onSelectArticleTitle?: (title: string) => void;
  onOpenArticleById?: (articleId: string) => void;
  predictionContracts?: PredictionContract[];
  /** 跳转「地区情报」深潜工作台（主体×矩阵×三级下钻×组合） */
  onGoRegion?: () => void;
}

export const IntelligenceHubView: React.FC<IntelligenceHubViewProps> = ({
  selectedPersona,
  contextArticles,
  snapshot,
  snapshotStatus,
  onRefreshSnapshot,
  onOpenSettings,
  onSelectArticleTitle,
  onOpenArticleById,
  predictionContracts = [],
  onGoRegion,
}) => {
  const { provider: aiProvider, loading: aiLoading } = useAIProvider();
  const [section, setSection] = useState<HubSection>('overview');
  const recentArticles = useMemo(
    () => filterRecentArticles(contextArticles, HUB_RECENT_DAYS),
    [contextArticles]
  );
  const categoryCount = snapshot ? Object.keys(snapshot.derived.categoryCounts || {}).length : 0;
  const totalCorpusCount = snapshot?.meta?.corpusSize ?? contextArticles.length;
  const recentCount = recentArticles.length;
  const traceableCount = snapshot?.derived?.traceableCount !== undefined
    ? snapshot.derived.traceableCount
    : recentArticles.filter(
        (article) => (Boolean(article.sourceUrl) || Boolean(article.sourceName && (article.sourceDate || article.date))) && articleSortTime(article) > 0
      ).length;

  const sections: Array<{ id: HubSection; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: '态势总览', icon: <Activity className="w-4 h-4" /> },
    { id: 'supply_stress', label: '断供压力测试', icon: <ShieldAlert className="w-4 h-4 text-rose-500" /> },
    { id: 'competitor_radar', label: '竞对异动雷达', icon: <Compass className="w-4 h-4 text-amber-500" /> },
    { id: 'signals', label: '信号', icon: <Flame className="w-4 h-4" /> },
    { id: 'sources', label: '来源与实体', icon: <Database className="w-4 h-4" /> },
    { id: 'regions', label: '地区观察', icon: <MapPin className="w-4 h-4" /> },
    { id: 'advisor', label: 'AI 顾问', icon: <Bot className="w-4 h-4" /> },
  ];
  const sectionFeatureId: Record<HubSection, FeatureSummaryId> = {
    overview: 'intelligence-overview',
    supply_stress: 'intelligence-overview',
    competitor_radar: 'intelligence-overview',
    signals: 'intelligence-signals',
    sources: 'intelligence-sources',
    regions: 'intelligence-regions',
    advisor: 'intelligence-advisor',
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      {/* Top Title Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-950 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                最近态势 · 近 {HUB_RECENT_DAYS} 日
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
              见微 · 情报中心
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 font-sans max-w-2xl">
              看「最近」：默认近 {HUB_RECENT_DAYS} 日语料上的热力、信号与来源结构。当日总览请回首页看板；单条拆解用「读懂新闻」。
            </p>
          </div>

          <div className="bg-stone-800/80 p-4 rounded-xl border border-stone-700 space-y-1 shrink-0 text-right">
            <div className="text-xs text-stone-400 font-mono">最近窗口</div>
            <div className="text-xl font-serif font-black text-emerald-400 font-mono">
              {snapshotStatus === 'ok'
                ? recentCount > 0
                  ? `近${HUB_RECENT_DAYS}日 ${recentCount}`
                  : '近窗暂无条目'
                : '未连接'}
            </div>
            <div className="text-[10px] text-stone-400">
              全库 {totalCorpusCount} · 首页看板看当日
            </div>
          </div>
        </div>
      </div>

      <details className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-[11px] text-stone-500">
        <summary className="cursor-pointer flex items-center gap-1.5 font-serif font-bold text-stone-700">
          <Info className="w-3.5 h-3.5" />
          数据口径
        </summary>
        <p className="mt-1.5 leading-relaxed">
          情报中心默认统计近 {HUB_RECENT_DAYS} 日（含今天）运行时语料；共振、热力和密度是文本或时间信号。当日大盘请回首页看板。盲区是覆盖候选；明日关注不是概率预测。
        </p>
      </details>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-stone-200 pb-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-serif font-bold whitespace-nowrap transition-colors ${
              section === item.id
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <FeatureSummary featureId={sectionFeatureId[section]} compact />

      {section === 'overview' && (
      <>
      {/* 语料快照：服务端派生真实统计（DEMO / 实时双轨） */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-serif font-bold text-stone-950">
                语料快照 · 服务端派生统计
              </h3>
              <p className="text-xs text-stone-500">
                数据来自 GET /api/snapshot，随服务端语料实时计算（非演示造数）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                snapshotStatus === 'ok'
                  ? snapshot?.meta.demo
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : snapshotStatus === 'error'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-stone-100 text-stone-600 border-stone-300'
              }`}
            >
              {snapshotStatus === 'ok'
                ? snapshot?.meta.demo
                    ? '演示语料'
                    : snapshot?.meta.corpusSize === 0
                      ? '暂无语料'
                      : snapshot?.meta.corpus === 'live'
                        ? '实时语料 · 在线'
                        : '运行时语料'
                : snapshotStatus === 'error'
                  ? '接口不可达'
                  : '加载中…'}
            </span>
            <button
              onClick={onRefreshSnapshot}
              disabled={snapshotStatus === 'loading'}
              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-700 disabled:opacity-40 text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${snapshotStatus === 'loading' ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                aiProvider === 'gemini'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : aiProvider === 'deepseek'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-stone-100 text-stone-500 border-stone-200'
              }`}
              title="服务端 AI 通道（/api/health.ai）"
            >
              AI 通道：{aiLoading ? '…' : aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'deepseek' ? 'DeepSeek' : '未配置'}
            </span>
          </div>
        </div>

        {snapshot && snapshotStatus === 'ok' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <div className="text-stone-500 font-mono text-[10px]">语料文章数</div>
                <div className="text-xl font-serif font-black text-stone-900 font-mono">
                  {snapshot.meta.corpusSize}
                </div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <div className="text-stone-500 font-mono text-[10px]">覆盖分类</div>
                <div className="text-xl font-serif font-black text-stone-900 font-mono">
                  {categoryCount}
                </div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <div className="text-stone-500 font-mono text-[10px]">原文+时间可追溯</div>
                <div className="text-xl font-serif font-black text-stone-900 font-mono">
                  {traceableCount}/{totalCorpusCount}
                </div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <div className="text-stone-500 font-mono text-[10px]">标签覆盖</div>
                <div className="text-sm font-serif font-bold text-stone-900 leading-snug pt-1">
                  {snapshot.derived.tagFrequency.length} 个高频标签
                </div>
              </div>
            </div>

            {snapshot.derived.tagFrequency.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-serif font-bold text-stone-600">高频标签 TOP：</span>
                {snapshot.derived.tagFrequency.slice(0, 10).map((t) => (
                  <span key={t.tag} className="px-2 py-0.5 bg-stone-100 border border-stone-200 rounded-full text-stone-700 font-mono">
                    #{t.tag} ×{t.count}
                  </span>
                ))}
              </div>
            )}

            {snapshot.derived.regionAnnotatedCount ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-serif font-bold text-stone-600">
                  涉事地区（AI 标注 {snapshot.derived.regionAnnotatedCount} 条）：
                </span>
                {(snapshot.derived.regionMentionDistribution || []).slice(0, 6).map((r) => (
                  <span key={r.region} className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-blue-800 font-mono">
                    {r.region} · {r.weight}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="text-[10px] text-stone-400 font-mono text-right">
              生成于 {new Date(snapshot.meta.generatedAt).toLocaleString('zh-CN')} · 语料口径：{snapshot.meta.corpus}
            </div>
          </div>
        ) : snapshotStatus === 'loading' ? (
          <div className="py-6 text-center text-stone-400 text-xs">正在请求服务端派生快照…</div>
        ) : (
          <div className="py-6 text-center text-stone-400 text-xs">
            无法连接服务端 /api/snapshot。下方面板在无真实语料时会显示空态，不会填充示例数据。
          </div>
        )}
      </div>

      {/* 1. 四大决策概览卡片 (Critical Alerts, Trending, Sectors, Sources) */}
      <StrategicMetricsBar
        articles={recentArticles}
        onOpenAlerts={() => setSection('signals')}
        onOpenTrending={() => setSection('signals')}
        onOpenSectors={() => setSection('regions')}
        onOpenSources={() => setSection('sources')}
      />

      {/* 2. 动态热度演变趋势图 (Recharts Dynamic Heat Curve) */}
      <DynamicHeatTrendChart
        articles={recentArticles}
        onOpenArticleById={onOpenArticleById}
        onSelectArticleTitle={onSelectArticleTitle}
      />

      {/* 2.5 话题短期爆发预测趋势图 (Topic Breakout Forecast Recharts) */}
      <TopicBreakoutForecastChart
        articles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
        onOpenArticleById={onOpenArticleById}
      />

      {/* 2.8 新闻情绪指数动态时序趋势图 (Recharts Dynamic Sentiment Curve) */}
      <DynamicSentimentTrendChart
        articles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
        onOpenArticleById={onOpenArticleById}
      />

      {/* 2.9 全球供应链断供压力测试与卡脖子模拟器 */}
      <SupplyChainStressSimulator
        articles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
      />

      {/* 2.95 跨国企业竞争对手异动雷达 */}
      <CompetitorDynamicRadar
        articles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
      />

      {/* 3. 三层全球战略情报中心 (全景宏观 ➔ 行业垂类 ➔ 事件洞察) */}

      <StrategicThreeTierCenter
        articles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
        onOpenArticleById={onOpenArticleById}
      />

      {/* 3.5 全球战略决策行动指南 (分角色/分时效高价值决策建议清单) */}
      <StrategicActionPlaybook
        selectedPersona={selectedPersona}
        contextArticles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
        onOpenArticleById={onOpenArticleById}
      />

      {/* 4. 今日态势解读与行动指引 */}
      <SituationReadoutPanel articles={recentArticles} />
      <FrequentPatternPanel articles={recentArticles} />
      </>
      )}

      {section === 'supply_stress' && (
        <div className="space-y-6">
          <SupplyChainStressSimulator
            articles={recentArticles}
            onSelectArticleTitle={onSelectArticleTitle}
          />
        </div>
      )}

      {section === 'competitor_radar' && (
        <div className="space-y-6">
          <CompetitorDynamicRadar
            articles={recentArticles}
            onSelectArticleTitle={onSelectArticleTitle}
          />
        </div>
      )}

      {section === 'signals' && (

      <>
      {/* 1.5 动态热度演变趋势图 (Recharts Dynamic Heat Curve) */}
      <DynamicHeatTrendChart
        articles={recentArticles}
        onOpenArticleById={onOpenArticleById}
        onSelectArticleTitle={onSelectArticleTitle}
      />

      {/* 1.8 话题短期爆发预测趋势图 (Topic Breakout Forecast Recharts) */}
      <TopicBreakoutForecastChart
        articles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
        onOpenArticleById={onOpenArticleById}
      />

      {/* 1.9 新闻情绪指数动态时序趋势图 (Recharts Dynamic Sentiment Curve) */}
      <DynamicSentimentTrendChart
        articles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
        onOpenArticleById={onOpenArticleById}
      />

      {/* 2. Cross-Event Synergy & Hidden Nexus Engine (多事件跨篇因果交叉对比) */}


      <CrossEventNexusPanel
        articles={recentArticles}
        crossEvent={snapshot?.derived.crossEvent}
        onSelectArticleTitle={onSelectArticleTitle}
        onOpenArticleById={onOpenArticleById}
      />


      {/* 3. 24-Hour Content-Arrival Heatmap（真实时间统计） */}
      <SentimentHeatmap24h
        articles={recentArticles}
        arrivalHeat={snapshot?.derived.arrivalHeat}
        onSelectArticleTitle={onSelectArticleTitle}
      />

      {/* 4. Intelligence Density Curve（真实统计） */}
      <IntelligenceDensityCurve
        articles={recentArticles}
        density={snapshot?.derived.density}
        onSelectArticleTitle={onSelectArticleTitle}
      />
      </>
      )}

      {section === 'sources' && (
      <>
      {/* 5. Data Source Health（语料派生真实统计） */}
      <DataSourceHealthPanel articles={contextArticles} sourceHealth={snapshot?.derived.sourceHealth} />

      {/* 5.0 实体覆盖：只统计已经写入语料的 entityMentions */}
      <EntityCoveragePanel articles={contextArticles} />

      <SyndicationPanel articles={contextArticles} onOpenArticleById={onOpenArticleById} />
      <SourceArchivePanel />
      </>
      )}

      {section === 'regions' && (
      <>
      {/* 5.0 地区维度入口：三件套（标注/预警/覆盖趋势）在此，深潜去「地区情报」页 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#0284C7]/30 bg-sky-50/70 px-4 sm:px-5 py-3">
        <div className="text-[12px] text-sky-950 leading-relaxed">
          <b className="text-[#0369A1] font-serif">地区维度 · 统计三件套</b>
          <span className="text-sky-800/90"> —— AI 涉事地区标注 / 依赖预警 / 覆盖·去重·近7天趋势（与「地区情报」页原重复面板合并于此）。</span>
        </div>
        {onGoRegion && (
          <button
            type="button"
            onClick={onGoRegion}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-serif font-bold transition-colors"
          >
            去地区深潜（主体×矩阵×下钻×组合） →
          </button>
        )}
      </div>

      {/* 5.1 内容涉事地区 · AI 标注（抽样） */}
      <MentionRegionAIPanel articles={recentArticles} />

      {/* 5.2 涉事地区聚焦：依赖预警 + 按地区浏览 */}
      <RegionDependenceWidget articles={recentArticles} onOpenArticleById={onOpenArticleById} />

      {/* 5.3 地区情报：覆盖/去重度/近7天 */}
      <RegionIntelligencePanel articles={recentArticles} />

      {/* 6. 2-Columns: Today's Blindspots + Tomorrow's Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <TodayBlindspotWidget articles={recentArticles} blindspots={snapshot?.derived.blindspots} onOpenSettings={onOpenSettings} />
        <TomorrowWatchlistWidget
          articles={recentArticles}
          tomorrowWatch={snapshot?.derived.tomorrowWatch}
          predictionContracts={predictionContracts}
          onOpenArticleById={onOpenArticleById}
        />
      </div>
      </>
      )}

      {section === 'advisor' && (
      <>
      {/* 6.8 全球战略决策行动指南 (分角色/分时效高价值决策建议清单) */}
      <StrategicActionPlaybook
        selectedPersona={selectedPersona}
        contextArticles={recentArticles}
        onSelectArticleTitle={onSelectArticleTitle}
        onOpenArticleById={onOpenArticleById}
      />

      {/* 7. AI Strategic Advisor (基于今天的新闻情报回答我) */}
      <AIStrategicAdvisor
        selectedPersona={selectedPersona}
        contextArticles={recentArticles}
      />
      </>
      )}

    </div>
  );
};
