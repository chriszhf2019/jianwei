import { useState, useEffect, useCallback, type MutableRefObject } from 'react';
import { PrimaryNavTab, NewsArticle, CognitiveDetailTab } from '../types';
import { logUserActivity } from '../utils/activityTracker';

export type AppViewTab = PrimaryNavTab | 'detail';

const VALID_VIEW_TABS: PrimaryNavTab[] = ['home', 'intelligence', 'topics', 'region', 'my_focus', 'admin'];

export function parseLocationHash(): { tab: AppViewTab; articleId: string | null } {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [first, second] = raw.split('/');
  if (first === 'article' && second) {
    return { tab: 'detail', articleId: decodeURIComponent(second) };
  }
  if ((VALID_VIEW_TABS as string[]).includes(first)) {
    return { tab: first as PrimaryNavTab, articleId: null };
  }
  return { tab: 'home', articleId: null };
}

function hashForView(tab: AppViewTab, article?: NewsArticle | null): string {
  if (tab === 'detail' && article) {
    return `#/article/${encodeURIComponent(article.id)}`;
  }
  if (tab === 'home' || tab === 'detail') return '';
  return `#/${tab}`;
}

function writeHash(hash: string): void {
  if (hash) {
    window.location.hash = hash;
  } else if (window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

export type ArticleDeepLinkStatus = 'idle' | 'pending' | 'loading' | 'not_found';

/** Hash 路由：主导航与文章详情可刷新恢复。 */
export function useAppRouter(
  articles: NewsArticle[],
  articlesRef: MutableRefObject<NewsArticle[]>,
  options?: {
    corpusReady?: boolean;
    ensureArticleById?: (id: string) => Promise<NewsArticle | null>;
  }
) {
  const corpusReady = options?.corpusReady ?? true;
  const ensureArticleById = options?.ensureArticleById;

  const [activeTab, setActiveTab] = useState<AppViewTab>(() => parseLocationHash().tab);
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(() =>
    parseLocationHash().tab === 'detail' ? parseLocationHash().articleId : null
  );
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<CognitiveDetailTab>('seven_elements');
  const [deepLinkStatus, setDeepLinkStatus] = useState<ArticleDeepLinkStatus>(() =>
    parseLocationHash().tab === 'detail' && parseLocationHash().articleId ? 'pending' : 'idle'
  );

  useEffect(() => {
    if (activeTab === 'detail' && !selectedArticle) return;
    writeHash(hashForView(activeTab, selectedArticle));
  }, [activeTab, selectedArticle]);

  // 列表命中：语料已含该 id
  useEffect(() => {
    if (!pendingArticleId) return;
    const found = articles.find((a) => a.id === pendingArticleId);
    if (!found) return;
    setSelectedArticle(found);
    setActiveTab('detail');
    setPendingArticleId(null);
    setDeepLinkStatus('idle');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [articles, pendingArticleId]);

  // 列表未命中：语料就绪后按 id 拉单篇（覆盖游客 limit 截断）
  useEffect(() => {
    if (!pendingArticleId || !corpusReady || !ensureArticleById) return;
    if (articles.some((a) => a.id === pendingArticleId)) return;

    let cancelled = false;
    const id = pendingArticleId;
    setDeepLinkStatus('loading');
    void ensureArticleById(id).then((article) => {
      if (cancelled) return;
      if (article) {
        setSelectedArticle(article);
        setActiveTab('detail');
        setPendingArticleId(null);
        setDeepLinkStatus('idle');
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        setDeepLinkStatus('not_found');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pendingArticleId, corpusReady, ensureArticleById, articles]);

  useEffect(() => {
    const onHashChange = () => {
      const view = parseLocationHash();
      if (view.tab === 'detail') {
        if (view.articleId) {
          const found = articlesRef.current.find((a) => a.id === view.articleId);
          if (found) {
            setSelectedArticle(found);
            setActiveTab('detail');
            setPendingArticleId(null);
            setDeepLinkStatus('idle');
          } else {
            setActiveTab('detail');
            setSelectedArticle(null);
            setPendingArticleId(view.articleId);
            setDeepLinkStatus('pending');
          }
        } else {
          setActiveTab('home');
          setSelectedArticle(null);
          setPendingArticleId(null);
          setDeepLinkStatus('idle');
        }
      } else {
        setActiveTab(view.tab);
        setSelectedArticle(null);
        setPendingArticleId(null);
        setDeepLinkStatus('idle');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [articlesRef]);

  const handleSelectArticle = useCallback((art: NewsArticle) => {
    setSelectedArticle(art);
    setDetailInitialTab('seven_elements');
    setActiveTab('detail');
    setPendingArticleId(null);
    setDeepLinkStatus('idle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    logUserActivity({
      action: 'article.read',
      entityType: 'article',
      entityId: art.id,
      metadata: { title: art.title, category: art.category, isExternal: !!art.isExternal },
    });
  }, []);

  const handleSelectArticleWithTab = useCallback(
    (art: NewsArticle, tab: CognitiveDetailTab = 'seven_elements') => {
      setSelectedArticle(art);
      setDetailInitialTab(tab);
      setActiveTab('detail');
      setPendingArticleId(null);
      setDeepLinkStatus('idle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleBackToList = useCallback(() => {
    setActiveTab('home');
    setSelectedArticle(null);
    setPendingArticleId(null);
    setDeepLinkStatus('idle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goTab = useCallback((tab: PrimaryNavTab) => {
    setActiveTab(tab);
    setSelectedArticle(null);
    setPendingArticleId(null);
    setDeepLinkStatus('idle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    activeTab,
    setActiveTab,
    selectedArticle,
    setSelectedArticle,
    detailInitialTab,
    pendingArticleId,
    deepLinkStatus,
    handleSelectArticle,
    handleSelectArticleWithTab,
    handleBackToList,
    goTab,
  };
}
