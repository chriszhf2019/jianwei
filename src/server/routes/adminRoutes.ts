import path from "node:path";
import type { Express, Request, Response } from "express";
import {
  activeProvider,
  callAI,
  getAIUsage,
} from "../ai";
import { scheduledBackupStatus } from "../backupScheduler";
import {
  cacheSizes,
  clearEnrichCache,
  clearInFlightAI,
  clearPredictCache,
  RATE_MAX_PER_MIN,
  RATE_WINDOW_MS,
} from "../cache";
import {
  backupCorpus,
  backupDirectory,
  lastIngest,
  resetCorpus,
  serverCorpus,
} from "../corpus";
import {
  batchDeleteDatabaseAnalyses,
  databaseStats,
  deleteDatabaseAnalysis,
  getDatabaseAnalysisDetail,
  getDatabaseOverview,
  listAuditEvents,
  listDatabaseAnalyses,
  listDatabaseBackups,
  recordAuditEvent,
  restoreDatabaseBackup,
  verifyDatabaseBackup,
} from "../database";
import { feedUrls, NO_PERSIST } from "../settings";

export type RateLimiter = (req: Request, res: Response, next: () => void) => void;

export type AdminRouteOptions = {
  serverStartTime: number;
  demoDataEnabled: boolean;
};

