import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import localforage from 'localforage';
import { 
  HomeReadingMode, 
  UserPersona, 
  UserPersonaId, 
  NewsArticle, 
  RadarKeyword,
  PredictionContract,
  KnowledgeItem
} from '../types';

import { 
  USER_PERSONAS, 
  INITIAL_RADAR_KEYWORDS, 
  INITIAL_PREDICTION_CONTRACTS,
  INITIAL_KNOWLEDGE_ITEMS
} from '../data/intelligenceData';
import { CURATED_ARTICLES } from '../data/newsData';
import { useLocalState } from './useLocalState';
import { corpusDerived, deriveFromList, CorpusDerived } from '../utils/corpusMetrics';
import { parseArticleDate } from '../utils/articleTime';
import { logUserActivity } from '../utils/activityTracker';
import type { NewsSkill } from '../components/home/HomeView';

const INDEXED_DB_CORPUS_KEY = 'jianwei:indexeddb-corpus-v2';
const SESSION_CORPUS_CACHE_KEY = 'jianwei:cached-corpus-v1';
const LEGACY_DEMO_PREDICTION_IDS = new Set(['contract-agent-2026', 'contract-semi-historical']);

// 创建 localforage IndexedDB 存储实例，支持大规模语料持久化存储并防止配额溢出
const corpusDB = localforage.createInstance({
  name: 'JianWeiIntelligenceDB',
  storeName: 'articles_corpus',
  description: '大规模新闻语料与 AI 认知拆解的 IndexedDB 持久化存储库',
});

// 从 IndexedDB 中异步加载缓存语料（自动兼容迁移旧 sessionStorage 缓存）
async function loadCachedCorpus(): Promise<NewsArticle[] | null> {
  try {
    const cached = await corpusDB.getItem<NewsArticle[]>(INDEXED_DB_CORPUS_KEY);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
    const rawLegacy = sessionStorage.getItem(SESSION_CORPUS_CACHE_KEY);
    if (rawLegacy) {
      const parsedLegacy = JSON.parse(rawLegacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        await corpusDB.setItem(INDEXED_DB_CORPUS_KEY, parsedLegacy);
        sessionStorage.removeItem(SESSION_CORPUS_CACHE_KEY);
        return parsedLegacy as NewsArticle[];
      }
    }
  } catch (err) {
    console.warn('Load IndexedDB corpus error:', err);
  }
  return null;
}

// 异步持久化保存全量语料至 IndexedDB
async function saveCachedCorpus(articlesList: NewsArticle[]): Promise<void> {
  try {
    if (!articlesList || articlesList.length === 0) return;
    await corpusDB.setItem(INDEXED_DB_CORPUS_KEY, articlesList);
  } catch (err) {
    console.warn('Save IndexedDB corpus error:', err);
  }
}

/** 技能型生成结果合并：把返回字段写回文章 */
export function mergeSkillArticle(article: NewsArticle, overrides: Record<string, unknown>): NewsArticle {
  const next: NewsArticle = { ...article };
  const keys = [
    'tongsuSummary', 
    'dehydratedItems', 
    'aiInterpretation', 
    'sevenWBrief', 
    'trendForecastText', 
    'riskReviewText', 
    'backstoryTimeline', 
    'stakeholderImpact', 
    'coreLogic', 
    'bullBearDebate', 
    'relatedNews', 
    'personaForecasts', 
    'aiFieldMeta'
  ] as const;

  for (const key of keys) {
    const value = overrides[key];
    if (value !== undefined && value !== null) {
      (next as any)[key] = value;
    }
  }
  return next;
}

