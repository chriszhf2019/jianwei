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

export function ActivityTab({ s }: { s: AdminTabScope }) {
  const { hourlyDistribution, maxHourlyCount, selectedUserDetail, setSelectedUserDetail, userSummaries } = s;
  return (
        <div className="space-y-6">
          <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-serif font-black text-stone-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>24小时全天活跃时段分布 (Peak Activity Distribution)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  统计用户登录与高频研判的时段波峰，便于规划算力供给与模型缓存。
                </p>
              </div>

              <span className="text-xs font-mono text-stone-500">单位: 事件频次 (Events / Hour)</span>
            </div>

            <div className="grid grid-cols-12 sm:grid-cols-24 gap-1.5 pt-2 items-end h-28">
              {Array.from({ length: 24 }).map((_, h) => {
                const count = hourlyDistribution[h] || 0;
                const pct = Math.max(8, (count / maxHourlyCount) * 100);
                return (
                  <div key={h} className="flex flex-col items-center justify-end h-full group relative">
                    <div
                      className={`w-full rounded-t-xs transition-all duration-300 ${
                        count > 0 ? 'bg-[#E3120B] group-hover:bg-red-700' : 'bg-stone-200'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                    <span className="text-[9px] font-mono text-stone-400 mt-1">{h}时</span>
                    <div className="absolute -top-7 hidden group-hover:flex bg-stone-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                      {h}:00-{h}:59 · {count}次
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Usage Profile Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-base font-serif font-black text-stone-950 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>各分析师使用情况台账 (Analyst Usage Ledger)</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">点击任意用户可展开其近期的研判动作时序轨迹。</p>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 font-serif font-bold text-stone-700 border-b border-stone-200">
                    <tr>
                      <th className="p-3">分析师 / 用户名</th>
                      <th className="p-3">登录次数</th>
                      <th className="p-3">AI 研判</th>
                      <th className="p-3">知识沉淀</th>
                      <th className="p-3">情报阅读</th>
                      <th className="p-3">最后活跃时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {userSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-400 font-serif">
                          暂无用户活跃使用记录
                        </td>
                      </tr>
                    ) : (
                      userSummaries.map((u: any, idx: number) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedUserDetail(u)}
                          className={`hover:bg-amber-50/50 cursor-pointer transition-colors ${
                            selectedUserDetail?.username === u.username ? 'bg-amber-50/80 font-bold' : ''
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-stone-900 flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[10px] flex items-center justify-center font-serif">
                              {u.username.slice(0, 1).toUpperCase()}
                            </span>
                            <span>{u.username}</span>
                          </td>
                          <td className="p-3 font-mono text-blue-700">{u.totalLogins} 次</td>
                          <td className="p-3 font-mono text-amber-700">{u.totalAiAnalysis} 次</td>
                          <td className="p-3 font-mono text-purple-700">{u.totalDeposits} 条</td>
                          <td className="p-3 font-mono text-stone-700">{u.totalArticleReads} 篇</td>
                          <td className="p-3 font-mono text-stone-500 text-[11px]">{u.lastActiveAt || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected User Drawer */}
            <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="border-b border-stone-200 pb-3">
                  <div className="text-[10px] font-mono text-stone-500 uppercase">活跃轨迹明细 (User Footprint)</div>
                  <h4 className="text-base font-serif font-black text-stone-950 mt-1">
                    {selectedUserDetail ? `用户「${selectedUserDetail.username}」近期动作` : '选择左侧用户查看轨迹'}
                  </h4>
                </div>

                {selectedUserDetail ? (
                  <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
                    {selectedUserDetail.recentActions.length === 0 ? (
                      <p className="text-xs text-stone-400 py-6 text-center">暂无详细动作流水</p>
                    ) : (
                      selectedUserDetail.recentActions.map((act: any, i: number) => (
                        <div key={i} className="border-l-2 border-stone-800 pl-3 py-0.5 space-y-0.5">
                          <div className="text-[10px] font-mono text-stone-400">{act.at}</div>
                          <div className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-stone-100 text-[10px] font-mono text-stone-700">
                              {act.action}
                            </span>
                          </div>
                          {act.detail && <p className="text-[11px] text-stone-600 line-clamp-1">{act.detail}</p>}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-2 text-stone-400">
                    <Activity className="w-8 h-8 mx-auto text-stone-300 animate-pulse" />
                    <p className="text-xs font-serif">点击左侧任意用户行</p>
                    <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                      在此查阅其完整的深度分析、知识沉淀与登录操作明细
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
  );
}
