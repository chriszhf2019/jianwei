import express from "express";
import { NO_PERSIST } from "./settings";
import { serverCorpus, persistCorpus, findCorpusArticle, markCorpusArticlesDirty } from "./corpus";
import { activeProvider, callAI, providerModel } from "./ai";
import { applyRateLimit } from "./cache";
import { PROMPT_VERSIONS, attachFieldMeta, createFieldMeta, sanitizeEnrichPayload } from "./aiValidation";
import {
  evaluateQuoteMatch,
  inspectSourceDeduplicated,
  findQuoteContext,
  revalidateCachedQuote,
  sourceCheckKey,
} from "./sourceVerification";
import {
  loadSourceCheck,
  loadSourcePageText,
  persistSourceCheck,
  loadSourcePageTexts,
  listSourceArchives,
} from "./database";
import { buildSyndicationGraph } from "../utils/syndication";

const SOURCE_CHECK_TTL_MS = Number(process.env.SOURCE_CHECK_TTL_MS || 24 * 60 * 60 * 1000);

export function registerSourceRoutes(app: express.Express): void {
  // —— 通讯社/转载传播图 ——
  app.get("/api/syndication/graph", (_req, res) => {
    const articles = serverCorpus as any[];
    const pool = articles
      .filter((article) => article?.isExternal !== false && article?.title && article?.sourceUrl)
      .slice(0, 500);
    const pageTexts = new Map<string, string>();
    if (!NO_PERSIST && pool.length > 0) {
      const keyByArticle = new Map(pool.map((article) => [sourceCheckKey(article.sourceUrl, ""), article.id]));
      const stored = loadSourcePageTexts([...keyByArticle.keys()]);
      for (const [checkKey, text] of stored) {
        const articleId = keyByArticle.get(checkKey);
        if (articleId) pageTexts.set(articleId, text);
      }
    }
    res.json(buildSyndicationGraph(articles, 50, pageTexts));
  });

  // —— 来源页面核验：SSRF 防护、页面指纹、引句匹配 ——
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

  /** 用户贴链接读懂新闻：抓取标题与正文（返回有上限的 pageText，供解读）。 */
  const FETCH_ARTICLE_TEXT_CAP = Number(process.env.FETCH_ARTICLE_TEXT_CAP || 40_000);
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
          title: cached.title || "",
          excerpt: cached.excerpt || pageText.slice(0, 500),
          pageText: String(pageText).slice(0, FETCH_ARTICLE_TEXT_CAP),
          sourceName,
          contentHash: cached.contentHash,
          fetchedAt: cached.fetchedAt,
          truncated: String(pageText).length > FETCH_ARTICLE_TEXT_CAP,
          note: "已抓取页面正文（缓存）。内容来自目标站点，不是平台核验过的事实摘要。",
        });
      }
    }

    const result = await inspectSourceDeduplicated(url, "");
    if (result.status === "blocked") return res.status(403).json({ ok: false, ...result });
    if (result.status === "unsupported" && result.reason?.includes("protocol")) {
      return res.status(400).json({ ok: false, ...result });
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

    const pageText = String(result.pageText || "");
    const fetchFailedStatuses = new Set([
      "http_error",
      "timeout",
      "network_error",
      "too_large",
      "unsupported",
    ]);
    const fetchOk = Boolean(pageText) && !fetchFailedStatuses.has(result.status);

    let sourceName = "";
    try {
      sourceName = new URL(result.finalUrl || result.requestedUrl || url).hostname.replace(/^www\./, "");
    } catch {
      /* keep empty */
    }

    res.setHeader("Cache-Control", "no-store");
    if (!fetchOk) {
      return res.status(422).json({
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
      title: result.title || "",
      excerpt: result.excerpt || pageText.slice(0, 500),
      pageText: pageText.slice(0, FETCH_ARTICLE_TEXT_CAP),
      sourceName,
      contentHash: result.contentHash,
      fetchedAt: result.fetchedAt,
      truncated: pageText.length > FETCH_ARTICLE_TEXT_CAP,
      note: "已抓取页面正文。内容来自目标站点，不是平台核验过的事实摘要。",
    });
  });

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
      markCorpusArticlesDirty([article]);
      persistCorpus();
      res.json({ ok: true, overrides: { evidenceChain: verified }, matched: verified.filter((x: any) => x.verificationStatus === "linked").length });
    } catch (error: any) {
      res.json({ ok: false, error: String(error?.message || error) });
    }
  });

  function templateArticleTimeline(article: any, reason: string) {
    const title = String(article?.title || "");
    const category = String(article?.category || "");
    const isTech = category.includes("科技") || title.includes("AI") || title.includes("电池");
    const isGov = category.includes("政策") || title.includes("关税") || title.includes("监管");
    return {
      fallback: true,
      fallbackReason: reason,
      fallbackNote: "未配置可用模型或上游请求失败。下面是固定模板，不是对该文的模型判断。",
      summary: `围绕《${title}》的模板脉络。下面三段是固定框架，不是对该文的模型判断。`,
      timeline: [
        {
          phase: "antecedent",
          phaseLabel: "前因与溯源",
          timeLabel: "模板",
          title: isGov ? "规则与立案背景（模板）" : isTech ? "上一代技术约束（模板）" : "供需背景（模板）",
          detail: "未按本文生成前因，只保留阅读位置。",
          impact: "不作为事实结论。",
          keySignals: ["需对照原文"],
        },
        {
          phase: "current",
          phaseLabel: "当前关键节点",
          timeLabel: "当前",
          title,
          detail: article?.summary || article?.tongsuSummary || "当前节点使用文章标题和摘要。",
          impact: article?.oneSentenceVerdict || "未生成影响判断。",
          keySignals: ["文章标题"],
        },
        {
          phase: "future",
          phaseLabel: "潜在未来触发点",
          timeLabel: "模板",
          title: isGov ? "后续合规节点（模板）" : isTech ? "后续量产节点（模板）" : "后续观察（模板）",
          detail: "未来节点未生成，不能据此推断走势。",
          impact: "不作为预测。",
          keySignals: ["需另行核验"],
        },
      ],
    };
  }

  app.post("/api/article-timeline", applyRateLimit, async (req, res) => {
    const article = req.body?.article;
    if (!article || !article.title) {
      return res.status(400).json({ error: "article object with title is required" });
    }

    const provider = activeProvider();
    if (!provider) {
      return res.json(templateArticleTimeline(article, "no_api_key"));
    }

    const prompt = `你是全球宏观与产业情报资深分析师。请对以下新闻事件进行深度时序因果穿透，严格梳理出该事件的【前因溯源】、【当前关键节点】和【潜在未来触发点】三阶段演变脉络。

  新闻标题：${article.title}
  新闻摘要：${article.summary || article.tongsuSummary || ""}
  核心判断：${article.oneSentenceVerdict || ""}
  所在赛道：${article.category || ""}
  发布时间：${article.publishedAt || "近期"}

  严格输出 JSON 格式（不要输出 markdown 标记外的其它文字）：
  {
    "summary": "一句话概括事件从起因到未来的演变本质",
    "timeline": [
      {
        "phase": "antecedent",
        "phaseLabel": "📜 前因与溯源",
        "timeLabel": "起因阶段 / 过去 1-6 个月",
        "title": "简明节点标题",
        "detail": "深度解析驱动该事件发生的前提、历史铺垫与直接导火索",
        "impact": "对当时格局的影响",
        "keySignals": ["关键催化信号1", "信号2"]
      },
      {
        "phase": "current",
        "phaseLabel": "⚡ 当前关键节点",
        "timeLabel": "当前正在发生",
        "title": "当前突破或核心转折标题",
        "detail": "当前发生的实质性动作、关键数据变动或政策签署",
        "impact": "对当下的直接冲击与行业重塑",
        "keySignals": ["关键突破1", "关键数据2"]
      },
      {
        "phase": "future",
        "phaseLabel": "🔮 潜在未来触发点",
        "timeLabel": "未来 1-6 个月预警",
        "title": "潜在未来演变分支或触发条件",
        "detail": "未来可能发生的次生连锁反应、政策落地窗口或反制动作",
        "impact": "决策者需留意的中长期格局变化",
        "keySignals": ["未来观察指标1", "触发阈值2"]
      }
    ]
  }`;

    try {
      const aiText = await callAI(prompt, { json: true, temperature: 0.2 });
      let parsed: any;
      try {
        parsed = JSON.parse(aiText);
      } catch {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (parsed && Array.isArray(parsed.timeline) && parsed.timeline.length > 0) {
        return res.json(parsed);
      }
      throw new Error("Invalid timeline structure from AI");
    } catch (err: any) {
      console.error("article-timeline AI error:", err);
      return res.json(templateArticleTimeline(article, "upstream_failed"));
    }
  });
}
