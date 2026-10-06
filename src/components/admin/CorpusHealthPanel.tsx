import React from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Clock,
  RefreshCw,
  Rss,
  Zap,
} from 'lucide-react';
import type { NewsArticle } from '../../types';
import type { AdminStatus } from './adminTypes';

export function CorpusHealthPanel(props: {
  status: AdminStatus | null;
  corpusArticles: NewsArticle[];
  feedList: string[];
  ingesting: boolean;
  onTriggerIngest: () => void;
  latestCrawlTimeFormatted: string;
  sourceDistribution: Array<{ name: string; count: number; percentage: number }>;
}) {
  const {
    status,
    corpusArticles,
    feedList,
    ingesting,
    onTriggerIngest,
    latestCrawlTimeFormatted,
    sourceDistribution,
  } = props;
  return (

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
        onClick={onTriggerIngest}
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
}
