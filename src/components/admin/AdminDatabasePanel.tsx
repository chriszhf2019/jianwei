import React, { useState } from 'react';
import {
  Database,
  HardDrive,
  BookOpen,
  Sparkles,
  Zap,
  RefreshCw,
  Search,
  Cpu,
  X,
} from 'lucide-react';

interface AdminDatabasePanelProps {
  dbOverview: any;
  dbAnalyses: any[];
  dbTotalAnalyses: number;
  dbSearchQuery: string;
  setDbSearchQuery: (q: string) => void;
  dbCategoryFilter: string;
  setDbCategoryFilter: (cat: string) => void;
  dbPage: number;
  setDbPage: (p: number | ((prev: number) => number)) => void;
  dbLoading: boolean;
  onRefresh: () => void;
  onViewDetail: (key: string) => void;
  onReanalyze: (item: any) => void;
  onDeleteAnalysis: (key: string, title: string) => void;
  reanalyzingKey: string | null;
  selectedAnalysisDetail: any;
  onCloseDetailModal: () => void;
  renderCorpusHealthModule: () => React.ReactNode;
}

export const AdminDatabasePanel: React.FC<AdminDatabasePanelProps> = ({
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
  onRefresh,
  onViewDetail,
  onReanalyze,
  onDeleteAnalysis,
  reanalyzingKey,
  selectedAnalysisDetail,
  onCloseDetailModal,
  renderCorpusHealthModule,
}) => {
  return (
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
            直接从数据库秒级调取，无需重复开销
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
              onClick={onRefresh}
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
                        onClick={() => onViewDetail(item.key)}
                        className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-serif font-bold transition-colors cursor-pointer"
                      >
                        查看详情
                      </button>

                      <button
                        onClick={() => onReanalyze(item)}
                        disabled={reanalyzingKey === item.key}
                        className="px-2 py-1 rounded bg-stone-100 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-serif font-bold transition-colors cursor-pointer disabled:opacity-50"
                        title="触发全新的 AI 深度解析并覆盖数据库中的记录"
                      >
                        {reanalyzingKey === item.key ? '分析中…' : '重新分析'}
                      </button>

                      <button
                        onClick={() => onDeleteAnalysis(item.key, item.title)}
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
                onClick={() => setDbPage((p) => Math.max(1, (typeof p === 'function' ? (p as any)(p) : p) - 1))}
                className="px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 cursor-pointer"
              >
                上一页
              </button>
              <span className="font-mono text-stone-800">
                {dbPage} / {Math.ceil(dbTotalAnalyses / 20)}
              </span>
              <button
                disabled={dbPage >= Math.ceil(dbTotalAnalyses / 20)}
                onClick={() => setDbPage((p) => (typeof p === 'function' ? (p as any)(p) : p) + 1)}
                className="px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 cursor-pointer"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

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
                onClick={onCloseDetailModal}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 text-sm text-stone-800">
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
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-200">
              <button
                onClick={onCloseDetailModal}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-bold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
