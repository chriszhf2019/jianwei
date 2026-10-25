/**
 * 抓取原文正文：与 /api/fetch-article 同一套缓存 + SSRF 防护 + 最短正文门槛。
 * enrich 在调 AI 前复用此逻辑；失败时调用方不得扣游客额度。
 */
import {
  loadSourceCheck,
  loadSourcePageText,
  persistSourceCheck,
} from "./database";
import { NO_PERSIST } from "./settings";
import {
  extractPageMetadata,
  inspectSourceDeduplicated,
  looksTruncatedText,
  sourceCheckKey,
} from "./sourceVerification";

export const SOURCE_CHECK_TTL_MS = Number(process.env.SOURCE_CHECK_TTL_MS || 24 * 60 * 60 * 1000);
export const FETCH_ARTICLE_TEXT_CAP = Number(process.env.FETCH_ARTICLE_TEXT_CAP || 40_000);
/** 判定「已有可用原文」的最短字符数（与 fetch-article 门槛一致）。 */
export const MIN_USABLE_ARTICLE_TEXT = 40;
/** 语料/请求体已含较完整正文时可跳过再抓（与 skill 侧阈值对齐）。 */
export const MIN_CORPUS_FULL_CONTENT = 400;

export const FETCH_FAIL_NOTE =
  "未能抓取可用正文。常见原因：站点拦截、超时、非 HTML，或链接不可达。请改贴正文，或换可公开访问的链接。";

export const FETCH_BLOCKED_NOTE =
  "该链接被 SSRF 防护拦截（本机、内网或非公网地址）。";

export const ENRICH_FETCH_FAIL_NOTE =
  "未能抓取可用原文正文。常见原因：站点拦截、超时、非 HTML，或链接不可达。请稍后重试，或换可公开访问的链接。深度分析未开始，未扣减游客额度。";

export const ENRICH_FETCH_BLOCKED_NOTE =
  "该链接被 SSRF 防护拦截（本机、内网或非公网地址）。深度分析未开始，未扣减游客额度。";

export const NO_SOURCE_CONTENT_NOTE =
  "缺少可抓取的原文链接，且本地也没有足够正文，无法进行深度分析。请提供可公开访问的原文链接后再试。未扣减游客额度。";

export const TRUNCATED_CONTENT_NOTE =
  "抓取到的正文疑似不完整（结尾停在半句）。请改用「贴正文」粘贴全文，或更换可公开访问的原文链接。";

export type FetchArticleOk = {
  ok: true;
  cached: boolean;
  status: string;
  requestedUrl: string;
  finalUrl: string;
  httpStatus?: number;
  title: string;
  excerpt: string;
  pageText: string;
  sourceName: string;
  contentHash?: string;
  fetchedAt?: string;
  truncated: boolean;
  note: string;
};

export type FetchArticleFail = {
  ok: false;
  status?: string;
  requestedUrl?: string;
  finalUrl?: string;
  httpStatus?: number;
  reason?: string;
  fetchedAt?: string;
  note: string;
  /** 供 API 统一对外 reason：fetch_failed | fetch_blocked */
  failReason: "fetch_failed" | "fetch_blocked" | "truncated_content";
};

