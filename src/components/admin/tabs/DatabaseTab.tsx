import React from 'react';
import {
  ShieldCheck, Key, Users, Rss, FileText, RefreshCw, Plus, Trash2, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Sparkles, Server, Activity, UserPlus, Edit2, Database,
  HardDrive, Zap, Cpu, RotateCcw, Sliders, Radio, Download, Search, Check, X,
  ExternalLink, Clock, BarChart3, Calendar, LogIn, BookOpen, Crosshair, Lightbulb,
  TrendingUp, Filter, ChevronLeft, ChevronRight, UserCheck, Layers, HelpCircle, Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { SECTOR_TAXONOMY_DEFAULT } from '../../../utils/sectorTaxonomy';
import { AiCostPanel } from '../AiCostPanel';
import type { AdminTabScope } from './scope';

export function DatabaseTab({ s }: { s: AdminTabScope }) {
  const { activeTab, dbAnalyses, dbCategoryFilter, dbLoading, dbOverview, dbPage, dbSearchQuery, dbTotalAnalyses, fetchDatabaseData, handleDeleteAnalysis, handleReanalyzeItem, handleViewAnalysisDetail, insightsReport, reanalyzingKey, renderCorpusHealthModule, selectedAnalysisDetail, setDbCategoryFilter, setDbPage, setDbSearchQuery, setInsightsReport, setSelectedAnalysisDetail } = s;
  return (
    <>
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
                    dbAnalyses.map((item: any) => (
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
                    onClick={() => setDbPage((p: number) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 cursor-pointer"
                  >
                    上一页
                  </button>
                  <span className="font-mono text-stone-800">
                    {dbPage} / {Math.ceil(dbTotalAnalyses / 20)}
                  </span>
                  <button
                    disabled={dbPage >= Math.ceil(dbTotalAnalyses / 20)}
                    onClick={() => setDbPage((p: number) => p + 1)}
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
    </>
  );
}
