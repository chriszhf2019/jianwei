import { serverCorpus } from "./corpus";
import { NO_PERSIST } from "./settings";
import {
  evaluateQuoteMatch,
  findQuoteContext,
  sourceCheckKey,
} from "./sourceVerification";
import {
  loadSourcePageText,
  persistSourceCheck,
} from "./database";

/**
 * 旧版逐引句缓存可能早于正文快照修复，保留着不可复核的 quote_not_found。
 * 启动时仅使用已经保存的正文快照做确定性重算，不联网、不调用模型。
 */
export function repairEvidenceQuoteChecks(): void {
  if (NO_PERSIST) return;
  let repaired = 0;
  for (const article of serverCorpus) {
    if (!article?.sourceUrl || !Array.isArray(article.evidenceChain)) continue;
    const pageText = loadSourcePageText(sourceCheckKey(article.sourceUrl, ""));
    if (!pageText) continue;
    for (const item of article.evidenceChain) {
      const quote = String(item?.quote || "").trim();
      if (!quote) continue;
      const match = evaluateQuoteMatch(pageText, quote);
      const context = match.quoteFound ? findQuoteContext(pageText, quote) : null;
      persistSourceCheck(sourceCheckKey(article.sourceUrl, quote), {
        status: match.status,
        requestedUrl: article.sourceUrl,
        quoteFound: match.quoteFound,
        matchedContext: context?.context,
        matchedOffset: context?.offset,
        cached: false,
        fetchedAt: new Date().toISOString(),
        pageText,
      });
      repaired += 1;
    }
  }
  if (repaired > 0) {
    console.log(`Repaired ${repaired} evidence quote cache entries from stored page snapshots.`);
  }
}