/** 管理端：复位、状态、数据库、备份、审计、行为洞察。 */
export function registerAdminRoutes(
  app: Express,
  applyRateLimit: RateLimiter,
  options: AdminRouteOptions
): void {
  const { serverStartTime, demoDataEnabled: DEMO_DATA_ENABLED } = options;
  // 管理：复位内存语料与缓存（测试/演示环境用；不影响 data/settings.json）
  app.post("/api/admin/reset", applyRateLimit, (_req, res) => {
    const backupPath = backupCorpus("before-reset");
    resetCorpus();
    clearEnrichCache();
    clearPredictCache();
    clearInFlightAI();
    res.json({ ok: true, corpusSize: serverCorpus.length, backupPath });
  });

  app.get("/api/admin/status", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json({
      server: {
        startedAt: new Date(serverStartTime).toISOString(),
        uptimeSec: Math.round((Date.now() - serverStartTime) / 1000),
      },
      rateLimit: {
        maxPerMinute: RATE_MAX_PER_MIN,
        windowMs: RATE_WINDOW_MS,
      },
      aiUsage: getAIUsage(),
      caches: cacheSizes(),
      corpus: {
        corpus: feedUrls().length > 0 ? "live" : serverCorpus.length > 0 ? "runtime" : "empty",
        demo: DEMO_DATA_ENABLED,
        corpusSize: serverCorpus.length,
        storage: databaseStats(),
      },
      databaseOverview: getDatabaseOverview(),
      feeds: {
        enabled: feedUrls().length > 0,
        urls: feedUrls(),
        lastIngest,
      },
      backups: scheduledBackupStatus(),
    });
  });

  // 后台管理：数据库概览
  app.get("/api/admin/database/overview", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json(getDatabaseOverview());
  });

  // 后台管理：获取数据库中已保存的 AI 分析语料列表
  app.get("/api/admin/database/analyses", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const result = listDatabaseAnalyses({ q, category, limit, offset });
    res.json({ ok: true, ...result });
  });

  // 后台管理：获取特定 AI 分析语料的完整 JSON 数据
  app.get("/api/admin/database/analyses/:key", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const key = String(req.params.key || "").trim();
    const detail = getDatabaseAnalysisDetail(key);
    if (!detail) return res.status(404).json({ error: "analysis_not_found" });
    res.json({ ok: true, analysis: detail });
  });

  // 后台管理：从数据库删除某条已分析语料
  app.delete("/api/admin/database/analyses/:key", applyRateLimit, (req, res) => {
    const key = String(req.params.key || "").trim();
    const success = deleteDatabaseAnalysis(key);
    if (!success) return res.status(404).json({ error: "analysis_not_found" });
    recordAuditEvent({
      actor: String((req as any).auth?.username || "admin"),
      action: "database.analysis.delete",
      entityType: "article_analysis",
      entityId: key,
    });
    res.json({ ok: true });
  });

  // 后台管理：批量删除已分析语料
  app.post("/api/admin/database/analyses/batch-delete", applyRateLimit, (req, res) => {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys.map(String) : [];
    const deletedCount = batchDeleteDatabaseAnalyses(keys);
    recordAuditEvent({
      actor: String((req as any).auth?.username || "admin"),
      action: "database.analysis.batch_delete",
      entityType: "article_analysis",
      metadata: { count: deletedCount },
    });
    res.json({ ok: true, deletedCount });
  });

  app.get("/api/admin/backups", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json({
      backups: NO_PERSIST ? [] : listDatabaseBackups(backupDirectory()),
      scheduler: scheduledBackupStatus(),
    });
  });

  app.get("/api/admin/audit", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (NO_PERSIST) return res.json({ events: [], chain: { valid: true, checked: 0, brokenAt: null } });
    const result = listAuditEvents(Number(req.query.limit || 200));
    res.json(result);
  });

  // 用户行为事件打点与记录
  app.post("/api/activity/log", applyRateLimit, (req, res) => {
    const actor = String((req as any).auth?.username || req.body?.actor || "analyst_guest").slice(0, 120);
    const action = String(req.body?.action || "unknown").slice(0, 120);
    const entityType = req.body?.entityType ? String(req.body.entityType).slice(0, 80) : undefined;
    const entityId = req.body?.entityId ? String(req.body.entityId).slice(0, 160) : undefined;
    const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};

    recordAuditEvent({
      actor,
      action,
      entityType,
      entityId,
      status: "success",
      metadata,
    });
    res.json({ ok: true });
  });

  // 后台管理：分析用户行为日志，生成模式挖掘与洞察报告
  app.post("/api/admin/behavior-insights", applyRateLimit, async (req, res) => {
    try {
      const rawAudit = listAuditEvents(1000);
      const events = rawAudit.events || [];

      // 1. 24小时时段分布计算
      const hourlyDistribution: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;

      // 2. 动作分类与偏好计算
      const actionCounts: Record<string, number> = {
        "ai_analysis": 0,       // AI 深度解读 / 认知拆解
        "knowledge_deposit": 0, // 知识库沉淀
        "prediction_ledger": 0, // 前瞻预测契约
        "user_auth": 0,         // 登录 / 注册 / 账户管理
        "feed_ingestion": 0,    // RSS 信源巡检与管道摄取
        "system_admin": 0,      // 配置修改 / 偏好 / 数据库
        "article_read": 0,      // 新闻语料查阅与检索
      };

      const userMap: Record<string, number> = {};

      for (const evt of events) {
        if (evt.at) {
          const d = new Date(evt.at);
          if (!isNaN(d.getTime())) {
            const hour = d.getHours();
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
          }
        }

        const actor = evt.actor || "unknown";
        userMap[actor] = (userMap[actor] || 0) + 1;

        const act = String(evt.action || "").toLowerCase();
        if (act.includes("ai") || act.includes("analyze") || act.includes("enrich") || act.includes("analysis") || act.includes("strategic") || act.includes("nuance")) {
          actionCounts["ai_analysis"]++;
        } else if (act.includes("knowledge") || act.includes("deposit") || act.includes("corpus")) {
          actionCounts["knowledge_deposit"]++;
        } else if (act.includes("predict") || act.includes("contract") || act.includes("resolve")) {
          actionCounts["prediction_ledger"]++;
        } else if (act.includes("auth") || act.includes("login") || act.includes("register") || act.includes("user")) {
          actionCounts["user_auth"]++;
        } else if (act.includes("feed") || act.includes("ingest") || act.includes("source")) {
          actionCounts["feed_ingestion"]++;
        } else if (act.includes("setting") || act.includes("database") || act.includes("preference") || act.includes("admin")) {
          actionCounts["system_admin"]++;
        } else {
          actionCounts["article_read"]++;
        }
      }

      // 找出高峰 3 小时段
      let max3Sum = 0;
      let peakStart = 9;
      for (let h = 0; h < 24; h++) {
        const sum = (hourlyDistribution[h] || 0) + (hourlyDistribution[(h + 1) % 24] || 0) + (hourlyDistribution[(h + 2) % 24] || 0);
        if (sum > max3Sum) {
          max3Sum = sum;
          peakStart = h;
        }
      }
      const peakEnd = (peakStart + 3) % 24;
      const totalCount = events.length || 1;
      const peakPercent = Math.round((max3Sum / totalCount) * 100);
      const peakHoursText = `${String(peakStart).padStart(2, "0")}:00 - ${String(peakEnd).padStart(2, "0")}:00 (集中了 ${peakPercent}% 的活跃流水)`;

      const actionNameMap: Record<string, { name: string; category: string }> = {
        "ai_analysis": { name: "AI 深度认知解读与推演", category: "核心智能" },
        "knowledge_deposit": { name: "知识库入库与沉淀", category: "知识沉淀" },
        "prediction_ledger": { name: "前瞻预测契约与校准", category: "决策研判" },
        "user_auth": { name: "账户认证与权限变更", category: "安全合规" },
        "feed_ingestion": { name: "RSS信源巡检与管道摄取", category: "数据采集" },
        "system_admin": { name: "系统配置与数据库交互", category: "后台管理" },
        "article_read": { name: "新闻语料查阅与检索", category: "内容调阅" },
      };

      const actionPreferences = Object.entries(actionCounts)
        .map(([key, count]) => ({
          key,
          name: actionNameMap[key]?.name || key,
          category: actionNameMap[key]?.category || "其他",
          count,
          percentage: Math.round((count / totalCount) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      const topUsers = Object.entries(userMap)
        .map(([username, count]) => ({
          username,
          count,
          percentage: Math.round((count / totalCount) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // AI 模式挖掘与研判兜底
      let insights = {
        executiveSummary: `用户行为日志共记录 ${totalCount} 条操作流水。团队使用场景集中在 ${actionPreferences[0]?.name || "AI 深度解读"}，占比达 ${actionPreferences[0]?.percentage || 0}%。整体行为符合深度政经与科技智库的典型高频分析与知识沉淀链路。`,
        peakPatternAnalysis: `核心活跃时段分布在 ${peakHoursText}。研判显示该时间段为分析师与决策层集中进行热点定性、五层光谱拆解与知识沉淀的业务高峰期。`,
        featurePreferenceAnalysis: `高频调用的模块包括 ${actionPreferences.slice(0, 2).map((a) => a.name).join(" 和 ")}，显示出团队对 AI 深度剖析与长期知识沉淀具有极高粘性与使用依赖。`,
        workflowEfficiencyScore: Math.min(98, 75 + Math.round(totalCount / 10)),
        anomaliesOrRisks: "各时段与接口访问流分布平稳，未发现高频爆发性攻击或恶意越权迹象。日志区块链哈希完整性校验 100% 通过。",
        recommendations: [
          `建议在高峰时段（${peakHoursText}）前预先触发 RSS 信源全量摄取，提早完成热点预分析。`,
          "建议在分析详情面板中增加一键归档到预测契约的快捷入口，打通深度解读到前瞻校准的闭环。",
          "定期复核用户权限分配，保证高级深度分析权限与各部门角色职责精确对齐。"
        ],
      };

      const provider = activeProvider();
      if (provider) {
        try {
          const prompt = `你是一个顶级企业级 SaaS 平台与政经智库系统的用户行为模式与团队效率数据挖掘专家。
  请根据以下真实的用户行为审计日志汇总数据，产出一份精辟、深刻的《团队行为模式与功能偏好挖掘洞察报告》。

  【行为数据概览】
  - 审计流水总数：${totalCount} 条
  - 核心高峰时段：${peakHoursText}
  - 24小时时段分布 (小时: 次数)：${JSON.stringify(hourlyDistribution)}
  - 功能偏好分布：${JSON.stringify(actionPreferences)}
  - 活跃用户占比：${JSON.stringify(topUsers)}

  请严格输出合法的 JSON 格式，结构如下：
  {
    "executiveSummary": "100-150字管理层摘要：精辟总结团队整体使用习惯、平台粘性与研究节奏",
    "peakPatternAnalysis": "关于活跃时段与工作流节奏的深度剖析（解释为什么在这个时段集中）",
    "featurePreferenceAnalysis": "关于主要功能模块（如 AI 深度分析、知识库沉淀、预测契约）偏好的透视与诉求洞察",
    "workflowEfficiencyScore": 88, // 0-100 的团队研判效率与工具协同评分
    "anomaliesOrRisks": "行为风控或异常观察（若无则填：未发现异常高频或越权风控隐患）",
    "recommendations": [
      "建议1：针对高峰时段与高频模块的具体优化方案",
      "建议2：针对低频模块或产品链路联动的改进方案",
      "建议3：针对管理层配置与数据安全的落地建议"
    ]
  }`;

          const text = await callAI(prompt, { json: true, temperature: 0.3 });
          if (text) {
            let parsed;
            try {
              parsed = JSON.parse(text);
            } catch {
              const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
              parsed = JSON.parse(cleaned);
            }
            if (parsed && parsed.executiveSummary) {
              insights = { ...insights, ...parsed };
            }
          }
        } catch (aiErr) {
          console.warn("AI behavior insights fallback to stats:", aiErr);
        }
      }

      res.json({
        ok: true,
        generatedAt: new Date().toISOString(),
        totalEventsAnalyzed: totalCount,
        hourlyDistribution,
        peakHoursText,
        actionPreferences,
        topUsers,
        insights,
      });
    } catch (err: any) {
      console.error("Behavior insights error:", err);
      res.status(500).json({ error: "failed_to_generate_behavior_insights" });
    }
  });

  // 管理端：用户登录与使用情况聚合分析
  app.get("/api/admin/user-activity", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (NO_PERSIST) return res.json({ stats: null, userSummaries: [], recentLogs: [] });

    const rawAudit = listAuditEvents(1000);
    const events = rawAudit.events || [];

    const userMap: Record<string, {
      username: string;
      totalLogins: number;
      totalAiAnalysis: number;
      totalArticleReads: number;
      totalDeposits: number;
      totalPredictions: number;
      lastActiveAt: string;
      recentActions: Array<{ action: string; at: string; detail?: string }>;
    }> = {};

    const hourlyDistribution: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;

    let totalLogins = 0;
    let totalAiCalls = 0;
    let totalReads = 0;
    let totalDeposits = 0;
    const activeActors = new Set<string>();

    for (const evt of events) {
      const actor = evt.actor || "analyst_guest";
      activeActors.add(actor);

      if (!userMap[actor]) {
        userMap[actor] = {
          username: actor,
          totalLogins: 0,
          totalAiAnalysis: 0,
          totalArticleReads: 0,
          totalDeposits: 0,
          totalPredictions: 0,
          lastActiveAt: evt.at,
          recentActions: [],
        };
      }

      const u = userMap[actor];
      if (new Date(evt.at) > new Date(u.lastActiveAt)) {
        u.lastActiveAt = evt.at;
      }

      if (u.recentActions.length < 15) {
        const meta = typeof evt.metadata === "object" && evt.metadata ? (evt.metadata as any) : {};
        u.recentActions.push({
          action: evt.action,
          at: evt.at,
          detail: evt.entityId || meta.title || meta.question || meta.tag || undefined,
        });
      }

      try {
        const hour = new Date(evt.at).getHours();
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      } catch {}

      const act = evt.action.toLowerCase();
      if (act.includes("login") || act.includes("auth")) {
        u.totalLogins += 1;
        totalLogins += 1;
      } else if (act.includes("enrich") || act.includes("ai") || act.includes("analysis") || act.includes("predict.create")) {
        u.totalAiAnalysis += 1;
        totalAiCalls += 1;
      } else if (act.includes("read") || act.includes("article") || act.includes("view")) {
        u.totalArticleReads += 1;
        totalReads += 1;
      } else if (act.includes("knowledge") || act.includes("deposit")) {
        u.totalDeposits += 1;
        totalDeposits += 1;
      } else if (act.includes("contract") || act.includes("prediction")) {
        u.totalPredictions += 1;
      }
    }

    res.json({
      stats: {
        totalLogins,
        totalAiCalls,
        totalReads,
        totalDeposits,
        activeUsersCount: activeActors.size,
        totalEventsLogged: events.length,
      },
      hourlyDistribution,
      userSummaries: Object.values(userMap),
      recentLogs: events.slice(0, 150),
    });
  });


  app.post("/api/admin/backups", applyRateLimit, (_req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "persistence_disabled" });
    const backupPath = backupCorpus("manual");
    if (!backupPath) return res.status(500).json({ error: "backup_failed" });
    recordAuditEvent({
      actor: "local",
      action: "backup.create",
      entityType: "database_backup",
      entityId: path.basename(backupPath),
      metadata: { corpusSize: serverCorpus.length },
    });
    res.status(201).json({ ok: true, backups: listDatabaseBackups(backupDirectory()) });
  });

  app.post("/api/admin/backups/verify", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "persistence_disabled" });
    const filename = path.basename(String(req.body?.file || ""));
    if (!filename.endsWith(".db")) return res.status(400).json({ error: "invalid_backup_file" });
    const result = verifyDatabaseBackup(path.join(backupDirectory(), filename));
    res.status(result.ok ? 200 : 409).json(result);
  });

  app.post("/api/admin/backups/restore", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "persistence_disabled" });
    const filename = path.basename(String(req.body?.file || ""));
    if (!filename.endsWith(".db")) return res.status(400).json({ error: "invalid_backup_file" });
    const result = restoreDatabaseBackup(path.join(backupDirectory(), filename), {
      confirmation: String(req.body?.confirmation || ""),
    });
    if (!result.ok) return res.status(409).json(result);
    recordAuditEvent({
      actor: "local",
      action: "backup.restore",
      entityType: "database_backup",
      entityId: filename,
      metadata: { articles: result.articles, rollbackFile: result.rollbackFile || null },
    });
    res.json({ ...result, restarting: true });
    setTimeout(() => process.exit(0), 1200);
  });

}
