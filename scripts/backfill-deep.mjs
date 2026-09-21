#!/usr/bin/env node
/**
 * Incrementally enrich shallow corpus articles through /api/enrich.
 * Existing deep fields are skipped. Failed items remain shallow and can be resumed.
 */
import 'dotenv/config';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';
const TOKEN = process.env.JIANWEI_AUTH_TOKEN || '';
const CONCURRENCY = Math.max(1, Math.min(6, Number(process.env.DEEP_CONCURRENCY || 3)));
const LIMIT = Math.max(0, Number(process.env.DEEP_LIMIT || 0));
const headers = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { 'x-jianwei-token': TOKEN, Authorization: `Bearer ${TOKEN}` } : {}),
};

async function corpus() {
  const response = await fetch(`${BASE}/api/corpus?limit=500`, { headers });
  if (!response.ok) throw new Error(`corpus HTTP ${response.status}`);
  return response.json();
}

async function enrich(article) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${BASE}/api/enrich`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({
        articleId: article.id,
        title: article.title,
        content: article.summary || article.subtitle || article.title,
        source: article.sourceName || '',
        sourceUrl: article.sourceUrl || '',
        publishedAt: article.publishedAt || '',
        category: article.category || '外部信源',
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 10_000 * (attempt + 1)));
      continue;
    }
    return { status: response.status, data };
  }
  return { status: 429, data: { enriched: false, reason: 'rate_limit_retries_exhausted' } };
}

const payload = await corpus();
const targets = (payload.corpus || [])
  .filter((article) => !article.spectrumLayers?.length)
  .slice(0, LIMIT > 0 ? LIMIT : undefined);

console.log(`deep enrichment start: ${targets.length} shallow articles, concurrency=${CONCURRENCY}`);
let cursor = 0;
let ok = 0;
let failed = 0;
let cached = 0;

async function worker() {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= targets.length) return;
    const article = targets[index];
    try {
      const result = await enrich(article);
      if (result.data?.enriched) {
        if (result.data.cached) cached += 1;
        else ok += 1;
      } else {
        failed += 1;
      }
      const completed = ok + cached + failed;
      if (completed % 10 === 0 || completed === targets.length) {
        console.log(`[deep] ${completed}/${targets.length} ok=${ok} cached=${cached} failed=${failed}`);
      }
    } catch (error) {
      failed += 1;
      console.log(`[deep] ${article.id} failed: ${String(error?.message || error).slice(0, 160)}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
console.log(`deep enrichment complete: ok=${ok} cached=${cached} failed=${failed}`);
