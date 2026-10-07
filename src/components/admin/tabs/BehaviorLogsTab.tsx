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

export function BehaviorLogsTab({ s }: { s: AdminTabScope }) {
  const { activeTab, auditEvents, behaviorActionFilter, behaviorPage, behaviorPageSize, behaviorUsernameQuery, filteredBehaviorLogs, formatActionBadge, handleExportCsv, handleGenerateBehaviorInsights, insightsLoading, paginatedBehaviorLogs, selectedLogModal, setBehaviorActionFilter, setBehaviorPage, setBehaviorPageSize, setBehaviorUsernameQuery, setSelectedLogModal, totalBehaviorPages } = s;
  return (
    <>
      {activeTab === 'behavior_logs' && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-serif font-black text-stone-950">
                  核心用户行为审计日志 (System Behavior Logs)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  共 {filteredBehaviorLogs.length} 条记录
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                精确审计与追溯用户注册申请、知识库沉淀添加、深度解读模型调用及推演契约执行全链路。
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleGenerateBehaviorInsights}
                disabled={insightsLoading}
                className="px-4 py-2 bg-[#E3120B] hover:bg-red-700 text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
                <span>{insightsLoading ? '模式挖掘中…' : '生成行为洞察报告'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出行为审计报表 (CSV)</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Badges Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { id: 'all', label: '全部行为日志', count: auditEvents.length, color: 'border-stone-800 bg-stone-50 text-stone-900' },
              { id: 'register', label: '注册申请', count: auditEvents.filter((e: any) => e.action.includes('register')).length, color: 'border-emerald-600 bg-emerald-50 text-emerald-900' },
              { id: 'knowledge', label: '知识库添加', count: auditEvents.filter((e: any) => e.action.includes('knowledge') || e.action.includes('deposit')).length, color: 'border-purple-600 bg-purple-50 text-purple-900' },
              { id: 'ai', label: '深度解读调用', count: auditEvents.filter((e: any) => e.action.includes('ai') || e.action.includes('enrich') || e.action.includes('analysis')).length, color: 'border-amber-600 bg-amber-50 text-amber-900' },
              { id: 'predict', label: '前瞻预测契约', count: auditEvents.filter((e: any) => e.action.includes('predict') || e.action.includes('contract')).length, color: 'border-blue-600 bg-blue-50 text-blue-900' },
            ].map((card) => {
              const isSelected = behaviorActionFilter === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => setBehaviorActionFilter(card.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? `${card.color} ring-2 ring-stone-900 shadow-xs font-bold`
                      : 'border-stone-200 hover:border-stone-400 bg-white text-stone-600'
                  }`}
                >
                  <div className="text-[11px] font-serif font-bold">{card.label}</div>
                  <div className="text-base sm:text-lg font-mono font-black mt-0.5">{card.count} 次</div>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="按用户名、操作类型或关联标题筛选…"
                value={behaviorUsernameQuery}
                onChange={(e) => setBehaviorUsernameQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div className="flex items-center space-x-3 text-xs font-serif text-stone-600">
              <div className="flex items-center space-x-1.5">
                <span>每页显示:</span>
                <select
                  value={behaviorPageSize}
                  onChange={(e) => setBehaviorPageSize(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:border-stone-900"
                >
                  <option value={10}>10 条 / 页</option>
                  <option value={20}>20 条 / 页</option>
                  <option value={50}>50 条 / 页</option>
                </select>
              </div>
            </div>
          </div>

          {/* Behavior Logs Paginated Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 font-serif font-bold text-stone-800 border-b border-stone-200">
                <tr>
                  <th className="p-3 w-16">编号</th>
                  <th className="p-3 w-40">操作时间</th>
                  <th className="p-3 w-36">用户名 / 角色</th>
                  <th className="p-3 w-36">操作类型</th>
                  <th className="p-3">关联实体 / 内容摘要</th>
                  <th className="p-3 w-20 text-center">状态</th>
                  <th className="p-3 w-20 text-right">明细</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedBehaviorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-stone-400 font-serif">
                      未找到符合筛选条件的系统行为日志
                    </td>
                  </tr>
                ) : (
                  paginatedBehaviorLogs.map((evt: any) => {
                    const badge = formatActionBadge(evt.action);
                    return (
                      <tr key={evt.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-3 font-mono text-stone-400 text-[11px]">#{evt.id}</td>
                        <td className="p-3 font-mono text-stone-600 text-[11px] whitespace-nowrap">{evt.at}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-white text-[9px] flex items-center justify-center font-serif font-bold shrink-0">
                              {evt.actor.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="font-mono font-bold text-stone-900 truncate">{evt.actor}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-serif font-bold border ${badge.colorClass}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </td>
                        <td className="p-3 font-sans text-stone-700 text-xs max-w-xs sm:max-w-md truncate">
                          {evt.entityId || (evt.metadata?.title as string) || (evt.metadata?.question as string) || (evt.metadata?.reason as string) || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${evt.status === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                            {evt.status === 'success' ? '成功' : '失败'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedLogModal(evt)}
                            className="text-stone-500 hover:text-stone-900 font-serif font-bold text-[11px] hover:underline cursor-pointer"
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-serif text-stone-600">
            <div>
              显示第 <span className="font-mono font-bold text-stone-900">{(behaviorPage - 1) * behaviorPageSize + 1}</span> 至{' '}
              <span className="font-mono font-bold text-stone-900">{Math.min(behaviorPage * behaviorPageSize, filteredBehaviorLogs.length)}</span>{' '}
              条 · 共 <span className="font-mono font-bold text-stone-900">{filteredBehaviorLogs.length}</span> 条行为记录
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setBehaviorPage((p: number) => Math.max(1, p - 1))}
                disabled={behaviorPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 disabled:opacity-40 text-stone-700 flex items-center space-x-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一页</span>
              </button>

              <span className="px-3 py-1 font-mono font-bold text-stone-900">
                {behaviorPage} / {totalBehaviorPages}
              </span>

              <button
                onClick={() => setBehaviorPage((p: number) => Math.min(totalBehaviorPages, p + 1))}
                disabled={behaviorPage === totalBehaviorPages || totalBehaviorPages === 0}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 disabled:opacity-40 text-stone-700 flex items-center space-x-1 cursor-pointer"
              >
                <span>下一页</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-stone-400">事件编号 #{selectedLogModal.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${selectedLogModal.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {selectedLogModal.status === 'success' ? '执行成功' : '失败'}
                  </span>
                </div>
                <h3 className="font-serif font-black text-base text-stone-950 mt-1">行为审计事件详情</h3>
              </div>
              <button onClick={() => setSelectedLogModal(null)} className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <span className="text-stone-500 font-serif">操作主体:</span>
                  <div className="font-mono font-bold text-stone-900 mt-0.5">{selectedLogModal.actor}</div>
                </div>
                <div>
                  <span className="text-stone-500 font-serif">动作类型:</span>
                  <div className="font-mono font-bold text-stone-900 mt-0.5">{selectedLogModal.action}</div>
                </div>
                <div>
                  <span className="text-stone-500 font-serif">记录时间:</span>
                  <div className="font-mono text-stone-700 mt-0.5">{selectedLogModal.at}</div>
                </div>
                <div>
                  <span className="text-stone-500 font-serif">关联实体类型:</span>
                  <div className="font-mono text-stone-700 mt-0.5">{selectedLogModal.entityType || '-'}</div>
                </div>
              </div>

              {selectedLogModal.entityId && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-stone-500 font-serif">关联内容 / 标题:</span>
                  <div className="font-sans font-bold text-stone-900 mt-0.5">{selectedLogModal.entityId}</div>
                </div>
              )}

              {selectedLogModal.metadata && (
                <div className="space-y-1">
                  <span className="text-stone-600 font-serif font-bold">审计元数据载荷 (JSON):</span>
                  <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLogModal.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button
                onClick={() => setSelectedLogModal(null)}
                className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-serif font-bold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
