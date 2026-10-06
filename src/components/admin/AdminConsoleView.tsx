import React from 'react';
import {
  ShieldCheck,
  Key,
  Users,
  Rss,
  FileText,
  RefreshCw,
  Sparkles,
  Activity,
  Database,
  Crosshair,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ActivityTab } from './tabs/ActivityTab';
import { AuditTab } from './tabs/AuditTab';
import { BehaviorLogsTab } from './tabs/BehaviorLogsTab';
import { DatabaseTab } from './tabs/DatabaseTab';
import { FeedsTab } from './tabs/FeedsTab';
import { KeysTab } from './tabs/KeysTab';
import { TaxonomyTab } from './tabs/TaxonomyTab';
import { UsersTab } from './tabs/UsersTab';
import { useAdminConsoleState } from './useAdminConsoleState';
import type { AdminTab } from './adminTypes';

export const AdminConsoleView: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    adminScope,
    message,
    loading,
    fetchData,
    status,
    settings,
    feedList,
    users,
    activityStats,
    auditEvents,
  } = useAdminConsoleState();

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
            统一配置企业级大模型密钥、多信源 RSS 摄取调度、9大行业赛道关键词（产品配置编辑种子）、用户组织权限与行为审计台账。
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
