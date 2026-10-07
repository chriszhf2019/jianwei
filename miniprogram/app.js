const { getBaseUrl, getToken } = require('./utils/storage');
const { request } = require('./utils/api');

App({
  globalData: {
    user: null,
    health: null,
  },

  onLaunch() {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      console.warn('[见微] 尚未配置 API 基址，请到「我的」填写 HTTPS 服务地址');
      return;
    }
    this.refreshSession();
  },

  async refreshSession() {
    try {
      const health = await request({ path: '/api/health', method: 'GET', auth: !!getToken() });
      this.globalData.health = health;
      this.globalData.user = health.user || null;
      return health;
    } catch (err) {
      console.warn('[见微] health 失败', err);
      this.globalData.health = null;
      return null;
    }
  },
});
