import React, { lazy, Suspense, useRef, useState, useEffect, useMemo } from 'react';
import localforage from 'localforage';
import { 
  PrimaryNavTab, 
  HomeReadingMode, 
  UserPersona, 
  UserPersonaId, 
  NewsArticle, 
  RadarKeyword,
  PredictionContract,
  CognitiveDetailTab,
  KnowledgeItem,
  ReadingDensity,
  DefaultReadingRhythm,
} from './types';

import { 
  USER_PERSONAS, 
  INITIAL_RADAR_KEYWORDS, 
  TOPIC_CLUSTERS,
  INITIAL_PREDICTION_CONTRACTS,
  INITIAL_KNOWLEDGE_ITEMS
} from './data/intelligenceData';
import { Header } from './components/Header';
import { HomeView, NewsSkill } from './components/home/HomeView';
import { useLocalState } from './hooks/useLocalState';
import { useSnapshot } from './hooks/useSnapshot';
import { corpusDerived, deriveFromList } from './utils/corpusMetrics';
import { parseArticleDate } from './utils/articleTime';
import { logUserActivity } from './utils/activityTracker';
import { appendActionMemo } from './utils/actionMemo';
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

const LEGACY_DEMO_PREDICTION_IDS = new Set(['contract-agent-2026', 'contract-semi-historical']);

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

const INDEXED_DB_CORPUS_KEY = 'jianwei:indexeddb-corpus-v2';
const SESSION_CORPUS_CACHE_KEY = 'jianwei:cached-corpus-v1';

// 创建 localforage IndexedDB 存储实例，替代 sessionStorage 以支持大规模语料持久化存储并防止配额溢出
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
    // 兼容迁移：若旧版本数据保存在 sessionStorage 中，无缝平滑迁移至 IndexedDB
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

