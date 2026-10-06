import React, { useState } from 'react';
import {
  Activity,
  Sparkles,
  Download,
  Search,
  Eye,
  X,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export interface AuditEvent {
  id: number;
  at: string;
  actor: string;
  action: string;
  entityType?: string;
  entityId?: string;
  status: string;
  metadata?: any;
}

interface AdminAuditPanelProps {
  auditEvents: AuditEvent[];
  insightsLoading: boolean;
  insightsReport: any;
  setInsightsReport: (report: any) => void;
  onGenerateBehaviorInsights: () => void;
  onExportCsv: () => void;
  selectedLogModal: AuditEvent | null;
  setSelectedLogModal: (log: AuditEvent | null) => void;
}

export const AdminAuditPanel: React.FC<AdminAuditPanelProps> = ({
  auditEvents,
  insightsLoading,
  insightsReport,
  setInsightsReport,
  onGenerateBehaviorInsights,
  onExportCsv,
  selectedLogModal,
  setSelectedLogModal,
}) => {
  const [behaviorActionFilter, setBehaviorActionFilter] = useState('all');
  const [behaviorUsernameQuery, setBehaviorUsernameQuery] = useState('');
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredBehaviorLogs = auditEvents.filter((log) => {
    const matchesUser =
      !behaviorUsernameQuery.trim() ||
      log.actor.toLowerCase().includes(behaviorUsernameQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(behaviorUsernameQuery.toLowerCase()) ||
      (log.metadata?.title && String(log.metadata.title).toLowerCase().includes(behaviorUsernameQuery.toLowerCase()));

    let matchesAction = true;
    if (behaviorActionFilter === 'register') matchesAction = log.action.includes('register');
    else if (behaviorActionFilter === 'knowledge') matchesAction = log.action.includes('knowledge') || log.action.includes('deposit');
    else if (behaviorActionFilter === 'ai') matchesAction = log.action.includes('ai') || log.action.includes('enrich') || log.action.includes('analysis');
    else if (behaviorActionFilter === 'predict') matchesAction = log.action.includes('predict') || log.action.includes('contract');

    return matchesUser && matchesAction;
  });

  const totalPages = Math.ceil(filteredBehaviorLogs.length / pageSize) || 1;
  const paginatedLogs = filteredBehaviorLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-serif font-black text-stone-950 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#E3120B]" />
              <span>核心用户行为审计日志 (System Behavior Logs)</span>
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
            onClick={onGenerateBehaviorInsights}
            disabled={insightsLoading}
            className="px-4 py-2 bg-[#E3120B] hover:bg-red-700 text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
            <span>{insightsLoading ? '模式挖掘中…' : '生成行为洞察报告'}</span>
          </button>

          <button
            onClick={onExportCsv}
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
          { id: 'register', label: '注册申请', count: auditEvents.filter((e) => e.action.includes('register')).length, color: 'border-emerald-600 bg-emerald-50 text-emerald-900' },
          { id: 'knowledge', label: '知识库添加', count: auditEvents.filter((e) => e.action.includes('knowledge') || e.action.includes('deposit')).length, color: 'border-purple-600 bg-purple-50 text-purple-900' },
          { id: 'ai', label: '深度解读调用', count: auditEvents.filter((e) => e.action.includes('ai') || e.action.includes('enrich') || e.action.includes('analysis')).length, color: 'border-amber-600 bg-amber-50 text-amber-900' },
          { id: 'predict', label: '前瞻预测契约', count: auditEvents.filter((e) => e.action.includes('predict') || e.action.includes('contract')).length, color: 'border-blue-600 bg-blue-50 text-blue-900' },
        ].map((card) => {
          const isSelected = behaviorActionFilter === card.id;
          return (
            <button
              key={card.id}
              onClick={() => {
                setBehaviorActionFilter(card.id);
                setCurrentPage(1);
              }}
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
            onChange={(e) => {
              setBehaviorUsernameQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs font-serif text-stone-600">
          <div className="flex items-center space-x-1.5">
            <span>每页显示:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-stone-50 border border-stone-300 rounded-lg"
            >
              <option value={15}>15 条</option>
              <option value={30}>30 条</option>
              <option value={50}>50 条</option>
            </select>
          </div>
          <span className="font-mono text-stone-400">|</span>
          <span className="font-mono">
            页码: {currentPage} / {totalPages}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-100 font-serif font-bold text-stone-700 border-b border-stone-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3">时间</th>
              <th className="p-3">操作主体 (Actor)</th>
              <th className="p-3">行为类型 (Action)</th>
              <th className="p-3">关联实体</th>
              <th className="p-3">状态</th>
              <th className="p-3 text-right">元数据</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-mono">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-stone-400 font-serif">
                  暂无匹配的行为审计记录
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="p-3 text-stone-500 text-[11px] whitespace-nowrap">
                    {new Date(log.at).toLocaleString('zh-CN', { hour12: false })}
                  </td>
                  <td className="p-3 font-bold text-stone-900">{log.actor}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200 text-[11px] font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 max-w-xs truncate text-stone-600" title={log.entityId || log.metadata?.title}>
                    {log.metadata?.title || log.entityId || '-'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        log.status === 'success' || log.status === 'ok'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedLogModal(log)}
                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 font-serif font-bold text-[11px] cursor-pointer"
                    >
                      <Eye className="w-3 h-3 inline mr-1" />
                      查看 Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-xs font-serif">
          <div className="text-stone-500">
            显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredBehaviorLogs.length)} 条，共 {filteredBehaviorLogs.length} 条
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded disabled:opacity-50 cursor-pointer"
            >
              上一页
            </button>
            <span className="font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded disabled:opacity-50 cursor-pointer"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-950">日志元数据 JSON (Log Details)</h3>
              <button onClick={() => setSelectedLogModal(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="p-4 bg-stone-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-80 select-all">
              {JSON.stringify(selectedLogModal, null, 2)}
            </pre>
            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedLogModal(null)} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-serif font-bold">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Modal */}
      {insightsReport && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-serif font-black text-stone-950">
                  AI 用户行为模式与功能偏好洞察报告
                </h3>
              </div>
              <button onClick={() => setInsightsReport(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-serif">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                <div className="font-bold text-purple-950 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>核心特征摘要 (Core Summary)</span>
                </div>
                <p className="text-purple-900 leading-relaxed">
                  {insightsReport.insights?.summary}
                </p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="font-bold text-amber-950 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-amber-700" />
                  <span>行为风控与合规观察 (Security & Compliance Observation)</span>
                </div>
                <p className="text-amber-900 leading-relaxed">
                  {insightsReport.insights?.anomaliesOrRisks}
                </p>
              </div>

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
    </div>
  );
};
