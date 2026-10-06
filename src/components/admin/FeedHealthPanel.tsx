import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  Wifi,
  Globe,
  Play,
  Pause,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
  Search,
  FileCode,
  Check,
  Copy,
  Info,
  Sparkles,
  HelpCircle,
  X,
  Stethoscope,
  Code,
} from 'lucide-react';

export interface FeedPingResult {
  url: string;
  status: 'healthy' | 'warning' | 'error';
  httpStatus?: number;
  responseTimeMs: number;
  itemCount: number;
  sampleTitle?: string;
  error?: string;
  errorType?: 'http_404' | 'http_error' | 'timeout' | 'parse_error' | 'empty' | 'network_error' | 'blocked';
  checkedAt: string;
}

export interface FeedContractIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion: string;
}

export interface FeedContractDiagnostic {
  url: string;
  testedAt: string;
  httpStatus?: number;
  httpStatusText?: string;
  contentType?: string;
  contentEncoding?: string;
  contentLengthBytes: number;
  responseTimeMs: number;
  detectedFormat: 'rss2' | 'atom' | 'rdf_rss1' | 'jsonfeed' | 'html_webpage' | 'raw_text' | 'unknown';
  xmlValid: boolean;
  xmlDeclaration?: string;
  encodingDeclared?: string;
  hasCdata: boolean;
  totalItemsFound: number;
  validItemsParsed: number;
  itemsWithTitleCount: number;
  itemsWithLinkCount: number;
  itemsWithDateCount: number;
  sampleItems: Array<{
    title: string;
    link: string;
    pubDate?: string;
    hasDescription: boolean;
  }>;
  overallHealth: 'pass' | 'warning' | 'fail';
  issues: FeedContractIssue[];
  rawSnippetPreview: string;
}

