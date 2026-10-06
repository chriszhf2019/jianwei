import { useState, useEffect, useCallback } from 'react';

export type AuthMode = 'login' | 'register';

/** 会话鉴权：health 探测、登录/注册/改密与游客横幅状态。 */
export function useAuthSession() {
  const [authRequired, setAuthRequired] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authUser, setAuthUser] = useState<any>(null);
  const [authTokenInput, setAuthTokenInput] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
      .then((d) => {
        if (d?.authRequired) setAuthRequired(true);
        if (d?.user?.mustChangePassword) {
          setMustChangePassword(true);
          setAuthRequired(false);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setAuthUser(data?.user || null))
      .catch(() => setAuthUser(null));
  }, []);

  useEffect(() => {
    const handleAuthRequired = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.error === 'guest_deep_read_limit') {
        setAuthError('游客只能使用一次深度解读。注册并等待管理员审批后可继续使用。');
      } else if (detail.error === 'password_change_required') {
        setMustChangePassword(true);
      } else {
        setAuthError(detail.message || '该功能需要注册并完成审批。');
      }
      setAuthMode('register');
      setIsAuthModalOpen(true);
    };
    window.addEventListener('jianwei:auth-required', handleAuthRequired);
    return () => window.removeEventListener('jianwei:auth-required', handleAuthRequired);
  }, []);

  const openLogin = useCallback(() => {
    setAuthMode('login');
    setAuthError('');
    setIsAuthModalOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setAuthMode('register');
    setAuthError('');
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthError('');
  }, []);

  const submitAuth = useCallback(async () => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authTokenInput.trim()
            ? { accessToken: authTokenInput.trim() }
            : { username: authUsername.trim(), password: authPassword }
        ),
      });
      const data = await response.json();
      if (!response.ok || !data?.token) {
        setAuthError(
          data?.error === 'pending_approval'
            ? '账号正在等待管理员审批。'
            : data?.error === 'rejected'
              ? '注册申请未通过，请联系管理员。'
              : '登录失败：账号、密码或访问令牌无效。'
        );
        return;
      }
      localStorage.setItem('jianwei:auth-token', data.token);
      setAuthUser(data.user || null);
      if (data.user?.mustChangePassword) {
        setMustChangePassword(true);
        setAuthRequired(false);
        return;
      }
      setAuthRequired(false);
      window.location.reload();
    } catch {
      setAuthError('登录服务不可达，请确认本地服务已启动。');
    }
  }, [authTokenInput, authUsername, authPassword]);

  const submitRegistration = useCallback(async () => {
    setAuthError('');
    setRegistrationSubmitted(false);
    if (registerPassword !== registerConfirm) {
      setAuthError('两次输入的密码不一致。');
      return;
    }
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUsername.trim(),
          password: registerPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(
          data?.error === 'username_exists'
            ? '用户名已存在。'
            : data?.error === 'password_too_weak'
              ? '密码至少 12 位，并需包含至少三类字符。'
              : '注册失败，请检查用户名和密码。'
        );
        return;
      }
      setRegistrationSubmitted(true);
      setRegisterPassword('');
      setRegisterConfirm('');
    } catch {
      setAuthError('注册服务不可达，请稍后重试。');
    }
  }, [registerUsername, registerPassword, registerConfirm]);

  const submitRequiredPasswordChange = useCallback(async () => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: authPassword,
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(
          data?.error === 'password_change_failed'
            ? '密码不符合要求或当前密码错误。密码至少 12 位，并需包含至少三类字符。'
            : '密码修改失败。'
        );
        return;
      }
      localStorage.removeItem('jianwei:auth-token');
      setMustChangePassword(false);
      setAuthRequired(true);
      setNewPassword('');
      setAuthError('密码已修改，请使用新密码重新登录。');
    } catch {
      setAuthError('密码修改服务不可达。');
    }
  }, [authPassword, newPassword]);

  return {
    authRequired,
    mustChangePassword,
    isAuthModalOpen,
    authMode,
    setAuthMode,
    authUser,
    authTokenInput,
    setAuthTokenInput,
    authUsername,
    setAuthUsername,
    authPassword,
    setAuthPassword,
    registerUsername,
    setRegisterUsername,
    registerPassword,
    setRegisterPassword,
    registerConfirm,
    setRegisterConfirm,
    registrationSubmitted,
    setRegistrationSubmitted,
    newPassword,
    setNewPassword,
    authError,
    openLogin,
    openRegister,
    closeAuthModal,
    submitAuth,
    submitRegistration,
    submitRequiredPasswordChange,
  };
}

export type AuthSession = ReturnType<typeof useAuthSession>;
