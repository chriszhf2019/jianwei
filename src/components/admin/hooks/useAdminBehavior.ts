import { useEffect, useMemo, useState } from 'react';
import type { ActivityStats, AuditEvent, UserSummary } from '../adminTypes';
import type { ShowToast } from './useAdminKeys';

/** 行为审计日志、洞察报告与活跃画像。 */
export function useAdminBehavior(deps: { showToast: ShowToast }) {
  const { showToast } = deps;
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<Record<number, number>>({});
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserSummary | null>(null);
  const [selectedLogModal, setSelectedLogModal] = useState<AuditEvent | null>(null);
  const [behaviorUsernameQuery, setBehaviorUsernameQuery] = useState('');
  const [behaviorActionFilter, setBehaviorActionFilter] = useState<string>('all');
  const [behaviorPage, setBehaviorPage] = useState<number>(1);
  const [behaviorPageSize, setBehaviorPageSize] = useState<number>(10);
  const [insightsReport, setInsightsReport] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const filteredBehaviorLogs = useMemo(() => {
    return auditEvents.filter((evt) => {
      if (behaviorActionFilter !== 'all') {
        const act = evt.action.toLowerCase();
        if (behaviorActionFilter === 'register' && !act.includes('register')) return false;
        if (behaviorActionFilter === 'knowledge' && !act.includes('knowledge') && !act.includes('deposit')) return false;
        if (behaviorActionFilter === 'ai' && !act.includes('ai') && !act.includes('enrich') && !act.includes('analysis')) return false;
        if (behaviorActionFilter === 'predict' && !act.includes('predict') && !act.includes('contract')) return false;
        if (behaviorActionFilter === 'login' && !act.includes('login') && !act.includes('auth')) return false;
      }
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

  return {
    auditEvents,
    setAuditEvents,
    activityStats,
    setActivityStats,
    userSummaries,
    setUserSummaries,
    hourlyDistribution,
    setHourlyDistribution,
    selectedUserDetail,
    setSelectedUserDetail,
    selectedLogModal,
    setSelectedLogModal,
    behaviorUsernameQuery,
    setBehaviorUsernameQuery,
    behaviorActionFilter,
    setBehaviorActionFilter,
    behaviorPage,
    setBehaviorPage,
    behaviorPageSize,
    setBehaviorPageSize,
    insightsReport,
    setInsightsReport,
    insightsLoading,
    filteredBehaviorLogs,
    totalBehaviorPages,
    paginatedBehaviorLogs,
    maxHourlyCount,
    handleGenerateBehaviorInsights,
    handleExportCsv,
  };
}