interface FeedHealthPanelProps {
  feedList: string[];
  onRemoveFeed: (url: string) => void;
  onRemoveMultipleFeeds: (urls: string[]) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const FeedHealthPanel: React.FC<FeedHealthPanelProps> = ({
  feedList,
  onRemoveFeed,
  onRemoveMultipleFeeds,
  onShowToast,
}) => {
  const [pingResults, setPingResults] = useState<Record<string, FeedPingResult>>({});
  const [pingingAll, setPingingAll] = useState(false);
  const [pingingSingle, setPingingSingle] = useState<string | null>(null);
  const [autoPing, setAutoPing] = useState(true);
  const [intervalSec, setIntervalSec] = useState(60);
  const [countdown, setCountdown] = useState(60);
  const [lastBatchCheckAt, setLastBatchCheckAt] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'error' | 'healthy'>('all');

  // Contract Diagnostic Modal States
  const [diagnoseModalOpen, setDiagnoseModalOpen] = useState(false);
  const [diagnoseTargetUrl, setDiagnoseTargetUrl] = useState('');
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<FeedContractDiagnostic | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Lab Quick Probe Input State
  const [labInputUrl, setLabInputUrl] = useState('');
  const [showLabQuickBar, setShowLabQuickBar] = useState(false);

  // Perform Batch Ping for all or selected feeds
  const handlePingAll = useCallback(
    async (silent = false) => {
      if (feedList.length === 0) return;
      if (!silent) setPingingAll(true);

      try {
        const res = await fetch('/api/feeds/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: feedList }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (Array.isArray(data.results)) {
          const map: Record<string, FeedPingResult> = {};
          data.results.forEach((r: FeedPingResult) => {
            map[r.url] = r;
          });
          setPingResults((prev) => ({ ...prev, ...map }));
          setLastBatchCheckAt(new Date().toISOString());

          if (!silent) {
            const errCount = data.summary?.error || 0;
            if (errCount > 0) {
              onShowToast('info', `检测完成: 发现 ${errCount} 个异常信源，已在下方高亮标红并支持契约诊断`);
            } else {
              onShowToast('success', `全量信源连通性正常，所有 ${feedList.length} 个数据源均健康就绪！`);
            }
          }
        }
      } catch (err: any) {
        if (!silent) {
          onShowToast('error', `信源健康探测失败: ${err.message || err}`);
        }
      } finally {
        if (!silent) setPingingAll(false);
        setCountdown(intervalSec);
      }
    },
    [feedList, intervalSec, onShowToast]
  );

  // Single Feed Ping
  const handlePingSingle = async (url: string) => {
    setPingingSingle(url);
    try {
      const res = await fetch('/api/feeds/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.result) {
        setPingResults((prev) => ({
          ...prev,
          [url]: data.result,
        }));
        if (data.result.status === 'error') {
          onShowToast('error', `信源异常 (${data.result.httpStatus || '失败'}): ${data.result.error || '无法解析'}`);
        } else {
          onShowToast('success', `信源连通正常: 响应 ${data.result.responseTimeMs}ms · 解析 ${data.result.itemCount} 篇条目`);
        }
      }
    } catch (err: any) {
      onShowToast('error', `单源探测异常: ${err.message}`);
    } finally {
      setPingingSingle(null);
    }
  };

  // Run Deep Contract Diagnostic for a single URL
  const handleRunContractDiagnostic = async (url: string) => {
    if (!url.trim()) return;
    setDiagnoseTargetUrl(url.trim());
    setDiagnoseModalOpen(true);
    setDiagnoseLoading(true);
    setDiagnosticReport(null);
    setCopiedSnippet(false);

    try {
      const res = await fetch('/api/feeds/diagnose-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.diagnostic) {
        setDiagnosticReport(data.diagnostic);
        // Also update ping result cache
        setPingResults((prev) => ({
          ...prev,
          [url.trim()]: {
            url: url.trim(),
            status: data.diagnostic.overallHealth === 'fail' ? 'error' : data.diagnostic.overallHealth === 'warning' ? 'warning' : 'healthy',
            httpStatus: data.diagnostic.httpStatus,
            responseTimeMs: data.diagnostic.responseTimeMs,
            itemCount: data.diagnostic.validItemsParsed,
            sampleTitle: data.diagnostic.sampleItems?.[0]?.title,
            error: data.diagnostic.issues.find((i: FeedContractIssue) => i.severity === 'error')?.message,
            checkedAt: data.diagnostic.testedAt,
          },
        }));
      }
    } catch (e: any) {
      onShowToast('error', `契约探针诊断失败: ${e.message}`);
    } finally {
      setDiagnoseLoading(false);
    }
  };

  // Copy raw snippet preview
  const handleCopySnippet = () => {
    if (diagnosticReport?.rawSnippetPreview) {
      navigator.clipboard.writeText(diagnosticReport.rawSnippetPreview);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2500);
      onShowToast('info', '已复制响应原始报文片段至剪贴板');
    }
  };

  // Initial Ping on mount
  useEffect(() => {
    if (feedList.length > 0 && Object.keys(pingResults).length === 0) {
      handlePingAll(true);
    }
  }, [feedList, handlePingAll, pingResults]);