// 异步持久化保存全量语料至 IndexedDB（海量数据无 5MB 配额溢出风险）
async function saveCachedCorpus(articlesList: NewsArticle[]): Promise<void> {
  try {
    if (!articlesList || articlesList.length === 0) return;
    await corpusDB.setItem(INDEXED_DB_CORPUS_KEY, articlesList);
  } catch (err) {
    console.warn('Save IndexedDB corpus error:', err);
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

/** 技能型生成结果合并：把返回字段写回文章 */
function mergeSkillArticle(article: NewsArticle, overrides: Record<string, unknown>): NewsArticle {
  const next: NewsArticle = { ...article };
  const keys = ['tongsuSummary', 'dehydratedItems', 'aiInterpretation', 'sevenWBrief', 'trendForecastText', 'riskReviewText', 'backstoryTimeline', 'stakeholderImpact', 'coreLogic', 'bullBearDebate', 'relatedNews', 'personaForecasts', 'aiFieldMeta'] as const;
  for (const key of keys) {
    const value = overrides[key];
    if (value !== undefined && value !== null) {
      (next as any)[key] = value;
    }
  }
  return next;
}

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<AppViewTab>(() => parseLocationHash().tab);
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(() =>
    parseLocationHash().tab === 'detail' ? parseLocationHash().articleId : null
  );
  // 身份透镜与首页阅读模式为 UI 偏好，持久化保存
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

  // Core Data State
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const corpusAuthoritativeRef = useRef(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<CognitiveDetailTab>('seven_elements');
  const articlesRef = useRef<NewsArticle[]>(articles);
  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  // 组件挂载时异步读取 IndexedDB 中持久化的海量语料库
  useEffect(() => {
    let active = true;
    loadCachedCorpus().then((cached) => {
      if (active && !corpusAuthoritativeRef.current && cached && cached.length > 0) {
        setArticles(cached);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // 浏览空闲期预加载延迟组件（Sub-10ms 极速页面切换与弹窗零延迟体验）
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

  // 持久化用户数据：以下状态自动写入 localStorage（useLocalState）
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

  const handleAddKnowledge = (item: KnowledgeItem) => {
    setKnowledgeItems((prev) => [item, ...prev.filter((i) => i.id !== item.id && i.title !== item.title)]);
    logUserActivity({
      action: 'knowledge.deposit',
      entityType: 'knowledge',
      entityId: item.id,
      metadata: { title: item.title, category: item.category },
    });
  };


  const handleUpdateKnowledge = (id: string, updates: Partial<KnowledgeItem>) => {
    setKnowledgeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveKnowledge = (id: string) => {
    setKnowledgeItems((prev) => prev.filter((item) => item.id !== id));
  };

  const preferencesHydratedRef = useRef(false);
  const preferencesVersionRef = useRef(0);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  // 全局加载状态指示器计数器
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

  const trackLoading = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setActiveRequests((c) => c + 1);
    try {
      return await fn();
    } finally {
      setActiveRequests((c) => Math.max(0, c - 1));
    }
  };

  // 旧版雷达对象带随机/静态示例数字；自本版起展示口径改为按语料实时派生，
  // 这里一次性清掉残留字段，避免后续代码或导出仍读到旧数字。
  useEffect(() => {
    setRadarKeywords((prev) =>
      prev.map((rk) => ({
        ...rk,
        count: 0,
        countChange: '',
        sentimentTrend: '',
        marketAttention: '',
        recentNewsTitle: '',
      }))
    );
  }, []);

  useEffect(() => {
    setPredictionContracts((prev) =>
      prev.filter((contract) => !LEGACY_DEMO_PREDICTION_IDS.has(contract.id))
    );
  }, []);

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
              /* 保留为未存证本地记录，不进入校准。 */
            }
          }
          merged.set(local.id, { ...local, ledger: 'local', integrityValid: false });
        }

        if (alive) setPredictionContracts([...merged.values()]);
      } catch {
        /* 服务不可达时保留本地状态，但未存证记录不会进入校准。 */
      }
    };
    void syncLedger();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setRadarKeywords((prev) => prev.filter((item) => !/^rk-[1-6]$/.test(item.id)));
    setBookmarkedIds((prev) => prev.filter((id) => id !== 'news-ai-agent-breakthrough'));
    setFollowedTags((prev) => prev.filter((tag) => tag !== '先进封装' && tag !== 'AI Agent'));
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
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddRadarOpen, setIsAddRadarOpen] = useState(false);
  const [isAudioBriefingOpen, setIsAudioBriefingOpen] = useState(false);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isCognitiveModelOpen, setIsCognitiveModelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [shareCardArticle, setShareCardArticle] = useState<NewsArticle | null>(null);
  const [activeTermExplain, setActiveTermExplain] = useState<string | null>(null);

  const selectedPersona: UserPersona =
    USER_PERSONAS.find((p) => p.id === selectedPersonaId) || USER_PERSONAS[0];

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
        setAuthMode('register');
      } else if (detail.error === 'password_change_required') {
        setMustChangePassword(true);
      } else {
        setAuthError(detail.message || '该功能需要注册并完成审批。');
        setAuthMode('login');
      }
      setIsAuthModalOpen(true);
    };
    window.addEventListener('jianwei:auth-required', handleAuthRequired);
    return () => window.removeEventListener('jianwei:auth-required', handleAuthRequired);
  }, []);

  const submitAuth = async (form?: HTMLFormElement | null) => {
    setAuthError('');
    // 浏览器自动填充可能只改 DOM、不触发 onChange；提交时以表单值为准。
    const fd = form ? new FormData(form) : null;
    const username = String(fd?.get('username') ?? authUsername).trim();
    const password = String(fd?.get('password') ?? authPassword);
    const accessToken = String(fd?.get('accessToken') ?? authTokenInput).trim();
    if (username) setAuthUsername(username);
    if (password) setAuthPassword(password);
    if (accessToken) setAuthTokenInput(accessToken);

    if (!accessToken && (!username || password.length < 6)) {
      setAuthError(!username ? '请输入用户名。' : '密码至少 6 位。');
      return;
    }

    setAuthSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          accessToken
            ? { accessToken }
            : { username, password }
        ),
      });
      const data = await response.json();
      if (!response.ok || !data?.token) {
        setAuthError(
          data?.error === 'pending_approval'
            ? '账号正在等待管理员审批。'
            : data?.error === 'rejected'
              ? '注册申请未通过，请联系管理员。'
              : data?.error === 'inactive'
                ? '账号已停用，请联系管理员。'
                : '登录失败：账号、密码或访问令牌无效。'
        );
        return;
      }
      localStorage.setItem('jianwei:auth-token', data.token);
      setAuthUser(data.user || null);
      if (data.user?.mustChangePassword) {
        setMustChangePassword(true);
        setAuthRequired(false);
        setIsAuthModalOpen(true);
        return;
      }
      setAuthRequired(false);
      window.location.reload();
    } catch {
      setAuthError('登录服务不可达，请确认本地服务已启动。');
    } finally {
      setAuthSubmitting(false);
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
              ? '密码至少 6 位。'
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
            ? '密码不符合要求或当前密码错误。密码至少 6 位。'
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

  // Handlers
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

  const handleToggleBookmark = (artId: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(artId) ? prev.filter((id) => id !== artId) : [...prev, artId]
    );
  };

  const handleToggleFollowTag = (tag: string) => {
    setFollowedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddRadar = (newR: RadarKeyword) => {
    setRadarKeywords((prev) => [newR, ...prev]);
  };

  const handleRemoveRadar = (id: string) => {
    setRadarKeywords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveContract = async (contract: PredictionContract): Promise<boolean> => {
    try {
      // 本地状态即刻写入与持久化锁定，保证无论网络/服务端状态如何均能成功建立契约
      setPredictionContracts((prev) => [
        contract,
        ...prev.filter((c) => c.id !== contract.id),
      ]);
      // 后台异步同步至服务端存证池
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
      }).catch(() => {/* 忽略后台同步网络抖动，前端已安全存储 */});
      return true;
    } catch {
      return true;
    }
  };

  const handleResolveContract = async (
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
  };

  const handleRemoveContract = async (id: string): Promise<boolean> => {
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
  };

  const handleReviewContract = async (
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
  };

  // 浅层文章经 /api/enrich 懒加载补全后：同步更新列表与当前选中文章
  const handleEnrichArticle = (updated: NewsArticle) => {
    setArticles((prev) => {
      const next = prev.map((a) => (a.id === updated.id ? updated : a));
      saveCachedCorpus(next);
      return next;
    });
    setSelectedArticle((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleAnalysisComplete = (newArticle: NewsArticle) => {
    setArticles((prev) => {
      const next = [newArticle, ...prev];
      saveCachedCorpus(next);
      return next;
    });
    setSelectedArticle(newArticle);
    setDetailInitialTab('seven_elements');
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 统一技能调用：sevenw/trend/risk 等 → /api/skill/:name → 合并 → 更新列表
  const runNewsSkill = async (skill: NewsSkill, article: NewsArticle): Promise<NewsArticle | null> => {
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
  };

  // 身份化「正反双向预测」：POST /api/skill/personaforecast → 按身份合并 → 更新列表
  const runPersonaForecast = async (persona: UserPersona, article: NewsArticle): Promise<NewsArticle | null> => {
    return trackLoading(async () => {
      try {
        // 组装已有深度字段作上下文（克制、只引已存在内容，避免 AI 空想）
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
  };

  // 情报数据层：服务端派生快照；失败或空语料时由面板显示空态。
  const { snapshot, status: snapshotStatus, refresh: refreshSnapshot } = useSnapshot();

  // 用户昵称（设置页与 Header 问候共享同一状态源）
  const [nickname, setNickname] = useLocalState<string>('user-nickname', '');
  const [readingDensity, setReadingDensity] = useLocalState<ReadingDensity>(
    'reading-density',
    'comfortable',
    { version: 1 }
  );
  const [defaultRhythm, setDefaultRhythm] = useLocalState<DefaultReadingRhythm>(
    'default-rhythm',
    'classic',
    { version: 1 }
  );

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
      if (payload.readingDensity === 'comfortable' || payload.readingDensity === 'compact') {
        setReadingDensity(payload.readingDensity);
      }
      if (payload.defaultRhythm === 'classic' || payload.defaultRhythm === 'fast_dialogue' || payload.defaultRhythm === 'data_driven') {
        setDefaultRhythm(payload.defaultRhythm);
      }
    };
    const absorbStrayActionMemo = () => {
      let stray = '';
      try {
        stray = localStorage.getItem('action-memo') || '';
        if (stray) localStorage.removeItem('action-memo');
      } catch {
        return;
      }
      if (!stray.trim()) return;
      setPersonalNotes((prev) => appendActionMemo(prev, stray));
    };
    fetch('/api/preferences')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!alive) return;
        if (!data) {
          absorbStrayActionMemo();
          return;
        }
        applyServerPreferences(data.payload);
        absorbStrayActionMemo();
        preferencesVersionRef.current = Number(data.version || 0);
        preferencesHydratedRef.current = true;
        setPreferencesHydrated(true);
      })
      .catch(() => {
        if (alive) absorbStrayActionMemo();
      });
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
        readingDensity,
        defaultRhythm,
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
        /* 离线时继续使用本地偏好，下次状态变化再尝试同步。 */
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
    readingDensity,
    defaultRhythm,
  ]);

  // 顶栏情绪值口径：与首页 Hero 一致——“今日(本地日期)发布优先，样本不足回退近30天”
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

  // 服务端运行时语料合并：启动预热摄取后首页应直接可见；空结果短等再拉一次，避免覆盖本地缓存
  useEffect(() => {
    const controller = new AbortController();
    const pageSize = 200;
    const maxLoaded = 10000;
    let cancelled = false;
    const fetchAllPages = async (): Promise<NewsArticle[]> => {
      const collected: NewsArticle[] = [];
      const seen = new Set<string>();
      let offset = 0;
      let loadedCount = 0;
      while (loadedCount < maxLoaded) {
        const res = await fetch(`/api/corpus?limit=${pageSize}&offset=${offset}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`corpus ${res.status}`);
        const json = await res.json();
        const page: NewsArticle[] = Array.isArray(json?.corpus) ? json.corpus : [];
        loadedCount += page.length;
        for (const article of page) {
          if (!article?.id || seen.has(article.id)) continue;
          seen.add(article.id);
          collected.push(article);
        }
        const hasMore = Boolean(json?.meta?.hasMore) && page.length > 0 && loadedCount < maxLoaded;
        if (!hasMore) break;
        offset += page.length;
      }
      return collected;
    };
    const loadAll = async (): Promise<void> => {
      setActiveRequests((c) => c + 1);
      try {
        let collected = await fetchAllPages();
        // 启动瞬间语料可能尚在 boot ingest：空则等待后再拉一次
        if (collected.length === 0 && !cancelled) {
          await new Promise((r) => setTimeout(r, 3500));
          if (!cancelled) collected = await fetchAllPages();
        }
        if (cancelled) return;
        corpusAuthoritativeRef.current = true;
        if (collected.length > 0) {
          setArticles(collected);
          saveCachedCorpus(collected);
        } else if (articlesRef.current.length === 0) {
          setArticles([]);
        }
        // 若服务端仍空但本地有缓存，保留缓存，不强制清空
      } finally {
        setActiveRequests((c) => Math.max(0, c - 1));
      }
    };
    loadAll()
      .catch(() => {
        /* 服务不可达：保留当前已加载的数据，不注入示例语料 */
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const bookmarkedArticles = articles.filter((a) => bookmarkedIds.includes(a.id));

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
            predictionContracts={predictionContracts}
            onEnrichArticle={handleEnrichArticle}
            onRunSkill={runNewsSkill}
            onRunPersonaForecast={runPersonaForecast}
            onAppendActionMemo={(entry) => setPersonalNotes((prev) => appendActionMemo(prev, entry))}
            readingDensity={readingDensity}
            defaultRhythm={defaultRhythm}
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
            onOpenAnalyze={() => setIsAnalyzeOpen(true)}
            readingDensity={readingDensity}
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
            predictionContracts={predictionContracts}
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
              else void submitAuth(e.currentTarget);
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
                  placeholder="新密码，至少 6 位"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                />
                <p className="text-[10px] text-stone-400">
                  密码至少 6 位。首次登录改密后需用新密码重新登录。
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
                    placeholder="密码，至少 6 位"
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
                    密码至少 6 位。注册后需管理员批准方可完整使用。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                    }}
                    className="text-xs font-serif font-bold text-[#E3120B] hover:text-red-800"
                  >
                    已有账号？去登录
                  </button>
                </div>
              )
            ) : (
            <div className="space-y-3">
              <input
                type="text"
                name="username"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="用户名"
                autoFocus
                autoComplete="username"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
              />
              <input
                type="password"
                name="password"
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
                  name="accessToken"
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
                authSubmitting ||
                (mustChangePassword
                  ? newPassword.length < 6
                  : authMode === 'register'
                    ? registrationSubmitted ||
                      registerUsername.trim().length < 2 ||
                      registerPassword.length < 6 ||
                      registerPassword !== registerConfirm
                    : false)
              }
              className="w-full px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-serif font-bold enabled:hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {authSubmitting
                ? '登录中…'
                : mustChangePassword
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
            readingDensity={readingDensity}
            onReadingDensityChange={setReadingDensity}
            defaultRhythm={defaultRhythm}
            onDefaultRhythmChange={setDefaultRhythm}
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
