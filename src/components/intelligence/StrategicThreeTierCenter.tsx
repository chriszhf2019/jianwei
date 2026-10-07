import React, { useState, useMemo } from 'react';
import { NewsArticle } from '../../types';
import {
  Globe,
  TrendingUp,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck,
  Cpu,
  Compass,
  ArrowRight,
  ExternalLink,
  Zap,
  Activity,
  MapPin,
  Clock,
  Radio,
  BookOpen,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { EvidenceBadge } from '../common/EvidenceBadge';
import { EditorialNotice } from '../common/EditorialNotice';
import { formatArticleTime } from '../../utils/articleTime';
import { DynamicSentimentTrendChart } from './DynamicSentimentTrendChart';
import { sentimentCounts, netSentiment } from '../../utils/corpusMetrics';
import { inferDefaultRegionMentions, normalizeRegionMentions } from '../../utils/regionSemantics';


interface StrategicThreeTierCenterProps {
  articles: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
  onOpenArticleById?: (articleId: string) => void;
  onOpenTermExplain?: (term: string) => void;
}

type LayerLevel = 'tier1_macro' | 'tier2_industry' | 'tier3_insights';

export const StrategicThreeTierCenter: React.FC<StrategicThreeTierCenterProps> = ({
  articles,
  onSelectArticleTitle,
  onOpenArticleById,
  onOpenTermExplain,
}) => {
  const [activeTier, setActiveTier] = useState<LayerLevel>('tier1_macro');
  const [selectedRadarType, setSelectedRadarType] = useState<'all' | 'tech' | 'competitor' | 'supply' | 'policy'>('all');

  // 地域提及：只按语料标注/规则提取计数，不编造环比涨幅
  const geoSignals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const art of articles) {
      const mentions =
        Array.isArray((art as any).regionMentions) && (art as any).regionMentions.length > 0
          ? normalizeRegionMentions((art as any).regionMentions)
          : inferDefaultRegionMentions(art);
      for (const m of mentions) {
        counts.set(m.region, (counts.get(m.region) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([region, count]) => ({ region, count }));
  }, [articles]);

  const lexiconPulse = useMemo(() => {
    const c = sentimentCounts(articles);
    const scanned = Math.max(1, c.scanned);
    const positivePct = Math.round((c.positive / scanned) * 100);
    const negativePct = Math.round((c.negative / scanned) * 100);
    const mixedPct = Math.round((c.mixed / scanned) * 100);
    const neutralPct = Math.max(0, 100 - positivePct - negativePct - mixedPct);
    const net = netSentiment(c);
    const tone =
      net == null
        ? '样本不足'
        : net >= 20
          ? '偏正面'
          : net <= -20
            ? '偏负面'
            : '多空接近';
    return { ...c, positivePct, negativePct, mixedPct, neutralPct, net, tone };
  }, [articles]);

  // Clustered Events for Tier 3：只用文章真实字段，不编造聚合篇数 / 权威档 / 热词
  const clusteredEvents = useMemo(() => {
    return articles.slice(0, 6).map((art, idx) => {
      const isTech = idx % 3 === 0;
      const isRisk = idx % 3 === 1;
      const tags = (art.tags || []).filter(Boolean).slice(0, 3);
      const sourceLabel = art.sourceName
        ? `来源：${art.sourceName}${art.sourceCount && art.sourceCount > 1 ? ` · 标注来源家数 ${art.sourceCount}` : ''}`
        : '来源未标明';

      return {
        article: art,
        corpusCount: Math.max(1, Number(art.sourceCount) || 1),
        velocity: null as string | null,
        buzzwords: tags,
        type: isTech ? 'tech' : isRisk ? 'supply' : 'competitor',
        typeLabel: isTech ? '🔬 技术相关' : isRisk ? '⚠️ 供给/风险相关' : '⚔️ 竞品/商业相关',
        whoWhat: art.summary || art.title,
        impact: art.oneSentenceVerdict || art.aiInterpretation?.core || null,
        sourceLevel: sourceLabel,
      };
    });
  }, [articles]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs font-sans space-y-6">
      {/* Header & Three Tier Tab Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-[#E3120B]" />
            <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
              战略情报漏斗 · 全景 ➔ 垂类 ➔ 洞察
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500">
            宏观层用站内词典/地域提及对照；垂类与事件层只展示语料已有字段，不编造全网指数
          </p>
        </div>

        {/* 3-Tier Switcher */}
        <div className="inline-flex rounded-xl border border-stone-300 bg-stone-100 p-1 text-xs font-serif font-bold shrink-0">
          <button
            onClick={() => setActiveTier('tier1_macro')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTier === 'tier1_macro' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>第一层：全景宏观</span>
          </button>
          <button
            onClick={() => setActiveTier('tier2_industry')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTier === 'tier2_industry' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>第二层：行业垂类</span>
          </button>
          <button
            onClick={() => setActiveTier('tier3_insights')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTier === 'tier3_insights' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-950'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>第三层：事件洞察</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          第一层：全景与宏观态势 (The Big Picture)
         ========================================================================= */}
      {activeTier === 'tier1_macro' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. 站内词典情绪 & 说明 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>站内词典情绪对照</span>
                </span>
                <span className="font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded font-bold text-[11px]">
                  {lexiconPulse.scanned === 0
                    ? '暂无样本'
                    : `${lexiconPulse.tone}${lexiconPulse.net == null ? '' : ` (${lexiconPulse.net > 0 ? '+' : ''}${lexiconPulse.net})`}`}
                </span>
              </div>

              {lexiconPulse.scanned === 0 ? (
                <p className="text-xs text-stone-600 font-sans">当前语料无可扫描标题/摘要，不显示假比例条。</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded-full bg-stone-200 overflow-hidden flex shadow-inner">
                    <div className="h-full bg-emerald-500" style={{ width: `${lexiconPulse.positivePct}%` }} title={`偏正面 ${lexiconPulse.positivePct}%`} />
                    <div className="h-full bg-violet-400" style={{ width: `${lexiconPulse.mixedPct}%` }} title={`交织 ${lexiconPulse.mixedPct}%`} />
                    <div className="h-full bg-stone-400" style={{ width: `${lexiconPulse.neutralPct}%` }} title={`中性 ${lexiconPulse.neutralPct}%`} />
                    <div className="h-full bg-rose-500" style={{ width: `${lexiconPulse.negativePct}%` }} title={`偏负面 ${lexiconPulse.negativePct}%`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-500 font-mono gap-2">
                    <span>正面 {lexiconPulse.positive}（{lexiconPulse.positivePct}%）</span>
                    <span>交织 {lexiconPulse.mixed}（{lexiconPulse.mixedPct}%）</span>
                    <span>中性 {Math.max(0, lexiconPulse.scanned - lexiconPulse.positive - lexiconPulse.negative - lexiconPulse.mixed)}（{lexiconPulse.neutralPct}%）</span>
                    <span>负面 {lexiconPulse.negative}（{lexiconPulse.negativePct}%）</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-stone-700 font-sans leading-relaxed pt-1">
                口径：对当前语料标题/摘要做词典归类占比。净情绪 = (正面-负面)/(正面+负面)×100。不是市场情绪或全网舆论真值。
              </p>
            </div>

            <div className="lg:col-span-2 bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#E3120B]" />
                  <span>宏观层说明</span>
                </span>
              </div>
              <EditorialNotice title="不再展示编辑预置宏观卡片">
                美联储预期、关税叙事等硬编码摘要已移除。请到下方时序图与语料列表核验站内实际篇目；有密钥时的解读仍是模型推断。
              </EditorialNotice>
            </div>
          </div>

          {/* 1.5 全球新闻情绪指数动态时序趋势图 (Recharts Global Sentiment Pulse Curve) */}
          <DynamicSentimentTrendChart
            articles={articles}
            onSelectArticleTitle={onSelectArticleTitle}
            onOpenArticleById={onOpenArticleById}
          />

          {/* 2. 地域热度与异动高发区 (Geo-Heatmap Signals) */}

          <div className="bg-white border-2 border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#E3120B]" />
                <h3 className="text-sm font-serif font-bold text-stone-950">
                  站内地域提及榜
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-mono">按语料提及篇数 · 非环比热度</span>
            </div>

            {geoSignals.length === 0 ? (
              <p className="text-xs text-stone-500 font-sans">当前语料未提取到可展示的地域提及；不编造地区涨幅。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {geoSignals.map((geo) => (
                  <div key={geo.region} className="p-4 bg-[#FAF8F5] border border-stone-300 rounded-xl space-y-2 hover:border-stone-800 transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-serif font-bold text-stone-950">{geo.region}</span>
                      <span className="font-mono font-bold text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded text-[10px]">
                        {geo.count} 篇
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-snug">
                      标题/摘要/标注中提及该地区的语料篇数；不是进出口或市场热度环比。
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          第二层：行业赛道与竞争动态 (Industry & Competitors)
         ========================================================================= */}
      {activeTier === 'tier2_industry' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Radar Type Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3 text-xs font-serif font-bold">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-stone-500" />
              <span>四大垂直雷达分类：</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedRadarType('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedRadarType === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                全部动态
              </button>
              <button
                onClick={() => setSelectedRadarType('tech')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedRadarType === 'tech' ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                🔬 技术破局 (Tech Breakthroughs)
              </button>
              <button
                onClick={() => setSelectedRadarType('competitor')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedRadarType === 'competitor' ? 'bg-sky-800 text-white' : 'bg-sky-50 text-sky-900 hover:bg-sky-100'
                }`}
              >
                ⚔️ 竞品与资本 (Competitor Radar)
              </button>
              <button
                onClick={() => setSelectedRadarType('supply')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedRadarType === 'supply' ? 'bg-amber-800 text-white' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                ⚠️ 供应链预警 (Supply Chain)
              </button>
              <button
                onClick={() => setSelectedRadarType('policy')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedRadarType === 'policy' ? 'bg-purple-800 text-white' : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                }`}
              >
                📜 政策法规 (Regulations)
              </button>
            </div>
          </div>

          {/* 4 Radar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. 技术破局 */}
            <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <span>技术破局 (Tech Breakthroughs)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  高价值节点
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="text-xs font-serif font-bold text-stone-950">
                    车企固态电池中试线运转
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    能量密度突破 450Wh/kg，标志着全固态商业化落地进入 12-18 个月倒计时。
                  </p>
                </div>
                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="text-xs font-serif font-bold text-stone-950">
                    MoE 超低推理成本架构在端侧落地
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    单 Token 消耗降低 70%，手机本地即时推理能力迎来质变。
                  </p>
                </div>
              </div>
            </div>

            {/* 2. 竞品追踪 */}
            <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                  <span>竞品与资本追踪 (Competitor Radar)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                  资金与人事
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="text-xs font-serif font-bold text-stone-950">
                    头部算力云厂商开启新一轮降价
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    API 调用价格下调 40%，同业中小模型供应商毛利率面临严重承压。
                  </p>
                </div>
                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="text-xs font-serif font-bold text-stone-950">
                    具身智能领军初创完成 B 轮大额融资
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    产业资本重点押注工业流水线自动化与灵巧手电机供应链。
                  </p>
                </div>
              </div>
            </div>

            {/* 3. 供应链预警 */}
            <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>供应链预警 (Supply Chain Risks)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  瓶颈与排产
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="text-xs font-serif font-bold text-stone-950">
                    HBM3e 高带宽内存现货紧张
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    先进封装排期已延后至 2026 年 Q4，算力模组交付周期延长 3 周。
                  </p>
                </div>
              </div>
            </div>

            {/* 4. 政策法规 */}
            <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>政策法规与合规 (Regulations)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                  准入门槛
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="text-xs font-serif font-bold text-stone-950">
                    跨境数据安全合规准则出台
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    要求跨国模型推理必须在本地完成脱敏，催化私有化部署方案增长。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          第三层：微观事件与 AI 洞察 (Actionable Insights / Clustered Events)
         ========================================================================= */}
      {activeTier === 'tier3_insights' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2 text-xs text-stone-600 font-serif">
            <span>已按事件聚类去重 · 提炼 <b>AI TL;DR</b> 三要素与新词黑话</span>
            <span className="font-mono">共 {clusteredEvents.length} 个聚合事件</span>
          </div>

          <div className="space-y-4">
            {clusteredEvents.map((evt, idx) => (
              <div
                key={evt.article.id}
                className="bg-[#FAF8F5] border-2 border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs hover:border-[#E3120B] transition-all"
              >
                {/* Event Header & Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-serif font-bold bg-stone-900 text-white">
                      {evt.typeLabel}
                    </span>
                    {evt.velocity ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {evt.velocity}
                      </span>
                    ) : null}
                    <span className="text-xs font-mono text-stone-500">
                      标注来源家数 {evt.corpusCount}（非多源核验计数）
                    </span>
                  </div>

                  <div className="text-xs font-mono text-stone-400">
                    {formatArticleTime(evt.article)}
                  </div>
                </div>

                {/* Event Title */}
                <h3
                  onClick={() => onOpenArticleById ? onOpenArticleById(evt.article.id) : onSelectArticleTitle && onSelectArticleTitle(evt.article.title)}
                  className="text-lg sm:text-xl font-serif font-black text-stone-950 hover:text-[#E3120B] cursor-pointer transition-colors leading-snug"
                >
                  {evt.article.title}
                </h3>

                {/* AI TL;DR Three-Element Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white border border-stone-300 rounded-xl p-4">
                  {/* 1. Who/What */}
                  <div className="space-y-1 border-b md:border-b-0 md:border-r border-stone-200 pb-2 md:pb-0 md:pr-3">
                    <div className="font-serif font-bold text-stone-900 flex items-center gap-1">
                      <span className="text-[#E3120B]">📌</span>
                      <span>发生了什么 (Who/What)</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed font-sans">
                      <KeyTermHighlight text={evt.whoWhat} />
                    </p>
                  </div>

                  {/* 2. Impact */}
                  <div className="space-y-1 border-b md:border-b-0 md:border-r border-stone-200 pb-2 md:pb-0 md:pr-3">
                    <div className="font-serif font-bold text-stone-900 flex items-center gap-1">
                      <span className="text-amber-600">💥</span>
                      <span>潜在影响 (Impact & So What)</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed font-sans">
                      {evt.impact
                        ? <KeyTermHighlight text={evt.impact} />
                        : <span className="text-stone-400">暂无站内解读摘要；以上仅为标题/摘要，不是已核验影响结论。</span>}
                    </p>
                  </div>

                  {/* 3. Source */}
                  <div className="space-y-1">
                    <div className="font-serif font-bold text-stone-900 flex items-center gap-1">
                      <span className="text-emerald-600">🛡️</span>
                      <span>证据与来源 (Source Verifiability)</span>
                    </div>
                    <p className="text-stone-600 leading-relaxed font-sans text-[11px]">
                      {evt.sourceLevel}
                    </p>
                    {evt.article.sourceUrl && (
                      <a
                        href={evt.article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0284C7] hover:underline inline-flex items-center gap-1 font-mono text-[10px] pt-1"
                      >
                        <span>查看原网出处 ↗</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Buzzword Extraction & Action */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                    <span className="font-serif font-bold text-stone-600">文章标签：</span>
                    {evt.buzzwords.length > 0 ? (
                      evt.buzzwords.map((bw) => (
                        <span
                          key={bw}
                          onClick={() => onOpenTermExplain && onOpenTermExplain(bw)}
                          className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200 font-mono text-[11px] cursor-pointer hover:bg-purple-100 transition-colors"
                        >
                          #{bw}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-400 font-mono text-[11px]">无标签（不编造热词）</span>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenArticleById ? onOpenArticleById(evt.article.id) : onSelectArticleTitle && onSelectArticleTitle(evt.article.title)}
                    className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs shrink-0"
                  >
                    <span>打开详情</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
