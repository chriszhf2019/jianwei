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

export interface FeedPingResult {
  url: string;
  status: 'healthy' | 'warning' | 'error';
  httpStatus?: number;
  responseTimeMs: number;
  itemCount: number;
  sampleTitle?: string;
  error?: string;
  errorType?: 'http_404' | 'http_error' | 'timeout' | 'parse_error' | 'empty' | 'network_error' | 'blocked';
  checkedAt: string;
}

export async function pingFeed(url: string, timeoutMs = 12000): Promise<FeedPingResult> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const cleanUrl = String(url || '').trim();

  if (!cleanUrl) {
    return {
      url: cleanUrl,
      status: 'error',
      responseTimeMs: 0,
      itemCount: 0,
      error: '信源地址不能为空',
      errorType: 'network_error',
      checkedAt,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = await validateFeedUrl(cleanUrl);
    let res: Response | null = null;
    let finalStatus = 200;

    for (let redirect = 0; redirect <= FEED_MAX_REDIRECTS; redirect += 1) {
      res = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'JianweiGenway/0.1 (+rss-health-ping)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.5',
          'Accept-Encoding': 'identity',
        },
      });
      finalStatus = res.status;
      const location = res.headers.get('location');
      if (![301, 302, 303, 307, 308].includes(res.status) || !location) break;
      if (redirect === FEED_MAX_REDIRECTS) {
        return {
          url: cleanUrl,
          status: 'error',
          httpStatus: finalStatus,
          responseTimeMs: Date.now() - startedAt,
          itemCount: 0,
          error: '重定向次数过多 (Too many redirects)',
          errorType: 'network_error',
          checkedAt,
        };
      }
      current = await validateFeedUrl(new URL(location, current).toString());
    }

    if (!res) {
      return {
        url: cleanUrl,
        status: 'error',
        responseTimeMs: Date.now() - startedAt,
        itemCount: 0,
        error: '无响应内容 (Empty response)',
        errorType: 'network_error',
        checkedAt,
      };
    }

    if (res.status === 404) {
      return {
        url: cleanUrl,
        status: 'error',
        httpStatus: 404,
        responseTimeMs: Date.now() - startedAt,
        itemCount: 0,
        error: 'HTTP 404: 页面不存在或 RSS 订阅链接已失效',
        errorType: 'http_404',
        checkedAt,
      };
    }

    if (!res.ok) {
      return {
        url: cleanUrl,
        status: 'error',
        httpStatus: res.status,
        responseTimeMs: Date.now() - startedAt,
        itemCount: 0,
        error: `HTTP ${res.status}: 服务端响应异常`,
        errorType: 'http_error',
        checkedAt,
      };
    }

    const xml = await readLimitedBody(res);
    const items = parseFeed(xml);

    const duration = Date.now() - startedAt;

    if (items.length === 0) {
      return {
        url: cleanUrl,
        status: 'error',
        httpStatus: res.status,
        responseTimeMs: duration,
        itemCount: 0,
        error: '解析失败: XML 未包含任何有效的 RSS <item> 或 Atom <entry> 资讯条目',
        errorType: 'empty',
        checkedAt,
      };
    }

    return {
      url: cleanUrl,
      status: duration > 5000 ? 'warning' : 'healthy',
      httpStatus: res.status,
      responseTimeMs: duration,
      itemCount: items.length,
      sampleTitle: items[0]?.title || '',
      checkedAt,
    };
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    const msg = String(err?.message || err);

    if (err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('feed_timeout')) {
      return {
        url: cleanUrl,
        status: 'error',
        responseTimeMs: duration,
        itemCount: 0,
        error: `连接超时 (${Math.round(timeoutMs / 1000)}s 内未响应)`,
        errorType: 'timeout',
        checkedAt,
      };
    }

    if (
      msg.includes('blocked_private_feed_url') ||
      msg.includes('unsupported_feed_port') ||
      msg.includes('unsupported_feed_protocol') ||
      msg.includes('feed_url_credentials_not_allowed')
    ) {
      return {
        url: cleanUrl,
        status: 'error',
        responseTimeMs: duration,
        itemCount: 0,
        error: '安全拦截: 禁止请求私有内网、保留 IP 地址或非标准端口协议',
        errorType: 'blocked',
        checkedAt,
      };
    }

    return {
      url: cleanUrl,
      status: 'error',
      responseTimeMs: duration,
      itemCount: 0,
      error: `请求或解析失败: ${msg}`,
      errorType: 'network_error',
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function pingAllFeeds(urls: string[], timeoutMs = 12000): Promise<FeedPingResult[]> {
  return mapWithConcurrency(urls, FEED_CONCURRENCY, (u) => pingFeed(u, timeoutMs));
}

export interface FeedContractIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion: string;
}