  // Scheduled / Auto Ping Timer
  useEffect(() => {
    if (!autoPing || feedList.length === 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handlePingAll(true);
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPing, feedList.length, handlePingAll, intervalSec]);

  // Computed Health Statistics
  const stats = useMemo(() => {
    const total = feedList.length;
    let healthy = 0;
    let warning = 0;
    let error = 0;
    let unprobed = 0;
    const errorUrls: string[] = [];

    feedList.forEach((url) => {
      const res = pingResults[url];
      if (!res) {
        unprobed += 1;
      } else if (res.status === 'healthy') {
        healthy += 1;
      } else if (res.status === 'warning') {
        warning += 1;
      } else if (res.status === 'error') {
        error += 1;
        errorUrls.push(url);
      }
    });

    const healthScore = total > 0 ? Math.round(((healthy + warning * 0.7) / total) * 100) : 100;

    return { total, healthy, warning, error, unprobed, errorUrls, healthScore };
  }, [feedList, pingResults]);

  // Filtered List
  const filteredFeeds = useMemo(() => {
    return feedList.filter((url) => {
      const res = pingResults[url];
      if (filterStatus === 'error') {
        return res?.status === 'error';
      }
      if (filterStatus === 'healthy') {
        return res?.status === 'healthy' || res?.status === 'warning';
      }
      return true;
    });
  }, [feedList, pingResults, filterStatus]);

  // One-click remove all abnormal feeds
  const handleRemoveAllErrors = () => {
    if (stats.errorUrls.length === 0) return;
    if (
      window.confirm(
        `确定一键移除所有 ${stats.errorUrls.length} 个异常信源（404 或解析失败）吗？移除后将不再向其发起请求。`
      )
    ) {
      onRemoveMultipleFeeds(stats.errorUrls);
      onShowToast('success', `已成功移除 ${stats.errorUrls.length} 个异常信源并保存落盘！`);
    }
  };

  // Re-try all abnormal feeds
  const handleRetryAllErrors = async () => {
    if (stats.errorUrls.length === 0) return;
    setPingingAll(true);
    try {
      const res = await fetch('/api/feeds/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: stats.errorUrls }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results)) {
          const map: Record<string, FeedPingResult> = {};
          data.results.forEach((r: FeedPingResult) => {
            map[r.url] = r;
          });
          setPingResults((prev) => ({ ...prev, ...map }));
          onShowToast('info', '异常信源重试探测完成');
        }
      }
    } catch (e: any) {
      onShowToast('error', `重试失败: ${e.message}`);
    } finally {
      setPingingAll(false);
    }
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-serif font-black text-stone-950 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>信源健康与 RSS 解析契约诊断中枢</span>
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border flex items-center gap-1.5 ${
                stats.error > 0
                  ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {stats.error > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>{stats.error} 个异常源待诊断</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>信源健康度 {stats.healthScore}%</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            定时 Ping 探测 RSS 状态，并提供<b>契约解析探针</b>：针对格式不规范、HTML 伪装、编码冲突等问题输出具体修复指南。
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Lab Quick Test Toggle */}
          <button
            onClick={() => setShowLabQuickBar(!showLabQuickBar)}
            className="px-3 py-1.5 rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
            title="打开单链接快速契约测试实验室"
          >
            <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
            <span>{showLabQuickBar ? '收起契约实验室' : 'RSS 契约测试探针'}</span>
          </button>

          {/* Auto Ping Toggle */}
          <button
            onClick={() => setAutoPing(!autoPing)}
            className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              autoPing
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
            }`}
            title="开启/关闭后台定时自动巡检"
          >
            {autoPing ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-stone-400" />}
            <span>{autoPing ? `自动巡检中 (${countdown}s)` : '定时巡检已暂停'}</span>
          </button>

          {/* Clean all errors button */}
          {stats.error > 0 && (
            <button
              onClick={handleRemoveAllErrors}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>一键移除 {stats.error} 个异常源</span>
            </button>
          )}

          {/* Trigger All Ping */}
          <button
            onClick={() => handlePingAll(false)}
            disabled={pingingAll || feedList.length === 0}
            className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pingingAll ? 'animate-spin text-amber-300' : ''}`} />
            <span>{pingingAll ? '正在探测全部信源…' : '全部重新 Ping 探测'}</span>
          </button>
        </div>
      </div>