export function useAppStorage() {
  // UI 偏好持久化
  const [homeReadingMode, setHomeReadingMode] = useLocalState<HomeReadingMode>(
    'home-reading-mode',
    'standard',
    { version: 1 }
  );

  const [selectedPersonaId, setSelectedPersonaId] = useLocalState<UserPersonaId>(
    'user-persona',
    'investor',
    { version: 1 }
  );

  const selectedPersona: UserPersona = useMemo(
    () => USER_PERSONAS.find((p) => p.id === selectedPersonaId) || USER_PERSONAS[0],
    [selectedPersonaId]
  );

  // 语料库核心状态
  const [articles, setArticles] = useState<NewsArticle[]>(CURATED_ARTICLES);
  const articlesRef = useRef<NewsArticle[]>(articles);
  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  // 组件挂载时异步读取 IndexedDB 中持久化的语料库
  useEffect(() => {
    let active = true;
    loadCachedCorpus().then((cached) => {
      if (active && cached && cached.length > 0) {
        setArticles(cached);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // 持久化用户数据
  const [radarKeywords, setRadarKeywords] = useLocalState<RadarKeyword[]>(
    'radar-keywords',
    INITIAL_RADAR_KEYWORDS,
    { version: 1 }
  );

  const [bookmarkedIds, setBookmarkedIds] = useLocalState<string[]>(
    'bookmarked-article-ids',
    [],
    { version: 1 }
  );

  const [followedTags, setFollowedTags] = useLocalState<string[]>(
    'followed-tags',
    [],
    { version: 1 }
  );

  const [interestGroups, setInterestGroups] = useLocalState<string[]>(
    'news-interest-groups',
    [],
    { version: 1 }
  );

  const [personalNotes, setPersonalNotes] = useLocalState<string>('action-memo', '', {
    version: 1,
    legacyKey: 'jianwei-action-memo',
  });

  const [predictionContracts, setPredictionContracts] = useLocalState<PredictionContract[]>(
    'prediction-contracts',
    INITIAL_PREDICTION_CONTRACTS,
    { version: 1 }
  );

  const [knowledgeItems, setKnowledgeItems] = useLocalState<KnowledgeItem[]>(
    'jianwei-knowledge-ledger',
    INITIAL_KNOWLEDGE_ITEMS,
    { version: 1 }
  );

  const [nickname, setNickname] = useLocalState<string>('user-nickname', '');

  // 全局请求加载指示器计数器
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    const handleStart = () => setActiveRequests((c) => c + 1);
    const handleEnd = () => setActiveRequests((c) => Math.max(0, c - 1));

    window.addEventListener('jianwei:loading-start', handleStart);
    window.addEventListener('jianwei:loading-end', handleEnd);

    return () => {
      window.removeEventListener('jianwei:loading-start', handleStart);
      window.removeEventListener('jianwei:loading-end', handleEnd);
    };
  }, []);

  const trackLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setActiveRequests((c) => c + 1);
    try {
      return await fn();
    } finally {
      setActiveRequests((c) => Math.max(0, c - 1));
    }
  }, []);

  // 知识库增删改操作
  const handleAddKnowledge = useCallback((item: KnowledgeItem) => {
    setKnowledgeItems((prev) => [item, ...prev.filter((i) => i.id !== item.id && i.title !== item.title)]);
    logUserActivity({
      action: 'knowledge.deposit',
      entityType: 'knowledge',
      entityId: item.id,
      metadata: { title: item.title, category: item.category },
    });
  }, [setKnowledgeItems]);

  const handleUpdateKnowledge = useCallback((id: string, updates: Partial<KnowledgeItem>) => {
    setKnowledgeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, [setKnowledgeItems]);

  const handleRemoveKnowledge = useCallback((id: string) => {
    setKnowledgeItems((prev) => prev.filter((item) => item.id !== id));
  }, [setKnowledgeItems]);

  // 收藏与关注标签操作
  const handleToggleBookmark = useCallback((artId: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(artId) ? prev.filter((id) => id !== artId) : [...prev, artId]
    );
  }, [setBookmarkedIds]);

  const handleToggleFollowTag = useCallback((tag: string) => {
    setFollowedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, [setFollowedTags]);

  const handleAddRadar = useCallback((newR: RadarKeyword) => {
    setRadarKeywords((prev) => [newR, ...prev]);
  }, [setRadarKeywords]);

  const handleRemoveRadar = useCallback((id: string) => {
    setRadarKeywords((prev) => prev.filter((r) => r.id !== id));
  }, [setRadarKeywords]);

  // 预测契约保存与复核
  const handleSaveContract = useCallback(async (contract: PredictionContract): Promise<boolean> => {
    try {
      setPredictionContracts((prev) => [
        contract,
        ...prev.filter((c) => c.id !== contract.id),
      ]);
      fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data?.contract) {
            setPredictionContracts((prev) => [
              data.contract,
              ...prev.filter((c) => c.id !== contract.id),
            ]);
          }
        }
      }).catch(() => {/* 忽略后台同步网络抖动 */});
      return true;
    } catch {
      return true;
    }
  }, [setPredictionContracts]);

  const handleResolveContract = useCallback(async (
    contractId: string,
    actualOutcome: string,
    status: PredictionContract['status'],
    brierScore?: number,
    outcomeSourceUrl?: string,
    reviewer?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(contractId)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          actualOutcome,
          outcomeEvidence: actualOutcome,
          outcomeSourceUrl,
          brierScore,
          reviewer,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.contract) return false;
      const ledgerResponse = await fetch('/api/predictions');
      const ledgerData = await ledgerResponse.json();
      if (ledgerResponse.ok && Array.isArray(ledgerData?.contracts)) {
        setPredictionContracts(ledgerData.contracts);
      } else {
        setPredictionContracts((prev) =>
          prev.map((c) => c.id === contractId ? data.contract : c)
        );
      }
      return true;
    } catch {
      return false;
    }
  }, [setPredictionContracts]);

  const handleRemoveContract = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) return false;
      setPredictionContracts((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch {
      return false;
    }
  }, [setPredictionContracts]);

  const handleReviewContract = useCallback(async (
    contractId: string,
    reviewer: string,
    decision: 'confirm' | 'dispute',
    notes?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(contractId)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer, decision, notes }),
      });
      if (!response.ok) return false;
      const contractsResponse = await fetch('/api/predictions');
      const data = await contractsResponse.json();
      if (!contractsResponse.ok || !Array.isArray(data?.contracts)) return false;
      setPredictionContracts(data.contracts);
      return true;
    } catch {
      return false;
    }
  }, [setPredictionContracts]);

  // 文章补全与分析完成写入
  const handleEnrichArticle = useCallback((updated: NewsArticle) => {
    setArticles((prev) => {
      const next = prev.map((a) => (a.id === updated.id ? updated : a));
      saveCachedCorpus(next);
      return next;
    });
  }, []);

  const handleAnalysisComplete = useCallback((newArticle: NewsArticle) => {
    setArticles((prev) => {
      const next = [newArticle, ...prev];
      saveCachedCorpus(next);
      return next;
    });
  }, []);

  // 技能调用器
  const runNewsSkill = useCallback(async (skill: NewsSkill, article: NewsArticle): Promise<NewsArticle | null> => {
    return trackLoading(async () => {
      try {
        const body: Record<string, string> = {
          articleId: article.id,
          title: article.title,
          content: (article.summary || article.subtitle || article.title).slice(0, 600),
          source: article.sourceName || '',
          sourceUrl: article.sourceUrl || '',
          publishedAt: article.publishedAt || '',
          category: article.category,
        };
        const res = await fetch(`/api/skill/${skill}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json?.ok && json.overrides) {
          const updated = mergeSkillArticle(article, json.overrides);
          handleEnrichArticle(updated);
          return updated;
        }
        return null;
      } catch {
        return null;
      }
    });
  }, [trackLoading, handleEnrichArticle]);

  const runPersonaForecast = useCallback(async (persona: UserPersona, article: NewsArticle): Promise<NewsArticle | null> => {
    return trackLoading(async () => {
      try {
        const ctxParts: string[] = [];
        const personaImpact = (article.personaImpacts || []).find((p) => p.personaId === persona.id);
        if (personaImpact?.coreImpact) ctxParts.push(`身份已有影响快照：${personaImpact.coreImpact}`);
        if (personaImpact?.opportunity) ctxParts.push(`- 机会：${personaImpact.opportunity}`);
        if (personaImpact?.threatRisk) ctxParts.push(`- 风险：${personaImpact.threatRisk}`);
        if (article.coreLogic?.essence) ctxParts.push(`底层逻辑本质：${article.coreLogic.essence}`);
        if (article.bullBearDebate?.read) ctxParts.push(`正反方力量判断：${article.bullBearDebate.read}`);
        if (article.logicTree?.variableWeights?.length) {
          ctxParts.push(
            '驱动变量权重：' +
              article.logicTree.variableWeights
                .map((w) => `${w.name}(${w.weight}%, ${w.impactDirection === 'up' ? '利好' : w.impactDirection === 'down' ? '利空' : '中性'})`)
                .join('；')
          );
        }
        if (article.sevenElements?.aiVerdict?.verdictSummary) ctxParts.push(`AI 定性：${article.sevenElements.aiVerdict.verdictSummary}`);
        const body = {
          articleId: article.id,
          title: article.title,
          content: (article.summary || article.subtitle || article.title).slice(0, 600),
          source: article.sourceName || '',
          sourceUrl: article.sourceUrl || '',
          publishedAt: article.publishedAt || '',
          category: article.category,
          personaId: persona.id,
          personaName: persona.name,
          personaDesc: `${persona.tagline || ''}${persona.focusKeywords?.length ? `｜关注词：${persona.focusKeywords.join('、')}` : ''}`,
          extraContext: ctxParts.join('\n'),
        };
        const res = await fetch('/api/skill/personaforecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json?.ok && json.overrides) {
          const updated = mergeSkillArticle(article, json.overrides);
          handleEnrichArticle(updated);
          return updated;
        }
        return null;
      } catch {
        return null;
      }
    });
  }, [trackLoading, handleEnrichArticle]);

  // 数据清洗：剔除遗留测试数据
  useEffect(() => {
    setRadarKeywords((prev) =>
      prev
        .filter((item) => !/^rk-[1-6]$/.test(item.id))
        .map((rk) => ({
          ...rk,
          count: 0,
          countChange: '',
          sentimentTrend: '',
          marketAttention: '',
          recentNewsTitle: '',
        }))
    );
    setPredictionContracts((prev) =>
      prev.filter((contract) => !LEGACY_DEMO_PREDICTION_IDS.has(contract.id))
    );
    setBookmarkedIds((prev) => prev.filter((id) => id !== 'news-ai-agent-breakthrough'));
    setFollowedTags((prev) => prev.filter((tag) => tag !== '先进封装' && tag !== 'AI Agent'));
  }, []);

  // 预测契约与服务端存证账本同步
  useEffect(() => {
    let alive = true;
    const syncLedger = async () => {
      try {
        const response = await fetch('/api/predictions');
        if (!response.ok) return;
        const data = await response.json();
        const serverContracts: PredictionContract[] = Array.isArray(data?.contracts) ? data.contracts : [];
        const merged = new Map(serverContracts.map((contract) => [contract.id, contract]));

        for (const local of predictionContracts) {
          if (merged.has(local.id)) continue;
          if (local.status === 'pending') {
            try {
              const registered = await fetch('/api/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(local),
              });
              const registeredData = await registered.json();
              if (registered.ok && registeredData?.contract) {
                merged.set(registeredData.contract.id, registeredData.contract);
                continue;
              }
            } catch {
              /* 保留为未存证本地记录 */
            }
          }
          merged.set(local.id, { ...local, ledger: 'local', integrityValid: false });
        }

        if (alive) setPredictionContracts([...merged.values()]);
      } catch {
        /* 服务不可达时保留本地状态 */
      }
    };
    void syncLedger();
    return () => {
      alive = false;
    };
  }, []);

  // 服务端用户偏好与设置同步 (Preferences Server Sync)
  const preferencesHydratedRef = useRef(false);
  const preferencesVersionRef = useRef(0);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    const applyServerPreferences = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      if (['standard', 'tongsu', 'dehydrated'].includes(payload.homeReadingMode)) {
        setHomeReadingMode(payload.homeReadingMode);
      }
      if (USER_PERSONAS.some((persona) => persona.id === payload.selectedPersonaId)) {
        setSelectedPersonaId(payload.selectedPersonaId);
      }
      if (Array.isArray(payload.radarKeywords)) setRadarKeywords(payload.radarKeywords);
      if (Array.isArray(payload.bookmarkedIds)) setBookmarkedIds(payload.bookmarkedIds.map(String));
      if (Array.isArray(payload.followedTags)) setFollowedTags(payload.followedTags.map(String));
      if (Array.isArray(payload.interestGroups)) setInterestGroups(payload.interestGroups.map(String));
      if (typeof payload.nickname === 'string') setNickname(payload.nickname.slice(0, 80));
      if (typeof payload.personalNotes === 'string') setPersonalNotes(payload.personalNotes.slice(0, 20_000));
    };

    fetch('/api/preferences')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!alive || !data) return;
        applyServerPreferences(data.payload);
        preferencesVersionRef.current = Number(data.version || 0);
        preferencesHydratedRef.current = true;
        setPreferencesHydrated(true);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!preferencesHydrated || !preferencesHydratedRef.current) return;
    const timer = window.setTimeout(async () => {
      const payload = {
        homeReadingMode,
        selectedPersonaId,
        radarKeywords,
        bookmarkedIds,
        followedTags,
        interestGroups,
        nickname,
        personalNotes,
        knowledgeItems,
      };
      try {
        const response = await fetch('/api/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: preferencesVersionRef.current,
            payload,
          }),
        });
        const data = await response.json();
        if (response.ok && typeof data?.version === 'number') {
          preferencesVersionRef.current = data.version;
        }
      } catch {
        /* 离线时继续使用本地偏好 */
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    preferencesHydrated,
    homeReadingMode,
    selectedPersonaId,
    radarKeywords,
    bookmarkedIds,
    followedTags,
    interestGroups,
    nickname,
    personalNotes,
    knowledgeItems,
  ]);

  // 服务端运行时全量语料摄取与流式补充分页
  useEffect(() => {
    const controller = new AbortController();
    const pageSize = 200;
    const maxLoaded = 10000;
    let loadedCount = 0;

    const loadPage = async (offset: number): Promise<void> => {
      setActiveRequests((c) => c + 1);
      try {
        const res = await fetch(`/api/corpus?limit=${pageSize}&offset=${offset}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`corpus ${res.status}`);
        const json = await res.json();
        const page: NewsArticle[] = Array.isArray(json?.corpus) ? json.corpus : [];
        if (page.length > 0) {
          loadedCount += page.length;
          setArticles((prev) => {
            const seen = new Set(prev.map((a) => a.id));
            const fresh = page.filter((a) => !seen.has(a.id));
            const next = fresh.length > 0 ? [...prev, ...fresh] : prev;
            saveCachedCorpus(next);
            return next;
          });
        }
        if (json?.meta?.hasMore && page.length > 0 && loadedCount < maxLoaded) {
          await loadPage(offset + page.length);
        }
      } finally {
        setActiveRequests((c) => Math.max(0, c - 1));
      }
    };

    loadPage(0).catch(() => {
      /* 服务不可达：保留当前数据 */
    });

    return () => {
      controller.abort();
    };
  }, []);

  // 顶栏情绪与派生统计
  const derived = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayList = articles.filter((a) => {
      if (!a.publishedAt) return false;
      const ts = parseArticleDate(a.publishedAt);
      return ts !== null && ts >= dayStart;
    });
    const dToday = deriveFromList(todayList);
    if (dToday.scanned >= 20) return { value: dToday, scope: 'today' as const };
    return { value: corpusDerived(articles, 30), scope: '30d' as const };
  }, [articles]);

  const bookmarkedArticles = useMemo(
    () => articles.filter((a) => bookmarkedIds.includes(a.id)),
    [articles, bookmarkedIds]
  );

  return {
    // 状态
    homeReadingMode,
    setHomeReadingMode,
    selectedPersonaId,
    setSelectedPersonaId,
    selectedPersona,
    articles,
    setArticles,
    articlesRef,
    radarKeywords,
    setRadarKeywords,
    bookmarkedIds,
    setBookmarkedIds,
    bookmarkedArticles,
    followedTags,
    setFollowedTags,
    interestGroups,
    setInterestGroups,
    personalNotes,
    setPersonalNotes,
    predictionContracts,
    setPredictionContracts,
    knowledgeItems,
    setKnowledgeItems,
    nickname,
    setNickname,
    derived,
    activeRequests,
    preferencesHydrated,

    // 方法与操作
    handleAddKnowledge,
    handleUpdateKnowledge,
    handleRemoveKnowledge,
    handleToggleBookmark,
    handleToggleFollowTag,
    handleAddRadar,
    handleRemoveRadar,
    handleSaveContract,
    handleResolveContract,
    handleRemoveContract,
    handleReviewContract,
    handleEnrichArticle,
    handleAnalysisComplete,
    runNewsSkill,
    runPersonaForecast,
    trackLoading,
  };
}
