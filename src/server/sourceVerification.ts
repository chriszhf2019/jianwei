import crypto from "node:crypto";
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { extractClaimReviews, type ClaimReviewRecord } from "../utils/claimReview";

const REQUEST_TIMEOUT_MS = Number(process.env.SOURCE_FETCH_TIMEOUT_MS || 12_000);
const MAX_REDIRECTS = 3;
const MAX_BYTES = Number(process.env.SOURCE_FETCH_MAX_BYTES || 1_500_000);

export type SourceInspectionStatus =
  | "verified_quote"
  | "quote_not_found"
  | "quote_too_short"
  | "reachable_unverified"
  | "blocked"
  | "timeout"
  | "too_large"
  | "unsupported"
  | "http_error"
  | "network_error";

export interface SourceInspectionResult {
  status: SourceInspectionStatus;
  requestedUrl: string;
  finalUrl?: string;
  httpStatus?: number;
  title?: string;
  canonicalUrl?: string;
  excerpt?: string;
  contentHash?: string;
  quoteFound?: boolean;
  matchedContext?: string;
  matchedOffset?: number;
  cached?: boolean;
  fetchedAt: string;
  reason?: string;
  /** 同一 URL 和引句的并发请求复用了正在执行的抓取。 */
  deduplicated?: boolean;
  /** 仅服务端内部使用；API 响应会剥离该字段。 */
  pageText?: string;
  /** 页面 JSON-LD 里的 ClaimReview。没有该标记时不写。 */
  claimReviews?: ClaimReviewRecord[];
}

const inFlightInspections = new Map<string, Promise<SourceInspectionResult>>();

export interface QuoteMatch {
  status: "verified_quote" | "quote_not_found" | "quote_too_short" | "reachable_unverified";
  quoteFound?: boolean;
}

function ipv4Parts(address: string): number[] | null {
  const parts = address.split(".").map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    ? parts
    : null;
}

function isBlockedIpv4(address: string): boolean {
  const p = ipv4Parts(address);
  if (!p) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 192 && b === 0 && p[2] === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && p[2] === 100) return true;
  if (a === 203 && b === 0 && p[2] === 113) return true;
  if (a >= 224) return true;
  return false;
}

export function isPublicAddress(address: string): boolean {
  const raw = String(address || "").trim().toLowerCase();
  const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const normalized = mapped ? mapped[1] : raw;
  const family = net.isIP(normalized);
  if (family === 4) return !isBlockedIpv4(normalized);
  if (family !== 6) return false;
  if (normalized === "::" || normalized === "::1") return false;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
  if (/^fe[89ab]/.test(normalized)) return false;
  if (normalized.startsWith("ff")) return false;
  if (normalized.startsWith("2001:db8:")) return false;
  if (normalized.startsWith("64:ff9b:")) return false;
  return true;
}

function decodeHtmlEntities(input: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (all, name) => named[String(name).toLowerCase()] ?? all);
}

export function normalizeComparable(input: string): string {
  return decodeHtmlEntities(String(input || ""))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function sourceCheckKey(rawUrl: string, quote = ""): string {
  return crypto
    .createHash("sha256")
    .update(`${String(rawUrl || "").trim()}\n${normalizeComparable(quote)}`)
    .digest("hex");
}

export async function inspectSourceDeduplicated(
  rawUrl: string,
  quote = ""
): Promise<SourceInspectionResult> {
  const key = sourceCheckKey(rawUrl, quote);
  const existing = inFlightInspections.get(key);
  if (existing) {
    return { ...(await existing), deduplicated: true };
  }
  const pending = inspectSource(rawUrl, quote).finally(() => {
    inFlightInspections.delete(key);
  });
  inFlightInspections.set(key, pending);
  return pending;
}

export function findQuoteContext(
  pageText: string,
  quote: string,
  radius = 120
): { normalizedQuote: string; offset: number; context: string } | null {
  const normalizedQuote = normalizeComparable(quote);
  if (!normalizedQuote) return null;
  const normalizedChars: string[] = [];
  const sourceOffsets: number[] = [];
  const text = String(pageText || "");
  for (let i = 0; i < text.length;) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) break;
    const char = String.fromCodePoint(codePoint);
    const normalized = normalizeComparable(char);
    if (normalized) {
      for (const item of normalized) {
        normalizedChars.push(item);
        sourceOffsets.push(i);
      }
    }
    i += char.length;
  }
  const normalizedPage = normalizedChars.join("");
  const normalizedIndex = normalizedPage.indexOf(normalizedQuote);
  if (normalizedIndex < 0 || sourceOffsets.length === 0) return null;
  const start = sourceOffsets[normalizedIndex] ?? 0;
  const endIndex = Math.min(sourceOffsets.length - 1, normalizedIndex + normalizedQuote.length - 1);
  const end = (sourceOffsets[endIndex] ?? start) + 1;
  return {
    normalizedQuote,
    offset: start,
    context: text.slice(Math.max(0, start - radius), Math.min(text.length, end + radius)).trim(),
  };
}

export function evaluateQuoteMatch(pageText: string, quote: string): QuoteMatch {
  const quoteNormalized = normalizeComparable(quote);
  if (!quoteNormalized) return { status: "reachable_unverified" };
  if (quoteNormalized.length < 12) return { status: "quote_too_short" };
  const quoteFound = normalizeComparable(pageText).includes(quoteNormalized);
  return {
    status: quoteFound ? "verified_quote" : "quote_not_found",
    quoteFound,
  };
}

/**
 * 仅用于已有缓存 + 同 URL 正文快照的确定性重算。
 * 旧版缓存缺少快照时返回 null，调用方应重新抓取，不能继续信任旧结论。
 */
