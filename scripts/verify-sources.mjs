#!/usr/bin/env node
/**
 * Verify every unique source URL in the running corpus.
 * Results are persisted by /api/source/inspect into SQLite.
 */
import 'dotenv/config';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';
const TOKEN = process.env.JIANWEI_AUTH_TOKEN || '';
const CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.VERIFY_CONCURRENCY || 4)));
const headers = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { 'x-jianwei-token': TOKEN, Authorization: `Bearer ${TOKEN}` } : {}),
};

async function readJson(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function inspect(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE}/api/source/inspect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, quote: '' }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const waitMs = 10_000 * (attempt + 1);
      console.log(`[rate-limit] waiting ${Math.round(waitMs / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    if (!response.ok && response.status !== 403) {
      return { status: 'http_error', httpStatus: response.status, reason: data.error || 'request failed' };
    }
    return data;
  }
  return { status: 'network_error', reason: 'rate limit retries exhausted' };
}

const corpus = await readJson('/api/corpus?limit=500');
const urls = [...new Set((corpus.corpus || []).map((article) => article.sourceUrl).filter(Boolean))];
console.log(`source verification start: ${urls.length} unique URLs, concurrency=${CONCURRENCY}`);

const counts = {};
let cursor = 0;
let completed = 0;

async function worker() {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= urls.length) return;
    const result = await inspect(urls[index]);
    const status = result?.status || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    completed += 1;
    if (completed % 25 === 0 || completed === urls.length) {
      console.log(`[progress] ${completed}/${urls.length} ${JSON.stringify(counts)}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
console.log(`source verification complete: ${JSON.stringify(counts)}`);
