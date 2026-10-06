import type { Express, Request, Response } from "express";
import {
  activeProvider,
  callAI,
  deepseekKeyOk,
  geminiKeyOk,
} from "../ai";
import {
  appendFeedItems,
  ALLOW_DEMO_DATA,
  corpusSortTime,
  getCorpusRevision,
  lastIngest,
  persistCorpus,
  serverCorpus,
} from "../corpus";
import { queryArticlesPage, recordAuditEvent } from "../database";
import { diagnoseFeedContract, ingestAllFeeds, pingAllFeeds, pingFeed } from "../feeds";
import {
  feedUrls,
  NO_PERSIST,
  persistSettings,
  settings,
} from "../settings";
import { validatePublicOutboundBaseUrl } from "../sourceVerification";
import { deriveFromList } from "../../utils/corpusMetrics";
import { parseArticleDate } from "../../utils/articleTime";

export type RateLimiter = (req: Request, res: Response, next: () => void) => void;

const GUEST_ARTICLE_LIMIT = Math.max(1, Math.min(50, Number(process.env.GUEST_ARTICLE_LIMIT || 4)));

/** 语料快照 / RSS / corpus 查询 / 设置 / AI 连通测试。 */
export function registerCorpusRoutes(app: Express, applyRateLimit: RateLimiter): void {
  const DEMO_DATA_ENABLED = ALLOW_DEMO_DATA;
  const SNAPSHOT_CACHE_TTL_MS = Number(process.env.SNAPSHOT_CACHE_TTL_MS || 15_000);
  let snapshotCache: { key: string; at: number; payload: any } | null = null;

  // Intelligence snapshot derivation skeleton (derives honest aggregates from the corpus)
  app.get("/api/snapshot", (_req, res) => {
    res.setHeader("Cache-Control", "private, max-age=15, must-revalidate");
    try {
      const arts: any[] = serverCorpus;
      const cacheKey = `${getCorpusRevision()}:${feedUrls().length}:${DEMO_DATA_ENABLED ? 1 : 0}`;
      if (
        snapshotCache &&
        snapshotCache.key === cacheKey &&
        Date.now() - snapshotCache.at < SNAPSHOT_CACHE_TTL_MS
      ) {
        res.json(snapshotCache.payload);
        return;
      }
      const categoryCounts: Record<string, number> = {};
      const starDistribution: Record<number, number> = {};
      const velocityCounts: Record<string, number> = {};
      const tagFreq: Record<string, number> = {};

      for (const a of arts) {
        const cat = a.category || "未分类";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        const star = Number(a.credibilityStars) || 0;
        starDistribution[star] = (starDistribution[star] || 0) + 1;

        const vel = a.changeVelocity || "未知";
        velocityCounts[vel] = (velocityCounts[vel] || 0) + 1;

        for (const t of a.tags || []) {
          tagFreq[t] = (tagFreq[t] || 0) + 1;
        }
      }

      const tagFrequency = Object.entries(tagFreq)
        .map(([tag, count]) => ({ tag, count }))
        .sort((x, y) => y.count - x.count);

      const sourceTotal = arts.reduce((sum, a) => sum + (Number(a.sourceCount) || 0), 0);

      const traceableCount = arts.filter(
        (a) => (Boolean(a.sourceUrl) || Boolean(a.sourceName)) && parseArticleDate(a.publishedAt || a.sourceDate || a.date) !== null
      ).length;

      // 涉事地区分布（AI 全量标注写回字段，存在才统计）
      const regionSum = new Map<string, number>();
      let annotatedCount = 0;
      for (const a of arts) {
        const rms: any[] = Array.isArray(a.regionMentions) ? a.regionMentions : [];
        if (rms.length > 0) annotatedCount += 1;
        for (const r of rms) regionSum.set(r.region, (regionSum.get(r.region) || 0) + (Number(r.confidence) || 0));
      }
      const regionMentionDistribution = [...regionSum.entries()]
        .map(([region, weight]) => ({ region, weight: Math.round(weight * 10) / 10 }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8);

      const payload = {
        meta: {
          generatedAt: new Date().toISOString(),
          corpus: feedUrls().length > 0 ? "live" : arts.length > 0 ? "runtime" : "empty",
          corpusSize: arts.length,
          demo: DEMO_DATA_ENABLED,
          note:
            feedUrls().length > 0
              ? "已配置真实信源，snapshot 基于服务端运行时语料派生。"
              : arts.length > 0
                ? "未配置实时 RSS，当前仅对已加载的真实运行时语料派生统计。"
                : "暂无真实语料；配置 RSS 源并执行摄取后才会生成统计。",
        },
        derived: {
          categoryCounts,
          starDistribution,
          velocityCounts,
          tagFrequency,
          sourceStats: {
            total: sourceTotal,
            avgPerArticle: arts.length ? +(sourceTotal / arts.length).toFixed(1) : 0,
          },
          traceableCount,
          regionMentionDistribution,
          regionAnnotatedCount: annotatedCount,
        },
        // 以下指标需要真实信源的时间/立场/冲突信号，接入采集器后逐步实现
        // 说明：heatmap/density/crossEvent 已由前端基于语料实时计算；
        // 以下三项需逐源 tier/立场/覆盖率口径，服务端暂不派生（UI 以示例口径展示并如实标注）
        notYetDerived: ["sourceHealth", "blindspots", "tomorrowForecasts"],
      };
      snapshotCache = { key: cacheKey, at: Date.now(), payload };
      res.json(payload);
    } catch (err: any) {
      console.error("Snapshot error:", err);
      res.status(500).json({ error: "snapshot derivation failed" });
    }
  });


  // —— 真实信源接入：状态、连通性探测 (Ping) 与手动摄取 ——
  app.get("/api/feeds/status", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-cache");
    res.json({
      enabled: feedUrls().length > 0,
      urls: feedUrls(),
      lastIngest,
      corpus: feedUrls().length > 0 ? "live" : serverCorpus.length > 0 ? "runtime" : "empty",
      corpusSize: serverCorpus.length,
    });
  });

  app.post("/api/feeds/ping", applyRateLimit, async (req, res) => {
    res.setHeader("Cache-Control", "private, no-cache");
    const { url, urls } = (req.body || {}) as { url?: string; urls?: string[] };

    try {
      if (url && typeof url === "string") {
        const single = await pingFeed(url.trim());
        return res.json({ ok: true, result: single });
      }

      const targetUrls = Array.isArray(urls) && urls.length > 0
        ? urls.map((u) => String(u).trim()).filter(Boolean)
        : feedUrls();

      if (targetUrls.length === 0) {
        return res.json({
          ok: true,
          results: [],
          summary: { total: 0, healthy: 0, warning: 0, error: 0 },
        });
      }

      const results = await pingAllFeeds(targetUrls);
      const healthyCount = results.filter((r) => r.status === "healthy").length;
      const warningCount = results.filter((r) => r.status === "warning").length;
      const errorCount = results.filter((r) => r.status === "error").length;

      res.json({
        ok: true,
        results,
        summary: {
          total: results.length,
          healthy: healthyCount,
          warning: warningCount,
          error: errorCount,
          allHealthy: errorCount === 0 && warningCount === 0,
        },
      });
    } catch (err: any) {
      console.error("Feed ping error:", err);
      res.status(500).json({ error: "feed ping probe failed: " + (err?.message || err) });
    }
  });

  app.post("/api/feeds/diagnose-contract", applyRateLimit, async (req, res) => {
    res.setHeader("Cache-Control", "private, no-cache");
    const { url } = (req.body || {}) as { url?: string };

    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "请提供需检测的 RSS/Atom 订阅地址 (url)" });
    }

    try {
      const diagnostic = await diagnoseFeedContract(url.trim());
      res.json({ ok: true, diagnostic });
    } catch (err: any) {
      console.error("Feed diagnose-contract error:", err);
      res.status(500).json({ error: "feed contract diagnosis failed: " + (err?.message || err) });
    }
  });

  app.post("/api/feeds/ingest", applyRateLimit, async (_req, res) => {
    if (feedUrls().length === 0) {
      return res.status(400).json({ error: "未配置 NEWS_FEED_URLS（逗号分隔的 RSS 地址）" });
    }
    try {
      const { items, result } = await ingestAllFeeds(feedUrls());
      const maxAgeDays = Number(process.env.FEED_MAX_AGE_DAYS || 30);
      appendFeedItems(items, maxAgeDays, {
        urls: result.urls,
        errors: result.errors,
        dedupedSkipped: result.skipped,
        sourceResults: result.sourceResults,
      });
      recordAuditEvent({
        actor: "local",
        action: "feeds.ingest",
        entityType: "feed",
        entityId: result.urls.join(",").slice(0, 160),
        metadata: {
          added: lastIngest?.added || 0,
          skipped: lastIngest?.skipped || 0,
          errors: result.errors.length,
          sourceResults: result.sourceResults,
        },
      });
      res.json({ ok: true, lastIngest, corpusSize: serverCorpus.length });
    } catch (e: any) {
      console.error("Feed ingest error:", e);
      res.status(500).json({ error: "feed ingest failed: " + (e?.message || e) });
    }
  });

  app.get("/api/corpus", (req, res) => {
    res.setHeader("Cache-Control", "private, max-age=15, must-revalidate");
    const isGuest = Boolean((req as any).auth?.isGuest);
    const region = typeof req.query.region === "string" ? req.query.region.trim() : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const limitRaw = Number(req.query.limit);
    const hasLimit = Number.isFinite(limitRaw) && limitRaw > 0;
    const limit = isGuest ? GUEST_ARTICLE_LIMIT : hasLimit ? Math.min(limitRaw, 500) : 500;
    const offsetRaw = Number(req.query.offset);
    const offset = isGuest ? 0 : Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;

    if (!NO_PERSIST) {
      const page = queryArticlesPage({ region, q, limit, offset });
      if (page) {
        res.json({
          corpus: page.items,
          meta: {
            corpusSize: page.total,
            filteredTotal: page.filteredTotal,
            matches: region || q ? page.filteredTotal : undefined,
            region: region || undefined,
            query: q || undefined,
            corpus: feedUrls().length > 0 ? "live" : page.total > 0 ? "runtime" : "empty",
            demo: DEMO_DATA_ENABLED,
            guest: isGuest,
            guestArticleLimit: isGuest ? GUEST_ARTICLE_LIMIT : undefined,
            offset,
            limit,
            hasMore: isGuest ? false : offset + page.items.length < page.filteredTotal,
            generatedAt: new Date().toISOString(),
          },
        });
        return;
      }
    }

    let list = serverCorpus;
    if (region) {
      list = serverCorpus.filter((a: any) =>
        Array.isArray(a.regionMentions) && a.regionMentions.some((r: any) => String(r?.region) === region)
      );
    }
    if (q) {
      list = list.filter((a: any) => {
        const haystack = `${a?.title || ""} ${a?.subtitle || ""} ${a?.summary || ""} ${(a?.tags || []).join(" ")}`.toLowerCase();
        return haystack.includes(q);
      });
    }
    const sorted = [...list].sort((a: any, b: any) => corpusSortTime(b) - corpusSortTime(a));
    const safeOffset = Math.min(offset, sorted.length);
    res.json({
      corpus: sorted.slice(safeOffset, safeOffset + limit), // 最新在前，支持 offset 分页
      meta: {
        corpusSize: serverCorpus.length,
        filteredTotal: sorted.length,
        matches: region ? sorted.length : undefined,
        region: region || undefined,
        query: q || undefined,
        corpus: feedUrls().length > 0 ? "live" : sorted.length > 0 ? "runtime" : "empty",
        demo: DEMO_DATA_ENABLED,
        guest: isGuest,
        guestArticleLimit: isGuest ? GUEST_ARTICLE_LIMIT : undefined,
        offset: safeOffset,
        limit,
        hasMore: isGuest ? false : safeOffset + limit < sorted.length,
        generatedAt: new Date().toISOString(),
      },
    });
  });


  // —— 设置（用户信息 + AI 双通道 Key + 信源），脱敏返回；不把密钥回传前端 ——
  function publicSettings() {
    return {
      userName: settings.userName || "",
      ai: {
        choice: settings.aiChoice,
        provider: activeProvider(),
        gemini: geminiKeyOk(),
        deepseek: deepseekKeyOk(),
        geminiModel: settings.geminiModel,
        deepseekModel: settings.deepseekModel,
        deepseekBaseUrl: settings.deepseekBaseUrl,
      },
      feeds: feedUrls(),
    };
  }

  app.get("/api/settings", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json(publicSettings());
  });

  app.post("/api/settings", applyRateLimit, async (req, res) => {
    try {
      const b = req.body || {};
      const choice = b.aiChoice;
      if (choice === "auto" || choice === "gemini" || choice === "deepseek") {
        settings.aiChoice = choice;
      }
      if (typeof b.geminiApiKey === "string") settings.geminiApiKey = b.geminiApiKey.trim();
      if (typeof b.deepseekApiKey === "string") settings.deepseekApiKey = b.deepseekApiKey.trim();
      if (typeof b.geminiModel === "string" && b.geminiModel.trim()) settings.geminiModel = b.geminiModel.trim();
      if (typeof b.deepseekModel === "string" && b.deepseekModel.trim()) settings.deepseekModel = b.deepseekModel.trim();
      if (typeof b.deepseekBaseUrl === "string" && b.deepseekBaseUrl.trim()) {
        const nextBaseUrl = b.deepseekBaseUrl.trim();
        if (process.env.JIANWEI_ALLOW_PRIVATE_AI_BASE_URL !== "1") {
          try {
            await validatePublicOutboundBaseUrl(nextBaseUrl);
          } catch (e: any) {
            return res.status(400).json({
              error: "deepseekBaseUrl must be a public HTTPS endpoint without credentials",
              reason: String(e?.message || e),
            });
          }
        }
        settings.deepseekBaseUrl = nextBaseUrl;
      }
      if (typeof b.userName === "string") settings.userName = b.userName.trim();
      if (Array.isArray(b.feeds)) {
        settings.feeds = b.feeds.map((u: any) => String(u || "").trim()).filter(Boolean);
      }
      if (b.sectorOverrides && typeof b.sectorOverrides === "object") {
        const clean: Record<string, { keywords: string[] }> = {};
        for (const [id, val] of Object.entries<any>(b.sectorOverrides)) {
          if (Array.isArray(val?.keywords) && val.keywords.length > 0) {
            clean[id] = { keywords: val.keywords.map((k: any) => String(k).trim()).filter(Boolean) };
          }
        }
        settings.sectorOverrides = clean;
      }
      persistSettings();
      recordAuditEvent({
        actor: "local",
        action: "settings.update",
        entityType: "settings",
        entityId: "runtime",
        metadata: { changedFields: Object.keys(req.body || {}).sort() },
      });
      res.json({ ok: true, ...publicSettings() });
    } catch (e: any) {
      console.error("Settings update error:", e);
      res.status(500).json({ error: "settings update failed" });
    }
  });

  // AI 连接测试：以当前生效通道发一条极短请求
  app.post("/api/ai/test", applyRateLimit, async (_req, res) => {
    const provider = activeProvider();
    if (!provider) {
      return res.json({ ok: false, provider: null, reason: "未配置任何 API Key（Gemini / DeepSeek）" });
    }
    try {
      const text = await callAI("请只回复两个字：正常", { temperature: 0 });
      res.json({ ok: true, provider, sample: String(text || "").slice(0, 80) });
    } catch (e: any) {
      res.json({ ok: false, provider, reason: String(e?.message || e) });
    }
  });

}
