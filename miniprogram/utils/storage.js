const BASE_URL_KEY = 'jianwei:api-base';
const TOKEN_KEY = 'jianwei:auth-token';
const USER_KEY = 'jianwei:user';

function getBaseUrl() {
  return (wx.getStorageSync(BASE_URL_KEY) || '').replace(/\/+$/, '');
}

function setBaseUrl(url) {
  const cleaned = String(url || '').trim().replace(/\/+$/, '');
  wx.setStorageSync(BASE_URL_KEY, cleaned);
  return cleaned;
}

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) wx.setStorageSync(TOKEN_KEY, token);
  else wx.removeStorageSync(TOKEN_KEY);
}

function getUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

function setUser(user) {
  if (user) wx.setStorageSync(USER_KEY, user);
  else wx.removeStorageSync(USER_KEY);
}

function clearSession() {
  setToken('');
  setUser(null);
}

module.exports = {
  getBaseUrl,
  setBaseUrl,
  getToken,
  setToken,
  getUser,
  setUser,
  clearSession,
};
