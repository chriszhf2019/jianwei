const { fetchCorpus, fetchSnapshot } = require('../../utils/api');
const { getBaseUrl } = require('../../utils/storage');
const { articleTeaser, formatMeta } = require('../../utils/format');

const PAGE_SIZE = 20;

Page({
  data: {
    baseUrl: '',
    query: '',
    articles: [],
    snapshot: null,
    statusText: '',
    loading: false,
    loadingMore: false,
    offset: 0,
    hasMore: false,
  },

  onShow() {
    this.setData({ baseUrl: getBaseUrl() });
    if (getBaseUrl()) {
      this.reload();
    }
  },

  onPullDownRefresh() {
    this.reload().finally(() => wx.stopPullDownRefresh());
  },

  onQueryInput(e) {
    this.setData({ query: e.detail.value });
  },

  onSearch() {
    this.reload();
  },

  async reload() {
    if (!getBaseUrl()) {
      this.setData({ articles: [], snapshot: null, statusText: '' });
      return;
    }
    this.setData({ loading: true, statusText: '', offset: 0 });
    try {
      const [corpusRes, snapshot] = await Promise.all([
        fetchCorpus({ q: this.data.query, limit: PAGE_SIZE, offset: 0 }),
        fetchSnapshot().catch(() => null),
      ]);
      const articles = (corpusRes.corpus || []).map((a) => ({
        ...a,
        _teaser: articleTeaser(a),
        _meta: formatMeta(a),
      }));
      const meta = corpusRes.meta || {};
      let statusText = '';
      if (meta.guest) {
        statusText = `游客模式：最多展示 ${meta.guestArticleLimit || 4} 篇。登录后可看完整语料。`;
      }
      this.setData({
        articles,
        snapshot,
        hasMore: !!meta.hasMore,
        offset: articles.length,
        statusText,
      });
    } catch (err) {
      this.setData({
        articles: [],
        snapshot: null,
        statusText: err.message || '加载失败',
      });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.setData({ loadingMore: true });
    try {
      const corpusRes = await fetchCorpus({
        q: this.data.query,
        limit: PAGE_SIZE,
        offset: this.data.offset,
      });
      const more = (corpusRes.corpus || []).map((a) => ({
        ...a,
        _teaser: articleTeaser(a),
        _meta: formatMeta(a),
      }));
      const articles = this.data.articles.concat(more);
      const meta = corpusRes.meta || {};
      this.setData({
        articles,
        offset: articles.length,
        hasMore: !!meta.hasMore,
      });
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    const article = this.data.articles.find((a) => a.id === id);
    if (!article) return;
    wx.setStorageSync('jianwei:detail-article', article);
    wx.navigateTo({ url: `/pages/detail/detail?id=${encodeURIComponent(id)}` });
  },
});
