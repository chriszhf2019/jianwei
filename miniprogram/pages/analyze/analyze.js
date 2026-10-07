const { analyzeNews } = require('../../utils/api');
const { getBaseUrl } = require('../../utils/storage');

Page({
  data: {
    title: '',
    content: '',
    source: '',
    loading: false,
    result: null,
    resultNote: '',
  },

  onShow() {
    if (!getBaseUrl()) {
      wx.showToast({ title: '请先配置 API 基址', icon: 'none' });
    }
  },

  onTitle(e) {
    this.setData({ title: e.detail.value });
  },
  onContent(e) {
    this.setData({ content: e.detail.value });
  },
  onSource(e) {
    this.setData({ source: e.detail.value });
  },

  async onAnalyze() {
    const title = (this.data.title || '').trim();
    const content = (this.data.content || '').trim();
    if (!title || !content) return;
    if (!getBaseUrl()) {
      wx.showToast({ title: '请先在「我的」配置 API', icon: 'none' });
      return;
    }

    this.setData({ loading: true, result: null, resultNote: '' });
    try {
      const res = await analyzeNews({
        title,
        content,
        source: (this.data.source || '').trim() || undefined,
      });
      if (res.fallback || !res.data) {
        this.setData({
          resultNote:
            res.reason ||
            res.message ||
            '未生成分析（无 API Key、额度用尽或模型不可用）',
        });
        return;
      }
      this.setData({ result: res.data, resultNote: res.cached ? '命中服务端缓存' : '' });
    } catch (err) {
      this.setData({ resultNote: err.message || '分析失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  openResult() {
    if (!this.data.result) return;
    wx.setStorageSync('jianwei:detail-article', this.data.result);
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(this.data.result.id || 'analyzed')}`,
    });
  },
});