export function revalidateCachedQuote(
  cached: any,
  pageText: string | null,
  quote: string
): any | null {
  if (!cached || !pageText || !normalizeComparable(quote)) return null;
  if (!["verified_quote", "quote_not_found", "quote_too_short"].includes(String(cached.status || ""))) {
    return null;
  }
  const match = evaluateQuoteMatch(pageText, quote);
  const context = match.quoteFound ? findQuoteContext(pageText, quote) : null;
  return {
    ...cached,
    status: match.status,
    quoteFound: match.quoteFound,
    matchedContext: context?.context,
    matchedOffset: context?.offset,
    cached: true,
  };
}

export function extractPageMetadata(html: string): {
  title: string;
  canonicalUrl: string;
  description: string;
  text: string;
} {
  const source = String(html || "");
  const titleMatch =
    source.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ||
    source.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    source.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  const descriptionMatch =
    source.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    source.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ||
    source.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const canonicalMatch =
    source.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
    source.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);

  const text = decodeHtmlEntities(
    source
      .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return {
    title: decodeHtmlEntities(titleMatch?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 300),
    canonicalUrl: decodeHtmlEntities(canonicalMatch?.[1] || "").trim().slice(0, 2000),
    description: decodeHtmlEntities(descriptionMatch?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 1000),
    text,
  };
}

async function resolvePublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  if (net.isIP(hostname)) {
    const family = net.isIP(hostname) as 4 | 6;
    if (!isPublicAddress(hostname)) throw new Error("blocked_private_network");
    return { address: hostname, family };
  }
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  const publicRecord = records.find((record) => isPublicAddress(record.address));
  if (!publicRecord) throw new Error("blocked_private_network");
  return { address: publicRecord.address, family: publicRecord.family as 4 | 6 };
}

function validateSourceUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported_protocol");
  if (url.username || url.password) throw new Error("url_credentials_not_allowed");
  if (
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    (net.isIP(url.hostname) && !isPublicAddress(url.hostname))
  ) {
    throw new Error("blocked_private_network");
  }
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("unsupported_port");
  return url;
}

export async function validatePublicOutboundBaseUrl(raw: string): Promise<URL> {
  const url = validateSourceUrl(raw);
  if (url.protocol !== "https:") throw new Error("https_required");
  if (url.port && url.port !== "443") throw new Error("unsupported_port");
  await resolvePublicAddress(url.hostname);
  return url;
}

async function requestOnce(url: URL): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}> {
  const resolved = await resolvePublicAddress(url.hostname);
  const transport = url.protocol === "https:" ? https : http;
  return await new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: url.protocol,
        host: resolved.address,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          Host: url.host,
          "User-Agent": "JianweiGenwaySourceVerifier/0.1",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
          "Accept-Encoding": "identity",
        },
        servername: url.hostname,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy(new Error("too_large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          resolve({
            status: Number(res.statusCode || 0),
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

export async function inspectSource(rawUrl: string, quote = ""): Promise<SourceInspectionResult> {
  const fetchedAt = new Date().toISOString();
  let current: URL;
  try {
    current = validateSourceUrl(rawUrl);
  } catch (error: any) {
    return {
      status: error?.message === "blocked_private_network" ? "blocked" : "unsupported",
      requestedUrl: rawUrl,
      fetchedAt,
      reason: String(error?.message || error),
    };
  }

  try {
    let response: Awaited<ReturnType<typeof requestOnce>> | null = null;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      response = await requestOnce(current);
      const location = response.headers.location;
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) break;
      if (redirect === MAX_REDIRECTS) {
        return { status: "network_error", requestedUrl: rawUrl, httpStatus: response.status, fetchedAt, reason: "too_many_redirects" };
      }
      current = validateSourceUrl(new URL(String(location), current).toString());
    }

    if (!response) throw new Error("empty_response");
    const contentType = String(response.headers["content-type"] || "").toLowerCase();
    if (!/text\/html|application\/xhtml\+xml|text\/plain/.test(contentType)) {
      return {
        status: "unsupported",
        requestedUrl: rawUrl,
        finalUrl: current.toString(),
        httpStatus: response.status,
        fetchedAt,
        reason: `unsupported_content_type:${contentType || "unknown"}`,
      };
    }
    const metadata = extractPageMetadata(response.body);
    const claimReviews = extractClaimReviews(response.body);
    const contentHash = crypto.createHash("sha256").update(response.body).digest("hex");
    const quoteMatch = evaluateQuoteMatch(metadata.text, quote);
    const status: SourceInspectionStatus = quoteMatch.status;
    const quoteFound = quoteMatch.quoteFound;
    const quoteContext = quoteFound ? findQuoteContext(metadata.text, quote) : null;

    return {
      status: response.status >= 400 ? "http_error" : status,
      requestedUrl: rawUrl,
      finalUrl: current.toString(),
      httpStatus: response.status,
      title: metadata.title,
      canonicalUrl: metadata.canonicalUrl,
      excerpt: (metadata.description || metadata.text).slice(0, 500),
      contentHash,
      quoteFound,
      matchedContext: quoteContext?.context,
      matchedOffset: quoteContext?.offset,
      cached: false,
      fetchedAt,
      pageText: metadata.text.slice(0, 200_000),
      ...(claimReviews.length > 0 ? { claimReviews } : {}),
    };
  } catch (error: any) {
    const reason = String(error?.message || error);
    const status: SourceInspectionStatus =
      reason === "timeout" ? "timeout" :
      reason === "too_large" ? "too_large" :
      reason.includes("blocked_private_network") ? "blocked" :
      reason.startsWith("unsupported") || reason === "invalid_url" ? "unsupported" :
      "network_error";
    return { status, requestedUrl: rawUrl, fetchedAt, reason };
  }
}
