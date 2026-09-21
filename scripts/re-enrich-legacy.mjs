#!/usr/bin/env node
/**
 * Re-generate legacy deep-analysis fields through the running server.
 * Only the legacy-unknown articles are selected. Model misses stay missing.
 */
import 'dotenv/config';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';
const TOKEN = process.env.JIANWEI_AUTH_TOKEN || '';
const headers = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { 'x-jianwei-token': TOKEN, Authorization: `Bearer ${TOKEN}` } : {}),
};

const corpus = await fetch(`${BASE}/api/corpus?limit=500`, { headers }).then((r) => r.json());
const targets = (corpus.corpus || []).filter((article) =>
  Object.values(article.aiFieldMeta || {}).some((meta) => meta?.method === 'legacy_unknown')
);

if (targets.length === 0) {
  console.log('no legacy-unknown articles found');
  process.exit(0);
}

console.log(`re-enrich start: ${targets.length} legacy articles`);
for (const article of targets) {
  console.log(`[enrich] ${article.id} ${article.title}`);
  const response = await fetch(`${BASE}/api/enrich`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      articleId: article.id,
      title: article.title,
      content: article.summary || article.subtitle || article.title,
      source: article.sourceName || '',
      sourceUrl: article.sourceUrl || '',
      publishedAt: article.publishedAt || '',
      category: article.category || '外部信源',
      force: true,
    }),
  });
  const data = await response.json().catch(() => ({}));
  console.log(`[enrich] ${article.id} ${response.status} ${data.enriched ? 'ok' : data.reason || 'failed'}`);
}
console.log('re-enrich complete');
