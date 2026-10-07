import React from 'react';
import { useAuth } from '../state/AuthContext';
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT } from '../shared/passwordPolicy';

/** 游客横幅 + 登录/注册/改密模态。 */
export const AuthGate: React.FC = () => {
  const auth = useAuth();

  return (
    <>
      {auth.authRequired && auth.authUser?.isGuest && !auth.isAuthModalOpen && !auth.mustChangePassword && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
            <span>
              游客模式：最多查看 <b>4</b> 条新闻；深度解读（完整分析）限 <b>1</b> 次。「大白话」可试用，不占用该额度。
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={auth.openRegister}
                className="rounded-md bg-stone-900 px-2.5 py-1 font-serif font-bold text-white"
              >
                注册申请
              </button>
              <button
                type="button"
                onClick={auth.openLogin}
                className="rounded-md border border-amber-400 bg-white px-2.5 py-1 font-serif font-bold text-amber-900"
              >
                登录
              </button>
            </div>
          </div>
        </div>
      )}

      {(auth.isAuthModalOpen || auth.mustChangePassword) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (auth.mustChangePassword) void auth.submitRequiredPasswordChange();
              else if (auth.authMode === 'register') void auth.submitRegistration();
              else void auth.submitAuth();
            }}
            className="w-full max-w-sm bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                {auth.mustChangePassword
                  ? '首次登录需修改密码'
                  : auth.authMode === 'register'
                    ? '注册申请'
                    : '登录见微'}
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                {auth.mustChangePassword
                  ? '当前密码由管理员设置或重置，修改完成前不能访问其他功能。'
                  : auth.authMode === 'register'
                    ? '注册后需等待管理员审批。审批前可继续以游客身份浏览。'
                    : '使用已批准账号登录，或兼容旧版访问令牌。凭据只保存在本机浏览器。'}
              </p>
            </div>
            {auth.mustChangePassword ? (
              <div className="space-y-3">
                <input
                  type="password"
                  name="password"
                  value={auth.newPassword}
                  onChange={(e) => auth.setNewPassword(e.target.value)}
                  placeholder={`新密码，至少 ${PASSWORD_MIN_LENGTH} 位`}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                />
                <p className="text-[10px] text-stone-400">{PASSWORD_POLICY_HINT}</p>
              </div>
            ) : auth.authMode === 'register' ? (
              auth.registrationSubmitted ? (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3 text-xs text-emerald-900 leading-relaxed">
                  注册申请已提交，状态为“待审批”。管理员批准后即可使用完整功能。
                  <button
                    type="button"
                    onClick={() => {
                      auth.setAuthMode('login');
                      auth.setRegistrationSubmitted(false);
                    }}
                    className="mt-3 w-full rounded-lg border border-emerald-400 bg-white px-3 py-2 font-serif font-bold"
                  >
                    返回登录
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    name="username"
                    value={auth.registerUsername}
                    onChange={(e) => auth.setRegisterUsername(e.target.value)}
                    placeholder="用户名"
                    autoComplete="username"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                  />
                  <input
                    type="password"
                    name="password"
                    value={auth.registerPassword}
                    onChange={(e) => auth.setRegisterPassword(e.target.value)}
                    placeholder={`密码，至少 ${PASSWORD_MIN_LENGTH} 位`}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                  />
                  <input
                    type="password"
                    name="passwordConfirm"
                    value={auth.registerConfirm}
                    onChange={(e) => auth.setRegisterConfirm(e.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                  />
                  <p className="text-[10px] text-stone-400">{PASSWORD_POLICY_HINT}</p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  name="username"
                  value={auth.authUsername}
                  onChange={(e) => auth.setAuthUsername(e.target.value)}
                  placeholder="用户名"
                  autoFocus
                  autoComplete="username"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                />
                <input
                  type="password"
                  name="password"
                  value={auth.authPassword}
                  onChange={(e) => auth.setAuthPassword(e.target.value)}
                  placeholder="密码"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                />
                <details>
                  <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-800">
                    使用旧版访问令牌
                  </summary>
                  <input
                    type="password"
                    value={auth.authTokenInput}
                    onChange={(e) => auth.setAuthTokenInput(e.target.value)}
                    placeholder="访问令牌"
                    autoComplete="off"
                    className="mt-2 w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-stone-900"
                  />
                </details>
                <button
                  type="button"
                  onClick={auth.openRegister}
                  className="text-xs font-serif font-bold text-[#E3120B] hover:text-red-800"
                >
                  没有账号？提交注册申请
                </button>
              </div>
            )}
            {auth.authError && <p className="text-xs text-red-700">{auth.authError}</p>}
            <button
              type="submit"
              disabled={
                auth.mustChangePassword
                  ? auth.newPassword.length < PASSWORD_MIN_LENGTH
                  : auth.authMode === 'register'
                    ? auth.registrationSubmitted ||
                      auth.registerUsername.trim().length < 2 ||
                      auth.registerPassword.length < PASSWORD_MIN_LENGTH ||
                      auth.registerPassword !== auth.registerConfirm
                    : !auth.authTokenInput.trim() &&
                      (!auth.authUsername.trim() || auth.authPassword.length < 1)
              }
              className="w-full px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-serif font-bold hover:bg-red-700 transition-colors disabled:opacity-40"
            >
              {auth.mustChangePassword
                ? '修改密码'
                : auth.authMode === 'register'
                  ? auth.registrationSubmitted
                    ? '等待审批'
                    : '提交注册申请'
                  : '进入见微'}
            </button>
            {!auth.mustChangePassword && (
              <button
                type="button"
                onClick={auth.closeAuthModal}
                className="w-full text-center text-xs text-stone-500 hover:text-stone-900"
              >
                暂不登录，继续以游客身份浏览
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
};
