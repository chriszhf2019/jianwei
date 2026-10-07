function pickText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.text === 'string') return value.text;
  return fallback;
}

function articleTeaser(article) {
  if (!article) return '';
  return (
    article.oneSentenceVerdict ||
    article.summary ||
    (article.tongsuSummary && article.tongsuSummary.simpleSay) ||
    article.subtitle ||
    ''
  );
}

function formatMeta(article) {
  if (!article) return '';
  const parts = [];
  if (article.sourceName) parts.push(article.sourceName);
  if (article.timeAgo) parts.push(article.timeAgo);
  else if (article.date) parts.push(article.date);
  if (article.category) parts.push(article.category);
  return parts.join(' · ');
}

module.exports = {
  pickText,
  articleTeaser,
  formatMeta,
};
