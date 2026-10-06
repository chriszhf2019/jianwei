import { useState, type FormEvent } from 'react';
import type { UserItem } from '../adminTypes';
import type { ShowToast } from './useAdminKeys';

/** 用户账号、审批与会话。 */
export function useAdminUsers(deps: { showToast: ShowToast; refresh: () => void | Promise<void> }) {
  const { showToast, refresh } = deps;
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'analyst' | 'viewer'>('analyst');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      showToast('error', '请填写完整用户名与初始密码');
      return;
    }
    if (newPassword.trim().length < 6) {
      showToast('error', '初始密码长度不得少于 6 位');
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || '创建用户失败';
        if (msg === 'username_exists') msg = '该用户名已被注册或已存在';
        else if (msg === 'invalid_username') msg = '用户名格式不符合要求（允许字母、数字、下划线、@、.、-，2-120字）';
        else if (msg === 'password_too_short') msg = '初始密码太短，长度至少需要 6 位';
        else if (msg === 'invalid_role') msg = '系统角色类别无效';
        else if (msg === 'persistence_disabled') msg = '数据库暂未开启持久化支持';
        throw new Error(msg);
      }
      showToast('success', `用户「${newUsername.trim()}」创建成功！`);
      setShowCreateUserModal(false);
      setNewUsername('');
      setNewPassword('');
      void refresh();
    } catch (e: any) {
      showToast('error', e.message || '创建用户失败');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserItem>) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('更新用户信息失败');
      showToast('success', '用户状态更新成功');
      void refresh();
    } catch (e: any) {
      showToast('error', e.message || '更新失败');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!resetNewPassword.trim()) {
      showToast('error', '请输入新密码');
      return;
    }
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetNewPassword.trim() }),
      });
      if (!res.ok) throw new Error('重置密码失败');
      showToast('success', '密码重置成功，该用户已有会话已自动下线');
      setResettingUserId(null);
      setResetNewPassword('');
    } catch (e: any) {
      showToast('error', e.message || '重置密码失败');
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/sessions`, { method: 'DELETE' });
      if (!res.ok) throw new Error('注销会话失败');
      showToast('success', '已强制注销该用户的所有活跃会话');
    } catch (e: any) {
      showToast('error', e.message || '操作失败');
    }
  };

  return {
    users,
    setUsers,
    showCreateUserModal,
    setShowCreateUserModal,
    creatingUser,
    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
    newRole,
    setNewRole,
    userSearchQuery,
    setUserSearchQuery,
    roleFilter,
    setRoleFilter,
    resettingUserId,
    setResettingUserId,
    resetNewPassword,
    setResetNewPassword,
    filteredUsers,
    handleCreateUser,
    handleUpdateUser,
    handleResetPassword,
    handleRevokeSessions,
  };
}
