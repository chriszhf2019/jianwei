#!/usr/bin/env node
/**
 * Backfill real region/entity annotations through the running server.
 * Missing or failed items stay unset and will be retried on the next run.
 */
import 'dotenv/config';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';
const TOKEN = process.env.JIANWEI_AUTH_TOKEN || '';
const headers = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { 'x-jianwei-token': TOKEN, Authorization: `Bearer ${TOKEN}` } : {}),
};

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${path} HTTP ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

async function waitFor(kind) {
  let last = '';
  for (let i = 0; i < 900; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const status = await request(`/api/${kind}/status`);
    const task = status.task || {};
    const line = `${task.status || 'unknown'} ${task.processed || 0}/${task.total || 0} failed=${task.failed || 0}`;
    if (line !== last) {
      console.log(`[${kind}] ${line}`);
      last = line;
    }
    if (!task.running) {
      return task;
    }
  }
  throw new Error(`${kind} annotation timed out`);
}

async function run(kind) {
  console.log(`[${kind}] start`);
  const started = await request(`/api/${kind}/annotate`, { method: 'POST', body: '{}' });
  if (started.ok === false) throw new Error(`${kind} unavailable: ${started.reason || 'unknown'}`);
  if (started.done) {
    console.log(`[${kind}] already complete`);
    return;
  }
  const final = await waitFor(kind);
  console.log(`[${kind}] finished processed=${final.processed}/${final.total} failed=${final.failed}`);
  if (final.failed > 0) {
    console.log(`[${kind}] failed items remain unset and can be retried by running this script again.`);
  }
}

await run('regions');
await run('entities');
console.log('annotation backfill complete');
