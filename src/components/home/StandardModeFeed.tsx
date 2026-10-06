import React, { useState } from 'react';
import { NewsArticle, UserPersona, CognitiveDetailTab, ReadingDensity } from '../../types';
import {
  ArrowRight,
  Bookmark,
  Radio,
  ExternalLink,
  Share2,
  Check,
  Headphones,
  MapPin,
  Flame,
  Clock,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Target,
  FileCheck,
  Zap,
  BookOpen,
  ListFilter,
  Layers,
  Scale,
  Briefcase,
  Rocket,
  Code2,
} from 'lucide-react';

import { formatArticleTime, isStaleArticle } from '../../utils/articleTime';
import { monitorHits } from '../../utils/monitorKeywords';
import { SentimentPair } from '../common/SentimentPair';
import { SECTOR_TAXONOMY, keywordMatches } from '../../utils/sectorTaxonomy';
import { mediaProfile, tierBadge } from '../../utils/mediaAuthority';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { EvidenceBadge } from '../common/EvidenceBadge';
import { getArticleCanonicalCategory, CATEGORY_THEMES } from '../../utils/categoryClassifier';
import type { RadarKeyword } from '../../types';
import type { NewsSkill } from './HomeView';

/** 派生涉事地点 */
function deriveLocation(article: NewsArticle): string {
  if (article.regionMentions && article.regionMentions.length > 0) {
    return article.regionMentions[0].region;
  }
  if (article.impactScope && article.impactScope !== '全球') {
    return article.impactScope;
  }
  const text = `${article.title} ${article.summary || ''}`;
  if (/深圳|广州|北京|上海|杭州|成都|香港|台湾|中国/.test(text)) return '中国';
  if (/美国|硅谷|华盛顿|加州|纽约/.test(text)) return '北美';
  if (/欧盟|德国|法国|英国|伦敦/.test(text)) return '欧洲';
  if (/日本|东京|韩国|首尔|新加坡/.test(text)) return '亚太';
  if (/沙特|阿联酋|中东/.test(text)) return '中东';
  return '全球';
}

/** 计算热度指数 70-98 */
function deriveHeatIndex(article: NewsArticle): number {
  let score = 80;
  if (article.sourceCount && article.sourceCount > 1) {
    score += Math.min(15, (article.sourceCount - 1) * 4);
  }
  const len = (article.title + (article.summary || '')).length;
  if (len > 300) score += 3;
  return Math.min(98, score);
}

/** 提炼反常与转折点 */
function deriveCounterIntuitive(article: NewsArticle): string | null {
  if (article.coreLogic?.counterIntuitive) {
    return article.coreLogic.counterIntuitive;
  }
  const microLayer = article.spectrumLayers?.find((l) => l.layer === 'micro_signal');
  if (microLayer?.headline && microLayer.headline.length > 8) {
    return microLayer.headline;
  }
  if (article.aiInterpretation?.limits) {
    return `关键边界：${article.aiInterpretation.limits}`;
  }
  if (article.subtitle && article.subtitle.length > 10 && !article.subtitle.includes(article.title)) {
    return article.subtitle;
  }
  return null;
}

interface StandardModeFeedProps {
  articles: NewsArticle[];
  bookmarkedIds: string[];
  followedTags: string[];
  selectedPersona: UserPersona;
  onSelectArticle: (article: NewsArticle) => void;
  onSelectArticleWithTab?: (article: NewsArticle, tab?: CognitiveDetailTab) => void;
  onToggleBookmark: (articleId: string) => void;
  onToggleFollowTag: (tag: string) => void;
  radarKeywords?: RadarKeyword[];
  onRemoveRadar?: (id: string) => void;
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  contextArticles?: NewsArticle[];
  onOpenShareCard?: (article: NewsArticle) => void;
  onOpenAudioBriefing?: () => void;
  onOpenTermExplain?: (term: string) => void;
  onOpenAnalyze?: () => void;
  readingDensity?: ReadingDensity;
}

const renderPersonaIcon = (iconName: string) => {
  switch (iconName) {
    case 'TrendingUp': return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    case 'Briefcase': return <Briefcase className="w-4 h-4 text-amber-600" />;
    case 'Rocket': return <Rocket className="w-4 h-4 text-purple-600" />;
    case 'Layers': return <Layers className="w-4 h-4 text-blue-600" />;
    case 'Code2': return <Code2 className="w-4 h-4 text-indigo-600" />;
    case 'Target': return <Target className="w-4 h-4 text-rose-600" />;
    default: return <Briefcase className="w-4 h-4 text-amber-600" />;
  }
};

