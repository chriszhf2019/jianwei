#!/usr/bin/env node
/**
 * Re-extract evidence quotes from the original source page and verify them exactly.
 */
import 'dotenv/config';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';
const TOKEN = process.env.JIANWEI_AUTH_TOKEN || '';
const headers = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { 'x-jianwei-token': TOKEN, Authorization: `Bearer ${TOKEN}` } : {}),
};

const corpus = await fetch(`${BASE}/api/corpus?limit=500`, { headers }).then((r) => r.json());
const targets = (corpus.corpus || []).filter(
  (article) => article.sourceUrl && Array.isArray(article.evidenceChain) && article.evidenceChain.length > 0
);
console.log(`evidence re-extraction start: ${targets.length} articles`);

for (const article of targets) {
  const response = await fetch(`${BASE}/api/source/reextract-evidence`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ articleId: article.id }),
  });
  const data = await response.json().catch(() => ({}));
  console.log(
    `[evidence] ${article.id} HTTP ${response.status} matched=${data.matched ?? '—'}${data.error ? ` error=${data.error}` : ''}`
  );
}

console.log('evidence re-extraction complete');
