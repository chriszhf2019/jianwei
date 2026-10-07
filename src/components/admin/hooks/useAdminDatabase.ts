import { useCallback, useEffect, useState } from 'react';
import type { AdminTab } from '../adminTypes';
import type { ShowToast } from './useAdminKeys';

/** 数据库与分析语料页签。 */
export function useAdminDatabase(deps: {
  activeTab: AdminTab;
  showToast: ShowToast;
}) {
  const { activeTab, showToast } = deps;
  const [dbOverview, setDbOverview] = useState<any>(null);
  const [dbAnalyses, setDbAnalyses] = useState<any[]>([]);
  const [dbTotalAnalyses, setDbTotalAnalyses] = useState<number>(0);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbCategoryFilter, setDbCategoryFilter] = useState('all');
  const [dbPage, setDbPage] = useState(1);
  const [dbLoading, setDbLoading] = useState(false);
  const [selectedAnalysisDetail, setSelectedAnalysisDetail] = useState<any>(null);
  const [reanalyzingKey, setReanalyzingKey] = useState<string | null>(null);

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

  return {
    dbOverview,
    dbAnalyses,
    dbTotalAnalyses,
    dbSearchQuery,
    setDbSearchQuery,
    dbCategoryFilter,
    setDbCategoryFilter,
    dbPage,
    setDbPage,
    dbLoading,
    selectedAnalysisDetail,
    setSelectedAnalysisDetail,
    reanalyzingKey,
    fetchDatabaseData,
    handleViewAnalysisDetail,
    handleDeleteAnalysis,
    handleReanalyzeItem,
  };
}
