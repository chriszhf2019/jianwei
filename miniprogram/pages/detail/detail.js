const { askNuance, enrichArticle } = require('../../utils/api');
const { formatMeta } = require('../../utils/format');

function buildSevenRows(seven) {
  if (!seven) return [];
  const map = [
    ['What', seven.what],
    ['Who', seven.who],
    ['When', seven.when],
    ['Where', seven.where],
    ['Why', seven.why],
    ['How', seven.how],
    ['So what', seven.soWhat],
  ];
  return map.filter(([, v]) => v).map(([k, v]) => ({ k, v }));
}

Page({
  data: {
    article: null,
    meta: '',
    seven: null,
    sevenRows: [],
    enriched: false,
    enriching: false,
    question: '',
    asking: false,
    answer: '',
  },

  onLoad(query) {
    const cached = wx.getStorageSync('jianwei:detail-article');
    if (!cached || (query.id && cached.id !== query.id)) {
      this.setData({ article: null });
      return;
    }
    this.applyArticle(cached, false);
  },

  applyArticle(article, enriched) {
    const seven = article.sevenElements || null;
    this.setData({
      article,
      meta: formatMeta(article),
      seven,
      sevenRows: buildSevenRows(seven),
      enriched: !!enriched || !!seven,
    });
  },

  openSource() {
    const url = this.data.article && this.data.article.sourceUrl;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '原文链接已复制', icon: 'none' });
      },
    });
  },

  onQuestionInput(e) {
    this.setData({ question: e.detail.value });
  },

  async onEnrich() {
    if (!this.data.article || this.data.enriching) return;
    this.setData({ enriching: true });
    try {
      const res = await enrichArticle(this.data.article);
      if (!res || res.enriched === false) {
        const reason = (res && res.reason) || 'unavailable';
        const tip =
          reason === 'no_api_key'
            ? '深读不可用：服务端未配置 AI Key'
            : `深读未完成（${reason}）`;
        wx.showToast({ title: tip, icon: 'none', duration: 3000 });
        return;
      }
      const overrides = res.overrides || {};
      const merged = { ...this.data.article, ...overrides };
      wx.setStorageSync('jianwei:detail-article', merged);
      this.applyArticle(merged, true);
      wx.showToast({ title: res.cached ? '命中缓存' : '已补全', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '深读失败', icon: 'none' });
    } finally {
      this.setData({ enriching: false });
    }
  },

  async onAsk() {
    const question = (this.data.question || '').trim();
    if (!question || !this.data.article) return;
    this.setData({ asking: true, answer: '' });
    try {
      const a = this.data.article;
      const articleContext = [
        a.title,
        a.summary,
        a.oneSentenceVerdict,
        a.coreQuote,
      ]
        .filter(Boolean)
        .join('\n');
      const res = await askNuance({ question, articleContext });
      if (res.fallback || !res.answer) {
        this.setData({
          answer: res.reason || res.message || '未生成回答（可能无 Key 或额度用尽）',
        });
        return;
      }
      this.setData({ answer: res.answer });
    } catch (err) {
      wx.showToast({ title: err.message || '提问失败', icon: 'none' });
    } finally {
      this.setData({ asking: false });
    }
  },
});
