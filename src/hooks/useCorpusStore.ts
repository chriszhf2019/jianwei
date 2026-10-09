import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import localforage from 'localforage';
import { NewsArticle, UserPersona } from '../types';
import { CURATED_ARTICLES } from '../data/newsData';
import { corpusDerived, deriveFromList } from '../utils/corpusMetrics';
import { parseArticleDate } from '../utils/articleTime';
import type { NewsSkill } from '../components/home/HomeView';

const INDEXED_DB_CORPUS_KEY = 'jianwei:indexeddb-corpus-v2';
const SESSION_CORPUS_CACHE_KEY = 'jianwei:cached-corpus-v1';
const LEGACY_DEMO_ARTICLE_IDS = new Set(
  CURATED_ARTICLES.map((article) => String(article.id || '')).filter(Boolean)
);

function withoutLegacyDemoArticles(list: NewsArticle[]): NewsArticle[] {
  return list.filter((article) => !LEGACY_DEMO_ARTICLE_IDS.has(String(article.id || '')));
}

const corpusDB = localforage.createInstance({
  name: 'JianWeiIntelligenceDB',
  storeName: 'articles_corpus',
  description: '大规模新闻语料与 AI 认知拆解的 IndexedDB 持久化存储库',
});

async function loadCachedCorpus(): Promise<NewsArticle[] | null> {
  try {
    const cached = await corpusDB.getItem<NewsArticle[]>(INDEXED_DB_CORPUS_KEY);
    if (Array.isArray(cached) && cached.length > 0) return cached;
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
    'aiFieldMeta',
  ] as const;
  for (const key of keys) {
    const value = overrides[key];
    if (value !== undefined && value !== null) {
      (next as any)[key] = value;
    }
  }
  return next;
}

/** 语料库：IndexedDB 缓存、服务端分页拉取、技能写回与派生统计。 */
export function useCorpusStore() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const articlesRef = useRef<NewsArticle[]>(articles);
  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    let active = true;
    loadCachedCorpus().then((cached) => {
      if (!active || !cached || cached.length === 0) return;
      const cleaned = withoutLegacyDemoArticles(cached);
      if (cleaned.length > 0) {
        setArticles(cleaned);
        if (cleaned.length !== cached.length) void saveCachedCorpus(cleaned);
      } else if (cached.length > 0) {
        void corpusDB.removeItem(INDEXED_DB_CORPUS_KEY);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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

  const handleEnrichArticle = useCallback((updated: NewsArticle) => {
    setArticles((prev) => {
      const next = prev.map((a) => (a.id === updated.id ? updated : a));
      void saveCachedCorpus(next);
      return next;
    });
  }, []);

  const handleAnalysisComplete = useCallback((newArticle: NewsArticle) => {
    setArticles((prev) => {
      const next = [newArticle, ...prev];
      void saveCachedCorpus(next);
      return next;
    });
  }, []);

  const runNewsSkill = useCallback(
    async (skill: NewsSkill, article: NewsArticle): Promise<NewsArticle | null> => {
      return trackLoading(async () => {
        try {
          const body: Record<string, string> = {
            articleId: article.id,
            title: article.title,
            content: (article.content || article.summary || article.subtitle || article.title).slice(0, 4000),
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
    },
    [trackLoading, handleEnrichArticle]
  );

  const runPersonaForecast = useCallback(
    async (persona: UserPersona, article: NewsArticle): Promise<NewsArticle | null> => {
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
                  .map(
                    (w) =>
                      `${w.name}(${w.weight}%, ${w.impactDirection === 'up' ? '利好' : w.impactDirection === 'down' ? '利空' : '中性'})`
                  )
                  .join('；')
            );
          }
          if (article.sevenElements?.aiVerdict?.verdictSummary) {
            ctxParts.push(`AI 定性：${article.sevenElements.aiVerdict.verdictSummary}`);
          }
          const body = {
            articleId: article.id,
            title: article.title,
            content: (article.content || article.summary || article.subtitle || article.title).slice(0, 4000),
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
    },
    [trackLoading, handleEnrichArticle]
  );

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
        if (offset === 0) {
          loadedCount = page.length;
          setArticles(page);
          if (page.length > 0) void saveCachedCorpus(page);
          else void corpusDB.removeItem(INDEXED_DB_CORPUS_KEY);
        } else if (page.length > 0) {
          loadedCount += page.length;
          setArticles((prev) => {
            const seen = new Set(prev.map((a) => a.id));
            const fresh = page.filter((a) => !seen.has(a.id));
            const next = fresh.length > 0 ? [...prev, ...fresh] : prev;
            void saveCachedCorpus(next);
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

    loadPage(0).catch(() => undefined);
    return () => controller.abort();
  }, []);

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

  return {
    articles,
    setArticles,
    articlesRef,
    derived,
    activeRequests,
    trackLoading,
    handleEnrichArticle,
    handleAnalysisComplete,
    runNewsSkill,
    runPersonaForecast,
  };
}

export type CorpusStore = ReturnType<typeof useCorpusStore>;
