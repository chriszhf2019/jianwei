import express from "express";
import { ingestAllFeeds } from "./feeds";
import { parseArticleDate } from "../utils/articleTime";
import { serverSectorList } from "./sectors";
import { deriveBlindspots, deriveSourceHealth, deriveTomorrowHeat } from "../utils/corpusSnapshot";
import { deriveArrivalHeatBundle, deriveCrossEventTop, deriveDensityCurve } from "../utils/arrivalPanels";
import { feedUrls, feedMaxAgeDays, NO_PERSIST } from "./settings";
import { serverCorpus, lastIngest, appendFeedItems, corpusSortTime, getCorpusRevision } from "./corpus";
import { applyRateLimit } from "./cache";
import { queryArticlesPage, recordAuditEvent } from "./database";

export interface CorpusFeedRouteDeps {
  demoDataEnabled: boolean;
  guestArticleLimit: number;
}

export function registerCorpusFeedRoutes(app: express.Express, deps: CorpusFeedRouteDeps): void {
  const DEMO_DATA_ENABLED = deps.demoDataEnabled;
  const GUEST_ARTICLE_LIMIT = deps.guestArticleLimit;

  const SNAPSHOT_CACHE_TTL_MS = Number(process.env.SNAPSHOT_CACHE_TTL_MS || 15_000);
  let snapshotCache: { key: string; at: number; payload: any } | null = null;

  // Intelligence snapshot derivation skeleton (derives honest aggregates from the corpus)
  app.get("/api/snapshot", (_req, res) => {
    res.setHeader("Cache-Control", "private, max-age=15, must-revalidate");
    try {
      const arts: any[] = serverCorpus;
      const sectorKey = serverSectorList().map((sector) => `${sector.id}:${sector.keywords.join(",")}`).join("|");
      const cacheKey = `${getCorpusRevision()}:${feedUrls().length}:${DEMO_DATA_ENABLED ? 1 : 0}:${sectorKey}`;
      if (
        snapshotCache &&
        snapshotCache.key === cacheKey &&
        Date.now() - snapshotCache.at < SNAPSHOT_CACHE_TTL_MS
      ) {
        res.json(snapshotCache.payload);
        return;
      }
      const categoryCounts: Record<string, number> = {};
      // credibilityStars / changeVelocity：历史字段兼容保留；运行逻辑已不读，派生统计恒为空对象。
      const starDistribution: Record<number, number> = {};
      const velocityCounts: Record<string, number> = {};
      const tagFreq: Record<string, number> = {};

      for (const a of arts) {
        const cat = a.category || "未分类";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

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
          sourceHealth: deriveSourceHealth(arts),
          blindspots: deriveBlindspots(arts, serverSectorList()),
          tomorrowWatch: deriveTomorrowHeat(arts, serverSectorList()),
          arrivalHeat: deriveArrivalHeatBundle(arts),
          density: deriveDensityCurve(arts, { taxonomy: serverSectorList() }),
          crossEvent: deriveCrossEventTop(arts),
        },
        // 热力、密度、跨事件共振与其余派生项使用同一套计数公式。
        // 时段按服务端本地时区分桶；共振分是信号重叠加权，不是因果强度或概率。
        notYetDerived: [],
      };
      snapshotCache = { key: cacheKey, at: Date.now(), payload };
      res.json(payload);
    } catch (err: any) {
      console.error("Snapshot error:", err);
      res.status(500).json({ error: "snapshot derivation failed" });
    }
  });


  // —— 真实信源接入：状态与手动摄取 ——
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

  app.post("/api/feeds/ingest", applyRateLimit, async (_req, res) => {
    if (feedUrls().length === 0) {
      return res.status(400).json({ error: "未配置 NEWS_FEED_URLS（逗号分隔的 RSS 地址）" });
    }
    try {
      const { items, result } = await ingestAllFeeds(feedUrls());
      const maxAgeDays = feedMaxAgeDays();
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
}
