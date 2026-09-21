import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Settings,
  UserRound,
  KeyRound,
  Rss,
  Save,
  Zap,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  BookOpen,
  RotateCcw,
  Database,
  RefreshCw,
  AlertTriangle,
  Radio,
  Plus,
} from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';
import { NEWS_INTEREST_GROUPS, SECTOR_TAXONOMY_DEFAULT, SUGGESTED_SOURCES } from '../utils/sectorTaxonomy';
import { POSITIVE_WORDS, NEGATIVE_WORDS } from '../utils/corpusMetrics';
import { SOURCE_REGION_LABELS } from '../utils/sourceRegion';
import { MENTION_REGIONS } from '../utils/mentionRegion';
import { RadarKeyword, NewsArticle } from '../types';
import { monitorHits } from '../utils/monitorKeywords';
import { FeatureSummary } from './common/FeatureSummary';
import type { FeatureSummaryId } from '../utils/featureSummaries';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nickname: string;
  onNicknameChange: (value: string) => void;
  /** 首页默认兴趣领域；“我的领域”按赛道词表派生过滤。 */
  interestGroups: string[];
  onInterestGroupsChange: (value: string[]) => void;
  /** 首页“关注”筛选使用的手动标签。 */
  followedTags: string[];
  onFollowedTagsChange: (value: string[]) => void;
  /** 监控雷达词库（设置页管理增删） */
  radarKeywords?: RadarKeyword[];
  onAddRadarOpen?: () => void;
  onRemoveRadar?: (id: string) => void;
  /** 用于显示每个监控词在当前语料的命中数 */
  articles?: NewsArticle[];
}

interface PublicSettings {
  userName: string;
  ai: {
    choice: 'auto' | 'gemini' | 'deepseek';
    provider: 'gemini' | 'deepseek' | null;
    gemini: boolean;
    deepseek: boolean;
    geminiModel: string;
    deepseekModel: string;
    deepseekBaseUrl: string;
  };
  feeds: string[];
}

interface FeedStatus {
  enabled: boolean;
  urls: string[];
  lastIngest: {
    added?: number;
    skipped?: number;
    errors?: string[];
    at?: string;
    corpusSize?: number;
  } | null;
  corpus: string;
  corpusSize: number;
}

interface AdminStatus {
  aiUsage?: {
    totalCalls: number;
    promptChars: number;
    outputChars: number;
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
    lastResetAt: string;
    byProvider: Record<string, { calls: number; promptChars: number; outputChars: number; promptTokens: number; outputTokens: number; totalTokens: number }>;
    persistedToday?: {
      calls: number;
      promptChars: number;
      outputChars: number;
      promptTokens: number;
      outputTokens: number;
      totalTokens: number;
      tokenReportedCalls: number;
    } | null;
    limits?: {
      dailyCalls: number;
      dailyTokens: number;
    };
  };
}

const inputCls =
  'w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900';
const labelCls = 'block text-[11px] font-serif font-bold text-stone-600 mb-1';
const sectionTitle =
  'flex items-center space-x-1.5 text-xs font-serif font-bold text-stone-800';