      {/* Optional Lab Quick Probe Bar */}
      {showLabQuickBar && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border-2 border-purple-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-purple-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>RSS 解析契约探针实验室 (可在订阅前预先测试任意 RSS/Atom 地址)</span>
            </h3>
            <span className="text-[10px] font-mono text-purple-600 bg-purple-100 px-2 py-0.5 rounded font-bold">
              轻量级实时诊断
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="输入待测试的 RSS/Atom 地址 (例如: https://feed.36kr.com/feed)"
              value={labInputUrl}
              onChange={(e) => setLabInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunContractDiagnostic(labInputUrl)}
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-purple-300 rounded-xl focus:outline-hidden focus:border-purple-600 font-mono text-stone-900"
            />
            <button
              onClick={() => handleRunContractDiagnostic(labInputUrl)}
              disabled={!labInputUrl.trim() || diagnoseLoading}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>执行契约测试</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Health Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
              : 'bg-stone-50 hover:bg-stone-100/80 border-stone-200 text-stone-900'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider flex items-center justify-between opacity-80">
            <span>订阅总源数</span>
            <Wifi className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-serif font-black font-mono mt-1">{stats.total}</div>
          <div className="text-[10px] mt-1 opacity-70">
            {stats.unprobed > 0 ? `${stats.unprobed} 个待探测` : '全部已纳入监控'}
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('healthy')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'healthy'
              ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
              : 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider flex items-center justify-between opacity-80">
            <span>健康可用 (200 OK)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-serif font-black font-mono mt-1 text-emerald-700">{stats.healthy}</div>
          <div className="text-[10px] mt-1 text-emerald-600 font-mono">
            有效内容正常解析入库
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('error')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'error'
              ? 'bg-rose-800 text-white border-rose-900 shadow-xs'
              : stats.error > 0
              ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-300'
              : 'bg-stone-50 border-stone-200 text-stone-900'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider flex items-center justify-between opacity-80">
            <span>异常/故障信源</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className={`text-xl font-serif font-black font-mono mt-1 ${stats.error > 0 ? 'text-rose-600 font-bold' : ''}`}>
            {stats.error}
          </div>
          <div className="text-[10px] mt-1 text-rose-600 font-mono">
            {stats.error > 0 ? '支持一键契约诊断建议' : '0 故障，运转良好'}
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider flex items-center justify-between">
            <span>巡检状态 / 上次同步</span>
            <Clock className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-xs font-serif font-bold text-stone-900 mt-1.5 truncate">
            {lastBatchCheckAt ? new Date(lastBatchCheckAt).toLocaleTimeString() : '实时监测中'}
          </div>
          <div className="text-[10px] text-stone-500 font-mono mt-1">
            周期: 每 {intervalSec} 秒 Ping 探测
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-serif font-bold text-stone-700 mr-2">筛选显示:</span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            全部 ({feedList.length})
          </button>
          <button
            onClick={() => setFilterStatus('error')}
            className={`px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filterStatus === 'error'
                ? 'bg-rose-600 text-white'
                : stats.error > 0
                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>仅看异常</span>
            {stats.error > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-700 text-white font-mono">
                {stats.error}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus('healthy')}
            className={`px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-colors cursor-pointer ${
              filterStatus === 'healthy'
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            仅看正常 ({stats.healthy + stats.warning})
          </button>
        </div>

        {stats.error > 0 && filterStatus === 'error' && (
          <button
            onClick={handleRetryAllErrors}
            disabled={pingingAll}
            className="text-xs text-rose-600 hover:text-rose-800 font-serif font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pingingAll ? 'animate-spin' : ''}`} />
            <span>重新探测所有异常源</span>
          </button>
        )}
      </div>

      {/* Feed Cards List */}
      {feedList.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-stone-300 rounded-xl text-center text-xs text-stone-500">
          暂未配置外部 RSS 信源。请在下方订阅官方预置高可用源或添加自定义 RSS 地址。
        </div>
      ) : filteredFeeds.length === 0 ? (
        <div className="p-8 bg-stone-50 border border-stone-200 rounded-xl text-center text-xs text-stone-500 font-serif">
          {filterStatus === 'error' ? '🎉 太棒了！当前没有任何异常信源，所有数据源运转良好。' : '没有符合筛选条件的信源。'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeeds.map((url, idx) => {
            const probe = pingResults[url];
            const isAbnormal = probe?.status === 'error';
            const isWarning = probe?.status === 'warning';
            const isHealthy = probe?.status === 'healthy';
            const isPinging = pingingSingle === url || pingingAll;

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isAbnormal
                    ? 'bg-rose-50/70 border-rose-400 shadow-2xs'
                    : isWarning
                    ? 'bg-amber-50/50 border-amber-300'
                    : isHealthy
                    ? 'bg-white border-stone-200 hover:border-stone-300'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                {/* Left: Feed Details & Error Messages */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {isAbnormal ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>异常 · {probe.httpStatus ? `HTTP ${probe.httpStatus}` : probe.errorType || '故障'}</span>
                      </span>
                    ) : isWarning ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500 text-white flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>预警 · 延迟偏高</span>
                      </span>
                    ) : isHealthy ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-600 text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>健康 · HTTP 200</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-stone-300 text-stone-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>待探测</span>
                      </span>
                    )}

                    {/* Latency badge */}
                    {probe && (
                      <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                        {probe.responseTimeMs}ms
                      </span>
                    )}

                    {/* Item count */}
                    {probe && probe.itemCount > 0 && (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                        {probe.itemCount} 篇条目
                      </span>
                    )}

                    {/* URL Link */}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-stone-700 transition-colors p-0.5"
                      title="在新标签页打开 RSS 地址"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* URL string */}
                  <div className="font-mono text-xs text-stone-800 break-all font-semibold select-all">
                    {url}
                  </div>

                  {/* Diagnostic / Error Details or Sample Article */}
                  {isAbnormal && (
                    <div className="text-xs text-rose-800 font-serif bg-rose-100/90 p-2.5 rounded-lg border border-rose-300 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-1.5">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <div>
                          <div className="font-bold">
                            {probe?.error || '信源解析失败或无法建立握手'}
                          </div>
                          <div className="text-[11px] text-rose-700 mt-0.5">
                            建议点击右侧<b>「契约诊断与修复建议」</b>获取格式修复指引与替代端点。
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isHealthy && probe?.sampleTitle && (
                    <div className="text-[11px] text-stone-500 truncate">
                      <span className="font-serif text-stone-400">最新收录样本: </span>
                      <span className="text-stone-700 italic">“{probe.sampleTitle}”</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-stone-200">
                  {/* Contract Diagnostic Probe Button */}
                  <button
                    onClick={() => handleRunContractDiagnostic(url)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAbnormal
                        ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-2xs ring-2 ring-purple-300'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                    }`}
                    title="执行轻量级解析试探并查看针对性修复建议"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>契约诊断与建议</span>
                  </button>

                  {/* Re-Ping single button */}
                  <button
                    onClick={() => handlePingSingle(url)}
                    disabled={isPinging}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-serif font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    title="重新单源测试连通性"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>重测</span>
                  </button>

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveFeed(url)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      isAbnormal
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                        : 'text-stone-500 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title="从订阅管道中移除此源"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isAbnormal ? '一键移除' : '移除'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contract Diagnostic & Fix Suggestions Modal */}
      {diagnoseModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[11px] font-mono font-bold flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-purple-700" />
                    <span>RSS 解析契约试探与诊断报告</span>
                  </span>
                  {diagnosticReport && (
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        diagnosticReport.overallHealth === 'pass'
                          ? 'bg-emerald-100 text-emerald-800'
                          : diagnosticReport.overallHealth === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {diagnosticReport.overallHealth === 'pass'
                        ? '🟢 契约通过 (PASS)'
                        : diagnosticReport.overallHealth === 'warning'
                        ? '🟡 警告 (WARNING)'
                        : '🔴 契约违背 (FAIL)'}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-serif font-black text-stone-950 break-all select-all font-mono">
                  {diagnoseTargetUrl}
                </h3>
              </div>
              <button
                onClick={() => setDiagnoseModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {diagnoseLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                <div className="text-sm font-serif font-bold text-stone-800">
                  正在发起轻量级解析试探与契约校验…
                </div>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  探测 HTTP 状态码、协议规范、XML 实体转义、编码声明及条目字段完整性
                </p>
              </div>
            ) : diagnosticReport ? (
              <div className="space-y-6 text-sm text-stone-800">
                {/* 1. Protocol & Response Specifications Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="text-[10px] font-mono text-stone-500 uppercase">检测协议格式</div>
                    <div className="font-serif font-bold text-sm text-stone-900 uppercase">
                      {diagnosticReport.detectedFormat}
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="text-[10px] font-mono text-stone-500 uppercase">HTTP 状态</div>
                    <div className={`font-mono font-bold text-sm ${diagnosticReport.httpStatus === 200 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {diagnosticReport.httpStatus || 'N/A'} {diagnosticReport.httpStatusText}
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="text-[10px] font-mono text-stone-500 uppercase">有效条目解析</div>
                    <div className="font-mono font-bold text-sm text-stone-900">
                      {diagnosticReport.validItemsParsed} / {diagnosticReport.totalItemsFound} 篇
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="text-[10px] font-mono text-stone-500 uppercase">探针响应耗时</div>
                    <div className="font-mono font-bold text-sm text-stone-900">
                      {diagnosticReport.responseTimeMs} ms
                    </div>
                  </div>
                </div>

                {/* 2. Concrete Actionable Fix Suggestions */}
                <div className="space-y-3">
                  <h4 className="font-serif font-bold text-stone-950 text-sm flex items-center gap-1.5 border-b border-stone-200 pb-1.5">
                    <Sparkles className="w-4 h-4 text-purple-700" />
                    <span>具体诊断结论与精准修复建议 ({diagnosticReport.issues.length})</span>
                  </h4>

                  {diagnosticReport.issues.length === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>未发现任何契约违背项，该信源各字段完备，解析性能优良。</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {diagnosticReport.issues.map((iss, i) => (
                        <div
                          key={i}
                          className={`p-3.5 rounded-xl border-2 space-y-1.5 ${
                            iss.severity === 'error'
                              ? 'bg-rose-50 border-rose-300 text-rose-950'
                              : iss.severity === 'warning'
                              ? 'bg-amber-50 border-amber-300 text-amber-950'
                              : 'bg-blue-50 border-blue-300 text-blue-950'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-serif font-bold">
                            <span className="flex items-center gap-1.5">
                              {iss.severity === 'error' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              ) : iss.severity === 'warning' ? (
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              )}
                              <span>{iss.message}</span>
                            </span>
                            <span className="text-[10px] font-mono uppercase opacity-70 px-1.5 py-0.5 rounded bg-white/60">
                              {iss.code}
                            </span>
                          </div>

                          <div className="text-xs leading-relaxed bg-white/80 p-2.5 rounded-lg border border-black/5 flex items-start gap-2">
                            <div className="font-bold text-purple-900 shrink-0">💡 修复建议:</div>
                            <div className="text-stone-800">{iss.suggestion}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Sample Parsed Items Preview */}
                {diagnosticReport.sampleItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-serif font-bold text-stone-950 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-stone-600" />
                      <span>条目解析切片样本 (前 {diagnosticReport.sampleItems.length} 条)</span>
                    </h4>
                    <div className="space-y-1.5">
                      {diagnosticReport.sampleItems.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1">
                          <div className="font-serif font-bold text-stone-900">{item.title}</div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-stone-500">
                            <span>发布时间: {item.pubDate || '未标明'}</span>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-sm"
                            >
                              {item.link}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Raw Response Snippet Preview */}
                {diagnosticReport.rawSnippetPreview && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-stone-950 text-xs flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-stone-600" />
                        <span>响应原始报文预览 (前 {diagnosticReport.rawSnippetPreview.length} 字符)</span>
                      </h4>
                      <button
                        onClick={handleCopySnippet}
                        className="text-[11px] font-serif font-bold text-stone-600 hover:text-stone-950 flex items-center gap-1 p-1 rounded hover:bg-stone-100 cursor-pointer"
                      >
                        {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSnippet ? '已复制' : '复制报文'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-stone-900 text-stone-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40 select-all border border-stone-800">
                      {diagnosticReport.rawSnippetPreview}
                    </pre>
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
              <div className="text-xs text-stone-500 font-mono">
                {diagnosticReport?.testedAt ? `测试时间: ${new Date(diagnosticReport.testedAt).toLocaleString()}` : ''}
              </div>

              <div className="flex items-center space-x-2">
                {diagnosticReport?.overallHealth === 'fail' && feedList.includes(diagnoseTargetUrl) && (
                  <button
                    onClick={() => {
                      onRemoveFeed(diagnoseTargetUrl);
                      setDiagnoseModalOpen(false);
                      onShowToast('success', `已移除异常信源: ${diagnoseTargetUrl}`);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>一键移除该失效源</span>
                  </button>
                )}

                <button
                  onClick={() => handleRunContractDiagnostic(diagnoseTargetUrl)}
                  disabled={diagnoseLoading}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${diagnoseLoading ? 'animate-spin' : ''}`} />
                  <span>重新执行契约探针</span>
                </button>

                <button
                  onClick={() => setDiagnoseModalOpen(false)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-bold cursor-pointer"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
