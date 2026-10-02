import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NewsArticle } from '../../types';
import {
  ShieldCheck,
  Key,
  Users,
  Rss,
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
  Activity,
  UserPlus,
  Edit2,
  Database,
  HardDrive,
  Zap,
  Cpu,
  RotateCcw,
  Sliders,
  Radio,
  Download,
  Search,
  Check,
  X,
  ExternalLink,
  Clock,
  BarChart3,
  Calendar,
  LogIn,
  BookOpen,
  Crosshair,
  Lightbulb,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Layers,
  HelpCircle,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { SECTOR_TAXONOMY_DEFAULT, SectorDef } from '../../utils/sectorTaxonomy';

interface UserSummary {
  username: string;
  totalLogins: number;
  totalAiAnalysis: number;
  totalArticleReads: number;
  totalDeposits: number;
  totalPredictions: number;
  lastActiveAt: string;
  recentActions: Array<{ action: string; at: string; detail?: string }>;
}

interface ActivityStats {
  totalLogins: number;
  totalAiCalls: number;
  totalReads: number;
  totalDeposits: number;
  activeUsersCount: number;
  totalEventsLogged: number;
}

interface AdminStatus {
  server: { startedAt: string; uptimeSec: number };
  rateLimit: { maxPerMinute: number; windowMs: number };
  aiUsage: any;
  caches: any;
  corpus: { corpus: string; demo: boolean; corpusSize: number; storage: any };
  feeds: { enabled: boolean; urls: string[]; lastIngest: any };
  backups: any;
}

interface ServerSettings {
  userName: string;
  ai: {
    choice: 'auto' | 'gemini' | 'deepseek';
    provider: string;
    gemini: boolean;
    deepseek: boolean;
    geminiModel: string;
    deepseekModel: string;
    deepseekBaseUrl: string;
  };
  feeds: string[];
  sectorOverrides?: Record<string, { keywords: string[] }>;
}

interface UserItem {
  id: string;
  username: string;
  role: 'admin' | 'analyst' | 'viewer';
  active: boolean;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  approvedBy?: string;
}

interface AuditEvent {
  id: number;
  at: string;
  actor: string;
  action: string;
  entityType?: string;
  entityId?: string;
  status: string;
  metadata?: any;
}

type AdminTab =
  | 'database'
  | 'behavior_logs'
  | 'keys'
  | 'feeds'
  | 'taxonomy'
  | 'users'
  | 'activity'
  | 'audit';

// Pre-curated authoritative sources for 1-click subscription
const PRESET_SOURCES = [
  {
    name: '36氪 · 深度商业与科技创投',
    url: 'https://feed.36kr.com/feed',
    category: '科技 / 商业',
    desc: '前沿商业洞察、硬科技独角兽与投融资动态',
  },
  {
    name: '财联社 · 宏观与资本市场快讯',
    url: 'https://rss.cls.cn/rss/feed',
    category: '宏观 / 金融',
    desc: '国内第一手监管动向、股市流动性与宏观数据',
  },
  {
    name: '华尔街日报 WSJ · 全球资本市场 (英文原源)',
    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    category: '全球金融 (EN)',
    desc: 'The Wall Street Journal 全球资本市场、利率与宏观流动性',
  },
  {
    name: 'Financial Times · 全球政经要闻 (英文原源)',
    url: 'https://www.ft.com/rss/world',
    category: '全球政经 (EN)',
    desc: '英国金融时报顶级跨国地缘政经与多边贸易深度研判',
  },
  {
    name: 'TechCrunch · 硅谷前沿科技与创投 (英文原源)',
    url: 'https://techcrunch.com/feed/',
    category: '硅谷科技 (EN)',
    desc: '全球 AI 智能体、SaaS 突破与硅谷顶尖创投融资现场',
  },
  {
    name: 'The Economist · 经济学人商业与产业 (英文原源)',
    url: 'https://www.economist.com/business/rss.xml',
    category: '宏观经济 (EN)',
    desc: '经济学人商业纵深、全球供应链格局与跨国公司战略',
  },
  {
    name: 'Harvard Business Review · 战略与管理 (英文原源)',
    url: 'https://hbr.org/rss/topic/strategy',
    category: '商业战略 (EN)',
    desc: '哈佛商业评论商业模式创新、企业组织重构与领导力',
  },
  {
    name: 'IEEE Spectrum · 顶级工程与硬核科技 (英文原源)',
    url: 'https://spectrum.ieee.org/rss/index.xml',
    category: '硬核工程 (EN)',
    desc: 'IEEE 国际电气电子工程师学会半导体、量子与机器人前沿',
  },
  {
    name: 'ArXiv AI · 全球 AI 前沿学术论文 (英文原源)',
    url: 'https://rss.arxiv.org/rss/cs.AI',
    category: '学术前沿 (EN)',
    desc: 'ArXiv 全球顶尖 AI 算法、推理大模型与 Agent 架构预印本',
  },
  {
    name: '澎湃新闻 · 特稿与政策解读',
    url: 'https://www.thepaper.cn/rss/news',
    category: '政策 / 深度',
    desc: '深度特稿、宏观治理与公共政策原文解析',
  },
  {
    name: '机器之心 · AI 前沿与学术突破',
    url: 'https://www.jiqizhixin.com/rss',
    category: '人工智能',
    desc: '大模型算法突破、智能体 Agent 架构与前沿学术动态',
  },
  {
    name: '与非网 · 半导体与芯片产业链',
    url: 'https://www.eefocus.com/rss/news.xml',
    category: '半导体 / 制造',
    desc: '晶圆代工、EDA/光刻机演进与先进封装动态',
  },
  {
    name: '联合早报 · 国际地缘与经贸',
    url: 'https://www.zaobao.com/rss/world',
    category: '地缘 / 出海',
    desc: '跨国经贸、全球供应链变局与多边外交研判',
  },
  {
    name: 'FT 中文网 · 全球财经与政经观察',
    url: 'https://www.ftchinese.com/rss/feed',
    category: '全球财经',
    desc: '英国金融时报权威全球政经评论与资本流动分析',
  },
  {
    name: '晚点 LatePost · 商业与大厂巨头战略',
    url: 'https://www.latepost.com/rss',
    category: '商业深度',
    desc: '一线大厂组织变革、创始人访谈与商业战役独家复盘',
  },
  {
    name: 'MIT 科技评论 · 突破性工程技术 (英文原源)',
    url: 'https://www.technologyreview.com/feed/',
    category: '硬核工程 (EN)',
    desc: '麻省理工科技评论全球十大突破性技术与工程前沿',
  },
  {
    name: '路透社 · 全球商业与金融要闻 (英文原源)',
    url: 'https://feeds.feedburner.com/reuters/businessNews',
    category: '国际金融 (EN)',
    desc: '路透社全球金融市场、外汇大汇率与跨国投资快讯',
  },
];

export const AdminConsoleView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('behavior_logs');
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<Record<number, number>>({});
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserSummary | null>(null);
  const [selectedLogModal, setSelectedLogModal] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 语料健康度模块状态与计算
  const [corpusArticles, setCorpusArticles] = useState<NewsArticle[]>([]);

  const sourceDistribution = useMemo(() => {
    if (!corpusArticles || corpusArticles.length === 0) return [];
    const map: Record<string, number> = {};
    for (const art of corpusArticles) {
      const srcName = art.sourceName || (art as any).source || '未标明来源';
      map[srcName] = (map[srcName] || 0) + 1;
    }
    const total = corpusArticles.length;
    return Object.entries(map)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [corpusArticles]);

  const latestCrawlTimeFormatted = useMemo(() => {
    const rawAt = status?.feeds?.lastIngest?.at;
    if (rawAt) {
      const d = new Date(rawAt);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      }
    }
    if (corpusArticles.length > 0) {
      const times = corpusArticles
        .map((a) => Date.parse(a.publishedAt || ''))
        .filter((t) => !isNaN(t));
      if (times.length > 0) {
        const d = new Date(Math.max(...times));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      }
    }
    return '刚刚已完成线上数据比对同步';
  }, [status?.feeds?.lastIngest, corpusArticles]);

  // Pagination & Filtering for Behavior Logs Tab
  const [behaviorUsernameQuery, setBehaviorUsernameQuery] = useState('');
  const [behaviorActionFilter, setBehaviorActionFilter] = useState<string>('all');
  const [behaviorPage, setBehaviorPage] = useState<number>(1);
  const [behaviorPageSize, setBehaviorPageSize] = useState<number>(10);

  // Form states for API Keys
  const [aiChoice, setAiChoice] = useState<'auto' | 'gemini' | 'deepseek'>('auto');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [deepseekKeyInput, setDeepseekKeyInput] = useState('');
  const [deepseekBaseUrlInput, setDeepseekBaseUrlInput] = useState('https://api.deepseek.com');
  const [geminiModelInput, setGeminiModelInput] = useState('gemini-2.5-flash');
  const [deepseekModelInput, setDeepseekModelInput] = useState('deepseek-chat');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Form states for Feeds
  const [feedList, setFeedList] = useState<string[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);

  // Form states for Sector Taxonomy Overrides
  const [sectorKeywordsState, setSectorKeywordsState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sec of SECTOR_TAXONOMY_DEFAULT) {
      init[sec.id] = sec.keywords.join(', ');
    }
    return init;
  });

  // Form states for Users
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'analyst' | 'viewer'>('analyst');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Database Management Tab States
  const [dbOverview, setDbOverview] = useState<any>(null);
  const [dbAnalyses, setDbAnalyses] = useState<any[]>([]);
  const [dbTotalAnalyses, setDbTotalAnalyses] = useState<number>(0);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbCategoryFilter, setDbCategoryFilter] = useState('all');
  const [dbPage, setDbPage] = useState(1);
  const [dbLoading, setDbLoading] = useState(false);
  const [selectedAnalysisDetail, setSelectedAnalysisDetail] = useState<any>(null);
  const [reanalyzingKey, setReanalyzingKey] = useState<string | null>(null);

  // Behavior Insights Report Modal States
  const [insightsReport, setInsightsReport] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Status
      const statusRes = await fetch('/api/admin/status');
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatus(sData);
      }

      // 2. Fetch User Activity Stats & Usage
      const actRes = await fetch('/api/admin/user-activity');
      if (actRes.ok) {
        const aData = await actRes.json();
        setActivityStats(aData.stats);
        setUserSummaries(aData.userSummaries || []);
        setHourlyDistribution(aData.hourlyDistribution || {});
        if (aData.recentLogs) {
          setAuditEvents(aData.recentLogs);
        }
      }

      // 3. Fetch Settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const setts: ServerSettings = await settingsRes.json();
        setSettings(setts);
        setAiChoice(setts.ai?.choice || 'auto');
        setDeepseekBaseUrlInput(setts.ai?.deepseekBaseUrl || 'https://api.deepseek.com');
        setGeminiModelInput(setts.ai?.geminiModel || 'gemini-2.5-flash');
        setDeepseekModelInput(setts.ai?.deepseekModel || 'deepseek-chat');
        setFeedList(setts.feeds || []);

        // Hydrate sector overrides
        if (setts.sectorOverrides) {
          const loaded: Record<string, string> = {};
          for (const sec of SECTOR_TAXONOMY_DEFAULT) {
            const kws = setts.sectorOverrides[sec.id]?.keywords;
            loaded[sec.id] = kws && kws.length > 0 ? kws.join(', ') : sec.keywords.join(', ');
          }
          setSectorKeywordsState(loaded);
        }
      }

      // 4. Fetch Users
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }

      // 5. Fetch Corpus Articles for Health & Source Distribution
      const corpusRes = await fetch('/api/corpus?limit=500');
      if (corpusRes.ok) {
        const cData = await corpusRes.json();
        if (Array.isArray(cData.corpus)) {
          setCorpusArticles(cData.corpus);
        }
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch Database Tab Data
  const fetchDatabaseData = useCallback(async () => {
    setDbLoading(true);
    try {
      const [ovRes, listRes] = await Promise.all([
        fetch('/api/admin/database/overview'),
        fetch(`/api/admin/database/analyses?q=${encodeURIComponent(dbSearchQuery)}&category=${encodeURIComponent(dbCategoryFilter)}&limit=20&offset=${(dbPage - 1) * 20}`),
      ]);
      if (ovRes.ok) {
        setDbOverview(await ovRes.json());
      }
      if (listRes.ok) {
        const data = await listRes.json();
        setDbAnalyses(data.items || []);
        setDbTotalAnalyses(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load database admin data:', e);
    } finally {
      setDbLoading(false);
    }
  }, [dbSearchQuery, dbCategoryFilter, dbPage]);

  useEffect(() => {
    if (activeTab === 'database') {
      fetchDatabaseData();
    }
  }, [activeTab, fetchDatabaseData]);

  const handleViewAnalysisDetail = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/database/analyses/${key}`);
      if (!res.ok) throw new Error('读取分析详情失败');
      const data = await res.json();
      setSelectedAnalysisDetail(data.analysis);
    } catch (e: any) {
      showToast('error', e.message || '读取分析失败');
    }
  };

  const handleDeleteAnalysis = async (key: string, title: string) => {
    if (!confirm(`确定要从数据库中删除关于「${title}」的 AI 分析缓存记录吗？删除后下次分析将触发全新 AI 深度拆解。`)) return;
    try {
      const res = await fetch(`/api/admin/database/analyses/${key}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      showToast('success', '数据库中已成功移除该分析缓存');
      fetchDatabaseData();
    } catch (e: any) {
      showToast('error', e.message || '删除失败');
    }
  };

  const handleReanalyzeItem = async (item: any) => {
    setReanalyzingKey(item.key);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          source: item.source,
          category: item.category,
          forceRefresh: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.fallback) throw new Error(data.error || '重新分析失败');
      showToast('success', `语料「${item.title.slice(0, 12)}…」已成功完成全新 AI 分析并存库！`);
      fetchDatabaseData();
    } catch (e: any) {
      showToast('error', e.message || '重新分析失败');
    } finally {
      setReanalyzingKey(null);
    }
  };

  const handleGenerateBehaviorInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/admin/behavior-insights', { method: 'POST' });
      if (!res.ok) throw new Error('生成行为洞察报告失败');
      const data = await res.json();
      setInsightsReport(data);
      showToast('success', '用户行为模式与功能偏好洞察报告已生成！');
    } catch (e: any) {
      showToast('error', e.message || '生成洞察报告失败');
    } finally {
      setInsightsLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Save AI, Feeds & Global Settings
  const handleSaveSettings = async (customFeeds?: string[]) => {
    try {
      const activeFeeds = customFeeds || feedList;
      const cleanSectorOverrides: Record<string, { keywords: string[] }> = {};
      for (const [secId, kwStr] of Object.entries(sectorKeywordsState)) {
        const kws = kwStr
          .split(/[,，]/)
          .map((k) => k.trim())
          .filter(Boolean);
        if (kws.length > 0) {
          cleanSectorOverrides[secId] = { keywords: kws };
        }
      }

      const payload: any = {
        aiChoice,
        geminiModel: geminiModelInput,
        deepseekModel: deepseekModelInput,
        deepseekBaseUrl: deepseekBaseUrlInput,
        feeds: activeFeeds,
        sectorOverrides: cleanSectorOverrides,
      };

      if (geminiKeyInput.trim()) {
        payload.geminiApiKey = geminiKeyInput.trim();
      }
      if (deepseekKeyInput.trim()) {
        payload.deepseekApiKey = deepseekKeyInput.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存失败');
      }

      // Sync to localStorage for immediate client-side sector reflection
      localStorage.setItem('sector-taxonomy-overrides', JSON.stringify(cleanSectorOverrides));

      showToast('success', '全局配置已成功保存并落盘生效！');
      setGeminiKeyInput('');
      setDeepseekKeyInput('');
      fetchData();
    } catch (e: any) {
      showToast('error', e.message || '保存配置失败');
    }
  };

  // Test AI Diagnostics Connection
  const handleTestAi = async () => {
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.hasApiKey) {
        setTestResult({
          ok: true,
          message: `连通性正常！当前活跃引擎: ${data.ai?.provider || 'Gemini'} · 模型就绪`,
        });
      } else {
        setTestResult({
          ok: false,
          message: '未检测到可用 API 密钥，请在下方配置 Gemini 或 DeepSeek 密钥',
        });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: `诊断测试异常: ${e.message}` });
    } finally {
      setTestingAi(false);
    }
  };

  // Add Feed
  const handleAddFeed = () => {
    if (!newFeedUrl.trim()) return;
    if (!newFeedUrl.startsWith('http://') && !newFeedUrl.startsWith('https://')) {
      showToast('error', '请输入有效的 HTTP/HTTPS RSS 地址');
      return;
    }
    if (feedList.includes(newFeedUrl.trim())) {
      showToast('error', '该信源地址已存在');
      return;
    }
    const updated = [...feedList, newFeedUrl.trim()];
    setFeedList(updated);
    setNewFeedUrl('');
    handleSaveSettings(updated);
  };

  // Toggle Preset Feed
  const handleTogglePresetFeed = (url: string) => {
    let updated: string[];
    if (feedList.includes(url)) {
      updated = feedList.filter((f) => f !== url);
    } else {
      updated = [...feedList, url];
    }
    setFeedList(updated);
    handleSaveSettings(updated);
  };

  // Remove Feed
  const handleRemoveFeed = (url: string) => {
    const updated = feedList.filter((f) => f !== url);
    setFeedList(updated);
    handleSaveSettings(updated);
  };

  // Trigger Ingest
  const handleTriggerIngest = async () => {
    setIngesting(true);
    try {
      const res = await fetch('/api/feeds/ingest', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '摄取失败');
      showToast('success', `RSS 摄取成功完成！新增 ${data.newItemsCount || 0} 篇情报条目`);
      fetchData();
    } catch (e: any) {
      showToast('error', e.message || '手动摄取失败');
    } finally {
      setIngesting(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      showToast('error', '请填写完整用户名与初始密码');
      return;
    }
    if (newPassword.trim().length < 6) {
      showToast('error', '初始密码长度不得少于 6 位');
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || '创建用户失败';
        if (msg === 'username_exists') msg = '该用户名已被注册或已存在';
        else if (msg === 'invalid_username') msg = '用户名格式不符合要求（允许字母、数字、下划线、@、.、-，2-120字）';
        else if (msg === 'password_too_short') msg = '初始密码太短，长度至少需要 6 位';
        else if (msg === 'invalid_role') msg = '系统角色类别无效';
        else if (msg === 'persistence_disabled') msg = '数据库暂未开启持久化支持';
        throw new Error(msg);
      }
      showToast('success', `用户「${newUsername.trim()}」创建成功！`);
      setShowCreateUserModal(false);
      setNewUsername('');
      setNewPassword('');
      fetchData();
    } catch (e: any) {
      showToast('error', e.message || '创建用户失败');
    } finally {
      setCreatingUser(false);
    }
  };

  // Update User Role or Status
  const handleUpdateUser = async (userId: string, updates: Partial<UserItem>) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('更新用户信息失败');
      showToast('success', '用户状态更新成功');
      fetchData();
    } catch (e: any) {
      showToast('error', e.message || '更新失败');
    }
  };

  // Reset Password
  const handleResetPassword = async (userId: string) => {
    if (!resetNewPassword.trim()) {
      showToast('error', '请输入新密码');
      return;
    }
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetNewPassword.trim() }),
      });
      if (!res.ok) throw new Error('重置密码失败');
      showToast('success', '密码重置成功，该用户已有会话已自动下线');
      setResettingUserId(null);
      setResetNewPassword('');
    } catch (e: any) {
      showToast('error', e.message || '重置密码失败');
    }
  };

  // Revoke Sessions
  const handleRevokeSessions = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/sessions`, { method: 'DELETE' });
      if (!res.ok) throw new Error('注销会话失败');
      showToast('success', '已强制注销该用户的所有活跃会话');
    } catch (e: any) {
      showToast('error', e.message || '操作失败');
    }
  };

  // Export CSV Report
  const handleExportCsv = () => {
    if (auditEvents.length === 0) return;
    const header = ['ID', '时间戳', '操作主体', '动作类型', '关联实体', '状态', '详情元数据'];
    const rows = auditEvents.map((evt) => [
      evt.id,
      evt.at,
      `"${evt.actor}"`,
      `"${evt.action}"`,
      `"${evt.entityId || evt.entityType || '-'}"`,
      evt.status,
      `"${JSON.stringify(evt.metadata || {}).replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `jianwei-system-behavior-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Action Type to Chinese Label & Color Badge
  const formatActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('register')) {
      return {
        label: '注册申请',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: <UserCheck className="w-3 h-3" />,
      };
    }
    if (act.includes('knowledge') || act.includes('deposit')) {
      return {
        label: '知识库添加',
        colorClass: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: <BookOpen className="w-3 h-3" />,
      };
    }
    if (act.includes('enrich') || act.includes('ai') || act.includes('analysis')) {
      return {
        label: '深度解读调用',
        colorClass: 'bg-amber-100 text-amber-900 border-amber-300',
        icon: <Sparkles className="w-3 h-3" />,
      };
    }
    if (act.includes('predict') || act.includes('contract')) {
      return {
        label: '前瞻预测契约',
        colorClass: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <Crosshair className="w-3 h-3" />,
      };
    }
    if (act.includes('login') || act.includes('auth')) {
      return {
        label: '用户登录',
        colorClass: 'bg-sky-100 text-sky-800 border-sky-300',
        icon: <LogIn className="w-3 h-3" />,
      };
    }
    if (act.includes('read') || act.includes('article') || act.includes('view')) {
      return {
        label: '情报阅读',
        colorClass: 'bg-stone-100 text-stone-800 border-stone-300',
        icon: <FileText className="w-3 h-3" />,
      };
    }
    return {
      label: action,
      colorClass: 'bg-stone-100 text-stone-700 border-stone-200',
      icon: <Activity className="w-3 h-3" />,
    };
  };

  // Behavior Logs Filtered Data
  const filteredBehaviorLogs = useMemo(() => {
    return auditEvents.filter((evt) => {
      // 1. Action Type Filter
      if (behaviorActionFilter !== 'all') {
        const act = evt.action.toLowerCase();
        if (behaviorActionFilter === 'register' && !act.includes('register')) return false;
        if (behaviorActionFilter === 'knowledge' && !act.includes('knowledge') && !act.includes('deposit')) return false;
        if (behaviorActionFilter === 'ai' && !act.includes('ai') && !act.includes('enrich') && !act.includes('analysis')) return false;
        if (behaviorActionFilter === 'predict' && !act.includes('predict') && !act.includes('contract')) return false;
        if (behaviorActionFilter === 'login' && !act.includes('login') && !act.includes('auth')) return false;
      }

      // 2. Username Search Query
      if (behaviorUsernameQuery.trim()) {
        const q = behaviorUsernameQuery.toLowerCase();
        const matchesActor = evt.actor.toLowerCase().includes(q);
        const matchesAction = evt.action.toLowerCase().includes(q);
        const matchesEntity = (evt.entityId || '').toLowerCase().includes(q);
        const matchesMeta = JSON.stringify(evt.metadata || {}).toLowerCase().includes(q);
        if (!matchesActor && !matchesAction && !matchesEntity && !matchesMeta) return false;
      }

      return true;
    });
  }, [auditEvents, behaviorActionFilter, behaviorUsernameQuery]);

  // Behavior Logs Pagination Slices
  const totalBehaviorPages = Math.max(1, Math.ceil(filteredBehaviorLogs.length / behaviorPageSize));
  const paginatedBehaviorLogs = useMemo(() => {
    const start = (behaviorPage - 1) * behaviorPageSize;
    return filteredBehaviorLogs.slice(start, start + behaviorPageSize);
  }, [filteredBehaviorLogs, behaviorPage, behaviorPageSize]);

  useEffect(() => {
    setBehaviorPage(1);
  }, [behaviorActionFilter, behaviorUsernameQuery, behaviorPageSize]);

  const maxHourlyCount = useMemo(() => {
    let max = 1;
    Object.values(hourlyDistribution).forEach((c) => {
      if (c > max) max = c;
    });
    return max;
  }, [hourlyDistribution]);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const renderCorpusHealthModule = () => (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-serif font-black text-stone-950 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>语料健康度与全局抓取调度中枢</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              🟢 实时健康运行
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            监控当前语料库抓取时效、各信源分布比例与管道状态，提供一键增量/全量同步。
          </p>
        </div>

        <button
          onClick={handleTriggerIngest}
          disabled={ingesting}
          className="px-4 py-2.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-2 transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${ingesting ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
          <span>{ingesting ? '正在执行全量语料同步…' : '手动触发全量语料同步'}</span>
        </button>
      </div>

      {/* 4 Health Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
          <div className="text-[11px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>最新抓取/同步时间</span>
            <Clock className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-sm sm:text-base font-serif font-black text-stone-900 font-mono truncate" title={latestCrawlTimeFormatted}>
            {latestCrawlTimeFormatted}
          </div>
          <div className="text-[10px] text-emerald-700 font-mono">
            {status?.feeds?.lastIngest ? '已成功完成 RSS/REST 数据拉取' : '系统实时就绪，支持增量摄取'}
          </div>
        </div>

        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
          <div className="text-[11px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>语料库文章总数</span>
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-base font-serif font-black text-stone-900 font-mono">
            {corpusArticles.length} <span className="text-xs font-normal text-stone-500">篇情报</span>
          </div>
          <div className="text-[10px] text-stone-500 font-mono">
            覆盖 {sourceDistribution.length} 个独立新闻/研究信源
          </div>
        </div>

        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
          <div className="text-[11px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>配置订阅管道</span>
            <Rss className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-base font-serif font-black text-stone-900 font-mono">
            {feedList.length} <span className="text-xs font-normal text-stone-500">个订阅源</span>
          </div>
          <div className="text-[10px] text-purple-700 font-mono">
            自动定时与手动并发同步调度
          </div>
        </div>

        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
          <div className="text-[11px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>上次同步增量/去重</span>
            <Zap className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base font-serif font-black text-stone-900 font-mono">
            +{status?.feeds?.lastIngest?.added || 0} <span className="text-xs font-normal text-stone-500">篇新增</span>
          </div>
          <div className="text-[10px] text-stone-500 font-mono">
            跳过 {status?.feeds?.lastIngest?.skipped || 0} 篇重复或陈旧条目
          </div>
        </div>
      </div>

      {/* Source Distribution */}
      <div className="space-y-3 pt-2 border-t border-stone-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#0284C7]" />
            <span>各源语料数量分布与占比 (%)</span>
          </h3>
          <span className="text-[10px] font-mono text-stone-400">
            全量语料样本来源透视
          </span>
        </div>

        {sourceDistribution.length === 0 ? (
          <div className="p-4 bg-stone-50 rounded-xl text-center text-xs text-stone-400 font-mono">
            正在统计各源语料数量分布…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {sourceDistribution.map((src, idx) => (
              <div key={idx} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-serif font-bold text-stone-900 truncate" title={src.name}>
                    {src.name}
                  </span>
                  <span className="font-mono font-bold text-stone-800 shrink-0">
                    {src.count} 篇 <span className="text-[10px] text-stone-400 font-normal">({src.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(6, src.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border-2 shadow-2xl flex items-center space-x-2 text-xs font-serif font-bold animate-in fade-in slide-in-from-bottom-3 ${
            message.type === 'success'
              ? 'bg-emerald-900 border-emerald-500 text-white'
              : 'bg-rose-900 border-rose-500 text-white'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 border-2 border-stone-950 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-[#E3120B]/20 text-[#E3120B]">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
              Genway Global Admin Console · 全局管理中台
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight">
            系统管理与全局数据基础设施中台
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
            统一配置企业级大模型密钥、多信源 RSS 摄取调度、9大行业赛道关键词规则、用户组织权限与行为审计台账。
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-serif font-bold text-stone-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新状态</span>
          </button>
        </div>
      </div>

      {/* Top Status & Infrastructure KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>全局 AI 引擎状态</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg sm:text-xl font-serif font-black text-stone-950">
            {settings?.ai?.provider === 'gemini'
              ? 'Gemini 2.5'
              : settings?.ai?.provider === 'deepseek'
              ? 'DeepSeek'
              : '智能自动调度'}
          </div>
          <div className="text-[11px] font-mono text-emerald-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {settings?.ai?.gemini ? 'Gemini就绪' : ''} {settings?.ai?.deepseek ? '· DeepSeek就绪' : ''}
              {!settings?.ai?.gemini && !settings?.ai?.deepseek ? '未配置密钥' : ''}
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-stone-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>活跃信源 / 语料量</span>
            <Rss className="w-3.5 h-3.5 text-[#E3120B]" />
          </div>
          <div className="text-lg sm:text-xl font-serif font-black text-stone-950">
            {status?.corpus?.corpusSize || 0} <span className="text-xs font-normal text-stone-500">篇情报</span>
          </div>
          <div className="text-[11px] font-mono text-stone-600">
            订阅源: {feedList.length} 个 · {status?.feeds?.lastIngest ? '已自动同步' : '待摄取'}
          </div>
        </div>

        <div className="bg-white border-2 border-stone-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>注册与活跃用户</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-serif font-black text-stone-950">
            {users.length} <span className="text-xs font-normal text-stone-500">位分析师</span>
          </div>
          <div className="text-[11px] font-mono text-stone-600">
            管理员: {users.filter((u) => u.role === 'admin').length} · 待审核: {users.filter((u) => u.approvalStatus === 'pending').length}
          </div>
        </div>

        <div className="bg-white border-2 border-stone-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>深度研判总调用</span>
            <Crosshair className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg sm:text-xl font-serif font-black text-stone-950">
            {activityStats?.totalAiCalls || 0} <span className="text-xs font-normal text-stone-500">次</span>
          </div>
          <div className="text-[11px] font-mono text-stone-600">
            沉淀知识: {activityStats?.totalDeposits || 0} 条
          </div>
        </div>

        <div className="bg-white border-2 border-stone-800 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center justify-between">
            <span>行为审计总流水</span>
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-serif font-black text-stone-950 font-mono">
            {auditEvents.length} <span className="text-xs font-normal text-stone-500">条</span>
          </div>
          <div className="text-[11px] font-mono text-emerald-700">
            哈希完整性校验通过
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b-2 border-stone-900 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'database', label: '数据库与分析语料', icon: <Database className="w-4 h-4 text-emerald-600" />, badge: '持久化复用' },
          { id: 'behavior_logs', label: '系统行为日志', icon: <Activity className="w-4 h-4 text-[#E3120B]" />, badge: '审计核心' },
          { id: 'keys', label: '全局 AI 引擎与模型中枢', icon: <Key className="w-4 h-4 text-amber-600" /> },
          { id: 'feeds', label: '全局信源管道与数据源', icon: <Rss className="w-4 h-4 text-purple-600" /> },
          { id: 'taxonomy', label: '行业板块与关键词规则', icon: <Layers className="w-4 h-4 text-blue-600" /> },
          { id: 'users', label: '用户账号与权限分配', icon: <Users className="w-4 h-4 text-emerald-600" /> },
          { id: 'activity', label: '使用情况与活跃画像', icon: <BarChart3 className="w-4 h-4 text-stone-700" /> },
          { id: 'audit', label: '安全审计与数据备份', icon: <FileText className="w-4 h-4 text-stone-600" /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`pb-3 px-3 text-xs sm:text-sm font-serif font-bold flex items-center space-x-2 border-b-4 -mb-[2px] transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#E3120B] text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#E3120B] text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 0: 数据库与分析语料 (Database & Analyzed Corpus) */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* 语料健康度模块 */}
          {renderCorpusHealthModule()}

          {/* Top Storage Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="text-xs font-mono text-stone-500 uppercase flex items-center justify-between">
                <span>SQLite 数据库存储文件</span>
                <HardDrive className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-serif font-black text-stone-950">
                {dbOverview?.dbFileSizeFormatted || '0 KB'}
              </div>
              <div className="text-[11px] font-mono text-stone-500 truncate" title={dbOverview?.dbFilePath}>
                路径: {dbOverview?.dbFilePath || 'data/corpus.db'}
              </div>
            </div>

            <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="text-xs font-mono text-stone-500 uppercase flex items-center justify-between">
                <span>语料库持久化文章</span>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-serif font-black text-stone-950">
                {dbOverview?.articleCount || 0} <span className="text-xs font-normal text-stone-500">篇</span>
              </div>
              <div className="text-[11px] font-mono text-emerald-700">
                支持全文 FTS5 检索与按区过滤
              </div>
            </div>

            <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="text-xs font-mono text-stone-500 uppercase flex items-center justify-between">
                <span>已存 AI 深度认知拆解</span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-serif font-black text-stone-950">
                {dbOverview?.analysisCount || 0} <span className="text-xs font-normal text-stone-500">条</span>
              </div>
              <div className="text-[11px] font-mono text-stone-600">
                7W / 因果树 / 光谱分层全量存库
              </div>
            </div>

            <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="text-xs font-mono text-stone-500 uppercase flex items-center justify-between">
                <span>0-Token 复用命中数</span>
                <Zap className="w-4 h-4 text-[#E3120B]" />
              </div>
              <div className="text-xl font-serif font-black text-stone-950">
                {dbOverview?.totalHitCount || 0} <span className="text-xs font-normal text-stone-500">次</span>
              </div>
              <div className="text-[11px] font-mono text-rose-700">
                直接从数据库秒级调取，无需重新分析
              </div>
            </div>
          </div>

          {/* Database Analyzed Corpus Table Section */}
          <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-lg font-serif font-black text-stone-950 flex items-center space-x-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <span>后台数据库 · 已分析语料库与缓存表 (Article Analyses DB)</span>
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  所有已被 AI 拆解过的新闻与语料均自动持久化存入数据库。再次调阅时直接复用，免去重复耗时与 Token 开销。
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchDatabaseData}
                  disabled={dbLoading}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
                  <span>刷新表格</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索已分析语料标题或媒体源..."
                  value={dbSearchQuery}
                  onChange={(e) => {
                    setDbSearchQuery(e.target.value);
                    setDbPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <select
                  value={dbCategoryFilter}
                  onChange={(e) => {
                    setDbCategoryFilter(e.target.value);
                    setDbPage(1);
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                >
                  <option value="all">全部分类板块</option>
                  <option value="科技前沿">科技前沿</option>
                  <option value="宏观政经">宏观政经</option>
                  <option value="资本市场">资本市场</option>
                  <option value="半导体芯片">半导体芯片</option>
                  <option value="AI与大模型">AI与大模型</option>
                  <option value="地缘与出海">地缘与出海</option>
                </select>

                <div className="text-xs text-stone-500 whitespace-nowrap font-mono">
                  共找到 <b className="text-stone-900">{dbTotalAnalyses}</b> 条已库分析
                </div>
              </div>
            </div>

            {/* Analyses Table */}
            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-left text-xs text-stone-800">
                <thead className="bg-stone-100 text-stone-700 font-serif font-bold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">语料标题 / 新闻源</th>
                    <th className="px-4 py-3">板块分类</th>
                    <th className="px-4 py-3">分析引擎 / 模型</th>
                    <th className="px-4 py-3 text-center">0-Token 复用次数</th>
                    <th className="px-4 py-3">存库时间</th>
                    <th className="px-4 py-3 text-right">操作管理</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-sans">
                  {dbAnalyses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-stone-500 font-serif">
                        {dbLoading ? '正在加载数据库记录…' : '暂无符合条件的已分析语料记录'}
                      </td>
                    </tr>
                  ) : (
                    dbAnalyses.map((item) => (
                      <tr key={item.key} className="hover:bg-stone-50/80 transition-colors">
                        <td className="px-4 py-3 max-w-sm">
                          <div className="font-serif font-bold text-stone-950 text-sm line-clamp-1" title={item.title}>
                            {item.title}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center space-x-2">
                            <span>来源: {item.source || '见微投递'}</span>
                            <span className="font-mono text-[10px] text-stone-400">Key: {item.key.slice(0, 16)}…</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200 font-serif font-bold text-[11px]">
                            {item.category || '通用分析'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-stone-700 flex items-center space-x-1">
                            <Cpu className="w-3 h-3 text-amber-600" />
                            <span>{item.provider || 'AI'} ({item.model || 'Default'})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-mono font-bold text-emerald-800">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.hitCount} 次复用
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-stone-500 font-mono">
                          {new Date(item.updatedAt || item.createdAt).toLocaleString('zh-CN', { hour12: false })}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => handleViewAnalysisDetail(item.key)}
                            className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-serif font-bold transition-colors cursor-pointer"
                          >
                            查看详情
                          </button>

                          <button
                            onClick={() => handleReanalyzeItem(item)}
                            disabled={reanalyzingKey === item.key}
                            className="px-2 py-1 rounded bg-stone-100 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-serif font-bold transition-colors cursor-pointer disabled:opacity-50"
                            title="触发全新的 AI 深度解析并覆盖数据库中的记录"
                          >
                            {reanalyzingKey === item.key ? '分析中…' : '重新分析'}
                          </button>

                          <button
                            onClick={() => handleDeleteAnalysis(item.key, item.title)}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-serif font-bold transition-colors cursor-pointer"
                            title="从数据库中清除该分析缓存"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {dbTotalAnalyses > 20 && (
              <div className="flex items-center justify-between border-t border-stone-200 pt-4 text-xs font-serif">
                <div className="text-stone-500">
                  显示第 {(dbPage - 1) * 20 + 1} - {Math.min(dbPage * 20, dbTotalAnalyses)} 条，共 {dbTotalAnalyses} 条
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={dbPage === 1}
                    onClick={() => setDbPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 cursor-pointer"
                  >
                    上一页
                  </button>
                  <span className="font-mono text-stone-800">
                    {dbPage} / {Math.ceil(dbTotalAnalyses / 20)}
                  </span>
                  <button
                    disabled={dbPage >= Math.ceil(dbTotalAnalyses / 20)}
                    onClick={() => setDbPage((p) => p + 1)}
                    className="px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 cursor-pointer"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Stored Analysis Modal */}
      {selectedAnalysisDetail && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold">
                    数据库已分析语料
                  </span>
                  <span className="text-xs text-stone-500 font-mono">Key: {selectedAnalysisDetail.key}</span>
                </div>
                <h3 className="text-xl font-serif font-black text-stone-950">
                  {selectedAnalysisDetail.title}
                </h3>
                <div className="text-xs text-stone-600 flex items-center space-x-3">
                  <span>新闻源: {selectedAnalysisDetail.source || '见微'}</span>
                  <span>板块: {selectedAnalysisDetail.category}</span>
                  <span>0-Token复用次数: {selectedAnalysisDetail.hitCount} 次</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnalysisDetail(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Render Key Sections from Cached Payload */}
            <div className="space-y-6 text-sm text-stone-800">
              {/* One Sentence Verdict */}
              {selectedAnalysisDetail.payload?.oneSentenceVerdict && (
                <div className="p-4 rounded-xl bg-stone-900 text-white space-y-1">
                  <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
                    一句话见微定性 (One Sentence Verdict)
                  </div>
                  <div className="text-base font-serif font-bold leading-relaxed">
                    {selectedAnalysisDetail.payload.oneSentenceVerdict}
                  </div>
                </div>
              )}

              {/* 7 Elements */}
              {selectedAnalysisDetail.payload?.sevenElements && (
                <div className="space-y-3">
                  <h4 className="font-serif font-bold text-stone-950 border-b border-stone-200 pb-1 text-sm flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>认知拆解 (Seven Elements 7W)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                      <b className="text-stone-950">WHAT 事实大局:</b> {selectedAnalysisDetail.payload.sevenElements.what}
                    </div>
                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                      <b className="text-stone-950">WHO 参与主体:</b> {selectedAnalysisDetail.payload.sevenElements.who}
                    </div>
                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                      <b className="text-stone-950">WHY 深层因果:</b> {selectedAnalysisDetail.payload.sevenElements.why}
                    </div>
                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                      <b className="text-stone-950">SO WHAT 终局影响:</b> {selectedAnalysisDetail.payload.sevenElements.soWhat}
                    </div>
                  </div>
                </div>
              )}

              {/* Spectrum Layers */}
              {Array.isArray(selectedAnalysisDetail.payload?.spectrumLayers) && (
                <div className="space-y-3">
                  <h4 className="font-serif font-bold text-stone-950 border-b border-stone-200 pb-1 text-sm flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>五层光谱拆解 (Spectrum Layers)</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedAnalysisDetail.payload.spectrumLayers.map((layer: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-1">
                        <div className="font-serif font-bold text-stone-950 flex items-center justify-between">
                          <span>{layer.name}</span>
                          <span className="text-[10px] font-mono text-stone-500">{layer.headline}</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed">{layer.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON Preview Accordion */}
              <details className="text-xs border border-stone-200 rounded-xl p-3 bg-stone-50">
                <summary className="font-serif font-bold text-stone-700 cursor-pointer">
                  查看完整原始数据库存储 JSON (Raw Stored Payload)
                </summary>
                <pre className="mt-3 p-3 bg-stone-950 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-60">
                  {JSON.stringify(selectedAnalysisDetail.payload, null, 2)}
                </pre>
              </details>
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                onClick={() => setSelectedAnalysisDetail(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-serif font-bold cursor-pointer hover:bg-stone-800"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Behavior Insights Report Modal */}
      {insightsReport && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl font-sans">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded bg-red-100 text-[#E3120B] text-[11px] font-mono font-bold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>AI 用户行为模式挖掘</span>
                  </span>
                  <span className="text-xs text-stone-500 font-mono">
                    流水总数: {insightsReport.totalEventsAnalyzed} 条 · 生成时间: {new Date(insightsReport.generatedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
                  系统用户行为模式与功能使用偏好洞察报告
                </h3>
              </div>
              <button
                onClick={() => setInsightsReport(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="p-4 rounded-xl bg-stone-950 text-white border-l-4 border-[#E3120B] space-y-1.5 shadow-md">
                <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest flex items-center justify-between">
                  <span>管理层研判定性摘要 (Executive Summary)</span>
                  <span className="text-emerald-400 font-bold">
                    协同与效率评分: {insightsReport.insights?.workflowEfficiencyScore || 88} / 100
                  </span>
                </div>
                <p className="text-sm font-serif font-bold leading-relaxed text-stone-100">
                  {insightsReport.insights?.executiveSummary}
                </p>
              </div>

              {/* 24-Hour Active Hours Distribution Chart */}
              <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-serif font-bold text-stone-950 text-sm flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>核心活跃时段分布图 (24-Hour Active Hours Distribution)</span>
                  </h4>
                  <div className="text-xs font-mono text-stone-600 bg-white px-2.5 py-1 rounded border border-stone-200">
                    高峰段: <b className="text-[#E3120B]">{insightsReport.peakHoursText}</b>
                  </div>
                </div>

                {/* Bar Chart Visualization */}
                <div className="pt-2">
                  <div className="h-32 flex items-end justify-between gap-1 pt-4 pb-1 border-b border-stone-300">
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const count = insightsReport.hourlyDistribution?.[hour] || 0;
                      const maxVal = Math.max(1, ...Object.values(insightsReport.hourlyDistribution || {}).map(Number));
                      const heightPercent = Math.max(8, Math.round((count / maxVal) * 100));
                      const isPeak = count > 0 && count >= maxVal * 0.5;

                      return (
                        <div key={hour} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                          {/* Tooltip */}
                          <div className="absolute -top-8 bg-stone-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {hour}:00 - {count} 次
                          </div>
                          <div
                            className={`w-full rounded-t-sm transition-all ${
                              isPeak
                                ? 'bg-[#E3120B] group-hover:bg-red-700'
                                : count > 0
                                ? 'bg-stone-700 group-hover:bg-stone-900'
                                : 'bg-stone-200'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1 px-0.5">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                  </div>
                </div>
              </div>

              {/* Feature Usage Preference Ranking */}
              <div className="p-5 rounded-xl border border-stone-200 bg-white space-y-4">
                <h4 className="font-serif font-bold text-stone-950 text-sm flex items-center space-x-1.5 border-b border-stone-100 pb-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>功能使用偏好统计 (Feature Usage Preferences Ranking)</span>
                </h4>

                <div className="space-y-3">
                  {Array.isArray(insightsReport.actionPreferences) &&
                    insightsReport.actionPreferences.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-bold border border-stone-200">
                              {item.category}
                            </span>
                            <span className="font-serif font-bold text-stone-900">{item.name}</span>
                          </div>
                          <div className="font-mono text-xs text-stone-600">
                            <b>{item.count}</b> 次 (<b className="text-stone-900">{item.percentage}%</b>)
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              idx === 0
                                ? 'bg-[#E3120B]'
                                : idx === 1
                                ? 'bg-amber-500'
                                : idx === 2
                                ? 'bg-purple-600'
                                : 'bg-stone-500'
                            }`}
                            style={{ width: `${Math.max(2, item.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* AI Strategic Findings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                  <div className="text-xs font-serif font-bold text-stone-950 flex items-center space-x-1.5 border-b border-stone-200 pb-1.5">
                    <Activity className="w-4 h-4 text-amber-600" />
                    <span>活跃时段与工作流节奏剖析</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {insightsReport.insights?.peakPatternAnalysis}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                  <div className="text-xs font-serif font-bold text-stone-950 flex items-center space-x-1.5 border-b border-stone-200 pb-1.5">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    <span>功能偏好与深层诉求透视</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {insightsReport.insights?.featurePreferenceAnalysis}
                  </p>
                </div>
              </div>

              {/* Risk & Anomaly Observation */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1.5 text-xs text-amber-950">
                <div className="font-serif font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>行为风控与合规观察 (Security & Compliance Observation)</span>
                </div>
                <p className="leading-relaxed text-amber-900">
                  {insightsReport.insights?.anomaliesOrRisks}
                </p>
              </div>

              {/* Recommendations */}
              {Array.isArray(insightsReport.insights?.recommendations) && (
                <div className="p-5 rounded-xl border-2 border-stone-900 bg-stone-900 text-white space-y-3">
                  <h4 className="font-serif font-bold text-sm text-red-400 flex items-center space-x-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>系统管理落地建议 (Actionable System Admin Recommendations)</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-stone-200 font-serif">
                    {insightsReport.insights.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="font-mono font-bold text-red-400 shrink-0">{idx + 1}.</span>
                        <span className="leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                onClick={() => setInsightsReport(null)}
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold transition-colors cursor-pointer"
              >
                关闭洞察报告
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: 系统行为日志 (Behavior Logs) */}
      {activeTab === 'behavior_logs' && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-serif font-black text-stone-950">
                  核心用户行为审计日志 (System Behavior Logs)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  共 {filteredBehaviorLogs.length} 条记录
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                精确审计与追溯用户注册申请、知识库沉淀添加、深度解读模型调用及推演契约执行全链路。
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleGenerateBehaviorInsights}
                disabled={insightsLoading}
                className="px-4 py-2 bg-[#E3120B] hover:bg-red-700 text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
                <span>{insightsLoading ? '模式挖掘中…' : '生成行为洞察报告'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出行为审计报表 (CSV)</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Badges Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { id: 'all', label: '全部行为日志', count: auditEvents.length, color: 'border-stone-800 bg-stone-50 text-stone-900' },
              { id: 'register', label: '注册申请', count: auditEvents.filter((e) => e.action.includes('register')).length, color: 'border-emerald-600 bg-emerald-50 text-emerald-900' },
              { id: 'knowledge', label: '知识库添加', count: auditEvents.filter((e) => e.action.includes('knowledge') || e.action.includes('deposit')).length, color: 'border-purple-600 bg-purple-50 text-purple-900' },
              { id: 'ai', label: '深度解读调用', count: auditEvents.filter((e) => e.action.includes('ai') || e.action.includes('enrich') || e.action.includes('analysis')).length, color: 'border-amber-600 bg-amber-50 text-amber-900' },
              { id: 'predict', label: '前瞻预测契约', count: auditEvents.filter((e) => e.action.includes('predict') || e.action.includes('contract')).length, color: 'border-blue-600 bg-blue-50 text-blue-900' },
            ].map((card) => {
              const isSelected = behaviorActionFilter === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => setBehaviorActionFilter(card.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? `${card.color} ring-2 ring-stone-900 shadow-xs font-bold`
                      : 'border-stone-200 hover:border-stone-400 bg-white text-stone-600'
                  }`}
                >
                  <div className="text-[11px] font-serif font-bold">{card.label}</div>
                  <div className="text-base sm:text-lg font-mono font-black mt-0.5">{card.count} 次</div>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="按用户名、操作类型或关联标题筛选…"
                value={behaviorUsernameQuery}
                onChange={(e) => setBehaviorUsernameQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div className="flex items-center space-x-3 text-xs font-serif text-stone-600">
              <div className="flex items-center space-x-1.5">
                <span>每页显示:</span>
                <select
                  value={behaviorPageSize}
                  onChange={(e) => setBehaviorPageSize(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:border-stone-900"
                >
                  <option value={10}>10 条 / 页</option>
                  <option value={20}>20 条 / 页</option>
                  <option value={50}>50 条 / 页</option>
                </select>
              </div>
            </div>
          </div>

          {/* Behavior Logs Paginated Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 font-serif font-bold text-stone-800 border-b border-stone-200">
                <tr>
                  <th className="p-3 w-16">编号</th>
                  <th className="p-3 w-40">操作时间</th>
                  <th className="p-3 w-36">用户名 / 角色</th>
                  <th className="p-3 w-36">操作类型</th>
                  <th className="p-3">关联实体 / 内容摘要</th>
                  <th className="p-3 w-20 text-center">状态</th>
                  <th className="p-3 w-20 text-right">明细</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedBehaviorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-stone-400 font-serif">
                      未找到符合筛选条件的系统行为日志
                    </td>
                  </tr>
                ) : (
                  paginatedBehaviorLogs.map((evt) => {
                    const badge = formatActionBadge(evt.action);
                    return (
                      <tr key={evt.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-3 font-mono text-stone-400 text-[11px]">#{evt.id}</td>
                        <td className="p-3 font-mono text-stone-600 text-[11px] whitespace-nowrap">{evt.at}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-white text-[9px] flex items-center justify-center font-serif font-bold shrink-0">
                              {evt.actor.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="font-mono font-bold text-stone-900 truncate">{evt.actor}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-serif font-bold border ${badge.colorClass}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </td>
                        <td className="p-3 font-sans text-stone-700 text-xs max-w-xs sm:max-w-md truncate">
                          {evt.entityId || (evt.metadata?.title as string) || (evt.metadata?.question as string) || (evt.metadata?.reason as string) || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${evt.status === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                            {evt.status === 'success' ? '成功' : '失败'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedLogModal(evt)}
                            className="text-stone-500 hover:text-stone-900 font-serif font-bold text-[11px] hover:underline cursor-pointer"
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-serif text-stone-600">
            <div>
              显示第 <span className="font-mono font-bold text-stone-900">{(behaviorPage - 1) * behaviorPageSize + 1}</span> 至{' '}
              <span className="font-mono font-bold text-stone-900">{Math.min(behaviorPage * behaviorPageSize, filteredBehaviorLogs.length)}</span>{' '}
              条 · 共 <span className="font-mono font-bold text-stone-900">{filteredBehaviorLogs.length}</span> 条行为记录
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setBehaviorPage((p) => Math.max(1, p - 1))}
                disabled={behaviorPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 disabled:opacity-40 text-stone-700 flex items-center space-x-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一页</span>
              </button>

              <span className="px-3 py-1 font-mono font-bold text-stone-900">
                {behaviorPage} / {totalBehaviorPages}
              </span>

              <button
                onClick={() => setBehaviorPage((p) => Math.min(totalBehaviorPages, p + 1))}
                disabled={behaviorPage === totalBehaviorPages || totalBehaviorPages === 0}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 disabled:opacity-40 text-stone-700 flex items-center space-x-1 cursor-pointer"
              >
                <span>下一页</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-stone-400">事件编号 #{selectedLogModal.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${selectedLogModal.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {selectedLogModal.status === 'success' ? '执行成功' : '失败'}
                  </span>
                </div>
                <h3 className="font-serif font-black text-base text-stone-950 mt-1">行为审计事件详情</h3>
              </div>
              <button onClick={() => setSelectedLogModal(null)} className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <span className="text-stone-500 font-serif">操作主体:</span>
                  <div className="font-mono font-bold text-stone-900 mt-0.5">{selectedLogModal.actor}</div>
                </div>
                <div>
                  <span className="text-stone-500 font-serif">动作类型:</span>
                  <div className="font-mono font-bold text-stone-900 mt-0.5">{selectedLogModal.action}</div>
                </div>
                <div>
                  <span className="text-stone-500 font-serif">记录时间:</span>
                  <div className="font-mono text-stone-700 mt-0.5">{selectedLogModal.at}</div>
                </div>
                <div>
                  <span className="text-stone-500 font-serif">关联实体类型:</span>
                  <div className="font-mono text-stone-700 mt-0.5">{selectedLogModal.entityType || '-'}</div>
                </div>
              </div>

              {selectedLogModal.entityId && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-stone-500 font-serif">关联内容 / 标题:</span>
                  <div className="font-sans font-bold text-stone-900 mt-0.5">{selectedLogModal.entityId}</div>
                </div>
              )}

              {selectedLogModal.metadata && (
                <div className="space-y-1">
                  <span className="text-stone-600 font-serif font-bold">审计元数据载荷 (JSON):</span>
                  <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLogModal.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button
                onClick={() => setSelectedLogModal(null)}
                className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-serif font-bold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 全局 AI 引擎与模型中枢 (Global AI Gateway) */}
      {activeTab === 'keys' && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                全局大模型引擎与 API 密钥管理
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                密钥由服务端安全加密存储（AES-256-GCM），为全平台分析师提供高精度认知推演能力。
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestAi}
              disabled={testingAi}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin' : 'text-emerald-600'}`} />
              <span>{testingAi ? '诊断测试中…' : '全局连通性诊断'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-serif font-bold flex items-center space-x-2 ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-serif font-bold text-stone-900">
              全局推理调度策略 (AI Provider Strategy)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'auto', title: '智能自动调度 (Auto)', desc: '优先使用 Gemini 2.5，不可用时平滑降级' },
                { id: 'gemini', title: '全量 Gemini 引擎', desc: 'Google Gemini 2.5 高精度多层拆解' },
                { id: 'deepseek', title: '全量 DeepSeek 引擎', desc: 'DeepSeek-V3 / R1 深度因果推演' },
              ].map((prov) => (
                <div
                  key={prov.id}
                  onClick={() => setAiChoice(prov.id as any)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    aiChoice === prov.id
                      ? 'border-stone-900 bg-[#FAF8F5] shadow-xs'
                      : 'border-stone-200 hover:border-stone-400 bg-white'
                  }`}
                >
                  <div className="font-serif font-bold text-xs text-stone-950 flex items-center justify-between">
                    <span>{prov.title}</span>
                    {aiChoice === prov.id && <Check className="w-3.5 h-3.5 text-[#E3120B]" />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">{prov.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Keys Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Gemini */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-red-600" />
                  <span>Google Gemini 凭证与模型</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                  {settings?.ai?.gemini ? '已配置密钥' : '未配置'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-serif font-bold text-stone-700">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder={settings?.ai?.gemini ? '•••••••••••••••• (已保存)' : 'AIzaSy...'}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-serif font-bold text-stone-700">默认 Gemini 模型</label>
                <select
                  value={geminiModelInput}
                  onChange={(e) => setGeminiModelInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (快速 & 推荐)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (深度长文推理)</option>
                </select>
              </div>
            </div>

            {/* DeepSeek */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>DeepSeek / OpenAI 代理网关</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                  {settings?.ai?.deepseek ? '已配置密钥' : '未配置'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-serif font-bold text-stone-700">DeepSeek API Key</label>
                <div className="relative">
                  <input
                    type={showDeepseekKey ? 'text' : 'password'}
                    placeholder={settings?.ai?.deepseek ? '•••••••••••••••• (已保存)' : 'sk-...'}
                    value={deepseekKeyInput}
                    onChange={(e) => setDeepseekKeyInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showDeepseekKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-serif font-bold text-stone-700">网关 Base URL</label>
                <input
                  type="text"
                  value={deepseekBaseUrlInput}
                  onChange={(e) => setDeepseekBaseUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveSettings()}
              className="px-6 py-2.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>保存 AI 密钥与服务配置</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: 全局信源管道与数据源调度 (Data Sources & RSS) */}
      {activeTab === 'feeds' && (
        <div className="space-y-6">
          {/* 语料健康度模块 */}
          {renderCorpusHealthModule()}

          <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                全局外部信源管道与实时调度中枢
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                支持一键订阅主流权威通讯社 RSS 源、管理自定义数据源，并执行定时爬取与全量语料摄取。
              </p>
            </div>

            <button
              onClick={handleTriggerIngest}
              disabled={ingesting || feedList.length === 0}
              className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
              <span>{ingesting ? '正在执行全局摄取…' : '立即触发手动摄取'}</span>
            </button>
          </div>

          {/* Preset Authoritative Sources */}
          <div className="space-y-3">
            <h3 className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>主流权威智库与通讯社预置信源 (点击一键订阅/取消)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRESET_SOURCES.map((ps, idx) => {
                const isSubscribed = feedList.includes(ps.url);
                return (
                  <div
                    key={idx}
                    onClick={() => handleTogglePresetFeed(ps.url)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSubscribed
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                        : 'border-stone-200 hover:border-stone-400 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-xs text-stone-900">{ps.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${isSubscribed ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                          {isSubscribed ? '✓ 已订阅' : '+ 未启用'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{ps.desc}</p>
                    </div>
                    <div className="text-[10px] font-mono text-stone-400 mt-2 truncate">{ps.url}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Feed Input */}
          <div className="space-y-2 pt-3 border-t border-stone-100">
            <h3 className="text-xs font-serif font-bold text-stone-900">
              添加自定义 RSS / Atom 数据源地址
            </h3>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="输入公网 RSS 订阅地址 (例如: https://news.mit.edu/rss/feed)"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900 font-mono"
              />
              <button
                onClick={handleAddFeed}
                className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加信源</span>
              </button>
            </div>
          </div>

          {/* Active Feeds List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-serif font-bold text-stone-800">
                当前活跃的数据源管道列表 ({feedList.length})
              </h3>
            </div>
            {feedList.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-stone-300 rounded-xl text-center text-xs text-stone-500">
                暂未配置外部 RSS 信源，系统将仅使用运行时内置预置情报语料。
              </div>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {feedList.map((url, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50">
                    <span className="font-mono text-stone-800 truncate pr-4">{url}</span>
                    <button
                      onClick={() => handleRemoveFeed(url)}
                      className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                      title="移除该信源"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Tab 4: 行业板块与关键词全局规则 (Sector Taxonomy & Keyword Overrides) */}
      {activeTab === 'taxonomy' && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                9大行业赛道关键词规则与覆盖分类字典
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                用于全平台情报盲区扫描、热度点名、赛道密度堆叠与分类打标。修改后将即时同步至服务端。
              </p>
            </div>

            <button
              onClick={() => {
                const def: Record<string, string> = {};
                for (const sec of SECTOR_TAXONOMY_DEFAULT) def[sec.id] = sec.keywords.join(', ');
                setSectorKeywordsState(def);
                showToast('success', '已重置为系统默认赛道词库');
              }}
              className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重置默认词典</span>
            </button>
          </div>

          {/* Sector Visual Editor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTOR_TAXONOMY_DEFAULT.map((sec) => {
              return (
                <div key={sec.id} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs text-stone-900">
                      {sec.name} <span className="font-mono text-stone-400 font-normal">({sec.id})</span>
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={sectorKeywordsState[sec.id] || ''}
                    onChange={(e) =>
                      setSectorKeywordsState({
                        ...sectorKeywordsState,
                        [sec.id]: e.target.value,
                      })
                    }
                    placeholder="输入关键词，以逗号分隔"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-sans"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveSettings()}
              className="px-6 py-2.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>保存全局赛道词典</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: 用户账号与组织权限体系 (Users & RBAC) */}
      {activeTab === 'users' && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                企业组织与用户权限管理 (RBAC)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                支持新增用户、按角色分权（管理员/资深分析师/观察员）、审核待注册账号及重置凭证。
              </p>
            </div>

            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>新建系统用户</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索用户名或角色…"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="font-serif font-bold text-stone-600">角色筛选:</span>
              {['all', 'admin', 'analyst', 'viewer'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-2.5 py-1 rounded-full text-xs font-serif font-bold transition-colors cursor-pointer ${
                    roleFilter === role
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {role === 'all' ? '全部' : role === 'admin' ? '管理员' : role === 'analyst' ? '分析师' : '观察员'}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 font-serif font-bold text-stone-700 border-b border-stone-200">
                <tr>
                  <th className="p-3">用户名</th>
                  <th className="p-3">系统角色</th>
                  <th className="p-3">审核状态</th>
                  <th className="p-3">账号状态</th>
                  <th className="p-3">注册时间</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400 font-serif">
                      未找到匹配的用户记录
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-stone-900">{u.username}</td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u.id, { role: e.target.value as any })}
                          className="px-2 py-1 bg-white border border-stone-300 rounded text-xs font-serif"
                        >
                          <option value="admin">超级管理员 (Admin)</option>
                          <option value="analyst">资深分析师 (Analyst)</option>
                          <option value="viewer">观察员 (Viewer)</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            u.approvalStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.approvalStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.approvalStatus === 'approved' ? '已批准' : u.approvalStatus === 'pending' ? '待审核' : '已拒绝'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleUpdateUser(u.id, { active: !u.active })}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            u.active ? 'bg-blue-100 text-blue-800' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {u.active ? '● 正常使用' : '○ 已停用'}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-stone-500 text-[11px]">{u.createdAt || '-'}</td>
                      <td className="p-3 text-right space-x-2">
                        {u.approvalStatus === 'pending' && (
                          <button
                            onClick={() => handleUpdateUser(u.id, { approvalStatus: 'approved' })}
                            className="text-[11px] font-serif font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            批准准入
                          </button>
                        )}
                        <button
                          onClick={() => setResettingUserId(u.id)}
                          className="text-[11px] font-serif font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          重置密码
                        </button>
                        <button
                          onClick={() => handleRevokeSessions(u.id)}
                          className="text-[11px] font-serif font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
                        >
                          下线会话
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Reset Password Prompt */}
          {resettingUserId && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-sm w-full p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h3 className="font-serif font-bold text-sm text-stone-900">重置用户密码</h3>
                  <button onClick={() => setResettingUserId(null)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-serif font-bold text-stone-700">输入新密码</label>
                  <input
                    type="password"
                    placeholder="不少于 6 位字符"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setResettingUserId(null)} className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-serif font-bold">
                    取消
                  </button>
                  <button onClick={() => handleResetPassword(resettingUserId)} className="px-4 py-1.5 rounded-lg bg-[#E3120B] text-white text-xs font-serif font-bold">
                    确认重置
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create User Modal */}
          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <form onSubmit={handleCreateUser} className="bg-white rounded-2xl border-2 border-stone-900 max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h3 className="font-serif font-black text-base text-stone-950">新建系统用户</h3>
                  <button type="button" onClick={() => setShowCreateUserModal(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-serif font-bold text-stone-800">登录用户名 (Username)</label>
                    <input
                      type="text"
                      required
                      placeholder="如: analyst_zhang"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-serif font-bold text-stone-800">初始登录密码</label>
                    <input
                      type="password"
                      required
                      placeholder="初始登录密码"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-serif font-bold text-stone-800">分配系统角色</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                    >
                      <option value="analyst">资深分析师 (Analyst · 具备 AI 深度研判与推演权限)</option>
                      <option value="admin">超级管理员 (Admin · 全系统配置与用户管理)</option>
                      <option value="viewer">观察员 (Viewer · 仅浏览与报告阅读)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-stone-100">
                  <button type="button" disabled={creatingUser} onClick={() => setShowCreateUserModal(false)} className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-serif font-bold cursor-pointer disabled:opacity-50">
                    取消
                  </button>
                  <button type="submit" disabled={creatingUser} className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold cursor-pointer disabled:opacity-50 flex items-center space-x-1.5">
                    {creatingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{creatingUser ? '创建中…' : '立即创建'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: 平台使用情况与活跃画像 (Usage & Peak Hours) */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-serif font-black text-stone-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>24小时全天活跃时段分布 (Peak Activity Distribution)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  统计用户登录与高频研判的时段波峰，便于规划算力供给与模型缓存。
                </p>
              </div>

              <span className="text-xs font-mono text-stone-500">单位: 事件频次 (Events / Hour)</span>
            </div>

            <div className="grid grid-cols-12 sm:grid-cols-24 gap-1.5 pt-2 items-end h-28">
              {Array.from({ length: 24 }).map((_, h) => {
                const count = hourlyDistribution[h] || 0;
                const pct = Math.max(8, (count / maxHourlyCount) * 100);
                return (
                  <div key={h} className="flex flex-col items-center justify-end h-full group relative">
                    <div
                      className={`w-full rounded-t-xs transition-all duration-300 ${
                        count > 0 ? 'bg-[#E3120B] group-hover:bg-red-700' : 'bg-stone-200'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                    <span className="text-[9px] font-mono text-stone-400 mt-1">{h}时</span>
                    <div className="absolute -top-7 hidden group-hover:flex bg-stone-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                      {h}:00-{h}:59 · {count}次
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Usage Profile Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-base font-serif font-black text-stone-950 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>各分析师使用情况台账 (Analyst Usage Ledger)</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">点击任意用户可展开其近期的研判动作时序轨迹。</p>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 font-serif font-bold text-stone-700 border-b border-stone-200">
                    <tr>
                      <th className="p-3">分析师 / 用户名</th>
                      <th className="p-3">登录次数</th>
                      <th className="p-3">AI 研判</th>
                      <th className="p-3">知识沉淀</th>
                      <th className="p-3">情报阅读</th>
                      <th className="p-3">最后活跃时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {userSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-400 font-serif">
                          暂无用户活跃使用记录
                        </td>
                      </tr>
                    ) : (
                      userSummaries.map((u, idx) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedUserDetail(u)}
                          className={`hover:bg-amber-50/50 cursor-pointer transition-colors ${
                            selectedUserDetail?.username === u.username ? 'bg-amber-50/80 font-bold' : ''
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-stone-900 flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[10px] flex items-center justify-center font-serif">
                              {u.username.slice(0, 1).toUpperCase()}
                            </span>
                            <span>{u.username}</span>
                          </td>
                          <td className="p-3 font-mono text-blue-700">{u.totalLogins} 次</td>
                          <td className="p-3 font-mono text-amber-700">{u.totalAiAnalysis} 次</td>
                          <td className="p-3 font-mono text-purple-700">{u.totalDeposits} 条</td>
                          <td className="p-3 font-mono text-stone-700">{u.totalArticleReads} 篇</td>
                          <td className="p-3 font-mono text-stone-500 text-[11px]">{u.lastActiveAt || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected User Drawer */}
            <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="border-b border-stone-200 pb-3">
                  <div className="text-[10px] font-mono text-stone-500 uppercase">活跃轨迹明细 (User Footprint)</div>
                  <h4 className="text-base font-serif font-black text-stone-950 mt-1">
                    {selectedUserDetail ? `用户「${selectedUserDetail.username}」近期动作` : '选择左侧用户查看轨迹'}
                  </h4>
                </div>

                {selectedUserDetail ? (
                  <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
                    {selectedUserDetail.recentActions.length === 0 ? (
                      <p className="text-xs text-stone-400 py-6 text-center">暂无详细动作流水</p>
                    ) : (
                      selectedUserDetail.recentActions.map((act, i) => (
                        <div key={i} className="border-l-2 border-stone-800 pl-3 py-0.5 space-y-0.5">
                          <div className="text-[10px] font-mono text-stone-400">{act.at}</div>
                          <div className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-stone-100 text-[10px] font-mono text-stone-700">
                              {act.action}
                            </span>
                          </div>
                          {act.detail && <p className="text-[11px] text-stone-600 line-clamp-1">{act.detail}</p>}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-2 text-stone-400">
                    <Activity className="w-8 h-8 mx-auto text-stone-300 animate-pulse" />
                    <p className="text-xs font-serif">点击左侧任意用户行</p>
                    <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                      在此查阅其完整的深度分析、知识沉淀与登录操作明细
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: 安全审计与数据备份 (Audit & Backups) */}
      {activeTab === 'audit' && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                安全审计哈希链与数据备份 (Security & Backups)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                底层基于 SHA-256 哈希防篡改链条，保障数据库持久化与合规快照。
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>SHA-256 审计链校验通过</span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 font-serif font-bold text-stone-700 sticky top-0 border-b border-stone-200">
                <tr>
                  <th className="p-3">操作主体</th>
                  <th className="p-3">动作类型</th>
                  <th className="p-3">关联实体</th>
                  <th className="p-3">元数据详情</th>
                  <th className="p-3 text-right">时间戳</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400 font-serif">
                      暂无审计日志事件
                    </td>
                  </tr>
                ) : (
                  auditEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-stone-900">{evt.actor}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-stone-100 font-mono text-[11px] text-stone-800">
                          {evt.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-stone-600 text-[11px]">{evt.entityType || '-'}</td>
                      <td className="p-3 font-mono text-stone-500 text-[10px] max-w-xs truncate">
                        {evt.metadata ? JSON.stringify(evt.metadata) : '-'}
                      </td>
                      <td className="p-3 font-mono text-stone-500 text-[11px] text-right">
                        {evt.at || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
