import type { Express } from "express";
import { activeProvider, callAI, providerModel } from "../ai";
import {
  PROMPT_VERSIONS,
  attachFieldMeta,
  createFieldMeta,
  sanitizeEnrichPayload,
} from "../aiValidation";
import { findCorpusArticle, persistCorpus, serverCorpus } from "../corpus";
import {
  loadSourceCheck,
  loadSourcePageText,
  persistSourceCheck,
  listSourceArchives,
} from "../database";
import { NO_PERSIST } from "../settings";
import {
  evaluateQuoteMatch,
  extractPageMetadata,
  findQuoteContext,
  inspectSourceDeduplicated,
  revalidateCachedQuote,
  sourceCheckKey,
} from "../sourceVerification";
import { buildSyndicationGraph } from "../../utils/syndication";

export type RateLimiter = (req: import("express").Request, res: import("express").Response, next: () => void) => void;

const SOURCE_CHECK_TTL_MS = Number(process.env.SOURCE_CHECK_TTL_MS || 24 * 60 * 60 * 1000);
const FETCH_ARTICLE_TEXT_CAP = Number(process.env.FETCH_ARTICLE_TEXT_CAP || 40_000);

/** 来源核验、证据重提取、转载传播图 */
export function registerSourceRoutes(app: import("express").Express, applyRateLimit: RateLimiter): void {
  // —— 通讯社/转载传播图 ——
  app.get("/api/syndication/graph", (_req, res) => {
    const graph = buildSyndicationGraph(serverCorpus as any[], 50);
    res.json(graph);
  });

  // —— 来源页面核验：SSRF 防护、页面指纹、引句匹配 ——
  app.post("/api/source/inspect", applyRateLimit, async (req, res) => {
    const url = String(req.body?.url || "").trim();
    const quote = String(req.body?.quote || "").trim();
    const force = req.body?.force === true;
    if (!url) return res.status(400).json({ error: "url is required" });
    const checkKey = sourceCheckKey(url, quote);
    if (!force && !NO_PERSIST) {
      const cached = loadSourceCheck(checkKey, SOURCE_CHECK_TTL_MS);
      if (cached) {
        if (!quote) {
          res.setHeader("Cache-Control", "no-store");
          return res.json({ ...cached, cached: true });
        }
        const ownSnapshot = loadSourcePageText(checkKey);
        const baseSnapshot = ownSnapshot || loadSourcePageText(sourceCheckKey(url, ""));
        const revalidated = revalidateCachedQuote(cached, baseSnapshot, quote);
        if (revalidated) {
          if (baseSnapshot) persistSourceCheck(checkKey, { ...revalidated, pageText: baseSnapshot });
          const { pageText: _pageText, ...publicResult } = revalidated;
          res.setHeader("Cache-Control", "no-store");
          return res.json({ ...publicResult, cached: true });
        }
        // 旧版引句缓存没有正文快照，不能把不可复核的旧结论继续当作缓存命中。
      }
    }
    const result = await inspectSourceDeduplicated(url, quote);
    if (result.status === "blocked") return res.status(403).json(result);
    if (result.status === "unsupported" && result.reason?.includes("protocol")) {
      return res.status(400).json(result);
    }
    const stableStatuses = new Set([
      "verified_quote",
      "quote_not_found",
      "quote_too_short",
      "reachable_unverified",
      "http_error",
      "unsupported",
    ]);
    if (!NO_PERSIST && stableStatuses.has(result.status)) persistSourceCheck(checkKey, result);
    const { pageText: _pageText, ...publicResult } = result;
    res.setHeader("Cache-Control", "no-store");
    res.json(publicResult);
  });

  app.post("/api/source/reextract-evidence", applyRateLimit, async (req, res) => {
    const articleId = String(req.body?.articleId || "").trim();
    if (!articleId) return res.status(400).json({ error: "articleId is required" });
    const article = findCorpusArticle(articleId);
    if (!article?.sourceUrl) return res.status(404).json({ error: "article or sourceUrl not found" });
    const provider = activeProvider();
    if (!provider) return res.status(503).json({ error: "no_ai_provider" });

    const baseKey = sourceCheckKey(article.sourceUrl, "");
    let pageText = loadSourcePageText(baseKey);
    let baseInspection = loadSourceCheck(baseKey, Number.MAX_SAFE_INTEGER);
    if (!pageText) {
      const inspected = await inspectSourceDeduplicated(article.sourceUrl, "");
      pageText = inspected.pageText || null;
      baseInspection = inspected;
      if (pageText) persistSourceCheck(baseKey, inspected);
    }
    if (!pageText) return res.status(422).json({ error: "source_page_text_unavailable" });

    const claims = Array.isArray(article.evidenceChain)
      ? article.evidenceChain.map((item: any) => ({
          id: item.id,
          claim: item.claim,
          sourceFact: item.sourceFact,
        }))
      : [];
    if (claims.length === 0) return res.status(400).json({ error: "evidence_chain_empty" });

    const prompt = `你是证据摘录核对员。请仅根据【来源页面正文】为每个 claim 找到能够支持、反驳或提供背景的原文短引句。
  严格只输出 JSON 数组：
  [{"id":"原 id","claim":"原 claim","sourceFact":"正文中的可核验事实摘要","quote":"必须是正文中逐字连续出现的短引句","sourceType":"primary_document|official_statement|reported_media|unknown","relation":"supports|contradicts|context","reliability":"可靠性依据","confidenceScore":0}]
  规则：
  1. quote 必须逐字取自正文，不得改写、补字或拼接不连续内容。
  2. 找不到精确引句时 quote 返回空字符串。
  3. 每条 claim 只返回一条最相关证据。
  4. sourceFact 和 reliability 不得加入正文没有的数据。

  来源：${article.sourceName || "外部信源"}
  来源链接：${article.sourceUrl}
  claims：
  ${JSON.stringify(claims)}

  来源页面正文：
  ${String(pageText).slice(0, 60000)}`;

    try {
      const text = await callAI(prompt, { json: true, temperature: 0.1 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      const rawList = Array.isArray(parsed) ? parsed : parsed?.evidenceChain;
      const cleaned = sanitizeEnrichPayload({ evidenceChain: rawList }).evidenceChain || [];
      const verified = cleaned.map((item: any) => {
        const context = item.quote ? findQuoteContext(pageText!, item.quote) : null;
        return {
          ...item,
          sourceUrl: article.sourceUrl,
          sourceName: article.sourceName,
          publishedAt: article.publishedAt || null,
          verificationStatus: context ? "linked" : "unlinked",
          verificationNote: context
            ? "引句已在来源页面正文中精确匹配。"
            : "模型未提供可在正文中精确匹配的引句。",
          matchedOffset: context?.offset,
          quote: context ? item.quote : "",
        };
      });
      article.evidenceChain = verified;
      if (!NO_PERSIST) {
        for (const item of verified) {
          if (!item.quote) continue;
          const match = evaluateQuoteMatch(pageText, item.quote);
          const context = match.quoteFound ? findQuoteContext(pageText, item.quote) : null;
          persistSourceCheck(sourceCheckKey(article.sourceUrl, item.quote), {
            ...(baseInspection || {}),
            status: match.status,
            requestedUrl: article.sourceUrl,
            quoteFound: match.quoteFound,
            matchedContext: context?.context,
            matchedOffset: context?.offset,
            cached: false,
            fetchedAt: baseInspection?.fetchedAt || new Date().toISOString(),
            pageText,
          });
        }
      }
      attachFieldMeta(
        article,
        ["evidenceChain"],
        createFieldMeta(provider, providerModel(provider), PROMPT_VERSIONS.evidence_reextract)
      );
      persistCorpus();
      res.json({ ok: true, overrides: { evidenceChain: verified }, matched: verified.filter((x: any) => x.verificationStatus === "linked").length });
    } catch (error: any) {
      res.json({ ok: false, error: String(error?.message || error) });
    }
  });

  // —— 来源页面档案（已保存正文的抓取记录） ——
  app.get("/api/source/archive", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (NO_PERSIST) return res.json({ entries: [], note: "当前不保存来源页面。" });
    try {
      const entries = listSourceArchives(40);
      res.json({
        entries,
        note: entries.length
          ? "档案只包含已经抓取并保存正文的页面。ClaimReview 只在页面自带 schema.org 标记时记入。"
          : "还没有已保存的来源页面。核验证据链接后，页面指纹和正文会留在这里。",
      });
    } catch (error) {
      console.error("source archive error:", error);
      res.status(503).json({ entries: [], note: "来源页面档案暂时读不出来。" });
    }
  });

  // —— 读懂新闻：贴链接抓取正文（复用 source inspect 的 SSRF 防护） ——
  app.post("/api/fetch-article", applyRateLimit, async (req, res) => {
    const url = String(req.body?.url || "").trim();
    const force = req.body?.force === true;
    if (!url) return res.status(400).json({ error: "url is required" });

    const checkKey = sourceCheckKey(url, "");
    if (!force && !NO_PERSIST) {
      const cached = loadSourceCheck(checkKey, SOURCE_CHECK_TTL_MS);
      const pageText = loadSourcePageText(checkKey);
      if (cached && pageText) {
        let sourceName = "";
        try {
          sourceName = new URL(cached.finalUrl || cached.requestedUrl || url).hostname.replace(/^www\./, "");
        } catch {
          /* keep empty */
        }
        res.setHeader("Cache-Control", "no-store");
        return res.json({
          ok: true,
          cached: true,
          status: cached.status,
          requestedUrl: url,
          finalUrl: cached.finalUrl || url,
          httpStatus: cached.httpStatus,
          title: cached.title || extractPageMetadata(pageText).title || "",
          excerpt: cached.excerpt || pageText.slice(0, 500),
          pageText: String(pageText).slice(0, FETCH_ARTICLE_TEXT_CAP),
          sourceName,
          contentHash: cached.contentHash,
          fetchedAt: cached.fetchedAt,
          truncated: String(pageText).length > FETCH_ARTICLE_TEXT_CAP,
          note: "已使用本地缓存的页面正文。内容来自目标站点，不是平台核验过的事实摘要。",
        });
      }
    }

    const result = await inspectSourceDeduplicated(url, "");
    if (result.status === "blocked") {
      return res.status(403).json({
        ok: false,
        status: result.status,
        reason: result.reason,
        note: "该链接被 SSRF 防护拦截（本机、内网或非公网地址）。",
      });
    }
    if (!NO_PERSIST) persistSourceCheck(checkKey, result);
    const pageText = String(result.pageText || "").trim();
    let sourceName = "";
    try {
      sourceName = new URL(result.finalUrl || url).hostname.replace(/^www\./, "");
    } catch {
      /* keep empty */
    }

    res.setHeader("Cache-Control", "no-store");
    if (!pageText || pageText.length < 40) {
      return res.json({
        ok: false,
        status: result.status,
        requestedUrl: url,
        finalUrl: result.finalUrl,
        httpStatus: result.httpStatus,
        reason: result.reason,
        fetchedAt: result.fetchedAt,
        note: "未能抓取可用正文。常见原因：站点拦截、超时、非 HTML，或链接不可达。请改贴正文，或换可公开访问的链接。",
      });
    }

    return res.json({
      ok: true,
      cached: false,
      status: result.status,
      requestedUrl: url,
      finalUrl: result.finalUrl || url,
      httpStatus: result.httpStatus,
      title: result.title || extractPageMetadata(pageText).title || "",
      excerpt: result.excerpt || pageText.slice(0, 500),
      pageText: pageText.slice(0, FETCH_ARTICLE_TEXT_CAP),
      sourceName,
      contentHash: result.contentHash,
      fetchedAt: result.fetchedAt,
      truncated: pageText.length > FETCH_ARTICLE_TEXT_CAP,
      note: "已抓取页面正文。内容来自目标站点，不是平台核验过的事实摘要。",
    });
  });

}
