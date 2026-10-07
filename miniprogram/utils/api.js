const { getBaseUrl, getToken, clearSession } = require('./storage');

/**
 * 统一请求。小程序必须走 HTTPS 合法域名（开发时可在开发者工具关闭域名校验）。
 * 认证只走 header，不依赖浏览器 Cookie（游客 jw_guest_id 在小程序侧不可靠）。
 */
function request({ path, method = 'GET', data, auth = true, timeout = 45000 }) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return Promise.reject(new Error('请先在「我的」配置 API 基址（HTTPS）'));
  }

  const header = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    const token = getToken();
    if (token) {
      header.Authorization = `Bearer ${token}`;
      header['x-jianwei-token'] = token;
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${path}`,
      method,
      data,
      header,
      timeout,
      success(res) {
        const status = res.statusCode || 0;
        const body = res.data;
        if (status === 401) {
          clearSession();
          reject(Object.assign(new Error('登录已失效，请重新登录'), { status, body }));
          return;
        }
        if (status < 200 || status >= 300) {
          const msg =
            (body && (body.error || body.message || body.reason)) ||
            `请求失败 (${status})`;
          reject(Object.assign(new Error(String(msg)), { status, body }));
          return;
        }
        resolve(body);
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络请求失败'));
      },
    });
  });
}

function fetchHealth() {
  return request({ path: '/api/health', method: 'GET', auth: true });
}

function fetchSnapshot() {
  return request({ path: '/api/snapshot', method: 'GET' });
}

function fetchCorpus({ q = '', region = '', limit = 20, offset = 0 } = {}) {
  const query = [];
  if (q) query.push(`q=${encodeURIComponent(q)}`);
  if (region) query.push(`region=${encodeURIComponent(region)}`);
  query.push(`limit=${limit}`);
  query.push(`offset=${offset}`);
  return request({ path: `/api/corpus?${query.join('&')}`, method: 'GET' });
}

function login({ username, password, accessToken }) {
  const data = accessToken
    ? { accessToken }
    : { username, password };
  return request({ path: '/api/auth/login', method: 'POST', data, auth: false });
}

function analyzeNews(payload) {
  return request({ path: '/api/analyze', method: 'POST', data: payload, timeout: 90000 });
}

function askNuance({ question, articleContext }) {
  return request({
    path: '/api/ask-nuance',
    method: 'POST',
    data: { question, articleContext },
    timeout: 60000,
  });
}

function enrichArticle(article) {
  return request({
    path: '/api/enrich',
    method: 'POST',
    data: {
      articleId: article.id,
      title: article.title,
      content: article.summary || article.content || '',
      source: article.sourceName,
      sourceUrl: article.sourceUrl,
      publishedAt: article.date || article.sourceDate,
      category: article.category,
    },
    timeout: 90000,
  });
}

module.exports = {
  request,
  fetchHealth,
  fetchSnapshot,
  fetchCorpus,
  login,
  analyzeNews,
  askNuance,
  enrichArticle,
};
