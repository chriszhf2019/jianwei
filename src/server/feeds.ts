// 真实信源接入骨架：RSS/Atom 抓取与解析（无第三方依赖；用 Node 原生 fetch + 轻量正则解析）
// 目标：把外部 RSS 条目映射成与内置 NewsArticle 同构的“浅层”对象，
// 深层认知字段由懒加载 /api/analyze 按需生成（见 DATA_PIPELINE_DESIGN.md §4）。

import dns from "node:dns/promises";
import net from "node:net";
import { isPublicAddress } from "./sourceVerification";

const FEED_TIMEOUT_MS = Number(process.env.FEED_FETCH_TIMEOUT_MS || 20_000);
const FEED_MAX_BYTES = Number(process.env.FEED_FETCH_MAX_BYTES || 2_000_000);
const FEED_MAX_REDIRECTS = 3;
const FEED_CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.FEED_FETCH_CONCURRENCY || 4)));
const FEED_MAX_ATTEMPTS = Math.max(1, Math.min(3, Number(process.env.FEED_FETCH_ATTEMPTS || 2)));
const inFlightFeeds = new Map<string, Promise<RawFeedItem[]>>();
const ALLOW_PRIVATE_FEEDS = process.env.JIANWEI_ALLOW_PRIVATE_FEEDS === "1";

export interface RawFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

/** 标题去重键：忽略大小写、标点、空白，避免同稿换标点后重复入库。 */
export function normalizedTitleKey(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/** URL 去重键：去掉常见追踪参数、锚点与末尾斜杠。 */
export function canonicalFeedUrl(link: string): string {
  try {
    const url = new URL(link);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|spm|from|source|ref|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().toLowerCase();
  } catch {
    return String(link || "").trim().toLowerCase();
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extract(tag: string, chunk: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = chunk.match(re);
  return m ? decodeEntities(m[1]).trim() : "";
}

function extractFirst(chunk: string, tags: string[]): string {
  for (const tag of tags) {
    const found = extract(tag, chunk);
    if (found) return found;
  }
  return "";
}

function extractLink(chunk: string): string {
  const href = chunk.match(/<link[^>]*href="([^"]+)"[^>]*>/i);
  if (href) return href[1];
  const plain = extract("link", chunk);
  if (plain) return plain;
  return "";
}

/** 轻量 RSS 2.0 解析：提取 <item> 列表中的标题/链接/时间/摘要 */
export function parseRSS(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const chunk = m[1];
    const title = stripTags(extract("title", chunk));
    const link = extract("link", chunk);
    const pubDate = extract("pubDate", chunk);
    const description = stripTags(extract("description", chunk));
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description: description.slice(0, 500) });
  }
  return items;
}

/** 轻量 Atom 解析：兼容 <entry>、<updated>/<published>、href 链接和 <content> 摘要。 */
export function parseAtom(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const chunk = m[1];
    const title = stripTags(extract("title", chunk));
    const link = extractLink(chunk);
    const pubDate = extractFirst(chunk, ["updated", "published"]);
    const description = stripTags(extractFirst(chunk, ["summary", "content"]));
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description: description.slice(0, 500) });
  }
  return items;
}

export function parseFeed(xml: string): RawFeedItem[] {
  const rss = parseRSS(xml);
  if (rss.length > 0) return rss;
  return parseAtom(xml);
}

async function validateFeedUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("invalid_feed_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported_feed_protocol");
  if (url.username || url.password) throw new Error("feed_url_credentials_not_allowed");
  if (ALLOW_PRIVATE_FEEDS) return url;
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("unsupported_feed_port");
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
    throw new Error("blocked_private_feed_url");
  }
  if (net.isIP(url.hostname)) {
    if (!isPublicAddress(url.hostname)) throw new Error("blocked_private_feed_url");
    return url;
  }
  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!records.some((record) => isPublicAddress(record.address))) {
    throw new Error("blocked_private_feed_url");
  }
  return url;
}

