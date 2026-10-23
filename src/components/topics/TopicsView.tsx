import React, { useMemo, useState, useEffect } from 'react';
import { NewsArticle } from '../../types';
import {
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
  Compass,
  CheckCircle2,
  Search,
  Download,
  Flame,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Building2,
  Filter,
  FileText,
  Radio,
  ExternalLink,
  Target,
  Zap,
  Star,
  Columns,
  Maximize2,
  Minimize2,
  GitCompare,
  Calendar,
  Share2,
  Headphones,
  GitFork,
} from 'lucide-react';
import { TopicPodcastModal } from './TopicPodcastModal';
import { TopicCausalGraph } from './TopicCausalGraph';
import { InvalidationAlertBanner } from './InvalidationAlertBanner';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatArticleTime } from '../../utils/articleTime';
import { MethodBadge } from '../common/MethodBadge';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { FeatureSummary } from '../common/FeatureSummary';
import {
  buildMatchedTopicDossiers,
  type MatchedTopicDossier,
  type TopicLifecycleStage,
} from '../../utils/topicDossiers';
import { buildTopicClusters } from '../../utils/topicCluster';

interface TopicsViewProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
}

export type { TopicLifecycleStage };
export type TimeHorizon = '7d' | '30d' | '90d' | 'all';
export type EnhancedTopicDossier = MatchedTopicDossier;

const TIME_HORIZON_LABELS: Record<TimeHorizon, { label: string; days: number }> = {
  '7d': { label: '近 7 天高频脉冲', days: 7 },
  '30d': { label: '近 30 天关键拐点', days: 30 },
  '90d': { label: '近 90 天宏观演进', days: 90 },
  'all': { label: '全周期全景时序', days: 3650 },
};

