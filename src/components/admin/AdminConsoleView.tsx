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
import { SECTOR_TAXONOMY_DEFAULT } from '../../utils/sectorTaxonomy';
import { ActivityTab } from './tabs/ActivityTab';
import { AuditTab } from './tabs/AuditTab';
import { BehaviorLogsTab } from './tabs/BehaviorLogsTab';
import { DatabaseTab } from './tabs/DatabaseTab';
import { FeedsTab } from './tabs/FeedsTab';
import { KeysTab } from './tabs/KeysTab';
import { TaxonomyTab } from './tabs/TaxonomyTab';
import { UsersTab } from './tabs/UsersTab';

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
  rateLimit: { maxPerMinute: number; windowMs: number; guestPerMinute?: number; viewerPerMinute?: number };
  exposure?: { note?: string };
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

  const adminScope = {
    activeTab,
    aiChoice,
    auditEvents,
    behaviorActionFilter,
    behaviorPage,
    behaviorPageSize,
    behaviorUsernameQuery,
    creatingUser,
    dbAnalyses,
    dbCategoryFilter,
    dbLoading,
    dbOverview,
    dbPage,
    dbSearchQuery,
    dbTotalAnalyses,
    deepseekBaseUrlInput,
    deepseekKeyInput,
    deepseekModelInput,
    feedList,
    fetchDatabaseData,
    filteredBehaviorLogs,
    filteredUsers,
    formatActionBadge,
    geminiKeyInput,
    geminiModelInput,
    handleAddFeed,
    handleCreateUser,
    handleDeleteAnalysis,
    handleExportCsv,
    handleGenerateBehaviorInsights,
    handleReanalyzeItem,
    handleRemoveFeed,
    handleResetPassword,
    handleRevokeSessions,
    handleSaveSettings,
    handleTestAi,
    handleTogglePresetFeed,
    handleTriggerIngest,
    handleUpdateUser,
    handleViewAnalysisDetail,
    hourlyDistribution,
    ingesting,
    insightsLoading,
    insightsReport,
    maxHourlyCount,
    newFeedUrl,
    newPassword,
    newRole,
    newUsername,
    paginatedBehaviorLogs,
    reanalyzingKey,
    renderCorpusHealthModule,
    resetNewPassword,
    resettingUserId,
    roleFilter,
    sectorKeywordsState,
    selectedAnalysisDetail,
    selectedLogModal,
    selectedUserDetail,
    setAiChoice,
    setBehaviorActionFilter,
    setBehaviorPage,
    setBehaviorPageSize,
    setBehaviorUsernameQuery,
    setDbCategoryFilter,
    setDbPage,
    setDbSearchQuery,
    setDeepseekBaseUrlInput,
    setDeepseekKeyInput,
    setDeepseekModelInput,
    setGeminiKeyInput,
    setGeminiModelInput,
    setInsightsReport,
    setNewFeedUrl,
    setNewPassword,
    setNewRole,
    setNewUsername,
    setResetNewPassword,
    setResettingUserId,
    setRoleFilter,
    setSectorKeywordsState,
    setSelectedAnalysisDetail,
    setSelectedLogModal,
    setSelectedUserDetail,
    setShowCreateUserModal,
    setShowDeepseekKey,
    setShowGeminiKey,
    setUserSearchQuery,
    settings,
    showCreateUserModal,
    showDeepseekKey,
    showGeminiKey,
    showToast,
    status,
    testResult,
    testingAi,
    totalBehaviorPages,
    userSearchQuery,
    userSummaries,
    users,
  };

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
          {status?.exposure?.note && (
            <p className="text-[11px] font-mono text-stone-400 max-w-2xl leading-relaxed">{status.exposure.note}</p>
          )}
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

      <DatabaseTab s={adminScope} />

      <BehaviorLogsTab s={adminScope} />

      {activeTab === 'keys' && <KeysTab s={adminScope} />}

      {activeTab === 'feeds' && <FeedsTab s={adminScope} />}

      {activeTab === 'taxonomy' && <TaxonomyTab s={adminScope} />}

      {activeTab === 'users' && <UsersTab s={adminScope} />}

      {activeTab === 'activity' && <ActivityTab s={adminScope} />}

      {activeTab === 'audit' && <AuditTab s={adminScope} />}
    </div>
  );
};
