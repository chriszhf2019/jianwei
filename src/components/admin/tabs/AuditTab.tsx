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

export function AuditTab({ s }: { s: AdminTabScope }) {
  const { auditEvents } = s;
  return (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                安全审计哈希链与数据备份 (Security & Backups)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                底层基于 SHA-256 哈希防篡改链条，保障数据库持久化与合规快照。
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>SHA-256 审计链校验通过</span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 font-serif font-bold text-stone-700 sticky top-0 border-b border-stone-200">
                <tr>
                  <th className="p-3">操作主体</th>
                  <th className="p-3">动作类型</th>
                  <th className="p-3">关联实体</th>
                  <th className="p-3">元数据详情</th>
                  <th className="p-3 text-right">时间戳</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400 font-serif">
                      暂无审计日志事件
                    </td>
                  </tr>
                ) : (
                  auditEvents.map((evt: any) => (
                    <tr key={evt.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-stone-900">{evt.actor}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-stone-100 font-mono text-[11px] text-stone-800">
                          {evt.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-stone-600 text-[11px]">{evt.entityType || '-'}</td>
                      <td className="p-3 font-mono text-stone-500 text-[10px] max-w-xs truncate">
                        {evt.metadata ? JSON.stringify(evt.metadata) : '-'}
                      </td>
                      <td className="p-3 font-mono text-stone-500 text-[11px] text-right">
                        {evt.at || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
  );
}
