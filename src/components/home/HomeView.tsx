import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { 
  NewsArticle, 
  HomeReadingMode, 
  UserPersona, 
  RadarKeyword,
  ReadingDensity,
} from '../../types';
import { HomeHeroStatus } from './HomeHeroStatus';
import { TrendComparisonCard } from './TrendComparisonCard';
import { StandardModeFeed } from './StandardModeFeed';
import { UserCheck, ShieldCheck, Bookmark, Radio, Target } from 'lucide-react';
import { corpusDerived, deriveFromList } from '../../utils/corpusMetrics';
import { articleSortTime, parseArticleDate } from '../../utils/articleTime';
import { detectBreaking } from '../../utils/todayBrief';
import { NEWS_INTEREST_GROUPS, SECTOR_TAXONOMY, keywordMatches, matchesNewsInterestGroups } from '../../utils/sectorTaxonomy';
import { monitorHits } from '../../utils/monitorKeywords';
import { buildEvidenceProfile } from '../../utils/evidenceProfile';
import { FeatureSummary } from '../common/FeatureSummary';
import { getArticleCanonicalCategory, CATEGORY_THEMES } from '../../utils/categoryClassifier';

const TongsuModeFeed = lazy(() =>
  import('./TongsuModeFeed').then((module) => ({ default: module.TongsuModeFeed }))
);
const DehydratedModeFeed = lazy(() =>
  import('./DehydratedModeFeed').then((module) => ({ default: module.DehydratedModeFeed }))
);

export type NewsSkill =
  | 'plain'
  | 'dehydrate'
  | 'interpret'
  | 'sevenw'
  | 'verdict'
  | 'trend'
  | 'risk'
  | 'timeline'
  | 'stakeholders'
  | 'corelogic'
  | 'debate'
  | 'relatednews'
  | 'enrich';

interface HomeViewProps {
  articles: NewsArticle[];
  readingMode: HomeReadingMode;
  onSelectReadingMode: (mode: HomeReadingMode) => void;
  selectedPersona: UserPersona;
  radarKeywords: RadarKeyword[];
  bookmarkedIds: string[];
  followedTags: string[];
  /** 用户设置中的兴趣领域；非空时首页默认进入「我的领域」。 */
  interestGroups: string[];
  onSelectArticle: (article: NewsArticle) => void;
  onSelectArticleWithTab?: (article: NewsArticle, tab?: import('../../types').CognitiveDetailTab) => void;
  onToggleBookmark: (articleId: string) => void;
  onToggleFollowTag: (tag: string) => void;
  /** 技能型单项生成：sevenw=7W事件模型 / trend=趋势情景 / risk=风险审稿；成功返回更新后文章，失败返回 null */
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  onRemoveRadar?: (id: string) => void;
  onOpenAudioBriefing: () => void;
  onOpenAddRadar: () => void;
  onOpenTermExplain: (term: string) => void;
  onOpenSettings?: () => void;
  onOpenShareCard?: (article: NewsArticle) => void;
  readingDensity?: ReadingDensity;
}