export interface FeedContractDiagnostic {
  url: string;
  testedAt: string;
  httpStatus?: number;
  httpStatusText?: string;
  contentType?: string;
  contentEncoding?: string;
  contentLengthBytes: number;
  responseTimeMs: number;
  detectedFormat: 'rss2' | 'atom' | 'rdf_rss1' | 'jsonfeed' | 'html_webpage' | 'raw_text' | 'unknown';
  xmlValid: boolean;
  xmlDeclaration?: string;
  encodingDeclared?: string;
  hasCdata: boolean;
  totalItemsFound: number;
  validItemsParsed: number;
  itemsWithTitleCount: number;
  itemsWithLinkCount: number;
  itemsWithDateCount: number;
  sampleItems: Array<{
    title: string;
    link: string;
    pubDate?: string;
    hasDescription: boolean;
  }>;
  overallHealth: 'pass' | 'warning' | 'fail';
  issues: FeedContractIssue[];
  rawSnippetPreview: string;
}

/** RSS/Atom 信源契约探针：深度解析响应结构并提供精准修复建议 */
export async function diagnoseFeedContract(url: string, timeoutMs = 15000): Promise<FeedContractDiagnostic> {
  const startedAt = Date.now();
  const testedAt = new Date().toISOString();
  const cleanUrl = String(url || '').trim();

  const emptyDiagnostic: FeedContractDiagnostic = {
    url: cleanUrl,
    testedAt,
    contentLengthBytes: 0,
    responseTimeMs: 0,
    detectedFormat: 'unknown',
    xmlValid: false,
    hasCdata: false,
    totalItemsFound: 0,
    validItemsParsed: 0,
    itemsWithTitleCount: 0,
    itemsWithLinkCount: 0,
    itemsWithDateCount: 0,
    sampleItems: [],
    overallHealth: 'fail',
    issues: [],
    rawSnippetPreview: '',
  };

  if (!cleanUrl) {
    emptyDiagnostic.issues.push({
      severity: 'error',
      code: 'empty_url',
      message: '信源订阅地址为空',
      suggestion: '请输入以 http:// 或 https:// 开头的合法 RSS/Atom 订阅地址。',
    });
    return emptyDiagnostic;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl: URL;
    try {
      currentUrl = await validateFeedUrl(cleanUrl);
    } catch (valErr: any) {
      const msg = String(valErr?.message || valErr);
      const issues: FeedContractIssue[] = [];

      if (msg.includes('blocked_private_feed_url')) {
        issues.push({
          severity: 'error',
          code: 'security_blocked',
          message: '安全拦截：禁止请求本地/私有内网或保留 IP 地址',
          suggestion: '出于 SSRF 安全防御考虑，请配置公网可访问的 RSS 链接。如需测试本地服务，可在服务端环境变量中启用 JIANWEI_ALLOW_PRIVATE_FEEDS=1。',
        });
      } else if (msg.includes('unsupported_feed_protocol')) {
        issues.push({
          severity: 'error',
          code: 'invalid_protocol',
          message: '不支持的 URL 协议',
          suggestion: '仅支持 HTTP 与 HTTPS 协议的订阅源，请勿使用 ftp:// 或 file:// 等非 Web 协议。',
        });
      } else if (msg.includes('unsupported_feed_port')) {
        issues.push({
          severity: 'error',
          code: 'invalid_port',
          message: '非标准 Web 端口被拦截',
          suggestion: '标准 RSS 仅允许 80 (HTTP) 与 443 (HTTPS) 端口，请确认服务端口配置。',
        });
      } else {
        issues.push({
          severity: 'error',
          code: 'invalid_url',
          message: `URL 格式无效: ${msg}`,
          suggestion: '请检查输入的 URL 字符串拼写，确保包含合法的域名与路径。',
        });
      }

      return {
        ...emptyDiagnostic,
        responseTimeMs: Date.now() - startedAt,
        issues,
      };
    }

    let res: Response | null = null;
    let finalStatus = 200;
    let statusText = 'OK';
    let contentType = '';
    let redirectsCount = 0;

    for (let redirect = 0; redirect <= FEED_MAX_REDIRECTS; redirect += 1) {
      res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'JianweiGenway/0.1 (+rss-contract-diagnostic; Mozilla/5.0 Compatible)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.5',
          'Accept-Encoding': 'identity',
        },
      });

      finalStatus = res.status;
      statusText = res.statusText || String(res.status);
      contentType = String(res.headers.get('content-type') || '');
      const location = res.headers.get('location');

      if (![301, 302, 303, 307, 308].includes(res.status) || !location) break;

      redirectsCount += 1;
      if (redirect === FEED_MAX_REDIRECTS) {
        return {
          ...emptyDiagnostic,
          httpStatus: finalStatus,
          httpStatusText: 'Too Many Redirects',
          responseTimeMs: Date.now() - startedAt,
          overallHealth: 'fail',
          issues: [
            {
              severity: 'error',
              code: 'redirect_loop',
              message: `重定向次数过多 (超过 ${FEED_MAX_REDIRECTS} 次跳转)`,
              suggestion: '源站重定向过多或存在死循环，建议将订阅地址直接修改为最终跳转的目标地址。',
            },
          ],
        };
      }
      currentUrl = await validateFeedUrl(new URL(location, currentUrl).toString());
    }

    const duration = Date.now() - startedAt;
    const issues: FeedContractIssue[] = [];

    if (redirectsCount > 0) {
      issues.push({
        severity: 'info',
        code: 'redirected',
        message: `链接经历了 ${redirectsCount} 次重定向`,
        suggestion: `源站发生了重定向，建议直接使用最终地址: ${currentUrl.toString()}`,
      });
    }

    if (!res) {
      issues.push({
        severity: 'error',
        code: 'empty_response',
        message: '服务器未返回任何 HTTP 响应',
        suggestion: '请确认远程源站服务正常运行，且未发生网络握手瞬断。',
      });
      return { ...emptyDiagnostic, responseTimeMs: duration, overallHealth: 'fail', issues };
    }

    const rawBody = await readLimitedBody(res).catch((err) => `[Read Error: ${err.message}]`);
    const contentLengthBytes = Buffer.byteLength(rawBody, 'utf8');
    const rawSnippetPreview = rawBody.slice(0, 1000);

    // Analyze HTTP Status
    if (finalStatus === 404) {
      issues.push({
        severity: 'error',
        code: 'http_404',
        message: 'HTTP 404: 页面不存在或 RSS 路径已下线',
        suggestion: '该订阅接口已被源站移除。建议访问该媒体主页寻找最新 RSS 链接，或直接一键清理该源。',
      });
    } else if (finalStatus === 403) {
      issues.push({
        severity: 'error',
        code: 'http_403',
        message: 'HTTP 403: 拒绝访问 (触发源站 WAF 或反爬限制)',
        suggestion: '源站开启了 Cloudflare/反爬防护。建议通过 RSSHub 等中间件订阅，或联系源站管理员放行。',
      });
    } else if (finalStatus >= 500) {
      issues.push({
        severity: 'error',
        code: 'http_server_error',
        message: `HTTP ${finalStatus}: 源站服务端异常 (${statusText})`,
        suggestion: '源站服务器发生内部错误，建议稍后重试或联系源站维护人员。',
      });
    }

    // Format Detection
    let detectedFormat: FeedContractDiagnostic['detectedFormat'] = 'unknown';
    const trimmed = rawBody.trim();
    const lowerBody = rawBody.toLowerCase();

    if (lowerBody.includes('<rss') || (lowerBody.includes('<channel>') && lowerBody.includes('<item>'))) {
      detectedFormat = 'rss2';
    } else if (lowerBody.includes('<feed') && (lowerBody.includes('<entry>') || lowerBody.includes('xmlns="http://www.w3.org/2005/atom"'))) {
      detectedFormat = 'atom';
    } else if (lowerBody.includes('<rdf:rdf') || lowerBody.includes('xmlns:rdf=')) {
      detectedFormat = 'rdf_rss1';
    } else if (trimmed.startsWith('{') && (lowerBody.includes('jsonfeed.org') || lowerBody.includes('"items"'))) {
      detectedFormat = 'jsonfeed';
    } else if (lowerBody.includes('<!doctype html') || lowerBody.includes('<html') || lowerBody.includes('<body')) {
      detectedFormat = 'html_webpage';
    } else if (trimmed.length > 0) {
      detectedFormat = 'raw_text';
    }

    // Issues based on detected format
    if (detectedFormat === 'html_webpage') {
      issues.push({
        severity: 'error',
        code: 'format_html',
        message: '返回内容为普通网页 HTML，非 RSS/Atom XML 格式',
        suggestion: '当前填入的可能是普通文章或网站首页地址。请在该网页的源代码中查找 <link rel="alternate" type="application/rss+xml"> 寻找正确的 RSS 订阅 URL (通常以 /feed, /rss.xml, /atom.xml 结尾)。',
      });
    } else if (detectedFormat === 'jsonfeed') {
      issues.push({
        severity: 'error',
        code: 'format_jsonfeed',
        message: '检测到 JSONFeed 协议格式，当前解析器需标准 XML (RSS/Atom)',
        suggestion: '源站返回了 JSON 格式的 Feed。建议使用源站提供的 XML/Atom 替代端点，或使用 RSS 转换中间件。',
      });
    }

    // XML Declaration & Encoding
    const declMatch = rawBody.match(/<\?xml\s+([^>]+)\?>/i);
    const xmlDeclaration = declMatch ? declMatch[0] : undefined;
    const encMatch = xmlDeclaration ? xmlDeclaration.match(/encoding=["']([^"']+)["']/i) : null;
    const encodingDeclared = encMatch ? encMatch[1].toUpperCase() : undefined;
    const hasCdata = rawBody.includes('<![CDATA[');

    if (encodingDeclared && !['UTF-8', 'UTF8', 'US-ASCII', 'ASCII'].includes(encodingDeclared)) {
      issues.push({
        severity: 'warning',
        code: 'non_utf8_encoding',
        message: `XML 头部声明了非 UTF-8 编码 (${encodingDeclared})`,
        suggestion: `若文章出现乱码，建议建议源站修改 RSS 输出模板为 UTF-8 编码并设置 <?xml version="1.0" encoding="UTF-8"?>。`,
      });
    }

    // Parse items
    const parsedItems = parseFeed(rawBody);
    const validItemsParsed = parsedItems.length;

    // Detailed Item Inspection
    let totalItemsFound = 0;
    let itemsWithTitleCount = 0;
    let itemsWithLinkCount = 0;
    let itemsWithDateCount = 0;
    const sampleItems: FeedContractDiagnostic['sampleItems'] = [];

    if (detectedFormat === 'rss2' || detectedFormat === 'rdf_rss1') {
      const itemMatches = rawBody.match(/<item[\s\S]*?<\/item>/gi) || [];
      totalItemsFound = itemMatches.length;
    } else if (detectedFormat === 'atom') {
      const entryMatches = rawBody.match(/<entry[\s\S]*?<\/entry>/gi) || [];
      totalItemsFound = entryMatches.length;
    } else {
      totalItemsFound = validItemsParsed;
    }

    for (const item of parsedItems) {
      if (item.title) itemsWithTitleCount += 1;
      if (item.link) itemsWithLinkCount += 1;
      if (item.pubDate) itemsWithDateCount += 1;
    }

    for (let i = 0; i < Math.min(3, parsedItems.length); i += 1) {
      const it = parsedItems[i];
      sampleItems.push({
        title: it.title,
        link: it.link,
        pubDate: it.pubDate,
        hasDescription: Boolean(it.description && it.description.length > 0),
      });
    }

    if (validItemsParsed === 0 && (detectedFormat === 'rss2' || detectedFormat === 'atom' || detectedFormat === 'rdf_rss1')) {
      issues.push({
        severity: 'error',
        code: 'no_valid_items',
        message: 'XML 结构中未发现任何包含有效 <title> 与 <link> 的文章条目',
        suggestion: '请检查 XML 结构中是否每个 <item>/<entry> 都包含了标准的 <title> 与 <link> 标签。',
      });
    } else if (validItemsParsed > 0) {
      if (itemsWithDateCount === 0) {
        issues.push({
          severity: 'warning',
          code: 'missing_pubdate',
          message: '所有条目均缺少 <pubDate> 或 <updated> 发布时间',
          suggestion: '虽然条目可正常提取，但缺少发布时间将无法进行精准的「当日情报」时间线切片与陈旧过滤。建议源站补充 RFC 822 或 ISO 8601 时间戳。',
        });
      }

      if (issues.filter((i) => i.severity === 'error').length === 0) {
        issues.push({
          severity: 'info',
          code: 'contract_passed',
          message: `契约校验通过: 成功解析 ${validItemsParsed} 篇有效条目，符合 ${detectedFormat.toUpperCase()} 规范`,
          suggestion: '该信源具备出色的结构完备性，可稳定接入实时增量摄取管道。',
        });
      }
    }

    const hasError = issues.some((i) => i.severity === 'error') || finalStatus !== 200;
    const hasWarn = issues.some((i) => i.severity === 'warning');
    const overallHealth: FeedContractDiagnostic['overallHealth'] = hasError ? 'fail' : hasWarn ? 'warning' : 'pass';

    return {
      url: cleanUrl,
      testedAt,
      httpStatus: finalStatus,
      httpStatusText: statusText,
      contentType,
      contentLengthBytes,
      responseTimeMs: duration,
      detectedFormat,
      xmlValid: ['rss2', 'atom', 'rdf_rss1'].includes(detectedFormat) && validItemsParsed > 0,
      xmlDeclaration,
      encodingDeclared,
      hasCdata,
      totalItemsFound,
      validItemsParsed,
      itemsWithTitleCount,
      itemsWithLinkCount,
      itemsWithDateCount,
      sampleItems,
      overallHealth,
      issues,
      rawSnippetPreview,
    };
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    const msg = String(err?.message || err);
    const issues: FeedContractIssue[] = [];

    if (err?.name === 'AbortError' || msg.includes('timeout')) {
      issues.push({
        severity: 'error',
        code: 'timeout',
        message: `网络连接或响应超时 (${Math.round(timeoutMs / 1000)}s)`,
        suggestion: '源站响应过慢或连接受阻。请检查源站公网连通性，或延长超时阈值。',
      });
    } else {
      issues.push({
        severity: 'error',
        code: 'network_failure',
        message: `请求发起或解析失败: ${msg}`,
        suggestion: '请核验源站 DNS 解析与 SSL 证书是否有效，确保服务器可正常与目标源建立握手。',
      });
    }

    return {
      ...emptyDiagnostic,
      responseTimeMs: duration,
      overallHealth: 'fail',
      issues,
    };
  } finally {
    clearTimeout(timer);
  }
}