export type FetchArticleResult = FetchArticleOk | FetchArticleFail;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** 与 /api/fetch-article 相同：缓存命中或现场抓取，正文过短则失败。 */
export async function fetchArticleText(
  rawUrl: string,
  options: { force?: boolean } = {}
): Promise<FetchArticleResult> {
  const url = String(rawUrl || "").trim();
  if (!url) {
    return {
      ok: false,
      failReason: "fetch_failed",
      reason: "url_required",
      note: "缺少原文链接，无法抓取正文。",
    };
  }
  if (!/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      failReason: "fetch_failed",
      reason: "unsupported_protocol",
      requestedUrl: url,
      note: "原文链接须为 http(s)。",
    };
  }

  const force = options.force === true;
  const checkKey = sourceCheckKey(url, "");

  if (!force && !NO_PERSIST) {
    const cached = loadSourceCheck(checkKey, SOURCE_CHECK_TTL_MS);
    const pageText = loadSourcePageText(checkKey);
    if (cached && pageText && String(pageText).trim().length >= MIN_USABLE_ARTICLE_TEXT) {
      const text = String(pageText);
      if (looksTruncatedText(text)) {
        return {
          ok: false,
          failReason: "truncated_content",
          status: String(cached.status || "reachable_unverified"),
          requestedUrl: url,
          finalUrl: String(cached.finalUrl || cached.requestedUrl || url),
          httpStatus: cached.httpStatus,
          reason: "truncated_content",
          fetchedAt: cached.fetchedAt,
          note: TRUNCATED_CONTENT_NOTE,
        };
      }
      return {
        ok: true,
        cached: true,
        status: String(cached.status || "reachable_unverified"),
        requestedUrl: url,
        finalUrl: String(cached.finalUrl || cached.requestedUrl || url),
        httpStatus: cached.httpStatus,
        title: cached.title || extractPageMetadata(text).title || "",
        excerpt: cached.excerpt || text.slice(0, 500),
        pageText: text.slice(0, FETCH_ARTICLE_TEXT_CAP),
        sourceName: hostnameOf(cached.finalUrl || cached.requestedUrl || url),
        contentHash: cached.contentHash,
        fetchedAt: cached.fetchedAt,
        truncated: text.length > FETCH_ARTICLE_TEXT_CAP,
        note: "已使用本地缓存的页面正文。内容来自目标站点，不是平台核验过的事实摘要。",
      };
    }
  }

  const result = await inspectSourceDeduplicated(url, "");
  if (result.status === "blocked") {
    return {
      ok: false,
      failReason: "fetch_blocked",
      status: result.status,
      requestedUrl: url,
      reason: result.reason,
      fetchedAt: result.fetchedAt,
      note: FETCH_BLOCKED_NOTE,
    };
  }
  if (!NO_PERSIST) persistSourceCheck(checkKey, result);

  const pageText = String(result.pageText || "").trim();
  if (pageText && pageText.length >= MIN_USABLE_ARTICLE_TEXT && looksTruncatedText(pageText)) {
    return {
      ok: false,
      failReason: "truncated_content",
      status: result.status,
      requestedUrl: url,
      finalUrl: result.finalUrl,
      httpStatus: result.httpStatus,
      reason: "truncated_content",
      fetchedAt: result.fetchedAt,
      note: TRUNCATED_CONTENT_NOTE,
    };
  }
  if (!pageText || pageText.length < MIN_USABLE_ARTICLE_TEXT) {
    return {
      ok: false,
      failReason: "fetch_failed",
      status: result.status,
      requestedUrl: url,
      finalUrl: result.finalUrl,
      httpStatus: result.httpStatus,
      reason: result.reason,
      fetchedAt: result.fetchedAt,
      note: FETCH_FAIL_NOTE,
    };
  }

  return {
    ok: true,
    cached: false,
    status: result.status,
    requestedUrl: url,
    finalUrl: result.finalUrl || url,
    httpStatus: result.httpStatus,
    title: result.title || extractPageMetadata(pageText).title || "",
    excerpt: result.excerpt || pageText.slice(0, 500),
    pageText: pageText.slice(0, FETCH_ARTICLE_TEXT_CAP),
    sourceName: hostnameOf(result.finalUrl || url),
    contentHash: result.contentHash,
    fetchedAt: result.fetchedAt,
    truncated: pageText.length > FETCH_ARTICLE_TEXT_CAP,
    note: "已抓取页面正文。内容来自目标站点，不是平台核验过的事实摘要。",
  };
}

export type ResolveEnrichContentOk = {
  ok: true;
  content: string;
  contentBasis: "full_article" | "corpus_content" | "request_content";
  fetchedTitle?: string;
  sourceName?: string;
};

export type ResolveEnrichContentFail = {
  ok: false;
  reason: "fetch_failed" | "fetch_blocked" | "no_source_content" | "truncated_content";
  note: string;
  status?: string;
  fetchReason?: string;
};

/**
 * enrich 专用：优先语料长正文 → 再抓 sourceUrl → 再接受请求体长正文；
 * 抓取失败或无可用来源时诚实失败（调用方勿扣额度）。
 */
export async function resolveEnrichArticleContent(input: {
  sourceUrl?: string;
  requestContent?: string;
  corpusContent?: string;
  force?: boolean;
}): Promise<ResolveEnrichContentOk | ResolveEnrichContentFail> {
  const corpus = String(input.corpusContent || "").trim();
  if (corpus.length >= MIN_CORPUS_FULL_CONTENT) {
    return {
      ok: true,
      content: corpus.slice(0, FETCH_ARTICLE_TEXT_CAP),
      contentBasis: "corpus_content",
    };
  }

  const sourceUrl = String(input.sourceUrl || "").trim();
  if (sourceUrl) {
    const fetched = await fetchArticleText(sourceUrl, { force: input.force });
    if (!fetched.ok) {
      const note =
        fetched.failReason === "fetch_blocked"
          ? ENRICH_FETCH_BLOCKED_NOTE
          : fetched.failReason === "truncated_content"
            ? `${TRUNCATED_CONTENT_NOTE}深度分析未开始，未扣减游客额度。`
            : fetched.reason === "url_required" || fetched.reason === "unsupported_protocol"
              ? `${fetched.note}深度分析未开始，未扣减游客额度。`
              : ENRICH_FETCH_FAIL_NOTE;
      return {
        ok: false,
        reason: fetched.failReason,
        note,
        status: fetched.status,
        fetchReason: fetched.reason,
      };
    }
    return {
      ok: true,
      content: fetched.pageText,
      contentBasis: "full_article",
      fetchedTitle: fetched.title,
      sourceName: fetched.sourceName,
    };
  }

  const requestContent = String(input.requestContent || "").trim();
  if (requestContent.length >= MIN_CORPUS_FULL_CONTENT) {
    return {
      ok: true,
      content: requestContent.slice(0, FETCH_ARTICLE_TEXT_CAP),
      contentBasis: "request_content",
    };
  }

  return {
    ok: false,
    reason: "no_source_content",
    note: NO_SOURCE_CONTENT_NOTE,
  };
}