export const TopicsView: React.FC<TopicsViewProps> = ({ articles, onSelectArticle }) => {
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 对比模式状态
  const [compareTopicAId, setCompareTopicAId] = useState<string>('dossier_ai_compute');
  const [compareTopicBId, setCompareTopicBId] = useState<string>('dossier_solid_battery');
  const [horizonA, setHorizonA] = useState<TimeHorizon>('all');
  const [horizonB, setHorizonB] = useState<TimeHorizon>('all');

  // 深度播客与拓扑图谱模式状态
  const [showPodcastModal, setShowPodcastModal] = useState<boolean>(false);
  const [dossierTab, setDossierTab] = useState<'overview' | 'graph'>('overview');


  // 「关注该主题」持久化状态 (Followed Topics Persistence)
  const [followedTopicIds, setFollowedTopicIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('genway_followed_topics');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return ['dossier_ai_compute', 'dossier_solid_battery'];
  });

  const handleToggleFollow = (topicId: string, topicTitle: string) => {
    setFollowedTopicIds((prev) => {
      const isFollowed = prev.includes(topicId);
      const next = isFollowed ? prev.filter((id) => id !== topicId) : [...prev, topicId];
      try {
        localStorage.setItem('genway_followed_topics', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      showToast(isFollowed ? `已取消关注「${topicTitle}」` : `已成功关注「${topicTitle}」，将在我的关注中置顶更新`);
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 语料驱动专题：种子关键词匹配；仅展示至少命中 1 篇的专题
  const dossiers = useMemo<EnhancedTopicDossier[]>(
    () => buildMatchedTopicDossiers(articles),
    [articles],
  );

  // 与首页同款的跨源事件聚合（有真实多篇才出现）
  const liveEventClusters = useMemo(
    () => buildTopicClusters(articles, 6),
    [articles],
  );

  const activeTopic = useMemo<EnhancedTopicDossier | null>(() => {
    if (dossiers.length === 0) return null;
    return dossiers.find((d) => d.id === selectedTopicId) || dossiers[0];
  }, [dossiers, selectedTopicId]);

  // 对比模式所选专题 A 与 B
  const topicA = useMemo(() => {
    return dossiers.find((d) => d.id === compareTopicAId) || dossiers[0] || null;
  }, [dossiers, compareTopicAId]);

  const topicB = useMemo(() => {
    return dossiers.find((d) => d.id === compareTopicBId) || dossiers[1] || dossiers[0] || null;
  }, [dossiers, compareTopicBId]);

  // 根据不同时间跨度过滤时间线
  const filterTimelineByHorizon = (timeline: EnhancedTopicDossier['timeline'], horizon: TimeHorizon) => {
    const days = TIME_HORIZON_LABELS[horizon].days;
    const cutoff = Date.now() - days * 86400000;
    if (days >= 365) return timeline;
    const filtered = timeline.filter((item) => item.timestamp >= cutoff);
    return filtered.length > 0 ? filtered : timeline.slice(0, 3);
  };

  const timelineA = useMemo(() => {
    if (!topicA) return [];
    return filterTimelineByHorizon(topicA.timeline, horizonA);
  }, [topicA, horizonA]);

  const timelineB = useMemo(() => {
    if (!topicB) return [];
    return filterTimelineByHorizon(topicB.timeline, horizonB);
  }, [topicB, horizonB]);

  // 对比模式下的热度曲线融合数据
  const compareHeatChartData = useMemo(() => {
    if (!topicA || !topicB) return [];
    const days = ['T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', 'T0'];
    return days.map((day, idx) => ({
      day,
      topicAVal: topicA.heatSparkline[idx]?.count || 0,
      topicBVal: topicB.heatSparkline[idx]?.count || 0,
    }));
  }, [topicA, topicB]);

  // 筛选过滤后的专题列表
  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      const matchSearch =
        !searchQuery.trim() ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const isFollowed = followedTopicIds.includes(d.id);

      if (selectedCategory === 'followed') {
        return isFollowed && matchSearch;
      }

      const matchCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'ai' && (d.category.includes('算力') || d.category.includes('智能') || d.category.includes('软件'))) ||
        (selectedCategory === 'energy' && d.category.includes('新能源')) ||
        (selectedCategory === 'macro' && (d.category.includes('宏观') || d.category.includes('金融') || d.category.includes('资本'))) ||
        (selectedCategory === 'education' && (d.category.includes('教育') || d.category.includes('认知'))) ||
        (selectedCategory === 'geopolitics' && d.category.includes('地缘'));

      return matchSearch && matchCategory;
    });
  }, [dossiers, searchQuery, selectedCategory, followedTopicIds]);

  // 一键复制 / 导出专题完整 Markdown 档案
  const handleExportTopicMarkdown = (topic: EnhancedTopicDossier) => {
    let md = `# 【见微深度专题战略档案】${topic.title}\n\n`;
    md += `> **专题所属**：${topic.category} ｜ **演进阶段**：${topic.stageLabel} ｜ **收录深度研报**：${topic.articles.length} 篇  \n`;
    md += `> **档案导出时间**：${new Date().toLocaleString('zh-CN')} ｜ **见微战略情报研判系统**  \n\n`;
    md += `---\n\n`;
    md += `## 🎯 专题核心论断与底层逻辑\n\n${topic.subtitle}\n\n`;
    md += `## ⚖️ 结构性博弈焦点与各方阵营诉求\n\n**核心冲突焦点**：${topic.coreConflict}\n\n`;
    topic.stakeholders.forEach((s) => {
      md += `### 🏢 阵营：${s.camp} (${s.stance})\n- **核心诉求与行动**：${s.coreDemand}\n\n`;
    });
    md += `## ⏳ 专题演进时间轴里程碑\n\n`;
    topic.timeline.forEach((item) => {
      md += `- **[${item.date}] ${item.milestone}**\n  * 影响与定性：${item.impact}\n`;
    });
    md += `\n## 🔍 关键前瞻观察指标 & 证伪触发条件\n\n`;
    topic.keyWatchpoints.forEach((w) => {
      md += `- 👁️ **重点盯防指标**：${w}\n`;
    });
    md += `- 🛑 **假设证伪条件**：${topic.invalidationTrigger}\n\n`;
    md += `## 📚 专题收录的深度解读报告列表\n\n`;
    topic.articles.forEach((art, idx) => {
      md += `${idx + 1}. **《${art.title}》** (${formatArticleTime(art)} · ${art.sourceName || '来源未标明'})\n   - 核心定性：${art.oneSentenceVerdict || art.summary || '详见站内报告'}\n\n`;
    });
    md += `---\n*见微 Genway · 内部深度专题决策档案*\n`;

    const blob = new Blob(['\ufeff' + md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `见微专题档案_${topic.title.slice(0, 24)}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-stone-950 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-serif font-bold border border-amber-400 flex items-center space-x-2 animate-in fade-in slide-in-from-top-4">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 顶部标题区与双模式切换开关 */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-950 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                长周期战略专题档案库
              </span>
              <MethodBadge methodId="editorial_template" compact />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
              见微 · 深度专题脉络与结构性博弈
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 font-sans max-w-2xl">
              仅展示当前语料关键词命中的专题；博弈/阶段文案是编辑种子。无命中时显示空态，不编造宏观数字。跨源事件复用首页同款聚合。
            </p>
          </div>

          {/* 模式切换大开关：单专题全景 / 时间线并排对比模式 */}
          <div className="flex items-center p-1.5 rounded-xl bg-stone-800 border border-stone-700 self-start md:self-auto shrink-0 space-x-1">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3.5 py-2 rounded-lg text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>单专题深潜</span>
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-3.5 py-2 rounded-lg text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'compare'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>时间线对比模式</span>
            </button>
          </div>
        </div>
      </div>

      <FeatureSummary featureId="topics" compact />

      {/* 🚨 核心专题假设证伪预警横幅 (Invalidation Alert Banner) */}
      <InvalidationAlertBanner
        topics={dossiers}
        onSelectTopic={(id) => {
          setSelectedTopicId(id);
          setViewMode('single');
        }}
      />

      {liveEventClusters.length > 0 && (
        <div className="bg-white border-2 border-stone-800 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-serif font-bold text-stone-950">跨源事件聚合（语料实时）</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                {liveEventClusters.length} 组
              </span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">与首页 buildTopicClusters 同口径</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveEventClusters.map((cluster) => (
              <button
                key={cluster.id}
                type="button"
                onClick={() => {
                  const first = cluster.articles[cluster.articles.length - 1] || cluster.articles[0];
                  if (first) onSelectArticle(first);
                }}
                className="text-left p-3 rounded-lg border border-stone-200 hover:border-stone-800 bg-stone-50 hover:bg-white transition-colors"
              >
                <div className="text-[10px] font-mono text-stone-500 mb-1">
                  {cluster.articles.length} 篇 · {cluster.timeSpan.durationHours}h 跨度
                </div>
                <div className="text-sm font-serif font-bold text-stone-950 line-clamp-2">{cluster.topicTitle}</div>
                {cluster.sharedEntities.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cluster.sharedEntities.slice(0, 4).map((ent) => (
                      <span key={ent} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600 font-mono">
                        {ent}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          模式一：单专题深潜模式 (Single Topic Mode)
         ========================================================================= */}
      {viewMode === 'single' && (
        <>
          {/* 专题检索与多维赛道过滤栏 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 border-stone-800 rounded-xl p-4 shadow-2xs">
            {/* Category Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {[
                { id: 'all', label: '全部专题档案' },
                { id: 'followed', label: `⭐ 我的关注 (${followedTopicIds.length})` },
                { id: 'ai', label: '🤖 AI与软件智能' },
                { id: 'energy', label: '⚡ 新能源与制造' },
                { id: 'macro', label: '📈 宏观与资本' },
                { id: 'education', label: '🎓 教育与认知' },
                { id: 'geopolitics', label: '🌐 地缘出海关税' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all shrink-0 cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索专题、技术或冲突关键词…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-stone-900 focus:bg-white"
              />
            </div>
          </div>

          {/* 专题档案卡片矩阵 (Topic Dossier Selector Cards with Follow Switch) */}
          {filteredDossiers.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-300 rounded-xl p-10 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-serif font-bold text-stone-700">
                {articles.length === 0
                  ? '当前语料为空，专题档案暂无可匹配条目'
                  : '当前语料未命中任何专题种子关键词'}
              </p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                请先摄取 RSS / 刷新语料；命中后才会展示专题卡片。不会用空种子或虚构宏观数字填充。
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDossiers.map((topic) => {
              const isSelected = activeTopic?.id === topic.id;
              const isFollowed = followedTopicIds.includes(topic.id);
              return (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-white text-stone-900 border-stone-300 hover:border-stone-800 hover:shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isSelected ? 'bg-stone-800 text-amber-300 border-stone-700' : topic.stageBadgeClass
                        }`}
                      >
                        {topic.stageLabel}
                      </span>

                      {/* 关注快捷开关 (Follow Switch Button) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFollow(topic.id, topic.title);
                        }}
                        className={`p-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[10px] font-serif ${
                          isFollowed
                            ? 'text-amber-400 hover:text-amber-300'
                            : isSelected
                            ? 'text-stone-400 hover:text-white'
                            : 'text-stone-400 hover:text-stone-800'
                        }`}
                        title={isFollowed ? '点击取消关注' : '点击关注该主题'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFollowed ? 'fill-amber-400 text-amber-400' : ''}`} />
                        <span className="text-[10px]">{isFollowed ? '已关注' : '关注'}</span>
                      </button>
                    </div>

                    <h3 className="text-sm font-serif font-black mb-1 leading-snug line-clamp-2">
                      {topic.title}
                    </h3>
                    <p className={`text-[11px] line-clamp-2 leading-relaxed font-sans ${
                      isSelected ? 'text-stone-300' : 'text-stone-600'
                    }`}>
                      {topic.subtitle}
                    </p>
                  </div>

                  {/* Mini Sparkline & Article Count */}
                  <div className="pt-2 border-t border-stone-200/40 flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-red-400' : 'text-[#E3120B]'}`}>
                      {topic.articles.length} 篇收录
                    </span>
                    <div className="w-20 h-6 select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={topic.heatSparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke={isSelected ? '#FBBF24' : '#E3120B'}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* 选中专题全景深度研判档案展示 (Selected Topic Dossier Showcase) */}
          {activeTopic && (
            <div className="bg-white border-2 border-stone-900 rounded-2xl p-6 sm:p-8 space-y-7 shadow-sm font-sans">
              {/* 专题头部：标题、阶段徽章与关注开关、一键导出按钮 */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-stone-900 pb-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-serif font-bold px-2.5 py-0.5 rounded-md border ${activeTopic.stageBadgeClass}`}>
                      {activeTopic.stageLabel}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-stone-100 text-stone-800 rounded-md font-mono border border-stone-300">
                      {activeTopic.category}
                    </span>
                    {activeTopic.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-0.5 bg-stone-50 text-stone-600 rounded-md font-mono border border-stone-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
                    {activeTopic.title}
                  </h2>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {/* AI 深度双人播客 */}
                  <button
                    type="button"
                    onClick={() => setShowPodcastModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-serif font-bold transition-all bg-[#E3120B] hover:bg-red-700 text-white shadow-xs cursor-pointer"
                    title="收听两位行业分析师对该专题的 3 分钟犀利双人对谈"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>AI 双人深度播客</span>
                  </button>

                  {/* 关注该主题快捷开关 */}
                  <button
                    type="button"
                    onClick={() => handleToggleFollow(activeTopic.id, activeTopic.title)}
                    className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-serif font-bold transition-all border cursor-pointer ${
                      followedTopicIds.includes(activeTopic.id)
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${followedTopicIds.includes(activeTopic.id) ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
                    <span>{followedTopicIds.includes(activeTopic.id) ? '已关注该主题' : '关注该主题'}</span>
                  </button>

                  {/* 一键导出专题档案 Markdown */}
                  <button
                    onClick={() => handleExportTopicMarkdown(activeTopic)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs cursor-pointer"
                    title="一键下载本专题全景时间轴与收录报告的完整 Markdown 决策简报"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{copiedNotification ? '已导出专题简报' : '导出简报 (.md)'}</span>
                  </button>
                </div>
              </div>

              {/* 模式子标签切换：全景博弈与时间轴 vs 因果拓扑图谱 */}
              <div className="flex items-center space-x-2 border-b-2 border-stone-200 pb-2">
                <button
                  onClick={() => setDossierTab('overview')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    dossierTab === 'overview'
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>全景博弈与时间轴</span>
                </button>
                <button
                  onClick={() => setDossierTab('graph')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    dossierTab === 'graph'
                      ? 'bg-purple-900 text-white shadow-2xs'
                      : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <GitFork className="w-3.5 h-3.5 text-purple-400" />
                  <span>因果传导拓扑图谱 (Causal Graph)</span>
                </button>
              </div>

              {/* 因果图谱展示 */}
              {dossierTab === 'graph' && (
                <TopicCausalGraph topic={activeTopic} />
              )}

              {/* 常规全景博弈展示 */}
              {dossierTab === 'overview' && (
                <>
                  {/* 1. 核心论断与底层逻辑提炼 (Core Thesis) */}
                  <div className="bg-[#FAF8F5] border-l-4 border-[#E3120B] p-5 rounded-r-xl space-y-1.5 shadow-2xs">
                    <div className="text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>见微核心论断与宏观逻辑提炼</span>
                    </div>
                    <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-relaxed">
                      <KeyTermHighlight text={activeTopic.subtitle} />
                    </p>
                  </div>

                  {/* 2. 结构性博弈焦点与各方阵营诉求矩阵 (Stakeholders Matrix) */}
                  <div className="space-y-3">
                    <div className="text-xs font-serif font-bold text-stone-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>结构性博弈焦点与利益阵营对立矩阵</span>
                    </div>

                    <div className="p-4 bg-stone-50 border border-stone-300 rounded-xl text-xs space-y-2">
                      <div className="font-serif font-bold text-stone-950 text-sm">
                        ⚡ 核心矛盾：{activeTopic.coreConflict}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {activeTopic.stakeholders.map((sh, idx) => (
                        <div key={idx} className={`p-3.5 rounded-xl border ${sh.color} space-y-1.5`}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-serif font-bold">{sh.camp}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/80 font-bold">
                              {sh.stance}
                            </span>
                          </div>
                          <p className="text-[11px] font-sans leading-relaxed">
                            <strong>核心诉求：</strong>{sh.coreDemand}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. 演进时间轴里程碑 (Evolution Timeline with Links) */}
                  <div className="space-y-3">
                    <div className="text-xs font-serif font-bold text-stone-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-[#0284C7]" />
                      <span>时间轴关键拐点与演进脉络 (Chronological Milestones)</span>
                    </div>

                    <div className="relative pl-6 border-l-2 border-stone-300 space-y-5">
                      {activeTopic.timeline.map((item, idx) => (
                        <div key={idx} className="relative group">
                          <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-stone-900 border-2 border-white ring-2 ring-stone-200 group-hover:bg-[#E3120B] transition-colors" />
                          <div className="text-[11px] font-mono font-bold text-stone-500 mb-0.5">
                            {item.date}
                          </div>
                          <h4 className="text-sm font-serif font-bold text-stone-950 mb-0.5">
                            {item.milestone}
                          </h4>
                          <p className="text-xs text-stone-600 leading-relaxed font-sans">
                            {item.impact}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. 重点盯防指标 & 证伪触发条件 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#FAF8F5] border border-stone-300 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-emerald-700" />
                        <span>重点前瞻观察指标 (Forward Watchpoints)</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-stone-700">
                        {activeTopic.keyWatchpoints.map((wp, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{wp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-serif font-bold text-rose-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-rose-700" />
                        <span>假设证伪条件 (Invalidation Trigger)</span>
                      </div>
                      <p className="text-xs text-rose-900 leading-relaxed font-sans">
                        {activeTopic.invalidationTrigger}
                      </p>
                    </div>
                  </div>
                </>
              )}


              {/* 5. 专题收录的全部深度报告列表 */}
              <div className="space-y-4 pt-4 border-t-2 border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-serif font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-[#E3120B]" />
                    <span>本专题收录的深度解读报告 ({activeTopic.articles.length} 篇)</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-400">点击卡片直达深度解读</span>
                </div>

                {activeTopic.articles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeTopic.articles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => onSelectArticle(art)}
                        className="p-4 bg-[#FAF8F5] hover:bg-white border-2 border-stone-200 hover:border-stone-900 rounded-xl cursor-pointer transition-all space-y-2 group shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-serif font-bold text-[#E3120B] bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[11px]">
                            {art.category}
                          </span>
                          <span className="text-stone-400 font-mono text-[11px]">
                            {formatArticleTime(art)}
                          </span>
                        </div>
                        <h4 className="text-sm font-serif font-bold text-stone-950 group-hover:text-[#E3120B] transition-colors line-clamp-2">
                          <KeyTermHighlight text={art.title} entities={(art.entityMentions || []).map((e) => e.name)} />
                        </h4>
                        <p className="text-xs text-stone-600 line-clamp-2 font-sans">
                          {art.oneSentenceVerdict || art.summary}
                        </p>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200/60">
                          <span className="text-stone-400 font-mono text-[10px]">
                            {art.sourceName || '来源未标明'}
                          </span>
                          <span className="font-serif font-bold text-stone-800 group-hover:text-[#E3120B] flex items-center gap-1">
                            <span>阅读深度拆解</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-stone-400 text-xs font-sans">
                    当前文章库中暂未检测到匹配报告。
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          🔥 模式二：时间线并排对比模式 (Side-by-Side Timeline Comparison Mode)
         ========================================================================= */}
      {viewMode === 'compare' && (
        <div className="space-y-6">
          {/* 对比模式控制台：选择左右专题与时间跨度 */}
          <div className="bg-white border-2 border-stone-900 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-serif font-black text-stone-950 flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-[#E3120B]" />
                  <span>双专题时序演进并排对照沙盘 (Side-by-Side Evolution Matrix)</span>
                </h3>
                <p className="text-xs text-stone-500">
                  支持独立调整左右时间跨度 · 穿透多领域技术突破与地缘管制的交叉传导机制
                </p>
              </div>

              <div className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-500">
                <Calendar className="w-3.5 h-3.5 text-stone-700" />
                <span>时序同步已就绪</span>
              </div>
            </div>

            {/* Selector Grid: Left Topic & Right Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Selector */}
              <div className="p-4 rounded-xl bg-blue-50/50 border-2 border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-black text-blue-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                    <span>对比方 A (基准专题)</span>
                  </span>
                  {topicA && (
                    <button
                      onClick={() => handleToggleFollow(topicA.id, topicA.title)}
                      className={`text-[10px] font-serif font-bold flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                        followedTopicIds.includes(topicA.id)
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <Star className={`w-3 h-3 ${followedTopicIds.includes(topicA.id) ? 'fill-amber-400 text-amber-500' : ''}`} />
                      <span>{followedTopicIds.includes(topicA.id) ? '已关注' : '关注'}</span>
                    </button>
                  )}
                </div>

                <select
                  value={compareTopicAId}
                  onChange={(e) => setCompareTopicAId(e.target.value)}
                  className="w-full text-xs font-serif font-bold bg-white border border-blue-300 rounded-lg p-2 focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                >
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.category})
                    </option>
                  ))}
                </select>

                {/* Horizon A Tabs */}
                <div className="flex items-center space-x-1 text-[11px] pt-1">
                  <span className="text-blue-900 font-mono text-[10px] mr-1">时间跨度：</span>
                  {(['7d', '30d', '90d', 'all'] as TimeHorizon[]).map((hz) => (
                    <button
                      key={hz}
                      onClick={() => setHorizonA(hz)}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-all ${
                        horizonA === hz
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-blue-900 border border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {hz === 'all' ? '全景' : hz.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Selector */}
              <div className="p-4 rounded-xl bg-purple-50/50 border-2 border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-black text-purple-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                    <span>对比方 B (对标专题)</span>
                  </span>
                  {topicB && (
                    <button
                      onClick={() => handleToggleFollow(topicB.id, topicB.title)}
                      className={`text-[10px] font-serif font-bold flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                        followedTopicIds.includes(topicB.id)
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <Star className={`w-3 h-3 ${followedTopicIds.includes(topicB.id) ? 'fill-amber-400 text-amber-500' : ''}`} />
                      <span>{followedTopicIds.includes(topicB.id) ? '已关注' : '关注'}</span>
                    </button>
                  )}
                </div>

                <select
                  value={compareTopicBId}
                  onChange={(e) => setCompareTopicBId(e.target.value)}
                  className="w-full text-xs font-serif font-bold bg-white border border-purple-300 rounded-lg p-2 focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                >
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.category})
                    </option>
                  ))}
                </select>

                {/* Horizon B Tabs */}
                <div className="flex items-center space-x-1 text-[11px] pt-1">
                  <span className="text-purple-900 font-mono text-[10px] mr-1">时间跨度：</span>
                  {(['7d', '30d', '90d', 'all'] as TimeHorizon[]).map((hz) => (
                    <button
                      key={hz}
                      onClick={() => setHorizonB(hz)}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-all ${
                        horizonB === hz
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      {hz === 'all' ? '全景' : hz.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 交叉因果与宏观共振推演盒 (Cross-Topic Resonance & Divergence Box) */}
          {topicA && topicB && (
            <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h4 className="text-xs sm:text-sm font-serif font-black text-stone-950 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>交叉因果与宏观共振推演（Cross-Topic Synergy & Divergence）</span>
                </h4>
                <span className="text-[10px] font-mono text-stone-500">双向传导分析</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-white rounded-lg border border-stone-200 space-y-1">
                  <strong className="text-stone-900 font-serif">🔗 宏观底层共振逻辑：</strong>
                  <p className="text-stone-600 leading-relaxed">
                    「{topicA.title}」与「{topicB.title}」均受到离岸美元降息周期与全球高附加值制造业重构驱动。前者重构了数字世界的算力吞吐天花板，后者则在物理世界为新能源与特种电力供给提供底层硬件支撑。
                  </p>
                </div>
                <div className="p-3.5 bg-white rounded-lg border border-stone-200 space-y-1">
                  <strong className="text-stone-900 font-serif">⚡ 时序先导与滞后关系：</strong>
                  <p className="text-stone-600 leading-relaxed">
                    技术指标显示，算力硬件相关突破平均领先终端制造装车演进 6-9 个月。当「{topicA.title}」率先突破时，将加速向「{topicB.title}」的工业自动化与具身制造传导。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 并排时间线对照栏 (Side-by-Side Dual Timelines) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Timeline: Topic A */}
            {topicA && (
              <div className="bg-white border-2 border-blue-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="border-b border-blue-100 pb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-800 font-mono mb-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>{TIME_HORIZON_LABELS[horizonA].label} ({timelineA.length} 个里程碑)</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-serif font-black text-stone-950">
                      {topicA.title}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-serif font-bold px-2 py-0.5 rounded border shrink-0 ${topicA.stageBadgeClass}`}>
                    {topicA.stageLabel}
                  </span>
                </div>

                <div className="relative pl-6 border-l-2 border-blue-200 space-y-6">
                  {timelineA.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100 group-hover:scale-125 transition-transform" />
                      <div className="text-[11px] font-mono font-bold text-blue-700 mb-0.5">
                        {item.date}
                      </div>
                      <h4 className="text-sm font-serif font-bold text-stone-950 mb-1">
                        {item.milestone}
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed font-sans">
                        {item.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Right Timeline: Topic B */}
            {topicB && (
              <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="border-b border-purple-100 pb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-purple-800 font-mono mb-1">
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      <span>{TIME_HORIZON_LABELS[horizonB].label} ({timelineB.length} 个里程碑)</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-serif font-black text-stone-950">
                      {topicB.title}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-serif font-bold px-2 py-0.5 rounded border shrink-0 ${topicB.stageBadgeClass}`}>
                    {topicB.stageLabel}
                  </span>
                </div>

                <div className="relative pl-6 border-l-2 border-purple-200 space-y-6">
                  {timelineB.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-purple-600 border-2 border-white ring-2 ring-purple-100 group-hover:scale-125 transition-transform" />
                      <div className="text-[11px] font-mono font-bold text-purple-700 mb-0.5">
                        {item.date}
                      </div>
                      <h4 className="text-sm font-serif font-bold text-stone-950 mb-1">
                        {item.milestone}
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed font-sans">
                        {item.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recharts 双专题报道热度时序演变对比图 */}
          <div className="bg-white border-2 border-stone-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="text-xs sm:text-sm font-serif font-bold text-stone-950 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>近 7 日报道热度演化对比走势 (Heat Momentum Comparison)</span>
              </h4>
              <div className="flex items-center space-x-3 text-[10px] font-mono font-bold">
                <span className="text-blue-700 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" /> {topicA?.title.slice(0, 10)}…
                </span>
                <span className="text-purple-700 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-purple-600 rounded-full" /> {topicB?.title.slice(0, 10)}…
                </span>
              </div>
            </div>

            <div className="w-full h-44 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compareHeatChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload && payload.length ? (
                        <div className="bg-stone-950 text-white text-xs font-mono p-2.5 rounded-lg shadow-lg space-y-1">
                          <div className="font-bold text-stone-300 border-b border-stone-800 pb-1">{label}</div>
                          <div className="text-blue-400">方 A 热度: {payload[0]?.value}</div>
                          <div className="text-purple-400">方 B 热度: {payload[1]?.value}</div>
                        </div>
                      ) : null
                    }
                  />
                  <Line type="monotone" dataKey="topicAVal" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="topicBVal" stroke="#9333EA" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* AI 双人深度播客弹窗 (Podcast Modal) */}
      {activeTopic && (
        <TopicPodcastModal
          isOpen={showPodcastModal}
          onClose={() => setShowPodcastModal(false)}
          topic={activeTopic}
        />
      )}
    </div>
  );
};