const PROVIDER_LABEL: Record<string, string> = { gemini: 'Gemini', deepseek: 'DeepSeek' };
type SettingsSection = 'profile' | 'ai' | 'feeds' | 'taxonomy' | 'radar' | 'usage' | 'backups' | 'audit' | 'users';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  nickname,
  onNicknameChange,
  interestGroups,
  onInterestGroupsChange,
  followedTags,
  onFollowedTagsChange,
  radarKeywords = [],
  onAddRadarOpen,
  onRemoveRadar,
  articles = [],
}) => {
  useEscapeClose(isOpen, onClose);

  const [view, setView] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile');
  const sectionFeatureId: Record<SettingsSection, FeatureSummaryId> = {
    profile: 'settings-profile',
    ai: 'settings-ai',
    feeds: 'settings-feeds',
    taxonomy: 'settings-taxonomy',
    radar: 'settings-radar',
    usage: 'settings-usage',
    backups: 'settings-backups',
    audit: 'settings-audit',
    users: 'settings-users',
  };

  // Key 表单（永不回显；仅改动/清除时随保存提交）
  const [aiChoice, setAiChoice] = useState<'auto' | 'gemini' | 'deepseek'>('auto');
  const [geminiKey, setGeminiKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [keyTouched, setKeyTouched] = useState({ gemini: false, deepseek: false });
  const [keysVisible, setKeysVisible] = useState({ gemini: false, deepseek: false });
  const [geminiModel, setGeminiModel] = useState('');
  const [deepseekModel, setDeepseekModel] = useState('');
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState('');
  const [feedsText, setFeedsText] = useState('');
  const [newFollowTag, setNewFollowTag] = useState('');

  // 赛道词库覆盖（影响盲区/密度/点名，保存后刷新页面生效）
  const [taxoText, setTaxoText] = useState(() => {
    const base = Object.fromEntries(SECTOR_TAXONOMY_DEFAULT.map((d) => [d.id, { keywords: d.keywords }]));
    return JSON.stringify(base, null, 0);
  });
  // 可视化逐赛道编辑（逗号分隔）；JSON 由行输入生成，仅作只读预览
  const [taxoRows, setTaxoRows] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sec of SECTOR_TAXONOMY_DEFAULT) init[sec.id] = sec.keywords.join('，');
    try {
      const raw = localStorage.getItem('sector-taxonomy-overrides');
      if (raw) {
        const ov = JSON.parse(raw) as Record<string, { keywords?: string[] }>;
        for (const sec of SECTOR_TAXONOMY_DEFAULT) {
          const kws = ov?.[sec.id]?.keywords;
          if (Array.isArray(kws) && kws.length > 0) init[sec.id] = kws.join('，');
        }
      }
    } catch {
      /* ignore */
    }
    return init;
  });
  const updateTaxoRow = (id: string, value: string) => {
    const next = { ...taxoRows, [id]: value };
    setTaxoRows(next);
    const shape: Record<string, unknown> = {};
    for (const sec of SECTOR_TAXONOMY_DEFAULT) {
      const kws = (next[sec.id] || '').split(/[,，]/).map((x: string) => x.trim()).filter(Boolean);
      if (kws.length > 0) shape[sec.id] = { keywords: kws };
    }
    setTaxoText(JSON.stringify(shape));
  };
  const saveTaxonomy = async () => {
    try {
      const ov = JSON.parse(taxoText);
      const shape: Record<string, unknown> = {};
      for (const sec of SECTOR_TAXONOMY_DEFAULT) {
        const kws = ov?.[sec.id]?.keywords;
        if (Array.isArray(kws)) shape[sec.id] = { keywords: kws.map(String).map((x: string) => x.trim()).filter(Boolean) };
      }
      localStorage.setItem('sector-taxonomy-overrides', JSON.stringify(shape));
      // 同步服务端（冲突分组等检测同词）
      try {
        const r = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectorOverrides: shape }),
        });
        if (!r.ok) throw new Error(`settings ${r.status}`);
      } catch {
        // 服务端同步失败仅提示，本地词库仍生效
      }
      setFeedback({ ok: true, text: '赛道词库已保存并同步服务端（刷新页面后，盲区/密度/点名与冲突分组将按新词库计算）。' });
    } catch {
      setFeedback({ ok: false, text: '词库不是合法 JSON，请检查后重试。' });
    }
  };
  const resetTaxonomy = () => {
    localStorage.removeItem('sector-taxonomy-overrides');
    const init: Record<string, string> = {};
    for (const sec of SECTOR_TAXONOMY_DEFAULT) init[sec.id] = sec.keywords.join('，');
    setTaxoRows(init);
    setTaxoText(JSON.stringify(Object.fromEntries(SECTOR_TAXONOMY_DEFAULT.map((d) => [d.id, { keywords: d.keywords }])), null, 0));
    setFeedback({ ok: true, text: '已恢复默认赛道词库（刷新页面后生效）。' });
  };

  const toggleInterestGroup = (id: string) => {
    onInterestGroupsChange(
      interestGroups.includes(id)
        ? interestGroups.filter((group) => group !== id)
        : [...interestGroups, id]
    );
  };

  const addFollowedTag = () => {
    const value = newFollowTag.trim().replace(/^#/, '');
    if (!value) return;
    const exists = followedTags.some((tag) => tag.toLowerCase() === value.toLowerCase());
    if (!exists) onFollowedTagsChange([...followedTags, value].slice(0, 50));
    setNewFollowTag('');
  };

  const removeFollowedTag = (tag: string) => {
    onFollowedTagsChange(followedTags.filter((item) => item !== tag));
  };

  // 信源摄取状态
  const [feedStatus, setFeedStatus] = useState<FeedStatus | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [backups, setBackups] = useState<Array<{
    file: string;
    createdAt: string;
    bytes: number;
    databaseHash: string;
    articles: number;
    integrityValid: boolean;
    reason?: string;
  }>>([]);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupScheduler, setBackupScheduler] = useState<{
    enabled: boolean;
    intervalMs: number;
    startupDelayMs: number;
    running: boolean;
    newestBackupAgeMs: number | null;
    lastStatus: { at: string; status: string; backupFile?: string; error?: string } | null;
  } | null>(null);
  const [auditEvents, setAuditEvents] = useState<Array<{
    id: number;
    at: string;
    actor: string;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    status: string;
    integrityValid: boolean;
  }>>([]);
  const [auditChain, setAuditChain] = useState<{ valid: boolean; checked: number; brokenAt: number | null } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; legacyToken?: boolean } | null>(null);
  const [users, setUsers] = useState<Array<{
    id: string;
    username: string;
    role: string;
    active: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
  }>>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer' });
  const [passwordChange, setPasswordChange] = useState({ current: '', next: '' });
  const [userMessage, setUserMessage] = useState('');

  const loadUsers = async () => {
    try {
      const [meResponse, usersResponse] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/users'),
      ]);
      const me = await meResponse.json();
      const data = await usersResponse.json();
      setCurrentUser(me?.user || null);
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch {
      setUsers([]);
    }
  };

  const createLocalUser = async () => {
    setUserMessage('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'failed');
      setNewUser({ username: '', password: '', role: 'viewer' });
      setUserMessage('用户已创建。');
      await loadUsers();
    } catch {
      setUserMessage('用户创建失败：用户名可能已存在，或密码未满足至少 12 位和三类字符要求。');
    }
  };

  const updateManagedUser = async (
    id: string,
    patch: { role?: string; active?: boolean; approvalStatus?: 'pending' | 'approved' | 'rejected' }
  ) => {
    setUserMessage('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'failed');
      setUserMessage('用户权限已更新，相关旧会话已按规则撤销。');
      await loadUsers();
    } catch (error: any) {
      setUserMessage(
        String(error?.message || error).includes('cannot_remove_last_admin')
          ? '不能停用或降级最后一个有效管理员。'
          : '用户更新失败。'
      );
    }
  };

  const resetManagedPassword = async (id: string, username: string) => {
    const password = window.prompt(`为 ${username} 设置新密码（至少 12 位，需包含至少三类字符）`);
    if (!password || password.length < 12) return;
    const response = await fetch(`/api/users/${encodeURIComponent(id)}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setUserMessage(response.ok ? '密码已重置，该用户全部会话已撤销。' : '密码重置失败。');
    if (response.ok) await loadUsers();
  };

  const revokeManagedSessions = async (id: string) => {
    const response = await fetch(`/api/users/${encodeURIComponent(id)}/sessions`, {
      method: 'DELETE',
    });
    const data = await response.json();
    setUserMessage(response.ok ? `已撤销 ${data.revoked || 0} 个会话。` : '会话撤销失败。');
  };

  const changeOwnPassword = async () => {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: passwordChange.current,
        newPassword: passwordChange.next,
      }),
    });
    setUserMessage(response.ok ? '密码已修改，请重新登录。' : '密码修改失败。');
    if (response.ok) {
      localStorage.removeItem('jianwei:auth-token');
      window.setTimeout(() => window.location.reload(), 500);
    }
  };

  const loadAudit = async () => {
    try {
      const response = await fetch('/api/admin/audit?limit=100');
      const data = await response.json();
      setAuditEvents(Array.isArray(data?.events) ? data.events : []);
      setAuditChain(data?.chain || null);
    } catch {
      setAuditEvents([]);
      setAuditChain(null);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/admin/backups');
      const data = await response.json();
      setBackups(Array.isArray(data?.backups) ? data.backups : []);
      setBackupScheduler(data?.scheduler || null);
    } catch {
      setBackups([]);
    }
  };

  useEffect(() => {
    if (isOpen && settingsSection === 'backups') void loadBackups();
    if (isOpen && settingsSection === 'audit') void loadAudit();
    if (isOpen && settingsSection === 'users') void loadUsers();
  }, [isOpen, settingsSection]);

  const createBackup = async () => {
    setBackupBusy(true);
    setBackupMessage('');
    try {
      const response = await fetch('/api/admin/backups', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'backup_failed');
      setBackups(Array.isArray(data.backups) ? data.backups : []);
      setBackupScheduler(data?.scheduler || null);
      setBackupMessage('备份已创建，并通过 SQLite 完整性与 SHA-256 校验。');
    } catch {
      setBackupMessage('备份创建失败，本次没有替换任何现有文件。');
    } finally {
      setBackupBusy(false);
    }
  };

  const verifyBackup = async (file: string) => {
    setBackupBusy(true);
    setBackupMessage('');
    try {
      const response = await fetch('/api/admin/backups/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file }),
      });
      const data = await response.json();
      setBackupMessage(
        data.ok
          ? `校验通过：${file}，${data.articles} 篇语料。`
          : `校验失败：${data.reason || 'unknown'}`
      );
      await loadBackups();
    } catch {
      setBackupMessage('校验请求失败。');
    } finally {
      setBackupBusy(false);
    }
  };

  const restoreBackup = async (file: string) => {
    const confirmation = window.prompt(`恢复会重启服务并替换当前数据库。输入 RESTORE 确认恢复 ${file}`);
    if (confirmation !== 'RESTORE') return;
    setBackupBusy(true);
    setBackupMessage('');
    try {
      const response = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.reason || data?.error || 'restore_failed');
      setBackupMessage(`恢复成功，服务即将自动重启。回滚文件：${data.rollbackFile || '已保留'}`);
    } catch {
      setBackupMessage('恢复失败，原数据库已保留或已执行回滚。');
    } finally {
      setBackupBusy(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setKeyTouched({ gemini: false, deepseek: false });
    setLoading(true);
    Promise.all([
      fetch('/api/settings').then((r) => {
        if (!r.ok) throw new Error(`settings ${r.status}`);
        return r.json();
      }),
      fetch('/api/feeds/status').then((r) => {
        if (!r.ok) throw new Error(`feeds ${r.status}`);
        return r.json();
      }),
      fetch('/api/admin/status')
        .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
        .catch(() => null),
    ])
      .then(([d, f, admin]) => {
        setView(d);
        setAdminStatus(admin as AdminStatus | null);
        setAiChoice(d.ai?.choice || 'auto');
        setGeminiModel(d.ai?.geminiModel || 'gemini-2.5-flash');
        setDeepseekModel(d.ai?.deepseekModel || 'deepseek-chat');
        setDeepseekBaseUrl(d.ai?.deepseekBaseUrl || 'https://api.deepseek.com');
        setFeedsText((d.feeds || []).join('\n'));
        setFeedStatus(f);
      })
      .catch(() => setFeedback({ ok: false, text: '读取服务端设置/信源状态失败（请确认服务已启动）。' }))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      userName: nickname,
      aiChoice,
      feeds: feedsText
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean),
    };
    if (geminiModel.trim()) payload.geminiModel = geminiModel.trim();
    if (deepseekModel.trim()) payload.deepseekModel = deepseekModel.trim();
    if (deepseekBaseUrl.trim()) payload.deepseekBaseUrl = deepseekBaseUrl.trim();
    if (keyTouched.gemini) payload.geminiApiKey = geminiKey.trim();
    if (keyTouched.deepseek) payload.deepseekApiKey = deepseekKey.trim();
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error(`settings ${res.status}`);
      const d = await res.json();
      setView(d);
      setFeedback({ ok: true, text: '已保存并即时生效（无需重启）。密钥仅存于服务端本地文件，不回显。' });
    } catch (e) {
      setFeedback({ ok: false, text: `保存失败：${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setSaving(false);
    }
  };

  const handleClearKeys = () => {
    setGeminiKey('');
    setDeepseekKey('');
    setKeyTouched({ gemini: true, deepseek: true });
    setFeedback({ ok: true, text: '已标记清除两个 API Key；点击“保存设置”后生效。' });
  };

  const handleTest = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/ai/test', { method: 'POST' });
      const d = await res.json();
      setFeedback(
        d.ok
          ? {
              ok: true,
              text: `连接成功（${PROVIDER_LABEL[d.provider] || d.provider}）${d.sample ? '：' + d.sample : ''}`,
            }
          : { ok: false, text: d.reason || '连接失败' }
      );
    } catch (e) {
      setFeedback({ ok: false, text: `测试请求失败：${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setTesting(false);
    }
  };

  const loadFeedStatus = async () => {
    setFeedLoading(true);
    try {
      const f = await fetch('/api/feeds/status').then((r) => r.json());
      setFeedStatus(f);
      setFeedback({ ok: true, text: `信源状态已刷新：语料 ${f.corpusSize} 篇（${f.corpus}）` });
    } catch {
      setFeedback({ ok: false, text: '刷新信源状态失败。' });
    } finally {
      setFeedLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!feedStatus?.enabled) return;
    setIngesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/feeds/ingest', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || `ingest ${res.status}`);
      const li = d.lastIngest || {};
      setFeedback({
        ok: true,
        text: `摄取完成：新增 ${li.added ?? 0} 条、跳过 ${li.skipped ?? 0} 条${
          li.errors?.length ? `、失败 ${li.errors.length} 源` : ''
        }；当前语料 ${d.corpusSize} 篇。`,
      });
      await loadFeedStatus();
    } catch (e) {
      setFeedback({ ok: false, text: `摄取失败：${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setIngesting(false);
    }
  };

  // 生效通道与强制选择的差异提示
  const effectiveProvider = view?.ai.provider ?? null;
  const choiceLabel = aiChoice === 'gemini' ? 'Gemini' : aiChoice === 'deepseek' ? 'DeepSeek' : '自动';
  const mismatchNote =
    aiChoice === 'gemini' && effectiveProvider === 'deepseek'
      ? '强制 Gemini 但未配置 Gemini Key，已回退到 DeepSeek。'
      : aiChoice === 'deepseek' && effectiveProvider === 'gemini'
        ? '强制 DeepSeek 但未配置 DeepSeek Key，已回退到 Gemini。'
        : aiChoice !== 'auto' && !effectiveProvider
          ? '该通道未配置 Key，当前无可用在线模型（将使用本地演示兜底）。'
          : null;

  const keyField = (
    id: 'gemini' | 'deepseek',
    label: string,
    value: string,
    setter: (v: string) => void,
    configured: boolean,
    placeholder: string
  ) => (
    <div>
      <label className={labelCls}>
        {label}{' '}
        <span className="text-stone-400 font-mono normal-case">
          （{loading ? '…' : configured ? '已配置' : '未配置'}）
        </span>
      </label>
      <div className="relative">
        <input
          type={keysVisible[id] ? 'text' : 'password'}
          className={`${inputCls} pr-9`}
          value={value}
          onChange={(e) => {
            setter(e.target.value);
            setKeyTouched((p) => ({ ...p, [id]: true }));
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setKeysVisible((p) => ({ ...p, [id]: !p[id] }))}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
          aria-label={keysVisible[id] ? '隐藏密钥' : '显示密钥'}
        >
          {keysVisible[id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="settings"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs font-sans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.15 } }}
            className="w-full max-w-2xl bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center space-x-2.5">
                <Settings className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-serif font-bold tracking-wide">见微 · 设置</h3>
                  <p className="text-[11px] text-stone-400 font-sans">用户档案 · AI 通道 · 信源摄取</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors" aria-label="关闭设置">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-stone-200 pb-2 -mt-3 sticky top-0 bg-[#FAF8F5] z-10 pt-3">
                {[
                  { id: 'profile' as const, label: '用户' },
                  { id: 'ai' as const, label: 'AI 通道' },
                  { id: 'feeds' as const, label: '信源' },
                  { id: 'taxonomy' as const, label: '词库' },
                  { id: 'radar' as const, label: '监控' },
                  { id: 'usage' as const, label: '用量' },
                  { id: 'backups' as const, label: '备份' },
                  { id: 'audit' as const, label: '审计' },
                  { id: 'users' as const, label: '权限' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettingsSection(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-serif font-bold whitespace-nowrap transition-colors ${
                      settingsSection === item.id
                        ? 'bg-stone-900 text-white'
                        : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <FeatureSummary featureId={sectionFeatureId[settingsSection]} compact />

              {/* 用户档案 */}
              {settingsSection === 'profile' && (
              <section className="space-y-2">
                <div className={sectionTitle}>
                  <UserRound className="w-4 h-4 text-[#E3120B]" />
                  <span>用户档案（顶栏问候即时生效）</span>
                </div>
                <input
                  className={inputCls}
                  value={nickname}
                  onChange={(e) => onNicknameChange(e.target.value)}
                  placeholder="输入您的昵称，例如：宏观研究员"
                />
                <p className="text-[10px] text-stone-400">
                  昵称保存在本机浏览器，保存设置时同步到服务端；顶栏问候语会随输入即时更新。
                </p>

                <div className="pt-3 mt-3 border-t border-stone-200 space-y-2">
                  <label className={labelCls}>新闻兴趣领域</label>
                  <div className="flex flex-wrap gap-1.5">
                    {NEWS_INTEREST_GROUPS.map((group) => {
                      const active = interestGroups.includes(group.id);
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => toggleInterestGroup(group.id)}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-serif font-bold transition-colors ${
                            active
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                          }`}
                        >
                          {active ? '✓ ' : ''}{group.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-stone-400 leading-relaxed">
                    首页默认进入「我的领域」，只显示命中所选领域的新闻；仍可手动切回「全部」。
                    领域判断来自可编辑的赛道词表，不做隐藏式 AI 分类。
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-200 space-y-2">
                  <label className={labelCls}>关注标签</label>
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      value={newFollowTag}
                      onChange={(event) => setNewFollowTag(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addFollowedTag();
                        }
                      }}
                      placeholder="输入标签，例如：财经、AI、英伟达"
                    />
                    <button
                      type="button"
                      onClick={addFollowedTag}
                      className="shrink-0 px-3 py-2 rounded-lg bg-stone-900 text-white text-[11px] font-serif font-bold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> 添加
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {followedTags.length === 0 ? (
                      <span className="text-[10px] text-stone-400">尚未设置关注标签。</span>
                    ) : followedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => removeFollowedTag(tag)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] text-[#E3120B]"
                        title="点击移除"
                      >
                        #{tag}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-400 leading-relaxed">
                    首页「关注」= 命中这些标签的新闻 + 你已收藏的文章。也可在新闻卡片上点击真实标签直接关注。
                  </p>
                </div>
              </section>
              )}

              {/* AI 双通道 */}
              {settingsSection === 'ai' && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={sectionTitle}>
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>AI 双通道（Gemini / DeepSeek）</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      effectiveProvider
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}
                  >
                    生效：{loading ? '…' : effectiveProvider ? PROVIDER_LABEL[effectiveProvider] : '本地演示'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      { id: 'auto', label: '自动' },
                      { id: 'gemini', label: '强制 Gemini' },
                      { id: 'deepseek', label: '强制 DeepSeek' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setAiChoice(opt.id)}
                      className={`px-3 py-2 rounded-lg border font-serif font-bold transition-all ${
                        aiChoice === opt.id
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {mismatchNote && (
                  <div className="flex items-start space-x-1.5 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{mismatchNote}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {keyField('gemini', 'Gemini API Key', geminiKey, setGeminiKey, view?.ai.gemini || false, '粘贴 Gemini API Key')}
                  {keyField('deepseek', 'DeepSeek API Key', deepseekKey, setDeepseekKey, view?.ai.deepseek || false, '粘贴 DeepSeek API Key（sk-…）')}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Gemini 模型</label>
                    <input className={inputCls} value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>DeepSeek 模型</label>
                    <input className={inputCls} value={deepseekModel} onChange={(e) => setDeepseekModel(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>DeepSeek Base URL</label>
                    <input className={inputCls} value={deepseekBaseUrl} onChange={(e) => setDeepseekBaseUrl(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 font-mono">
                  <span>通道选择：{choiceLabel}</span>
                  <span>· Gemini 模型：{view?.ai.geminiModel || geminiModel}</span>
                  <span>· DeepSeek 模型：{view?.ai.deepseekModel || deepseekModel}</span>
                </div>

                <button
                  onClick={handleClearKeys}
                  className="text-[11px] font-serif font-bold text-red-700 hover:text-red-900 flex items-center space-x-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清除已保存的 API Key（保存后生效）</span>
                </button>
              </section>
              )}

              {/* 信源接入与摄取 */}
              {settingsSection === 'feeds' && (
              <section className="space-y-3">
                <div className={sectionTitle}>
                  <Rss className="w-4 h-4 text-emerald-600" />
                  <span>真实信源 RSS（NEWS_FEED_URLS）</span>
                </div>
                <textarea
                  className={`${inputCls} resize-none font-mono`}
                  rows={3}
                  value={feedsText}
                  onChange={(e) => setFeedsText(e.target.value)}
                  placeholder={'每行一个 RSS 地址，例如：\nhttps://example.com/feed.xml'}
                />

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-serif font-bold text-stone-700">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>信源状态</span>
                    </div>
                    <button
                      onClick={loadFeedStatus}
                      disabled={feedLoading}
                      className="text-[11px] font-mono text-stone-500 hover:text-stone-900 flex items-center space-x-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${feedLoading ? 'animate-spin' : ''}`} />
                      <span>刷新</span>
                    </button>
                  </div>

                  {feedStatus ? (
                    <div className="space-y-1.5 text-[11px] text-stone-600">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          配置源：<strong>{feedStatus.urls.length}</strong> 个（{feedStatus.corpus === 'live' ? 'live' : 'curated（未配置）'}）
                        </span>
                        <span>
                          运行时语料：<strong>{feedStatus.corpusSize}</strong> 篇
                        </span>
                      </div>
                      {feedStatus.lastIngest && (
                        <div>
                          <span className="text-stone-400">上次摄取：</span>
                          {feedStatus.lastIngest.at
                            ? `${new Date(feedStatus.lastIngest.at).toLocaleString('zh-CN')} · 新增 ${feedStatus.lastIngest.added ?? 0} · 跳过 ${feedStatus.lastIngest.skipped ?? 0}`
                            : '暂无记录'}
                          {feedStatus.lastIngest.errors && feedStatus.lastIngest.errors.length > 0 && (
                            <span className="text-red-700 block mt-1 max-h-16 overflow-y-auto">
                              {feedStatus.lastIngest.errors.join('；')}
                            </span>
                          )}
                        </div>
                      )}
                      {!feedStatus.lastIngest && !feedStatus.enabled && (
                        <div className="text-amber-700 flex items-start space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>未配置 RSS 源：在上方粘贴地址并“保存设置”后，即可使用“立即摄取”。</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-400">加载中…</div>
                  )}

                  <button
                    onClick={handleIngest}
                    disabled={ingesting || !feedStatus?.enabled || feedLoading}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-serif font-bold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>{ingesting ? '摄取中…' : '立即摄取（POST /api/feeds/ingest）'}</span>
                  </button>
                </div>
              </section>
              )}

              {/* 词典与算法（词库可覆盖 / 查看词表与公式） */}
              {settingsSection === 'taxonomy' && (
              <section className="space-y-3 border-t border-stone-200 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-stone-800">
                    <BookOpen className="w-4 h-4 text-[#0284C7]" />
                    <span>盲区/密度/点名 · 赛道词库（可选覆盖）</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={resetTaxonomy}
                      className="text-[11px] font-serif font-bold text-stone-500 hover:text-stone-900 flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>恢复默认</span>
                    </button>
                    <button
                      onClick={saveTaxonomy}
                      className="text-[11px] font-serif font-bold text-[#0284C7] hover:text-blue-900"
                    >
                      保存词库
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SECTOR_TAXONOMY_DEFAULT.map((sec) => (
                    <div key={sec.id}>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] font-serif font-bold text-stone-500">{sec.name}</label>
                        <button
                          type="button"
                          onClick={() => updateTaxoRow(sec.id, sec.keywords.join('，'))}
                          className="text-[9px] font-mono text-stone-400 hover:text-stone-700"
                        >
                          用默认词
                        </button>
                      </div>
                      <input
                        className={`${inputCls} !py-1.5 !text-[11px]`}
                        value={taxoRows[sec.id] || ''}
                        onChange={(e) => updateTaxoRow(sec.id, e.target.value)}
                        placeholder="逗号分隔关键词"
                      />
                      {(SUGGESTED_SOURCES[sec.id] || []).length > 0 && (
                        <p className="text-[9px] text-stone-300 mt-0.5 leading-tight">
                          建议源：{SUGGESTED_SOURCES[sec.id].map((x) => x.name.split(' / ')[0]).slice(0, 2).join('、')}…
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <details className="text-[10px] text-stone-400">
                  <summary className="cursor-pointer font-serif font-bold text-stone-500">
                    查看/粘贴 JSON（只读预览）
                  </summary>
                  <pre className="mt-1.5 p-2 bg-stone-100 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                    {taxoText}
                  </pre>
                </details>
                <p className="text-[10px] text-stone-400">
                  修改以上任一赛道关键词后点“保存词库”（同步服务端冲突分组）；刷新页面后盲区/密度/点名按新词库重算。
                </p>

                <details className="text-[11px] text-stone-500">
                  <summary className="cursor-pointer font-serif font-bold text-stone-700">
                    查看算法口径与词表（情绪词典 / 赛道 / 地区）
                  </summary>
                  <div className="mt-2 space-y-2 leading-relaxed">
                    <p><strong>净情绪（词典代理）：</strong>净情绪=(正向-负向)/(正+负)×100；逐篇唯一归类为正向/负向/中性/交织，不重复计数。
                      正向词 {POSITIVE_WORDS.length} 个（{POSITIVE_WORDS.slice(0, 12).join('、')}…）；
                      负向词 {NEGATIVE_WORDS.length} 个（{NEGATIVE_WORDS.slice(0, 12).join('、')}…）。朴素基线，不构成投资依据。</p>
                    <p><strong>赛道词库（默认）：</strong>{SECTOR_TAXONOMY_DEFAULT.map((x) => `${x.name}(${x.keywords.length})`).join('、')}。</p>
                    <p><strong>来源地区（配置表）：</strong>{SOURCE_REGION_LABELS.join('、')}；<strong>涉事地区（词典启发式，非实体识别）：</strong>{MENTION_REGIONS.map((r) => r.name).join('、')}。</p>
                    <p><strong>其他口径：</strong>跨事件共振=共享标签+字符二元组文本相似度（文本信号，非因果）；数据源完整度=原文链接+发布时间+来源构成+已知集团覆盖（不合成综合健康分）；重大突发=标题强/弱信号词+否定语境过滤，非官方需≥2独立来源；多源印证=7天内不同发布方+标题相似度≥46%聚合，AI文本列出的媒体不计入独立来源。</p>
                  </div>
                </details>
              </section>
              )}

              {/* 监控雷达管理（增删监控词） */}
              {settingsSection === 'radar' && (
              <section className="space-y-3 border-t border-stone-200 pt-4">
                <div className="flex items-center justify-between">
                  <div className={sectionTitle}>
                    <Radio className="w-4 h-4 text-amber-600" />
                    <span>我的监控雷达（{radarKeywords.length} 词）</span>
                  </div>
                  {onAddRadarOpen && (
                    <button
                      onClick={onAddRadarOpen}
                      className="text-[11px] font-serif font-bold text-stone-700 hover:text-stone-950 bg-stone-200/70 hover:bg-stone-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>添加监控词</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-stone-400">
                  命中 = 监控词出现在新闻“标题/摘要”中。命中词会在这条新闻卡片上标出「📡 监控」；词库保存在本机浏览器（localStorage）。
                </p>

                {radarKeywords.length === 0 ? (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-500">
                    暂无监控词。点击右上「添加监控词」，例如：NVIDIA 算力、具身智能、降息。
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {radarKeywords.map((rk) => {
                      const hitCount = articles.filter((a) => monitorHits(a, [rk]).length > 0).length;
                      return (
                        <div
                          key={rk.id}
                          className="flex items-center justify-between px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                rk.level === 'red' ? 'bg-red-500' : rk.level === 'orange' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            <span className="text-xs font-serif font-bold text-stone-900 truncate">{rk.keyword}</span>
                            {articles.length > 0 && (
                              <span className="text-[10px] font-mono text-stone-400 shrink-0">
                                {hitCount} 条命中
                              </span>
                            )}
                          </div>
                          {onRemoveRadar && (
                            <button
                              onClick={() => onRemoveRadar(rk.id)}
                              className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors shrink-0"
                              title="移除该监控词"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-stone-400">
                  也可在「我的关注」页集中管理；监控词不限制数量，建议 ≤10 个以便雷达聚焦。
                </p>
              </section>
              )}

              {/* AI 用量（当前服务进程） */}
              {settingsSection === 'usage' && adminStatus?.aiUsage && (
                <section className="space-y-2">
                  <div className={sectionTitle}>
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>AI 用量与每日预算</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white border border-stone-300 rounded-lg p-2.5">
                      <div className="font-serif font-black text-stone-950">{adminStatus.aiUsage.totalCalls}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">本次进程调用</div>
                    </div>
                    <div className="bg-white border border-stone-300 rounded-lg p-2.5">
                      <div className="font-serif font-black text-stone-950">
                        {adminStatus.aiUsage.persistedToday?.calls ?? '—'}
                        <span className="text-[10px] font-mono text-stone-400">
                          /{adminStatus.aiUsage.limits?.dailyCalls || '∞'}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5">今日调用 / 上限</div>
                    </div>
                    <div className="bg-white border border-stone-300 rounded-lg p-2.5">
                      <div className="font-serif font-black text-stone-950">
                        {adminStatus.aiUsage.persistedToday?.tokenReportedCalls
                          ? adminStatus.aiUsage.persistedToday.totalTokens.toLocaleString()
                          : '未返回'}
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5">今日真实 token</div>
                    </div>
                    <div className="bg-white border border-stone-300 rounded-lg p-2.5">
                      <div className="font-serif font-black text-stone-950">
                        {Math.round((adminStatus.aiUsage.promptChars + adminStatus.aiUsage.outputChars) / 1000)}k
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5">进程内字符数</div>
                    </div>
                  </div>
                  {Object.entries(adminStatus.aiUsage.byProvider || {}).length > 0 && (
                    <div className="space-y-1">
                      {Object.entries(adminStatus.aiUsage.byProvider || {}).map(([key, b]) => (
                        <div key={key} className="flex justify-between text-[11px] text-stone-600">
                          <span className="font-mono">{key}</span>
                          <span className="font-mono">
                            {b.calls} 次 · {b.totalTokens ? `${b.totalTokens} tokens` : `${Math.round((b.promptChars + b.outputChars) / 1000)}k chars`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-stone-400">
                    今日调用与 token 持久化到 SQLite；模型未返回 usage 时明确显示“未返回”，不会推测费用或 token。
                  </p>
                </section>
              )}

              {settingsSection === 'backups' && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={sectionTitle}>
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>数据库备份与恢复</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void createBackup()}
                      disabled={backupBusy}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-[11px] font-serif font-bold"
                    >
                      {backupBusy ? '处理中…' : '创建备份'}
                    </button>
                  </div>
                  {backupMessage && (
                    <div className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-[11px] text-stone-600">
                      {backupMessage}
                    </div>
                  )}
                  {backupScheduler && (
                    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[10px] text-stone-500 space-y-0.5">
                      <div>
                        自动备份：{backupScheduler.enabled ? '已启用' : '测试模式禁用'} ·
                        间隔 {Math.round(backupScheduler.intervalMs / 3_600_000)} 小时
                      </div>
                      <div>
                        {backupScheduler.lastStatus
                          ? `上次状态：${backupScheduler.lastStatus.status} · ${backupScheduler.lastStatus.at}`
                          : `尚未执行；启动后 ${Math.round(backupScheduler.startupDelayMs / 60_000)} 分钟检查`}
                      </div>
                      <div>
                        最近备份：{backupScheduler.newestBackupAgeMs == null
                          ? '无'
                          : `${Math.round(backupScheduler.newestBackupAgeMs / 3_600_000)} 小时前`}
                      </div>
                    </div>
                  )}
                  {backups.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-400">暂无数据库备份。</div>
                  ) : (
                    <div className="space-y-2">
                      {backups.map((backup) => (
                        <div key={backup.file} className="rounded-lg border border-stone-300 bg-white p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-stone-700">{backup.file}</span>
                            <span className={`text-[10px] font-mono ${backup.integrityValid ? 'text-emerald-700' : 'text-red-700'}`}>
                              {backup.integrityValid ? '完整' : `异常 · ${backup.reason || 'unknown'}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {backup.createdAt || '时间未知'} · {backup.articles} 篇 · {backup.databaseHash.slice(0, 16)}…
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void verifyBackup(backup.file)}
                              disabled={backupBusy}
                              className="px-2.5 py-1 rounded border border-stone-300 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
                            >
                              重新校验
                            </button>
                            <button
                              type="button"
                              onClick={() => void restoreBackup(backup.file)}
                              disabled={backupBusy || !backup.integrityValid}
                              className="px-2.5 py-1 rounded bg-red-700 hover:bg-red-800 disabled:opacity-40 text-[10px] font-bold text-white"
                            >
                              恢复此备份
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-stone-400">
                    恢复前会重新验证哈希和 SQLite 完整性；成功后服务自动重启，原数据库保留为回滚文件。
                  </p>
                </section>
              )}

              {settingsSection === 'audit' && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={sectionTitle}>
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>审计事件链</span>
                    </div>
                    <span className={`text-[10px] font-mono ${
                      auditChain?.valid ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {auditChain
                        ? auditChain.valid
                          ? `完整 · ${auditChain.checked} 事件`
                          : `链异常 · 首个断点 #${auditChain.brokenAt}`
                        : '未加载'}
                    </span>
                  </div>
                  {auditEvents.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-400">暂无审计事件。</div>
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                      {auditEvents.map((event) => (
                        <div key={event.id} className="rounded-lg border border-stone-200 bg-white p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-stone-800">{event.action}</span>
                            <span className={`text-[9px] font-mono ${event.integrityValid ? 'text-emerald-700' : 'text-red-700'}`}>
                              {event.integrityValid ? '完整' : '异常'}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-stone-500">
                            {new Date(event.at).toLocaleString('zh-CN')} · {event.actor}
                            {event.entityId ? ` · ${event.entityId}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-stone-400">
                    审计链只追加、不提供修改或删除接口；每条记录包含前序哈希。
                  </p>
                </section>
              )}

              {settingsSection === 'users' && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={sectionTitle}>
                      <UserRound className="w-4 h-4 text-[#E3120B]" />
                      <span>用户与权限</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500">
                      {currentUser ? `${currentUser.username} · ${currentUser.role}` : '未登录'}
                    </span>
                  </div>

                  {currentUser?.role !== 'admin' ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                      只有管理员可以查看和创建用户。
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          value={newUser.username}
                          onChange={(event) => setNewUser((value) => ({ ...value, username: event.target.value }))}
                          placeholder="用户名"
                          className={inputCls}
                        />
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={(event) => setNewUser((value) => ({ ...value, password: event.target.value }))}
                          placeholder="密码，至少 12 位"
                          className={inputCls}
                        />
                        <div className="flex gap-2">
                          <select
                            value={newUser.role}
                            onChange={(event) => setNewUser((value) => ({ ...value, role: event.target.value }))}
                            className={inputCls}
                          >
                            <option value="viewer">只读</option>
                            <option value="editor">编辑</option>
                            <option value="admin">管理员</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => void createLocalUser()}
                            disabled={newUser.username.trim().length < 2 || newUser.password.length < 12}
                            className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 disabled:opacity-40 text-white text-[11px] font-bold whitespace-nowrap"
                          >
                            创建用户
                          </button>
                        </div>
                      </div>
                      {userMessage && <div className="text-[10px] text-stone-500">{userMessage}</div>}
                      <div className="space-y-1.5">
                        {users.map((user) => (
                          <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px]">
                            <span className="inline-flex items-center gap-2 font-mono text-stone-800">
                              {user.username}
                              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                                user.approvalStatus === 'approved'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : user.approvalStatus === 'pending'
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-red-300 bg-red-50 text-red-700'
                              }`}>
                                {user.approvalStatus === 'approved' ? '已批准' : user.approvalStatus === 'pending' ? '待审批' : '已拒绝'}
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              {user.approvalStatus === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void updateManagedUser(user.id, { approvalStatus: 'approved', active: true })}
                                    className="px-2 py-1 rounded border border-emerald-300 bg-emerald-50 text-[10px] font-bold text-emerald-800"
                                  >
                                    批准
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void updateManagedUser(user.id, { approvalStatus: 'rejected', active: false })}
                                    className="px-2 py-1 rounded border border-red-300 bg-red-50 text-[10px] font-bold text-red-700"
                                  >
                                    拒绝
                                  </button>
                                </>
                              )}
                              <select
                                value={user.role}
                                onChange={(event) => void updateManagedUser(user.id, { role: event.target.value })}
                                className="px-2 py-1 rounded border border-stone-300 bg-white text-[10px]"
                              >
                                <option value="viewer">只读</option>
                                <option value="editor">编辑</option>
                                <option value="admin">管理员</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => void updateManagedUser(user.id, { active: !user.active })}
                                className={`px-2 py-1 rounded border text-[10px] font-bold ${
                                  user.active
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : 'border-stone-300 bg-stone-100 text-stone-500'
                                }`}
                              >
                                {user.active ? '启用' : '停用'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void resetManagedPassword(user.id, user.username)}
                                className="px-2 py-1 rounded border border-stone-300 text-[10px] text-stone-600"
                              >
                                重置密码
                              </button>
                              <button
                                type="button"
                                onClick={() => void revokeManagedSessions(user.id)}
                                className="px-2 py-1 rounded border border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                              >
                                撤销会话
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {currentUser?.legacyToken ? (
                    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-500">
                      当前使用旧版访问令牌，不提供密码修改；请创建正式管理员账号后使用账号登录。
                    </div>
                  ) : (
                  <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
                    <div className="text-[11px] font-serif font-bold text-stone-700">修改当前密码</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="password"
                        value={passwordChange.current}
                        onChange={(event) => setPasswordChange((value) => ({ ...value, current: event.target.value }))}
                        placeholder="当前密码"
                        className={inputCls}
                      />
                      <input
                        type="password"
                        value={passwordChange.next}
                        onChange={(event) => setPasswordChange((value) => ({ ...value, next: event.target.value }))}
                        placeholder="新密码，至少 12 位"
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => void changeOwnPassword()}
                        disabled={!passwordChange.current || passwordChange.next.length < 12}
                        className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 disabled:opacity-40 text-white text-[11px] font-bold"
                      >
                        修改密码并退出
                      </button>
                    </div>
                  </div>
                  )}
                  <p className="text-[10px] text-stone-400">
                    只读角色不能执行写入、AI 调用或管理操作；编辑角色不能修改系统设置、备份或用户；管理员拥有全部权限。
                  </p>
                </section>
              )}

              {/* 反馈与说明 */}
              {feedback && (
                <div
                  className={`px-3 py-2 rounded-lg text-[11px] border flex items-start space-x-1.5 ${
                    feedback.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
                  }`}
                >
                  {feedback.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}
              <div className="flex items-start space-x-1.5 text-[10px] text-stone-400">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>
                  密钥在服务端以 AES-256-GCM 加密字段落盘（data/settings.json，需 JIANWEI_SECRET），
                  API 只返回“已配置/未配置”，不回传明文；配置 JIANWEI_AUTH_TOKEN 后 /api 会要求访问令牌。
                </p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-300 flex items-center justify-end space-x-2.5">
              <button
                onClick={handleTest}
                disabled={testing || saving}
                className="px-4 py-2 rounded-lg border border-stone-400 text-stone-700 hover:bg-stone-200 text-xs font-serif font-bold disabled:opacity-50 transition-colors flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{testing ? '测试中…' : '测试连接'}</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-stone-500 hover:text-stone-900 text-xs font-serif font-bold transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2 bg-[#E3120B] hover:bg-red-700 text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1.5 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? '保存中…' : '保存设置'}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