async function readLimitedBody(response: Response): Promise<string> {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > FEED_MAX_BYTES) throw new Error(`feed_too_large:${buffer.byteLength}`);
    return buffer.toString("utf8");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.byteLength;
    if (size > FEED_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`feed_too_large:${size}`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

async function fetchRssFeedOnce(url: string, timeoutMs = FEED_TIMEOUT_MS): Promise<RawFeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = await validateFeedUrl(url);
    let res: Response | null = null;
    for (let redirect = 0; redirect <= FEED_MAX_REDIRECTS; redirect += 1) {
      res = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "JianweiGenway/0.1 (+rss-ingester)",
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.5",
          "Accept-Encoding": "identity",
        },
      });
      const location = res.headers.get("location");
      if (![301, 302, 303, 307, 308].includes(res.status) || !location) break;
      if (redirect === FEED_MAX_REDIRECTS) throw new Error("too_many_feed_redirects");
      current = await validateFeedUrl(new URL(location, current).toString());
    }
    if (!res) throw new Error("empty_feed_response");
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (contentType && !/(xml|rss|atom|text\/plain)/.test(contentType)) {
      throw new Error(`unsupported_feed_content_type:${contentType}`);
    }
    const xml = await readLimitedBody(res);
    const items = parseFeed(xml);
    if (items.length === 0) throw new Error(`no parseable RSS/Atom entry in ${url}`);
    return items;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error(`feed_timeout:${url}`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** 同一 Feed URL 的并发抓取合并，避免调度器和手动摄取重复请求。 */
export async function fetchRssFeed(url: string, timeoutMs = FEED_TIMEOUT_MS): Promise<RawFeedItem[]> {
  const key = String(url || "").trim();
  const existing = inFlightFeeds.get(key);
  if (existing) return existing;
  const pending = fetchRssFeedOnce(key, timeoutMs).finally(() => {
    inFlightFeeds.delete(key);
  });
  inFlightFeeds.set(key, pending);
  return pending;
}

async function fetchRssFeedWithRetry(
  url: string
): Promise<{ url: string; batch?: RawFeedItem[]; error?: string; attempts: number; durationMs: number }> {
  const startedAt = Date.now();
  let lastError = "";
  for (let attempt = 1; attempt <= FEED_MAX_ATTEMPTS; attempt += 1) {
    try {
      return {
        url,
        batch: await fetchRssFeed(url),
        attempts: attempt,
        durationMs: Date.now() - startedAt,
      };
    } catch (error: any) {
      lastError = String(error?.message || error);
      if (attempt < FEED_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** (attempt - 1))));
      }
    }
  }
  return { url, error: lastError, attempts: FEED_MAX_ATTEMPTS, durationMs: Date.now() - startedAt };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  const run = async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= values.length) return;
      results[index] = await worker(values[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => run()));
  return results;
}

export interface IngestResult {
  at: string;
  urls: string[];
  added: number;
  skipped: number;
  errors: string[];
  sourceResults: Array<{
    url: string;
    ok: boolean;
    attempts: number;
    itemCount: number;
    durationMs: number;
    error?: string;
  }>;
}

/** 抓取并合并多个源：内部按标题去重，返回增量统计 */
export async function ingestAllFeeds(
  urls: string[]
): Promise<{ items: RawFeedItem[]; result: IngestResult }> {
  const items: RawFeedItem[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  const settled = await mapWithConcurrency(urls, FEED_CONCURRENCY, fetchRssFeedWithRetry);
  const sourceResults = settled.map((item) => ({
    url: item.url,
    ok: !item.error,
    attempts: item.attempts,
    itemCount: item.batch?.length || 0,
    durationMs: item.durationMs,
    ...(item.error ? { error: item.error } : {}),
  }));

  for (const item of settled) {
    if (item.error || !item.batch) {
      errors.push(`${item.url}: ${item.error}`);
      continue;
    }
    try {
      const batch = item.batch;
      for (const raw of batch) {
        const urlKey = canonicalFeedUrl(raw.link);
        if (!urlKey || seen.has(urlKey)) {
          skipped += 1;
          continue;
        }
        seen.add(urlKey);
        items.push(raw);
      }
    } catch (e: any) {
      errors.push(`${item.url}: ${e?.message || e}`);
    }
  }

  const result: IngestResult = {
    at: new Date().toISOString(),
    urls,
    added: items.length,
    skipped,
    errors,
    sourceResults,
  };
  return { items, result };
}
