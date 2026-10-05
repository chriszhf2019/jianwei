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

export function UsersTab({ s }: { s: AdminTabScope }) {
  const { creatingUser, filteredUsers, handleCreateUser, handleResetPassword, handleRevokeSessions, handleUpdateUser, newPassword, newRole, newUsername, resetNewPassword, resettingUserId, roleFilter, setNewPassword, setNewRole, setNewUsername, setResetNewPassword, setResettingUserId, setRoleFilter, setShowCreateUserModal, setUserSearchQuery, showCreateUserModal, userSearchQuery, users } = s;
  return (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                企业组织与用户权限管理 (RBAC)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                支持新增用户、按角色分权（管理员/资深分析师/观察员）、审核待注册账号及重置凭证。
              </p>
            </div>

            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>新建系统用户</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索用户名或角色…"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="font-serif font-bold text-stone-600">角色筛选:</span>
              {['all', 'admin', 'analyst', 'viewer'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-2.5 py-1 rounded-full text-xs font-serif font-bold transition-colors cursor-pointer ${
                    roleFilter === role
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {role === 'all' ? '全部' : role === 'admin' ? '管理员' : role === 'analyst' ? '分析师' : '观察员'}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 font-serif font-bold text-stone-700 border-b border-stone-200">
                <tr>
                  <th className="p-3">用户名</th>
                  <th className="p-3">系统角色</th>
                  <th className="p-3">审核状态</th>
                  <th className="p-3">账号状态</th>
                  <th className="p-3">注册时间</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400 font-serif">
                      未找到匹配的用户记录
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-stone-900">{u.username}</td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u.id, { role: e.target.value as any })}
                          className="px-2 py-1 bg-white border border-stone-300 rounded text-xs font-serif"
                        >
                          <option value="admin">超级管理员 (Admin)</option>
                          <option value="analyst">资深分析师 (Analyst)</option>
                          <option value="viewer">观察员 (Viewer)</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            u.approvalStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.approvalStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.approvalStatus === 'approved' ? '已批准' : u.approvalStatus === 'pending' ? '待审核' : '已拒绝'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleUpdateUser(u.id, { active: !u.active })}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            u.active ? 'bg-blue-100 text-blue-800' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {u.active ? '● 正常使用' : '○ 已停用'}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-stone-500 text-[11px]">{u.createdAt || '-'}</td>
                      <td className="p-3 text-right space-x-2">
                        {u.approvalStatus === 'pending' && (
                          <button
                            onClick={() => handleUpdateUser(u.id, { approvalStatus: 'approved' })}
                            className="text-[11px] font-serif font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            批准准入
                          </button>
                        )}
                        <button
                          onClick={() => setResettingUserId(u.id)}
                          className="text-[11px] font-serif font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          重置密码
                        </button>
                        <button
                          onClick={() => handleRevokeSessions(u.id)}
                          className="text-[11px] font-serif font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
                        >
                          下线会话
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Reset Password Prompt */}
          {resettingUserId && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-sm w-full p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h3 className="font-serif font-bold text-sm text-stone-900">重置用户密码</h3>
                  <button onClick={() => setResettingUserId(null)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-serif font-bold text-stone-700">输入新密码</label>
                  <input
                    type="password"
                    placeholder="不少于 6 位字符"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setResettingUserId(null)} className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-serif font-bold">
                    取消
                  </button>
                  <button onClick={() => handleResetPassword(resettingUserId)} className="px-4 py-1.5 rounded-lg bg-[#E3120B] text-white text-xs font-serif font-bold">
                    确认重置
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create User Modal */}
          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <form onSubmit={handleCreateUser} className="bg-white rounded-2xl border-2 border-stone-900 max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h3 className="font-serif font-black text-base text-stone-950">新建系统用户</h3>
                  <button type="button" onClick={() => setShowCreateUserModal(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-serif font-bold text-stone-800">登录用户名 (Username)</label>
                    <input
                      type="text"
                      required
                      placeholder="如: analyst_zhang"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-serif font-bold text-stone-800">初始登录密码</label>
                    <input
                      type="password"
                      required
                      placeholder="初始登录密码"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-serif font-bold text-stone-800">分配系统角色</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                    >
                      <option value="analyst">资深分析师 (Analyst · 具备 AI 深度研判与推演权限)</option>
                      <option value="admin">超级管理员 (Admin · 全系统配置与用户管理)</option>
                      <option value="viewer">观察员 (Viewer · 仅浏览与报告阅读)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-stone-100">
                  <button type="button" disabled={creatingUser} onClick={() => setShowCreateUserModal(false)} className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-serif font-bold cursor-pointer disabled:opacity-50">
                    取消
                  </button>
                  <button type="submit" disabled={creatingUser} className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold cursor-pointer disabled:opacity-50 flex items-center space-x-1.5">
                    {creatingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{creatingUser ? '创建中…' : '立即创建'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
  );
}
