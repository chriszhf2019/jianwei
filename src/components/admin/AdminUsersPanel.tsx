import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  X,
  UserCheck,
  ShieldCheck,
  KeyRound,
  Lock,
} from 'lucide-react';

export interface UserItem {
  id: string;
  username: string;
  role: 'admin' | 'analyst' | 'viewer';
  active: boolean;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  approvedBy?: string;
}

interface AdminUsersPanelProps {
  users: UserItem[];
  userSearchQuery: string;
  setUserSearchQuery: (q: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  onUpdateUser: (id: string, updates: Partial<UserItem>) => void;
  onRevokeSessions: (userId: string) => void;
  onResetPassword: (userId: string, newPass: string) => void;
  onCreateUser: (username: string, password: string, role: 'admin' | 'analyst' | 'viewer') => Promise<boolean>;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({
  users,
  userSearchQuery,
  setUserSearchQuery,
  roleFilter,
  setRoleFilter,
  onUpdateUser,
  onRevokeSessions,
  onResetPassword,
  onCreateUser,
  onShowToast,
}) => {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'analyst' | 'viewer'>('analyst');

  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      onShowToast('error', '请填写完整用户名与初始密码');
      return;
    }
    if (newPassword.trim().length < 6) {
      onShowToast('error', '初始密码长度不得少于 6 位');
      return;
    }
    setCreatingUser(true);
    try {
      const ok = await onCreateUser(newUsername.trim(), newPassword.trim(), newRole);
      if (ok) {
        setShowCreateUserModal(false);
        setNewUsername('');
        setNewPassword('');
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const handleConfirmReset = () => {
    if (!resetNewPassword.trim()) {
      onShowToast('error', '请输入新密码');
      return;
    }
    if (resettingUserId) {
      onResetPassword(resettingUserId, resetNewPassword.trim());
      setResettingUserId(null);
      setResetNewPassword('');
    }
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-lg font-serif font-black text-stone-950 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>企业组织与用户权限管理 (RBAC)</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            支持新增用户、按角色分权（超级管理员/资深分析师/观察员）、审批注册账号及重置凭证。
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
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-stone-900">{u.username}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => onUpdateUser(u.id, { role: e.target.value as any })}
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
                      onClick={() => onUpdateUser(u.id, { active: !u.active })}
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
                        onClick={() => onUpdateUser(u.id, { approvalStatus: 'approved' })}
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
                      onClick={() => onRevokeSessions(u.id)}
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

      {/* Reset Password Modal */}
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
              <button onClick={handleConfirmReset} className="px-4 py-1.5 rounded-lg bg-[#E3120B] text-white text-xs font-serif font-bold">
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateSubmit} className="bg-white rounded-2xl border-2 border-stone-900 max-w-md w-full p-6 space-y-4 shadow-2xl">
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
                  placeholder="例如: analyst_alex"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-serif font-bold text-stone-800">初始密码 (Password)</label>
                <input
                  type="password"
                  placeholder="至少 6 位密码"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-serif font-bold text-stone-800">分配系统角色</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                >
                  <option value="analyst">资深分析师 (Analyst · 完整深度解读与预测)</option>
                  <option value="viewer">观察员 (Viewer · 仅浏览与速读)</option>
                  <option value="admin">超级管理员 (Admin · 全权管理台与数据配置)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-serif font-bold"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={creatingUser}
                className="px-5 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold"
              >
                {creatingUser ? '正在创建…' : '立即创建用户'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
