const { login } = require('../../utils/api');
const { setToken, setUser, getBaseUrl } = require('../../utils/storage');

Page({
  data: {
    mode: 'password',
    username: '',
    password: '',
    accessToken: '',
    loading: false,
  },

  onShow() {
    if (!getBaseUrl()) {
      wx.showToast({ title: '请先配置 API 基址', icon: 'none' });
    }
  },

  setMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },
  onUsername(e) {
    this.setData({ username: e.detail.value });
  },
  onPassword(e) {
    this.setData({ password: e.detail.value });
  },
  onToken(e) {
    this.setData({ accessToken: e.detail.value });
  },

  async onSubmit() {
    if (!getBaseUrl()) {
      wx.showToast({ title: '请先在「我的」配置 API', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      let res;
      if (this.data.mode === 'token') {
        const accessToken = (this.data.accessToken || '').trim();
        if (!accessToken) throw new Error('请填写令牌');
        res = await login({ accessToken });
      } else {
        const username = (this.data.username || '').trim();
        const password = this.data.password || '';
        if (!username || !password) throw new Error('请填写用户名和密码');
        res = await login({ username, password });
      }
      if (!res || !res.ok || !res.token) {
        throw new Error((res && (res.error || res.message)) || '登录失败');
      }
      setToken(res.token);
      setUser(res.user || null);
      const app = getApp();
      if (app && app.refreshSession) await app.refreshSession();
      wx.showToast({ title: '已登录', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/mine' }) });
      }, 400);
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