export const StandardModeFeed: React.FC<StandardModeFeedProps> = ({
  articles,
  bookmarkedIds,
  followedTags,
  selectedPersona,
  onSelectArticle,
  onSelectArticleWithTab,
  onToggleBookmark,
  onToggleFollowTag,
  radarKeywords = [],
  onRemoveRadar,
  onRunSkill,
  contextArticles,
  onOpenShareCard,
  onOpenAudioBriefing,
  onOpenTermExplain,
  onOpenAnalyze,
  readingDensity = 'comfortable',
}) => {
  const compact = readingDensity === 'compact';
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [trackToastId, setTrackToastId] = useState<string | null>(null);

  // 区分前5条高密卡片与后续紧凑列表
  const featuredArticles = articles.slice(0, 5);
  const remainingArticles = articles.slice(5);

  const toggleSummary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSummaries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenTab = (article: NewsArticle, tab: CognitiveDetailTab) => {
    if (onSelectArticleWithTab) {
      onSelectArticleWithTab(article, tab);
    } else {
      onSelectArticle(article);
    }
  };

  const handleTrackEvent = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    onToggleBookmark(articleId);
    setTrackToastId(articleId);
    setTimeout(() => setTrackToastId(null), 2000);
  };

  const handleCopyLink = (e: React.MouseEvent, article: NewsArticle) => {
    e.stopPropagation();
    const url = article.sourceUrl || window.location.href;
    const textToCopy = `【见微情报】${article.title}\n💡 ${article.oneSentenceVerdict || article.summary || ''}\n🔗 ${url}`;
    navigator.clipboard?.writeText(textToCopy).then(() => {
      setCopiedId(article.id);
      setTimeout(() => setCopiedId(null), 1800);
    }).catch(() => {});
  };

  if (articles.length === 0) {
    return (
      <div className="bg-white border border-stone-300 rounded-xl p-10 text-center font-sans space-y-4">
        <p className="text-stone-600 text-sm leading-relaxed max-w-md mx-auto">
          当前筛选下暂无情报。可换分类、清雷达词，或直接贴链接 / 贴正文开始解读。
        </p>
        {onOpenAnalyze && (
          <button
            type="button"
            onClick={onOpenAnalyze}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E3120B] hover:bg-red-700 text-white text-xs font-serif font-bold rounded-xl transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            读懂新闻
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* ── Section 1: 前 5 条核心大报卡片 (Top 5 Featured Cards) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-2 border-stone-900 pb-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#E3120B] text-white text-xs font-serif font-bold">
              ★
            </span>
            <h3 className="font-serif font-black text-base text-stone-950 tracking-wide">
              今日重点洞察 · 前五大头条情报卡
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-serif">
            已精炼高密事实、反常细节与切身影响
          </span>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-2 ${compact ? 'gap-3' : 'gap-5'}`}>
          {featuredArticles.map((article, idx) => {
            const isBookmarked = bookmarkedIds.includes(article.id);
            const hits = monitorHits(article, radarKeywords);
            const isSummaryExpanded = Boolean(expandedSummaries[article.id]);
            const location = deriveLocation(article);
            const heatIndex = deriveHeatIndex(article);
            const counterIntuitive = deriveCounterIntuitive(article);
            const entities = (article.entityMentions || []).map((e) => e.name);

            // 获取针对当前用户身份的切身影响
            const personaImpact = (article.personaImpacts || []).find((p) => p.personaId === selectedPersona.id);
            const personaImpactText = personaImpact?.coreImpact
              || (article.dehydratedItems?.impactHighlights?.[0] ? `对${selectedPersona.name}：${article.dehydratedItems.impactHighlights[0]}` : null);

            // 提炼三栏轻量解读
            const aiCore = article.aiInterpretation?.core
              || article.dehydratedItems?.keyAction
              || article.oneSentenceVerdict
              || article.summary;

            const trendText = typeof article.trendForecastText === 'string'
              ? article.trendForecastText
              : (article.trendForecastText as any)?.shortTerm
              || article.rippleEffect?.stages?.[0]?.title
              || null;

            const riskText = typeof article.riskReviewText === 'string'
              ? article.riskReviewText
              : (article.riskReviewText as any)?.mainRisk
              || personaImpact?.threatRisk
              || null;

            // 媒体信息
            const prof = mediaProfile(article.sourceName, article.sourceUrl);
            const badge = prof ? tierBadge(prof.tier) : null;
            const mediaDisplayName = prof?.displayName
              || article.sourceName?.replace(/^www\./, '').replace(/\.(com|cn|net|org|gov)($|\.)/, '')
              || '来源未标明';

            return (
              <article
                key={article.id}
                className={`bg-white border border-stone-300/90 rounded-2xl shadow-xs hover:border-stone-800 hover:shadow-md transition-all flex flex-col justify-between relative ${compact ? 'p-3 space-y-2' : 'p-5 space-y-4'}`}
              >
                {/* 1. 顶部多维元数据栏 */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-stone-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-stone-600">
                    <span className="inline-flex items-center gap-1 font-serif text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
                      <MapPin className="w-3 h-3 text-[#E3120B]" />
                      {location}
                    </span>

                    {/* 赛道标识徽章（确保科技前沿、全球财经等界限分明） */}
                    {(() => {
                      const canonicalCat = getArticleCanonicalCategory(article);
                      const catTheme = CATEGORY_THEMES[canonicalCat];
                      return (
                        <span className={`inline-flex items-center gap-1 font-serif px-2 py-0.5 rounded-md border text-[11px] font-bold ${catTheme.badgeCls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${catTheme.dotCls}`} />
                          {canonicalCat}
                        </span>
                      );
                    })()}

                    <span className="inline-flex items-center gap-1 font-serif font-bold text-stone-900 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200 text-[11px]">
                      {badge && (
                        <span className={`font-mono text-[9px] px-1 rounded ${badge.cls}`}>{badge.label}</span>
                      )}
                      <span>{mediaDisplayName}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-stone-500 font-mono text-[11px]" title={article.publishedAt || article.date}>
                      <Clock className="w-3 h-3 text-stone-400" />
                      {formatArticleTime(article)}
                    </span>

                    <EvidenceBadge article={article} corpus={contextArticles} compact />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">
                      <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                      {heatIndex}
                    </span>

                    {onOpenAudioBriefing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAudioBriefing();
                        }}
                        className="p-1 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded transition-colors"
                        title="🎧 播放 30 秒语音快报"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenShareCard) onOpenShareCard(article);
                        else handleCopyLink(e, article);
                      }}
                      className="p-1 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded transition-colors"
                      title="📤 生成金句分享便签"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <SentimentPair title={article.title} summary={article.summary} />

                {/* 2. 标题区 */}
                <div className="cursor-pointer" onClick={() => onSelectArticle(article)}>
                  <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950 hover:text-[#E3120B] transition-colors leading-snug">
                    <KeyTermHighlight text={article.title} entities={entities} onOpenTermExplain={onOpenTermExplain} />
                  </h2>
                </div>

                {/* 3. 💡 见微一句话定性判词 */}
                <div className="bg-[#FAF7F2] border-l-3 border-[#E3120B] p-3 rounded-r-xl">
                  <div className="flex items-center gap-1.5 text-[11px] font-serif font-bold text-[#E3120B] uppercase tracking-wider mb-1">
                    <Zap className="w-3 h-3 fill-[#E3120B]" />
                    <span>见微 · 一句话定性</span>
                  </div>
                  <p className="text-xs sm:text-sm font-serif font-bold text-stone-900 leading-relaxed">
                    “{article.oneSentenceVerdict || article.summary || article.title}”
                  </p>
                </div>

                {/* 4. 🔍 隐秘转折 / 反常细节 */}
                {counterIntuitive && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-950 flex items-start gap-2">
                    <span className="shrink-0 text-amber-700 font-serif font-bold text-[11px] bg-amber-200/60 px-1.5 py-0.2 rounded">
                      🔍 隐秘转折
                    </span>
                    <p className="font-sans leading-relaxed text-stone-800">
                      <KeyTermHighlight text={counterIntuitive} entities={entities} onOpenTermExplain={onOpenTermExplain} />
                    </p>
                  </div>
                )}

                {/* 5. ▶ 可折叠事实摘要区 */}
                {article.summary && (
                  <div className="border border-stone-200 rounded-xl bg-stone-50/50 overflow-hidden transition-all text-xs">
                    <button
                      onClick={(e) => toggleSummary(article.id, e)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between text-stone-600 hover:text-stone-950 hover:bg-stone-100/70 transition-colors font-serif font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                        <span>{isSummaryExpanded ? '收起事实背景摘要' : '展开事实背景摘要 (150字事实脉络)'}</span>
                      </span>
                      {isSummaryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {isSummaryExpanded && (
                      <div className="p-3.5 pt-1 text-stone-700 font-serif leading-relaxed border-t border-stone-200 bg-white">
                        <KeyTermHighlight text={article.summary} entities={entities} onOpenTermExplain={onOpenTermExplain} />
                        {article.sourceUrl && (
                          <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] font-sans">
                            <span className="text-stone-400">原文出处链接：</span>
                            <a
                              href={article.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#0284C7] hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              <span>查看原网报道</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. 三栏轻量分析胶囊 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center gap-1 text-sky-900 font-serif font-bold text-[11px]">
                      <Sparkles className="w-3 h-3 text-sky-600" />
                      <span>AI解读 (动机)</span>
                    </div>
                    <p className="text-stone-700 leading-snug line-clamp-3 font-sans text-[11px]">
                      {aiCore}
                    </p>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center gap-1 text-emerald-900 font-serif font-bold text-[11px]">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      <span>发展趋势</span>
                    </div>
                    <p className="text-stone-700 leading-snug line-clamp-3 font-sans text-[11px]">
                      {trendText || '尚未生成趋势摘要。配置有效 API Key 后可生成（不使用模板补全）。'}
                    </p>
                  </div>

                  <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center gap-1 text-rose-900 font-serif font-bold text-[11px]">
                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                      <span>潜在风险</span>
                    </div>
                    <p className="text-stone-700 leading-snug line-clamp-3 font-sans text-[11px]">
                      {riskText || '尚未生成风险摘要。配置有效 API Key 后可生成（不使用模板补全）。'}
                    </p>
                  </div>
                </div>

                {/* 7. 各方立场：无独立立场样本时不展示伪比例条 */}
                <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-xl p-3 text-xs space-y-2 font-sans">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-serif font-bold text-stone-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-stone-600" />
                      <span>多方立场温差</span>
                    </span>
                    <span className="text-stone-400 font-mono text-[10px]">立场比例未测算 · 不展示伪百分比</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    当前卡片没有独立立场标注样本，因此不绘制乐观/观望/承压比例条，也不编造官方、智库、同业话术。
                  </p>
                </div>


                {/* 8. 切身影响胶囊 */}
                {personaImpactText && (
                  <div className="bg-amber-100/50 border border-amber-300/80 rounded-xl p-2.5 text-xs text-amber-950 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{renderPersonaIcon(selectedPersona.avatarIcon)}</span>
                      <p className="font-sans font-medium truncate text-amber-900">
                        <strong className="font-serif text-amber-950 font-bold">{selectedPersona.name}切身影响：</strong>
                        {personaImpactText}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTab(article, 'relevance_identity');
                      }}
                      className="shrink-0 text-[11px] font-serif font-bold text-amber-900 hover:text-amber-950 underline decoration-amber-400 cursor-pointer"
                    >
                      看行动清单 ➔
                    </button>
                  </div>
                )}

                {/* 9. 底部三大核心行动按键 */}
                <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTab(article, 'forecast_arena');
                      }}
                      className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-serif font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="立项预测：与 AI 一起判断未来走向并立账"
                    >
                      <Target className="w-3.5 h-3.5 text-purple-700" />
                      <span>走势预测</span>
                    </button>

                    <button
                      onClick={(e) => handleTrackEvent(e, article.id)}
                      className={`flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg border text-xs font-serif font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        isBookmarked
                          ? 'bg-amber-100 border-amber-400 text-amber-900'
                          : 'border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                      title={isBookmarked ? '已在追踪' : '将本事件加入持续追踪档案'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-600 text-amber-600' : 'text-stone-500'}`} />
                      <span>{isBookmarked ? '已在跟踪' : '持续跟踪'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTab(article, 'relevance_identity');
                      }}
                      className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-serif font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="查看针对您身份的角色行动建议清单"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>切身决策</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onSelectArticle(article)}
                    className="px-3.5 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    title="进入四篇章完整深度认知剖析 (耗时约 3 分钟)"
                  >
                    <span>深度剖析 · 约 3 分钟</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {trackToastId === article.id && (
                  <div className="absolute top-2 right-2 bg-stone-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-serif flex items-center gap-1.5 z-10 animate-fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isBookmarked ? '已加入持续跟踪档案' : '已取消跟踪'}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: 其余情报紧凑列表 (Remaining Articles Compact List) ── */}
      {remainingArticles.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2">
            <div className="flex items-center space-x-2">
              <ListFilter className="w-4 h-4 text-stone-700" />
              <h3 className="font-serif font-bold text-sm text-stone-900 tracking-wide">
                更多即时情报流 · 紧凑列表 ({remainingArticles.length} 篇)
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-serif">
              点击条目即可查看详情与快速行动
            </span>
          </div>

          <div className="bg-white border border-stone-300 rounded-2xl divide-y divide-stone-200 overflow-hidden shadow-xs">
            {remainingArticles.map((article) => {
              const isBookmarked = bookmarkedIds.includes(article.id);
              const location = deriveLocation(article);
              const heatIndex = deriveHeatIndex(article);
              const entities = (article.entityMentions || []).map((e) => e.name);

              const prof = mediaProfile(article.sourceName, article.sourceUrl);
              const badge = prof ? tierBadge(prof.tier) : null;
              const mediaDisplayName = prof?.displayName
                || article.sourceName?.replace(/^www\./, '').replace(/\.(com|cn|net|org|gov)($|\.)/, '')
                || '信源';

              return (
                <div
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="p-4 sm:p-4.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* 左侧：元数据 + 标题 + 一句话摘要 */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* 元数据行 */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                      <span className="inline-flex items-center gap-0.5 text-stone-700 font-serif bg-stone-100 px-1.5 py-0.2 rounded">
                        <MapPin className="w-2.5 h-2.5 text-[#E3120B]" />
                        {location}
                      </span>
                      {/* 赛道标识徽章 */}
                      {(() => {
                        const canonicalCat = getArticleCanonicalCategory(article);
                        const catTheme = CATEGORY_THEMES[canonicalCat];
                        return (
                          <span className={`font-serif text-[10px] font-bold px-1.5 py-0.2 rounded border ${catTheme.badgeCls}`}>
                            {canonicalCat}
                          </span>
                        );
                      })()}
                      <span className="font-serif font-medium text-stone-800 bg-stone-50 px-1.5 py-0.2 rounded border border-stone-200">
                        {badge && <span className={`font-mono text-[9px] mr-1 ${badge.cls}`}>{badge.label}</span>}
                        {mediaDisplayName}
                      </span>
                      <span className="font-mono text-stone-500">
                        {formatArticleTime(article)}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-amber-800 font-mono">
                        <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                        {heatIndex}
                      </span>
                      <SentimentPair title={article.title} summary={article.summary} compact />
                      <EvidenceBadge article={article} corpus={contextArticles} compact />
                    </div>

                    {/* 标题 */}
                    <h4 className="text-sm sm:text-base font-serif font-bold text-stone-900 group-hover:text-[#E3120B] transition-colors leading-snug line-clamp-2">
                      <KeyTermHighlight text={article.title} entities={entities} onOpenTermExplain={onOpenTermExplain} />
                    </h4>

                    {/* 一句话定性 / 副标题 */}
                    {(article.oneSentenceVerdict || article.subtitle || article.summary) && (
                      <p className="text-xs text-stone-600 font-serif line-clamp-1">
                        💡 {article.oneSentenceVerdict || article.subtitle || article.summary}
                      </p>
                    )}
                  </div>

                  {/* 右侧操作区 */}
                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTab(article, 'forecast_arena');
                      }}
                      className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-serif font-bold transition-colors cursor-pointer"
                      title="走势预测"
                    >
                      <Target className="w-3 h-3 inline mr-1 text-purple-700" />
                      预测
                    </button>

                    <button
                      onClick={(e) => handleTrackEvent(e, article.id)}
                      className={`p-1 rounded border text-[11px] font-serif transition-colors cursor-pointer ${
                        isBookmarked ? 'bg-amber-100 border-amber-400 text-amber-900' : 'border-stone-200 hover:bg-stone-100 text-stone-600'
                      }`}
                      title={isBookmarked ? '已在跟踪' : '加入跟踪'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-600 text-amber-600' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTab(article, 'relevance_identity');
                      }}
                      className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-[11px] font-serif font-bold transition-colors cursor-pointer"
                      title="切身决策"
                    >
                      <FileCheck className="w-3 h-3 inline mr-1 text-amber-700" />
                      决策
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectArticle(article);
                      }}
                      className="p-1 rounded hover:bg-stone-900 hover:text-white text-stone-700 border border-stone-300 transition-all cursor-pointer"
                      title="打开深度剖析"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
