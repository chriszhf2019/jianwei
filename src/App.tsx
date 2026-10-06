import React, { lazy, Suspense, useState, useEffect } from 'react';
import { 
  PrimaryNavTab, 
  UserPersona, 
  NewsArticle, 
  RadarKeyword,
  PredictionContract,
  CognitiveDetailTab,
  KnowledgeItem
} from './types';

import { USER_PERSONAS, TOPIC_CLUSTERS } from './data/intelligenceData';
import { Header } from './components/Header';
import { HomeView, NewsSkill } from './components/home/HomeView';
import { useAppStorage } from './hooks/useAppStorage';
import { useSnapshot } from './hooks/useSnapshot';
import { logUserActivity } from './utils/activityTracker';
import { Sparkles } from 'lucide-react';

type AppViewTab = PrimaryNavTab | 'detail';

const IntelligenceHubView = lazy(() =>
  import('./components/intelligence/IntelligenceHubView').then((module) => ({ default: module.IntelligenceHubView }))
);
const TopicsView = lazy(() =>
  import('./components/topics/TopicsView').then((module) => ({ default: module.TopicsView }))
);
const MyFocusView = lazy(() =>
  import('./components/focus/MyFocusView').then((module) => ({ default: module.MyFocusView }))
);
const RegionIntelligencePage = lazy(() =>
  import('./components/RegionIntelligencePage').then((module) => ({ default: module.RegionIntelligencePage }))
);
const NewsDetailView = lazy(() =>
  import('./components/detail/NewsDetailView').then((module) => ({ default: module.NewsDetailView }))
);
const TermExplainModal = lazy(() =>
  import('./components/TermExplainModal').then((module) => ({ default: module.TermExplainModal }))
);
const AudioBriefingModal = lazy(() =>
  import('./components/AudioBriefingModal').then((module) => ({ default: module.AudioBriefingModal }))
);
const SearchModal = lazy(() =>
  import('./components/SearchModal').then((module) => ({ default: module.SearchModal }))
);
const AddRadarModal = lazy(() =>
  import('./components/AddRadarModal').then((module) => ({ default: module.AddRadarModal }))
);
const NameExplanationModal = lazy(() =>
  import('./components/NameExplanationModal').then((module) => ({ default: module.NameExplanationModal }))
);
const AnalyzeModal = lazy(() =>
  import('./components/AnalyzeModal').then((module) => ({ default: module.AnalyzeModal }))
);
const CognitiveModelModal = lazy(() =>
  import('./components/CognitiveModelModal').then((module) => ({ default: module.CognitiveModelModal }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal }))
);
const ShareCardModal = lazy(() =>
  import('./components/common/ShareCardModal').then((module) => ({ default: module.ShareCardModal }))
);
const AdminConsoleView = lazy(() =>
  import('./components/admin/AdminConsoleView').then((module) => ({ default: module.AdminConsoleView }))
);

const ViewLoading = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-xs text-stone-400">
    正在加载页面…
  </div>
);

const VALID_VIEW_TABS: PrimaryNavTab[] = ['home', 'intelligence', 'topics', 'region', 'my_focus', 'admin'];

function parseLocationHash(): { tab: AppViewTab; articleId: string | null } {
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

/** 屏幕顶部微细红色进度条指示器 (Top Loading Bar) */
const TopLoadingBar: React.FC<{ loading: boolean }> = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 sm:h-1 bg-stone-200/30 pointer-events-none overflow-hidden">
      <div className="h-full bg-gradient-to-r from-red-600 via-[#E3120B] to-amber-500 animate-pulse transition-all duration-300 w-full shadow-[0_0_10px_rgba(227,18,11,0.9)]" />
    </div>
  );
};

