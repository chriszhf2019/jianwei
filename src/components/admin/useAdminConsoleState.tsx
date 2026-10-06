import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NewsArticle } from '../../types';
import { formatActionBadge } from './adminActionBadge';
import { CorpusHealthPanel } from './CorpusHealthPanel';
import type { AdminStatus, AdminTab, ServerSettings } from './adminTypes';
import { useAdminBehavior } from './hooks/useAdminBehavior';
import { useAdminDatabase } from './hooks/useAdminDatabase';
import { useAdminFeeds } from './hooks/useAdminFeeds';
import { useAdminKeys } from './hooks/useAdminKeys';
import { useAdminTaxonomy } from './hooks/useAdminTaxonomy';
import { useAdminUsers } from './hooks/useAdminUsers';

export function useAdminConsoleState() {
  const [activeTab, setActiveTab] = useState<AdminTab>('behavior_logs');
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [corpusArticles, setCorpusArticles] = useState<NewsArticle[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const fetchDataRef = useRef<() => Promise<void>>(async () => {});
  const saveRef = useRef<(feeds?: string[]) => Promise<void>>(async () => {});

  const keys = useAdminKeys();
  const taxonomy = useAdminTaxonomy();
  const feeds = useAdminFeeds({
    showToast,
    saveWithFeeds: (next) => saveRef.current(next),
    refresh: () => fetchDataRef.current(),
  });
  const users = useAdminUsers({
    showToast,
    refresh: () => fetchDataRef.current(),
  });
  const behavior = useAdminBehavior({ showToast });
  const database = useAdminDatabase({ activeTab, showToast });

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusRes = await fetch('/api/admin/status');
      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }

      const actRes = await fetch('/api/admin/user-activity');
      if (actRes.ok) {
        const aData = await actRes.json();
        behavior.setActivityStats(aData.stats);
        behavior.setUserSummaries(aData.userSummaries || []);
        behavior.setHourlyDistribution(aData.hourlyDistribution || {});
        if (aData.recentLogs) {
          behavior.setAuditEvents(aData.recentLogs);
        }
      }

      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const setts: ServerSettings = await settingsRes.json();
        setSettings(setts);
        keys.hydrateFromSettings(setts);
        feeds.hydrateFromSettings(setts);
        taxonomy.hydrateFromSettings(setts);
      }

      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const uData = await usersRes.json();
        users.setUsers(uData.users || []);
      }

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
    // Domain setters are stable enough for initial load; avoid recreating on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  fetchDataRef.current = fetchData;

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSaveSettings = async (customFeeds?: string[]) => {
    try {
      const activeFeeds = customFeeds || feeds.feedList;
      const cleanSectorOverrides = taxonomy.cleanOverrides();
      const payload: any = {
        ...keys.buildSavePayload(),
        feeds: activeFeeds,
        sectorOverrides: cleanSectorOverrides,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存失败');
      }

      localStorage.setItem('sector-taxonomy-overrides', JSON.stringify(cleanSectorOverrides));
      showToast('success', '全局配置已成功保存并落盘生效！');
      keys.clearKeyInputs();
      await fetchData();
    } catch (e: any) {
      showToast('error', e.message || '保存配置失败');
    }
  };

  saveRef.current = handleSaveSettings;

  const renderCorpusHealthModule = () => (
    <CorpusHealthPanel
      status={status}
      corpusArticles={corpusArticles}
      feedList={feeds.feedList}
      ingesting={feeds.ingesting}
      onTriggerIngest={feeds.handleTriggerIngest}
      latestCrawlTimeFormatted={latestCrawlTimeFormatted}
      sourceDistribution={sourceDistribution}
    />
  );

  const adminScope = {
    activeTab,
    aiChoice: keys.aiChoice,
    auditEvents: behavior.auditEvents,
    behaviorActionFilter: behavior.behaviorActionFilter,
    behaviorPage: behavior.behaviorPage,
    behaviorPageSize: behavior.behaviorPageSize,
    behaviorUsernameQuery: behavior.behaviorUsernameQuery,
    creatingUser: users.creatingUser,
    dbAnalyses: database.dbAnalyses,
    dbCategoryFilter: database.dbCategoryFilter,
    dbLoading: database.dbLoading,
    dbOverview: database.dbOverview,
    dbPage: database.dbPage,
    dbSearchQuery: database.dbSearchQuery,
    dbTotalAnalyses: database.dbTotalAnalyses,
    deepseekBaseUrlInput: keys.deepseekBaseUrlInput,
    deepseekKeyInput: keys.deepseekKeyInput,
    deepseekModelInput: keys.deepseekModelInput,
    feedList: feeds.feedList,
    fetchDatabaseData: database.fetchDatabaseData,
    filteredBehaviorLogs: behavior.filteredBehaviorLogs,
    filteredUsers: users.filteredUsers,
    formatActionBadge,
    geminiKeyInput: keys.geminiKeyInput,
    geminiModelInput: keys.geminiModelInput,
    handleAddFeed: feeds.handleAddFeed,
    handleCreateUser: users.handleCreateUser,
    handleDeleteAnalysis: database.handleDeleteAnalysis,
    handleExportCsv: behavior.handleExportCsv,
    handleGenerateBehaviorInsights: behavior.handleGenerateBehaviorInsights,
    handleReanalyzeItem: database.handleReanalyzeItem,
    handleRemoveFeed: feeds.handleRemoveFeed,
    handleRemoveMultipleFeeds: feeds.handleRemoveMultipleFeeds,
    handleResetPassword: users.handleResetPassword,
    handleRevokeSessions: users.handleRevokeSessions,
    handleSaveSettings,
    handleTestAi: keys.handleTestAi,
    handleTogglePresetFeed: feeds.handleTogglePresetFeed,
    handleTriggerIngest: feeds.handleTriggerIngest,
    handleUpdateUser: users.handleUpdateUser,
    handleViewAnalysisDetail: database.handleViewAnalysisDetail,
    hourlyDistribution: behavior.hourlyDistribution,
    ingesting: feeds.ingesting,
    insightsLoading: behavior.insightsLoading,
    insightsReport: behavior.insightsReport,
    maxHourlyCount: behavior.maxHourlyCount,
    newFeedUrl: feeds.newFeedUrl,
    newPassword: users.newPassword,
    newRole: users.newRole,
    newUsername: users.newUsername,
    paginatedBehaviorLogs: behavior.paginatedBehaviorLogs,
    reanalyzingKey: database.reanalyzingKey,
    renderCorpusHealthModule,
    resetNewPassword: users.resetNewPassword,
    resettingUserId: users.resettingUserId,
    roleFilter: users.roleFilter,
    sectorKeywordsState: taxonomy.sectorKeywordsState,
    selectedAnalysisDetail: database.selectedAnalysisDetail,
    selectedLogModal: behavior.selectedLogModal,
    selectedUserDetail: behavior.selectedUserDetail,
    setAiChoice: keys.setAiChoice,
    setBehaviorActionFilter: behavior.setBehaviorActionFilter,
    setBehaviorPage: behavior.setBehaviorPage,
    setBehaviorPageSize: behavior.setBehaviorPageSize,
    setBehaviorUsernameQuery: behavior.setBehaviorUsernameQuery,
    setDbCategoryFilter: database.setDbCategoryFilter,
    setDbPage: database.setDbPage,
    setDbSearchQuery: database.setDbSearchQuery,
    setDeepseekBaseUrlInput: keys.setDeepseekBaseUrlInput,
    setDeepseekKeyInput: keys.setDeepseekKeyInput,
    setDeepseekModelInput: keys.setDeepseekModelInput,
    setGeminiKeyInput: keys.setGeminiKeyInput,
    setGeminiModelInput: keys.setGeminiModelInput,
    setInsightsReport: behavior.setInsightsReport,
    setNewFeedUrl: feeds.setNewFeedUrl,
    setNewPassword: users.setNewPassword,
    setNewRole: users.setNewRole,
    setNewUsername: users.setNewUsername,
    setResetNewPassword: users.setResetNewPassword,
    setResettingUserId: users.setResettingUserId,
    setRoleFilter: users.setRoleFilter,
    setSectorKeywordsState: taxonomy.setSectorKeywordsState,
    setSelectedAnalysisDetail: database.setSelectedAnalysisDetail,
    setSelectedLogModal: behavior.setSelectedLogModal,
    setSelectedUserDetail: behavior.setSelectedUserDetail,
    setShowCreateUserModal: users.setShowCreateUserModal,
    setShowDeepseekKey: keys.setShowDeepseekKey,
    setShowGeminiKey: keys.setShowGeminiKey,
    setUserSearchQuery: users.setUserSearchQuery,
    settings,
    showCreateUserModal: users.showCreateUserModal,
    showDeepseekKey: keys.showDeepseekKey,
    showGeminiKey: keys.showGeminiKey,
    showToast,
    status,
    testResult: keys.testResult,
    testingAi: keys.testingAi,
    totalBehaviorPages: behavior.totalBehaviorPages,
    userSearchQuery: users.userSearchQuery,
    userSummaries: behavior.userSummaries,
    users: users.users,
  };

  return {
    activeTab,
    setActiveTab,
    adminScope,
    message,
    loading,
    fetchData,
    status,
    settings,
    feedList: feeds.feedList,
    users: users.users,
    activityStats: behavior.activityStats,
    auditEvents: behavior.auditEvents,
  };
}
