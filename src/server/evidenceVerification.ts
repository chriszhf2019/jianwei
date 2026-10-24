/**
 * 证据自动核验：抓取原文页面，把 evidenceChain 中的引句与页面正文逐条比对。
 * - 结果写回语料（verificationStatus / verificationNote / matchedOffset），刷新后仍可见。
 * - 后台执行，不阻塞 enrich 响应；同一篇文章在 TTL 内不重复抓取。
 */
import { findCorpusArticle, persistCorpus } from "./corpus";
import { inspectSourceDeduplicated, evaluateQuoteMatch, findQuoteContext, sourceCheckKey } from "./sourceVerification";
import { persistSourceCheck } from "./database";
import { NO_PERSIST } from "./settings";

export interface EvidenceVerificationResult {
  skipped: boolean;
  verified: number;
  unmatched: number;
  total: number;
  reason?: string;
}

const TTL_MS = 6 * 3600 * 1000;
const inFlight = new Map<string, Promise<EvidenceVerificationResult>>();
const lastRunAt = new Map<string, number>();

/** 同步核验（供调试/按需接口使用）。 */
export async function verifyEvidenceChainForArticle(articleId: string): Promise<EvidenceVerificationResult> {
  const id = String(articleId || "").trim();
  if (!id) return { skipped: true, verified: 0, unmatched: 0, total: 0, reason: "missing_article_id" };

  const article: any = findCorpusArticle(id);
  const sourceUrl = String(article?.sourceUrl || "").trim();
  const evidence = Array.isArray(article?.evidenceChain) ? article.evidenceChain : [];
  const withQuote = evidence.filter((ev: any) => String(ev?.quote || "").trim());
  if (!article || !sourceUrl || withQuote.length === 0) {
    return { skipped: true, verified: 0, unmatched: 0, total: withQuote.length, reason: "no_source_or_quote" };
  }

  let inspected;
  try {
    inspected = await inspectSourceDeduplicated(sourceUrl);
  } catch (error: any) {
    return {
      skipped: true,
      verified: 0,
      unmatched: 0,
      total: withQuote.length,
      reason: String(error?.message || error).slice(0, 120),
    };
  }

  const pageText = String(inspected?.pageText || "");
  if (!pageText || pageText.length < 80) {
    return { skipped: true, verified: 0, unmatched: 0, total: withQuote.length, reason: "no_page_text" };
  }

  if (!NO_PERSIST) {
    try {
      persistSourceCheck(sourceCheckKey(sourceUrl, ""), inspected);
    } catch {
      /* 缓存写入失败不影响核验结果 */
    }
  }

  let verified = 0;
  let unmatched = 0;
  for (const ev of evidence) {
    const quote = String(ev?.quote || "").trim();
    if (!quote) continue;
    const match = evaluateQuoteMatch(pageText, quote);
    const context = match.quoteFound ? findQuoteContext(pageText, quote) : null;
    if (match.quoteFound) {
      verified += 1;
      ev.verificationStatus = "linked";
      ev.verificationNote = "原文引句匹配";
      if (typeof context?.offset === "number") ev.matchedOffset = context.offset;
    } else {
      unmatched += 1;
      ev.verificationStatus = "unlinked";
      ev.verificationNote = "原文页面未找到该引句（可能改写或来源不符）";
    }
  }

  if (!NO_PERSIST) persistCorpus();
  return { skipped: false, verified, unmatched, total: withQuote.length };
}

/** 后台核验：去重 + TTL，不阻塞调用方。 */
export function verifyEvidenceChainInBackground(articleId: string): void {
  const id = String(articleId || "").trim();
  if (!id) return;
  const last = lastRunAt.get(id) || 0;
  if (Date.now() - last < TTL_MS) return;
  if (inFlight.has(id)) return;

  lastRunAt.set(id, Date.now());
  const task = verifyEvidenceChainForArticle(id)
    .catch((error) => {
      console.warn("[evidence-verify] failed:", String(error?.message || error).slice(0, 200));
      return { skipped: true, verified: 0, unmatched: 0, total: 0, reason: "error" };
    })
    .finally(() => {
      inFlight.delete(id);
    });
  inFlight.set(id, task);
}