export const App: React.FC = () => {
  // 1. App Storage Custom Hook (encapsulates IndexedDB, LocalStorage, Server Sync, Skill Actions & Data State)
  const {
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
    handleEnrichArticle: storageHandleEnrichArticle,
    handleAnalysisComplete: storageHandleAnalysisComplete,
    runNewsSkill,
    runPersonaForecast,
    trackLoading,
  } = useAppStorage();

  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<AppViewTab>(() => parseLocationHash().tab);
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(() =>
    parseLocationHash().tab === 'detail' ? parseLocationHash().articleId : null
  );
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<CognitiveDetailTab>('seven_elements');

  // 浏览空闲期预加载延迟组件
  useEffect(() => {
    const preloadLazyViews = () => {
      import('./components/detail/NewsDetailView');
      import('./components/intelligence/IntelligenceHubView');
      import('./components/topics/TopicsView');
      import('./components/focus/MyFocusView');
      import('./components/SearchModal');
      import('./components/AnalyzeModal');
      import('./components/AudioBriefingModal');
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadLazyViews, { timeout: 1500 });
    } else {
      setTimeout(preloadLazyViews, 800);
    }
  }, []);

  // Modals
  const [authRequired, setAuthRequired] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUser, setAuthUser] = useState<any>(null);
  const [authTokenInput, setAuthTokenInput] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddRadarOpen, setIsAddRadarOpen] = useState(false);
  const [isAudioBriefingOpen, setIsAudioBriefingOpen] = useState(false);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isCognitiveModelOpen, setIsCognitiveModelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [shareCardArticle, setShareCardArticle] = useState<NewsArticle | null>(null);
  const [activeTermExplain, setActiveTermExplain] = useState<string | null>(null);

  // 服务端若配置 JIANWEI_AUTH_TOKEN，健康检查会返回 authRequired，前端需先输入访问令牌。
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
      .then((d) => {
        if (d?.authRequired) {
          setAuthRequired(true);
        }
        if (d?.user?.mustChangePassword) {
          setMustChangePassword(true);
          setAuthRequired(false);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setAuthUser(data?.user || null))
      .catch(() => setAuthUser(null));
  }, []);

  useEffect(() => {
    const handleAuthRequired = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.error === 'guest_deep_read_limit') {
        setAuthError('游客只能使用一次深度解读。注册并等待管理员审批后可继续使用。');
      } else if (detail.error === 'password_change_required') {
        setMustChangePassword(true);
      } else {
        setAuthError(detail.message || '该功能需要注册并完成审批。');
      }
      setAuthMode('register');
      setIsAuthModalOpen(true);
    };
    window.addEventListener('jianwei:auth-required', handleAuthRequired);
    return () => window.removeEventListener('jianwei:auth-required', handleAuthRequired);
  }, []);

  const submitAuth = async () => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authTokenInput.trim()
            ? { accessToken: authTokenInput.trim() }
            : { username: authUsername.trim(), password: authPassword }
        ),
      });
      const data = await response.json();
      if (!response.ok || !data?.token) {
        setAuthError(
          data?.error === 'pending_approval'
            ? '账号正在等待管理员审批。'
            : data?.error === 'rejected'
              ? '注册申请未通过，请联系管理员。'
              : '登录失败：账号、密码或访问令牌无效。'
        );
        return;
      }
      localStorage.setItem('jianwei:auth-token', data.token);
      setAuthUser(data.user || null);
      if (data.user?.mustChangePassword) {
        setMustChangePassword(true);
        setAuthRequired(false);
        return;
      }
      setAuthRequired(false);
      window.location.reload();
    } catch {
      setAuthError('登录服务不可达，请确认本地服务已启动。');
    }
  };

  const submitRegistration = async () => {
    setAuthError('');
    setRegistrationSubmitted(false);
    if (registerPassword !== registerConfirm) {
      setAuthError('两次输入的密码不一致。');
      return;
    }
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUsername.trim(),
          password: registerPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(
          data?.error === 'username_exists'
            ? '用户名已存在。'
            : data?.error === 'password_too_weak'
              ? '密码至少 12 位，并需包含至少三类字符。'
              : '注册失败，请检查用户名和密码。'
        );
        return;
      }
      setRegistrationSubmitted(true);
      setRegisterPassword('');
      setRegisterConfirm('');
    } catch {
      setAuthError('注册服务不可达，请稍后重试。');
    }
  };

  const submitRequiredPasswordChange = async () => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: authPassword,
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(
          data?.error === 'password_change_failed'
            ? '密码不符合要求或当前密码错误。密码至少 12 位，并需包含至少三类字符。'
            : '密码修改失败。'
        );
        return;
      }
      localStorage.removeItem('jianwei:auth-token');
      setMustChangePassword(false);
      setAuthRequired(true);
      setNewPassword('');
      setAuthError('密码已修改，请使用新密码重新登录。');
    } catch {
      setAuthError('密码修改服务不可达。');
    }
  };

  // Keyboard shortcut ⌘K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // URL hash：主导航与文章详情可刷新恢复、可分享；浏览器的前进/后退同步返回
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
  }, []);

  // View Navigation Handlers
  const handleSelectArticle = (art: NewsArticle) => {
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
  };

  const handleSelectArticleWithTab = (art: NewsArticle, tab: CognitiveDetailTab = 'seven_elements') => {
    setSelectedArticle(art);
    setDetailInitialTab(tab);
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setActiveTab('home');
    setSelectedArticle(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnrichArticle = (updated: NewsArticle) => {
    storageHandleEnrichArticle(updated);
    setSelectedArticle((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleAnalysisComplete = (newArticle: NewsArticle) => {
    storageHandleAnalysisComplete(newArticle);
    setSelectedArticle(newArticle);
    setActiveTab('detail');
  };

  // 情报数据层：服务端派生快照
  const { snapshot, status: snapshotStatus, refresh: refreshSnapshot } = useSnapshot();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans flex flex-col selection:bg-red-100 selection:text-red-950">
      <TopLoadingBar loading={activeRequests > 0} />
      {/* 1. Global Navigation Header */}
      <Header
        activeTab={activeTab === 'detail' ? 'home' : activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedArticle(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        selectedPersona={selectedPersona}
        onSelectPersona={setSelectedPersonaId}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAnalyzeModal={() => setIsAnalyzeOpen(true)}
        onOpenNameModal={() => setIsNameModalOpen(true)}
        onOpenCognitiveModel={() => setIsCognitiveModelOpen(true)}
        optimistic={derived.value.net}
        negative={derived.value.scanned > 0 ? derived.value.negativeHits : null}
        sentimentScope={derived.scope}
        nickname={nickname}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAudioBriefing={() => setIsAudioBriefingOpen(true)}
      />

      {authRequired && authUser?.isGuest && !isAuthModalOpen && !mustChangePassword && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-950">
            <span>
              游客模式：最多查看 <b>4</b> 条新闻，深度解读最多使用 <b>1</b> 次。
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                  setIsAuthModalOpen(true);
                }}
                className="rounded-md bg-stone-900 px-2.5 py-1 font-serif font-bold text-white"
              >
                注册申请
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setIsAuthModalOpen(true);
                }}
                className="rounded-md border border-amber-400 bg-white px-2.5 py-1 font-serif font-bold text-amber-900"
              >
                登录
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Body Content Switcher */}
      <main className="flex-1">
        <Suspense fallback={<ViewLoading />}>
        {/* Detail View */}
        {activeTab === 'detail' && selectedArticle && (
          <NewsDetailView
            article={selectedArticle}
            initialTab={detailInitialTab}
            onBack={handleBackToList}
            isBookmarked={bookmarkedIds.includes(selectedArticle.id)}
            onToggleBookmark={() => handleToggleBookmark(selectedArticle.id)}
            activePersona={selectedPersona}
            onSelectPersona={setSelectedPersonaId}
            onOpenTermExplain={(term) => setActiveTermExplain(term)}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              setSelectedArticle(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSaveContract={handleSaveContract}
            onEnrichArticle={handleEnrichArticle}
            onRunSkill={runNewsSkill}
            onRunPersonaForecast={runPersonaForecast}
            contextArticles={articles}
            onOpenArticle={handleSelectArticle}
            onOpenShareCard={(art) => setShareCardArticle(art)}
            isDepositedInKnowledge={knowledgeItems.some((k) => k.articleId === selectedArticle.id)}
            onDepositToKnowledge={handleAddKnowledge}
          />
        )}


        {/* Home Page View */}
        {activeTab === 'home' && (
          <HomeView
            articles={articles}
            readingMode={homeReadingMode}
            onSelectReadingMode={setHomeReadingMode}
            selectedPersona={selectedPersona}
            radarKeywords={radarKeywords}
            bookmarkedIds={bookmarkedIds}
            followedTags={followedTags}
            interestGroups={interestGroups}
            onSelectArticle={handleSelectArticle}
            onSelectArticleWithTab={handleSelectArticleWithTab}
            onToggleBookmark={handleToggleBookmark}
            onToggleFollowTag={handleToggleFollowTag}
            onRunSkill={runNewsSkill}
            onOpenAudioBriefing={() => setIsAudioBriefingOpen(true)}
            onOpenAddRadar={() => setIsAddRadarOpen(true)}
            onRemoveRadar={handleRemoveRadar}
            onOpenTermExplain={(term) => setActiveTermExplain(term)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenShareCard={(art) => setShareCardArticle(art)}
          />
        )}


        {/* Intelligence Center Hub */}
        {activeTab === 'intelligence' && (
          <IntelligenceHubView
            selectedPersona={selectedPersona}
            contextArticles={articles}
            snapshot={snapshot}
            snapshotStatus={snapshotStatus}
            onRefreshSnapshot={refreshSnapshot}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectArticleTitle={(title) => {
              const matched = articles.find((a) => a.title.includes(title));
              if (matched) {
                handleSelectArticle(matched);
              }
            }}
            onOpenArticleById={(artId) => {
              const matched = articles.find((a) => a.id === artId);
              if (matched) {
                handleSelectArticle(matched);
              }
            }}
            onGoRegion={() => {
              setActiveTab('region');
              setSelectedArticle(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* Thematic Topics Archive */}
        {activeTab === 'topics' && (
          <TopicsView
            articles={articles}
            onSelectArticle={handleSelectArticle}
          />
        )}

        {/* 地区情报页 */}
        {activeTab === 'region' && (
          <RegionIntelligencePage
            articles={articles}
            onOpenArticleById={(artId) => {
              const matched = articles.find((a) => a.id === artId);
              if (matched) handleSelectArticle(matched);
            }}
          />
        )}

        {/* My Focus Workspace */}
        {activeTab === 'my_focus' && (
          <MyFocusView
            selectedPersona={selectedPersona}
            onSelectPersona={setSelectedPersonaId}
            radarKeywords={radarKeywords}
            articles={articles}
            onRemoveRadar={handleRemoveRadar}
            onOpenAddRadar={() => setIsAddRadarOpen(true)}
            followedTags={followedTags}
            onRemoveTag={handleToggleFollowTag}
            bookmarkedArticles={bookmarkedArticles}
            onSelectArticle={handleSelectArticle}
            onRemoveBookmark={handleToggleBookmark}
            predictionContracts={predictionContracts}
            onResolveContract={handleResolveContract}
            onReviewContract={handleReviewContract}
            onRemoveContract={handleRemoveContract}
            personalNotes={personalNotes}
            onPersonalNotesChange={setPersonalNotes}
            knowledgeItems={knowledgeItems}
            onAddKnowledge={handleAddKnowledge}
            onUpdateKnowledge={handleUpdateKnowledge}
            onRemoveKnowledge={handleRemoveKnowledge}
            onOpenArticleById={(artId) => {
              const matched = articles.find((a) => a.id === artId);
              if (matched) handleSelectArticle(matched);
            }}
            onOpenTermExplain={(term) => setActiveTermExplain(term)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminConsoleView />
        )}
        </Suspense>

      </main>

      {/* 3. Global Footer */}
      <footer className="bg-stone-900 text-stone-300 border-t-2 border-stone-950 mt-16 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 bg-[#E3120B] rounded text-white flex items-center justify-center font-serif font-black text-sm">
                  微
                </span>
                <span className="text-xl font-serif font-bold text-white tracking-tight">
                  见微 Genway
                </span>
                <span className="text-xs font-serif text-stone-400">
                  · 于细微处，读懂新闻背后
                </span>
              </div>
              <p className="text-xs text-stone-400 font-serif max-w-lg">
                报刊为骨，数据为翼，光谱拆解为记。服务于严肃决策者、投资机构与产业开拓者的 AI 新闻情报与认知分析平台。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
              <button
                onClick={() => setIsNameModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="查看见微产品全景图文白皮书、命名与设计哲学及 90 秒发布视频分镜"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E3120B]" />
                <span>产品说明与设计哲学 (Genway)</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-stone-500 font-mono">
            <div>© 2026 见微 Genway Intelligence Platform. All rights reserved.</div>
            <div className="mt-2 sm:mt-0">
              {articles.some((a) => a.isExternal)
                ? '运行时语料 · 外部信源条目保留原文链接；AI 解读与自评分未校准'
                : '当前没有真实语料；请在设置中配置 RSS 源并摄取'}
            </div>
          </div>
        </div>
      </footer>

      {(isAuthModalOpen || mustChangePassword) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mustChangePassword) void submitRequiredPasswordChange();
              else if (authMode === 'register') void submitRegistration();
              else void submitAuth();
            }}
            className="w-full max-w-sm bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                {mustChangePassword
                  ? '首次登录需修改密码'
                  : authMode === 'register'
                    ? '注册申请'
                    : '登录见微'}
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                {mustChangePassword
                  ? '当前密码由管理员设置或重置，修改完成前不能访问其他功能。'
                  : authMode === 'register'
                    ? '注册后需等待管理员审批。审批前可继续以游客身份浏览。'
                    : '使用已批准账号登录，或兼容旧版访问令牌。凭据只保存在本机浏览器。'}
              </p>
            </div>
            {mustChangePassword ? (
              <div className="space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="新密码，至少 12 位"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                />
                <p className="text-[10px] text-stone-400">
                  至少 12 位，并包含大小写字母、数字、符号或中文字符中的至少三类。
                </p>
              </div>
            ) : authMode === 'register' ? (
              registrationSubmitted ? (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3 text-xs text-emerald-900 leading-relaxed">
                  注册申请已提交，状态为“待审批”。管理员批准后即可使用完整功能。
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setRegistrationSubmitted(false);
                    }}
                    className="mt-3 w-full rounded-lg border border-emerald-400 bg-white px-3 py-2 font-serif font-bold"
                  >
                    返回登录
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="用户名"
                    autoComplete="username"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                  />
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="密码，至少 12 位"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                  />
                  <input
                    type="password"
                    value={registerConfirm}
                    onChange={(e) => setRegisterConfirm(e.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                  />
                  <p className="text-[10px] text-stone-400">
                    密码至少 12 位，并包含大小写字母、数字、符号或中文字符中的至少三类。
                  </p>
                </div>
              )
            ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="用户名"
                autoFocus
                autoComplete="username"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="密码"
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
              />
              <details>
                <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-800">使用旧版访问令牌</summary>
                <input
                  type="password"
                  value={authTokenInput}
                  onChange={(e) => setAuthTokenInput(e.target.value)}
                  placeholder="访问令牌"
                  autoComplete="off"
                  className="mt-2 w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                />
              </details>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className="text-xs font-serif font-bold text-[#E3120B] hover:text-red-800"
              >
                没有账号？提交注册申请
              </button>
            </div>
            )}
            {authError && <p className="text-xs text-red-700">{authError}</p>}
            <button
              type="submit"
              disabled={
                mustChangePassword
                  ? newPassword.length < 12
                  : authMode === 'register'
                    ? registrationSubmitted ||
                      registerUsername.trim().length < 2 ||
                      registerPassword.length < 12 ||
                      registerPassword !== registerConfirm
                    : !authTokenInput.trim() && (!authUsername.trim() || authPassword.length < 12)
              }
              className="w-full px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-serif font-bold hover:bg-red-700 transition-colors"
            >
              {mustChangePassword
                ? '修改密码'
                : authMode === 'register'
                  ? registrationSubmitted ? '等待审批' : '提交注册申请'
                  : '进入见微'}
            </button>
            {!mustChangePassword && (
              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setAuthError('');
                }}
                className="w-full text-center text-xs text-stone-500 hover:text-stone-900"
              >
                暂不登录，继续以游客身份浏览
              </button>
            )}
          </form>
        </div>
      )}

      {/* 4. Global Modals */}
      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsModal
            isOpen
            onClose={() => setIsSettingsOpen(false)}
            nickname={nickname}
            onNicknameChange={setNickname}
            radarKeywords={radarKeywords}
            articles={articles}
            interestGroups={interestGroups}
            onInterestGroupsChange={setInterestGroups}
            followedTags={followedTags}
            onFollowedTagsChange={setFollowedTags}
            onRemoveRadar={handleRemoveRadar}
            onAddRadarOpen={() => setIsAddRadarOpen(true)}
            selectedPersona={selectedPersona}
          />
        )}

        {isCognitiveModelOpen && (
          <CognitiveModelModal
            isOpen
            onClose={() => setIsCognitiveModelOpen(false)}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              setSelectedArticle(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTermExplain && (
          <TermExplainModal
            term={activeTermExplain}
            onClose={() => setActiveTermExplain(null)}
          />
        )}

        {isAudioBriefingOpen && (
          <AudioBriefingModal
            isOpen
            onClose={() => setIsAudioBriefingOpen(false)}
            articles={articles}
            selectedPersona={selectedPersona}
          />
        )}

        {isSearchOpen && (
          <SearchModal
            isOpen
            onClose={() => setIsSearchOpen(false)}
            articles={articles}
            radarKeywords={radarKeywords}
            topics={TOPIC_CLUSTERS}
            onSelectArticle={handleSelectArticle}
            onSelectTopic={(topicId) => {
              setActiveTab('topics');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {isAddRadarOpen && (
          <AddRadarModal
            isOpen
            onClose={() => setIsAddRadarOpen(false)}
            onAddRadar={handleAddRadar}
          />
        )}

        {isNameModalOpen && (
          <NameExplanationModal
            isOpen
            onClose={() => setIsNameModalOpen(false)}
          />
        )}

        {isAnalyzeOpen && (
          <AnalyzeModal
            isOpen
            onClose={() => setIsAnalyzeOpen(false)}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {shareCardArticle && (
          <ShareCardModal
            isOpen={!!shareCardArticle}
            onClose={() => setShareCardArticle(null)}
            article={shareCardArticle}
            selectedPersona={selectedPersona}
          />
        )}
      </Suspense>
    </div>
  );
};

export default App;
