const { fetchHealth } = require('../../utils/api');
const {
  getBaseUrl,
  setBaseUrl,
  getToken,
  getUser,
  clearSession,
  setUser,
} = require('../../utils/storage');

Page({
  data: {
    baseUrl: '',
    loggedIn: false,
    userLabel: '未登录',
    aiLabel: '未知',
    healthLabel: '未检测',
    saving: false,
    pinging: false,
  },

  onShow() {
    this.setData({ baseUrl: getBaseUrl() });
    this.refreshLabels();
    if (getBaseUrl()) this.pingHealth({ silent: true });
  },

  refreshLabels(health) {
    const user = (health && health.user) || getUser();
    const token = getToken();
    const loggedIn = !!(user || token);
    let userLabel = '未登录';
    if (user && user.username) {
      userLabel = `${user.username}（${user.role || 'user'}）`;
    } else if (token) {
      userLabel = '已保存令牌';
    }
    let aiLabel = '未知';
    if (health && health.ai) {
      aiLabel = health.ai.provider || (health.hasApiKey ? '已配置' : '未配置 Key');
    }
    const healthLabel = health
      ? `ok · authRequired=${!!health.authRequired}`
      : getBaseUrl()
        ? '待检测'
        : '未配置基址';
    this.setData({ loggedIn, userLabel, aiLabel, healthLabel });
  },

  onBaseUrl(e) {
    this.setData({ baseUrl: e.detail.value });
  },

  async saveBaseUrl() {
    const url = setBaseUrl(this.data.baseUrl);
    if (!url) {
      wx.showToast({ title: '请填写基址', icon: 'none' });
      return;
    }
    if (!/^https:\/\//i.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)/i.test(url)) {
      wx.showModal({
        title: '提示',
        content: '正式环境请使用 HTTPS。开发者工具本地调试可用 http://127.0.0.1。',
        showCancel: false,
      });
    }
    this.setData({ saving: true, baseUrl: url });
    try {
      await this.pingHealth();
      wx.showToast({ title: '已保存', icon: 'success' });
    } finally {
      this.setData({ saving: false });
    }
  },

  async pingHealth(opts = {}) {
    if (!getBaseUrl()) {
      this.refreshLabels(null);
      if (!opts.silent) wx.showToast({ title: '未配置基址', icon: 'none' });
      return;
    }
    this.setData({ pinging: true });
    try {
      const health = await fetchHealth();
      if (health.user) setUser(health.user);
      const app = getApp();
      if (app) {
        app.globalData.health = health;
        app.globalData.user = health.user || null;
      }
      this.refreshLabels(health);
      if (!opts.silent) wx.showToast({ title: '服务正常', icon: 'success' });
    } catch (err) {
      this.setData({ healthLabel: err.message || '检测失败' });
      if (!opts.silent) wx.showToast({ title: '检测失败', icon: 'none' });
    } finally {
      this.setData({ pinging: false });
    }
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  logout() {
    clearSession();
    const app = getApp();
    if (app) {
      app.globalData.user = null;
    }
    this.refreshLabels(null);
    wx.showToast({ title: '已退出', icon: 'none' });
  },
});