export const HomeView: React.FC<HomeViewProps> = ({
  articles,
  readingMode,
  onSelectReadingMode,
  selectedPersona,
  radarKeywords,
  bookmarkedIds,
  followedTags,
  interestGroups,
  onSelectArticle,
  onSelectArticleWithTab,
  onToggleBookmark,
  onToggleFollowTag,
  onRunSkill,
  onRemoveRadar,
  onOpenAudioBriefing,
  onOpenAddRadar,
  onOpenTermExplain,
  onOpenSettings,
  onOpenShareCard,
  readingDensity = 'comfortable',
}) => {

  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    interestGroups.length > 0 ? '我的领域' : '全部'
  );
  const [selectedRadarFilter, setSelectedRadarFilter] = useState<string | null>(null);
  // 注：每条当日新闻都可深度解读（点开详情即由 /api/enrich 生成），故不再提供
  // “深度解读/外部信源”筛选口径——解析状态用卡片徽标体现（见 StandardModeFeed）。
  // 分页：每次展示 20 条，底部“再看 20 条”继续
  const [visibleCount, setVisibleCount] = useState(20);
  const PAGE_SIZE = 20;
  const interestSignature = interestGroups.join('|');

  useEffect(() => {
    setSelectedCategory((current) => {
      if (interestGroups.length > 0) {
        return current === '全部' || current === '外部信源' ? '我的领域' : current;
      }
      return current === '我的领域' ? '全部' : current;
    });
  }, [interestSignature]);

  // —— 今日简报数据：今日(本地日期)真实发布条目 → 情绪/热词/突发/赛道（见 utils/todayBrief.ts）——
  const { todayList, dToday, d30, scope, breaking, sectorHeat, dayStartTs } = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const list = articles.filter((a) => {
      if (!a.isExternal || !a.publishedAt) return false;
      const ts = parseArticleDate(a.publishedAt);
      return ts !== null && ts >= dayStart;
    });
    const today = deriveFromList(list);
    const useToday = today.scanned >= 20;
    const fallback = useToday ? today : corpusDerived(articles, 30);
    // 今日赛道热度（统一替代“热词+赛道”两行）：每个赛道 = 命中文章数 + 命中 top 词（真实派生）
    const sectorAgg = new Map<string, { count: number; words: Map<string, number> }>();
    for (const a of list) {
      const text = `${a.title || ''} ${a.summary || ''}`.toLowerCase();
      for (const sec of SECTOR_TAXONOMY) {
        const hits = sec.keywords.filter((kw) => kw.trim().length >= 2 && keywordMatches(text, kw));
        if (hits.length === 0) continue;
        const e = sectorAgg.get(sec.id) || { count: 0, words: new Map<string, number>() };
        e.count += 1;
        for (const kw of hits) {
          const low = kw.toLowerCase();
          const canonical = SECTOR_TAXONOMY.flatMap((s) => s.keywords).find((k) => k.toLowerCase() === low) || kw;
          e.words.set(canonical, (e.words.get(canonical) || 0) + 1);
        }
        sectorAgg.set(sec.id, e);
      }
    }
    const heat = [...sectorAgg.entries()]
      .map(([id, e]) => {
        const def = SECTOR_TAXONOMY.find((s) => s.id === id);
        const topWords = [...e.words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
        return { id, name: def?.name || id, count: e.count, topWords };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return {
      todayList: list,
      dToday: today,
      d30: fallback,
      scope: (useToday ? 'today' : '30d') as 'today' | '30d',
      breaking: detectBreaking(list),
      sectorHeat: heat,
      dayStartTs: dayStart,
    };
  }, [articles]);

  const interestNames = useMemo(
    () => NEWS_INTEREST_GROUPS.filter((group) => interestGroups.includes(group.id)).map((group) => group.name),
    [interestSignature]
  );

  const categories = useMemo(() => {
    const topic = [
      ...(interestGroups.length > 0 ? ['我的领域'] : []),
      '全部',
      '关注',
      '影响我',
      'AI 前沿',
      '科技前沿',
      '全球财经',
      '产业纵深',
    ];
    // 有监控词时，在“关注/影响我”附近插入「监控中」筛选
    if (radarKeywords.length > 0) {
      const idx = topic.indexOf('影响我');
      if (idx >= 0) topic.splice(idx, 0, '监控中');
    }
    return {
      topic,
      evidence: ['多源印证'],
    };
  }, [interestSignature, radarKeywords]);

  // —— 当日信息流池：首页只展示“今日（本地日期）真实发布”的外部新闻；
  //     站内/投递文章若其发布日期是今天也计入。历史旧文不再混入首页信息流。
  const todayFeed = useMemo(() => {
    const nextDay = dayStartTs + 24 * 3600 * 1000;
    return articles.filter((a) => {
      // 1) 有真实发布时间的外部条目：按今日判定
      if (a.publishedAt) {
        const ts = parseArticleDate(a.publishedAt);
        if (ts !== null) return ts >= dayStartTs && ts < nextDay;
      }
      // 2) 无 publishedAt 的站内/投递文章：按 sourceDate/date（如用户今天 AI 投递）
      const st = parseArticleDate(a.sourceDate) ?? parseArticleDate(a.date);
      return st !== null && st >= dayStartTs && st < nextDay;
    });
  }, [articles, dayStartTs]);

  // 近 3 日信息流池 (72 小时范围)
  const threeDayFeed = useMemo(() => {
    const threeDaysAgo = dayStartTs - 2 * 24 * 3600 * 1000;
    const nextDay = dayStartTs + 24 * 3600 * 1000;
    return articles.filter((a) => {
      const ts =
        parseArticleDate(a.publishedAt || '') ??
        parseArticleDate(a.sourceDate || '') ??
        parseArticleDate(a.date || '') ??
        0;
      return ts >= threeDaysAgo && ts < nextDay;
    });
  }, [articles, dayStartTs]);

  // 时间窗口选择（今日 / 近 3 日 / 全部）
  const [timeHorizon, setTimeHorizon] = useState<'today' | '3d' | 'all'>('today');

  // 当日静默检测：今日确实无任何新情报
  const isQuietDay = todayFeed.length === 0;

  // 基础底池：按时间窗口选取；若今日无条目，智能切换近 3 日或全部，避免空白
  const basePool = useMemo(() => {
    if (timeHorizon === 'today') {
      if (isQuietDay) {
        return threeDayFeed.length > 0 ? threeDayFeed : articles;
      }
      return todayFeed;
    }
    if (timeHorizon === '3d') {
      return threeDayFeed.length > 0 ? threeDayFeed : articles;
    }
    return articles;
  }, [timeHorizon, isQuietDay, todayFeed, threeDayFeed, articles]);

  // 当前底池命中监控词的条数（分类 pill 徽章）
  const monitorTodayCount = useMemo(
    () => basePool.filter((a) => monitorHits(a, radarKeywords).length > 0).length,
    [basePool, radarKeywords]
  );

  // Filtered list（按底池 → 分类/热词筛选 → 按真实时间倒序）
  const filteredArticles = useMemo(() => {
    return basePool
      .filter((article) => {
        // If a radar keyword is clicked in widget
        if (selectedRadarFilter) {
          const q = selectedRadarFilter.toLowerCase();
          const matchesRadar =
            article.title.toLowerCase().includes(q) ||
            article.tags.some((t) => t.toLowerCase().includes(q)) ||
            article.summary.toLowerCase().includes(q);
          if (!matchesRadar) return false;
        }

        if (selectedCategory === '监控中') {
          // 只看命中“我的监控词”的新闻
          return monitorHits(article, radarKeywords).length > 0;
        }
        if (selectedCategory === '我的领域') {
          return matchesNewsInterestGroups(article, interestGroups);
        }
        if (selectedCategory === '全部') return true;
        if (selectedCategory === '多源印证') {
          return buildEvidenceProfile(article, articles).status === 'corroborated';
        }
        if (selectedCategory === '关注') {
          if (bookmarkedIds.includes(article.id)) return true;
          const fields = [article.category, ...(article.tags || [])]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());
          return followedTags.some((tag) => {
            const normalized = tag.trim().toLowerCase();
            if (!normalized) return false;
            return fields.some((field) => field === normalized || field.includes(normalized) || normalized.includes(field));
          });
        }
        if (selectedCategory === '影响我') {
          return article.personaImpacts?.some((p) => p.personaId === selectedPersona.id);
        }

        // 核心赛道规范化互斥归类：彻底消除「科技前沿」与「全球财经」的模糊重叠与串台
        if (
          selectedCategory === 'AI 前沿' ||
          selectedCategory === '科技前沿' ||
          selectedCategory === '全球财经' ||
          selectedCategory === '产业纵深'
        ) {
          return getArticleCanonicalCategory(article) === selectedCategory;
        }

        // 基础精确标签/分类匹配（兼容外部动态标签）
        if (article.category === selectedCategory || (article.tags || []).includes(selectedCategory)) {
          return true;
        }

        return false;
      })
      .slice()
      .sort((a, b) => articleSortTime(b) - articleSortTime(a));
  }, [basePool, articles, selectedCategory, selectedRadarFilter, followedTags, bookmarkedIds, selectedPersona, radarKeywords, interestGroups]);

  // 分类/关键词/时间跨度变化时，分页回到第一页
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, selectedRadarFilter, radarKeywords, timeHorizon]);

  // 分页后的列表（三模式共用，底部“再看 20 条”）
  const displayFeed = useMemo(() => filteredArticles.slice(0, visibleCount), [filteredArticles, visibleCount]);

  const renderFilterButton = (cat: string) => {
    const isSelected = selectedCategory === cat;
    const isAffectMe = cat === '影响我';
    const isMonitor = cat === '监控中';
    const isEvidence = cat === '多源印证';

    return (
      <button
        key={cat}
        onClick={() => setSelectedCategory(cat)}
        title={
          isMonitor
            ? `只看命中我监控词的今日新闻（共 ${monitorTodayCount} 条）`
            : isEvidence
              ? '证据筛选：仅展示多独立信源交叉印证的情报（多来源不等于事实为真）'
              : cat in CATEGORY_THEMES
                ? `${cat}：${CATEGORY_THEMES[cat as keyof typeof CATEGORY_THEMES].desc}`
                : cat === '关注'
                  ? '关注筛选：手动订阅的标签与已收藏文章'
                  : cat === '我的领域'
                    ? `按设置中的兴趣领域筛选：${interestNames.join('、') || '未设置'}`
                    : undefined
        }
        className={`px-3 py-1.5 rounded-xl text-xs font-serif whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs ${
          isSelected
            ? isEvidence
              ? 'bg-emerald-900 text-white font-bold border border-emerald-950 shadow-xs'
              : 'bg-stone-900 text-white font-bold border border-stone-950 shadow-xs'
            : isEvidence
              ? 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 hover:border-emerald-300 font-medium'
              : isAffectMe
                ? 'bg-white hover:bg-red-50 text-stone-800 border border-stone-200 hover:border-red-200 font-medium'
                : 'bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-950 border border-stone-200 hover:border-stone-300'
        }`}
      >
        {isAffectMe && <UserCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#E3120B]'}`} />}
        {isMonitor && <Radio className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-600'}`} />}
        {isEvidence && <ShieldCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />}
        {cat === '关注' && <Bookmark className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-stone-500'}`} />}
        {cat === '我的领域' && <Target className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#0284C7]'}`} />}

        <span>{isMonitor ? '监控中' : cat}</span>

        {isMonitor && (
          <span
            className={`text-[10px] font-mono px-1 rounded ${
              isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {monitorTodayCount}
          </span>
        )}

        {isAffectMe && (
          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
            isSelected ? 'bg-red-500 text-white' : 'bg-red-100 text-[#E3120B]'
          }`}>
            {selectedPersona.name.slice(0, 2)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans ${readingDensity === 'compact' ? 'py-3' : 'py-6'}`}>
      {/* 1. Hero Bar —— 今日简报（词典统计：情绪/热词/突发，口径透明可复核） */}
      <HomeHeroStatus
        stats={{
          total: articles.length,
          todayCount: todayList.length,
          scanned: (scope === 'today' ? dToday : d30).scanned,
          positive: (scope === 'today' ? dToday : d30).positive,
          negative: (scope === 'today' ? dToday : d30).negative,
          neutral: (scope === 'today' ? dToday : d30).neutral,
          mixed: (scope === 'today' ? dToday : d30).mixed,
          net: (scope === 'today' ? dToday : d30).net,
          ratio: (scope === 'today' ? dToday : d30).optimismRatio,
          hasLive: articles.length > 0,
          scope,
        }}
        breaking={breaking}
        sectorHeat={sectorHeat}
        onOpenBreaking={(art) => {
          const matched = articles.find((a) => a.id === art.id);
          if (matched) onSelectArticle(matched);
          else onSelectArticle(art);
        }}
        onSelectSector={(sectorName) => {
          // 映射到分类选择，若为 AI 与软件 则对应 AI 前沿，半导体与硬件 对应 科技前沿，宏观与金融 对应 全球财经，其他对应 产业纵深
          if (sectorName.includes('AI') || sectorName.includes('软件')) {
            setSelectedCategory('AI 前沿');
          } else if (sectorName.includes('半导体') || sectorName.includes('硬件') || sectorName.includes('数码')) {
            setSelectedCategory('科技前沿');
          } else if (sectorName.includes('宏观') || sectorName.includes('金融')) {
            setSelectedCategory('全球财经');
          } else {
            setSelectedCategory('产业纵深');
          }
        }}
      />

      {/* 2. 跨语料趋势对比卡片（词频演变 + AI 趋势演变纵览） */}
      <div className="mt-6 mb-6">
        <TrendComparisonCard
          articles={articles}
          onSelectKeyword={(kw) => {
            setSelectedRadarFilter(kw);
            window.scrollTo({ top: 400, behavior: 'smooth' });
          }}
        />
      </div>

      {/* 3. Main Content Grid（监控已并入分类，feed 全宽） */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Category Filter + Feed (全宽) */}
        <div className="lg:col-span-12 space-y-6">
          {/* 工具条：时间窗口切换 + 当日条数说明 + 阅读模式 + 🎧 听简报 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* 时间范围切换器 (今日 / 近3日 / 全部) */}
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  onClick={() => {
                    setTimeHorizon('today');
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                    timeHorizon === 'today' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                  title="聚焦今日发布的条目"
                >
                  今日 {todayFeed.length > 0 ? `· ${todayFeed.length}` : '(0)'}
                </button>
                <button
                  onClick={() => {
                    setTimeHorizon('3d');
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                    timeHorizon === '3d' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                  title="查看近 3 日发布的情报"
                >
                  近3日 · {threeDayFeed.length}
                </button>
                <button
                  onClick={() => {
                    setTimeHorizon('all');
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                    timeHorizon === 'all' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                  title="查看语料库全部条目"
                >
                  全部 · {articles.length}
                </button>
              </div>

              {/* 静默过渡说明 */}
              {isQuietDay && timeHorizon === 'today' && (
                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-serif text-[11px]">
                  今日暂无新情报，已呈现近 3 日精选
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {/* 阅读模式（标准/通俗/脱水） */}
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                {(
                  [
                    { id: 'standard', label: '标准', title: '完整信息·无噪解读' },
                    { id: 'tongsu', label: '通俗', title: '大白话·比喻·零门槛（小白模式）' },
                    { id: 'dehydrated', label: '脱水', title: '30 秒要点·纯干货' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    title={m.title}
                    onClick={() => onSelectReadingMode(m.id)}
                    className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                      readingMode === m.id ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                onClick={onOpenAudioBriefing}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-serif font-bold rounded-lg border border-amber-600/50 transition-all"
                title="听今日简报（AI 语音，3 分钟晨间解读）"
              >
                🎧 听简报
              </button>
            </div>
          </div>

          {/* 精炼统一的分类与证据核验工具栏 */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 border-b border-stone-200">
            {categories.topic.map(renderFilterButton)}
            <div className="h-5 w-px bg-stone-300 mx-1 shrink-0" />
            {categories.evidence.map(renderFilterButton)}
          </div>

          {selectedCategory === '我的领域' && (
            <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-950 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-[#0284C7] shrink-0" />
                <span>
                  当前按兴趣领域筛选：<strong>{interestNames.join('、') || '未设置'}</strong>。
                  领域由赛道关键词匹配，新闻可同时属于多个领域。
                </span>
              </div>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="underline underline-offset-2 hover:text-sky-700 font-bold"
                >
                  修改兴趣领域
                </button>
              )}
            </div>
          )}

          {selectedCategory === '关注' && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  关注范围 = 你设置的关注标签 <strong>{followedTags.join('、') || '（尚未设置）'}</strong> + 已收藏文章。
                </span>
              </div>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="underline underline-offset-2 hover:text-emerald-700 font-bold"
                >
                  去设置关注标签
                </button>
              )}
            </div>
          )}

          {/* Active Filter Notice */}
          {selectedCategory === '影响我' && (
            <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 text-xs text-red-950 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-[#E3120B] shrink-0" />
                <span>
                  已为您开启<strong>「{selectedPersona.name}」</strong>专属透镜：
                  直击对您资产配置、战略动作与日常决策的针对性影响。
                </span>
              </div>
            </div>
          )}

          {/* 监控中 Notice：引导添加/管理（点监控中分类时） */}
          {selectedCategory === '监控中' && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {monitorTodayCount > 0
                    ? <>今日 <strong>{monitorTodayCount}</strong> 条新闻命中您的监控词（{radarKeywords.map((r) => r.keyword).join(' · ')}）。</>
                    : '今日暂无命中监控词的新闻。'}
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="ml-2 underline underline-offset-2 hover:text-amber-950 font-bold"
                    >
                      去设置管理监控词
                    </button>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* 当所选赛道在当前时间窗口暂无新增时，提供一键切换至全部/近3日查看历史沉淀 */}
          {filteredArticles.length === 0 && selectedCategory in CATEGORY_THEMES && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-700 flex flex-wrap items-center justify-between gap-3 font-sans">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                <span>
                  当前【<strong>{selectedCategory}</strong>】在【{timeHorizon === 'today' ? '今日' : timeHorizon === '3d' ? '近 3 日' : '当前范围'}】暂无新增条目
                  {articles.filter(a => getArticleCanonicalCategory(a) === selectedCategory).length > 0 && (
                    <>（历史语料库中有 <strong>{articles.filter(a => getArticleCanonicalCategory(a) === selectedCategory).length}</strong> 篇深度沉淀档案）</>
                  )}。
                </span>
              </div>
              {timeHorizon !== 'all' && articles.filter(a => getArticleCanonicalCategory(a) === selectedCategory).length > 0 && (
                <button
                  onClick={() => setTimeHorizon('all')}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-lg font-serif font-bold text-xs transition-colors cursor-pointer"
                >
                  切换至全部范围查看档案 ➔
                </button>
              )}
            </div>
          )}

          {/* Render Active Reading Mode Feed（每次展示前 20 条） */}
          {readingMode === 'standard' && (
            <StandardModeFeed
              readingDensity={readingDensity}
              articles={displayFeed}
              bookmarkedIds={bookmarkedIds}
              followedTags={followedTags}
              selectedPersona={selectedPersona}
              onSelectArticle={onSelectArticle}
              onSelectArticleWithTab={onSelectArticleWithTab}
              onToggleBookmark={onToggleBookmark}
              onToggleFollowTag={onToggleFollowTag}
              radarKeywords={radarKeywords}
              onRemoveRadar={onRemoveRadar}
              onRunSkill={onRunSkill}
              contextArticles={articles}
              onOpenShareCard={onOpenShareCard}
              onOpenAudioBriefing={onOpenAudioBriefing}
              onOpenTermExplain={onOpenTermExplain}
            />
          )}


          {readingMode === 'tongsu' && (
            <Suspense fallback={<div className="py-10 text-center text-xs text-stone-400">正在加载阅读模式…</div>}>
              <TongsuModeFeed
                articles={displayFeed}
                onSelectArticle={onSelectArticle}
                onOpenTermExplain={onOpenTermExplain}
                onRunSkill={onRunSkill}
              />
            </Suspense>
          )}

          {readingMode === 'dehydrated' && (
            <Suspense fallback={<div className="py-10 text-center text-xs text-stone-400">正在加载阅读模式…</div>}>
              <DehydratedModeFeed
                articles={displayFeed}
                onSelectArticle={onSelectArticle}
                onRunSkill={onRunSkill}
              />
            </Suspense>
          )}

          {/* 加载更多 */}
          {filteredArticles.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="w-full py-3 border-2 border-dashed border-stone-300 hover:border-stone-500 rounded-xl text-sm font-serif font-bold text-stone-500 hover:text-stone-900 bg-white transition-colors"
            >
              再看 {Math.min(PAGE_SIZE, filteredArticles.length - visibleCount)} 条（已显示 {visibleCount}/{filteredArticles.length}）↓
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
