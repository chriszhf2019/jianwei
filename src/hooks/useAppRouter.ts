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

/** Hash 路由：主导航与文章详情可刷新恢复。 */
export function useAppRouter(articles: NewsArticle[], articlesRef: MutableRefObject<NewsArticle[]>) {
  const [activeTab, setActiveTab] = useState<AppViewTab>(() => parseLocationHash().tab);
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(() =>
    parseLocationHash().tab === 'detail' ? parseLocationHash().articleId : null
  );
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<CognitiveDetailTab>('seven_elements');

  useEffect(() => {
    if (activeTab === 'detail' && !selectedArticle) return;
    writeHash(hashForView(activeTab, selectedArticle));
  }, [activeTab, selectedArticle]);

  useEffect(() => {
    if (!pendingArticleId) return;
    const found = articles.find((a) => a.id === pendingArticleId);
    if (!found) return;
    setSelectedArticle(found);
    setActiveTab('detail');
    setPendingArticleId(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [articles, pendingArticleId]);

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
          } else {
            setActiveTab('detail');
            setSelectedArticle(null);
            setPendingArticleId(view.articleId);
          }
        } else {
          setActiveTab('home');
          setSelectedArticle(null);
          setPendingArticleId(null);
        }
      } else {
        setActiveTab(view.tab);
        setSelectedArticle(null);
        setPendingArticleId(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [articlesRef]);

  const handleSelectArticle = useCallback((art: NewsArticle) => {
    setSelectedArticle(art);
    setDetailInitialTab('seven_elements');
    setActiveTab('detail');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleBackToList = useCallback(() => {
    setActiveTab('home');
    setSelectedArticle(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goTab = useCallback((tab: PrimaryNavTab) => {
    setActiveTab(tab);
    setSelectedArticle(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    activeTab,
    setActiveTab,
    selectedArticle,
    setSelectedArticle,
    detailInitialTab,
    pendingArticleId,
    handleSelectArticle,
    handleSelectArticleWithTab,
    handleBackToList,
    goTab,
  };
}
