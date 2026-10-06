import express from "express";
import compression from "compression";
import path from "path";
import fs from "node:fs";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { createServer as createViteServer } from "vite";

import {
  serverSectorList,
  serverDetectSectors,
} from "./src/server/sectors";
import { registerAnnotationRoutes } from "./src/server/annotations";
import { startFeedScheduler } from "./src/server/scheduler";
import {
  startBackupScheduler,
} from "./src/server/backupScheduler";
import { registerDeepEndpoints } from "./src/server/deepEndpoints";
import { registerAnalysisRoutes } from "./src/server/routes/analysisRoutes";
import { registerEvaluationRoutes } from "./src/server/routes/evaluationRoutes";
import { registerAuthRoutes, type RequestAuth } from "./src/server/routes/authRoutes";
import { registerPredictionRoutes } from "./src/server/routes/predictionRoutes";
import { registerAiChatRoutes } from "./src/server/routes/aiChatRoutes";
import { registerAdminRoutes } from "./src/server/routes/adminRoutes";
import { registerCorpusRoutes } from "./src/server/routes/corpusRoutes";
import {
  NO_PERSIST,
} from "./src/server/settings";
import {
  serverCorpus,
  persistCorpus,
  findCorpusArticle,
  ALLOW_DEMO_DATA,
} from "./src/server/corpus";
import {
  activeProvider,
  callAI,
  providerModel,
  geminiKeyOk,
  deepseekKeyOk,
} from "./src/server/ai";
import {
  applyRateLimit,
} from "./src/server/cache";
import {
  PROMPT_VERSIONS,
  attachFieldMeta,
  createFieldMeta,
  sanitizeEnrichPayload,
} from "./src/server/aiValidation";
import {
  evaluateQuoteMatch,
  inspectSourceDeduplicated,
  findQuoteContext,
  revalidateCachedQuote,
  sourceCheckKey,
} from "./src/server/sourceVerification";
import {
  consumeGuestDeepRead,
  ensureBootstrapUser,
  cleanupExpiredUserSessions,
  loadSourceCheck,
  loadSourcePageText,
  persistSourceCheck,
  resolveUserSession,
} from "./src/server/database";
import {
  buildSyndicationGraph,
} from "./src/utils/syndication";

const app = express();
const PORT = 3000;
const serverStartTime = Date.now();
const AUTH_TOKEN = process.env.JIANWEI_AUTH_TOKEN || "";
const AUTH_ENABLED = !!AUTH_TOKEN;
const BIND_HOST = "0.0.0.0";
const DEMO_DATA_ENABLED = ALLOW_DEMO_DATA;
const SOURCE_CHECK_TTL_MS = Number(process.env.SOURCE_CHECK_TTL_MS || 24 * 60 * 60 * 1000);
const BOOTSTRAP_ADMIN_USER = process.env.JIANWEI_ADMIN_USER || "";
const BOOTSTRAP_ADMIN_PASSWORD = process.env.JIANWEI_ADMIN_PASSWORD || "";

if (AUTH_ENABLED && BOOTSTRAP_ADMIN_USER && BOOTSTRAP_ADMIN_PASSWORD) {
  try {
    ensureBootstrapUser(BOOTSTRAP_ADMIN_USER, BOOTSTRAP_ADMIN_PASSWORD);
  } catch (error) {
    console.error("failed to bootstrap admin user:", error);
  }
}

/**
 * 旧版逐引句缓存可能早于正文快照修复，保留着不可复核的 quote_not_found。
 * 启动时仅使用已经保存的正文快照做确定性重算，不联网、不调用模型。
 */
function repairEvidenceQuoteChecks(): void {
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
  if (repaired > 0) console.log(`Repaired ${repaired} evidence quote cache entries from stored page snapshots.`);
}

repairEvidenceQuoteChecks();

function safeTokenEqual(received: string, expected: string): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

app.disable("x-powered-by");
app.use(compression() as unknown as express.RequestHandler);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use((req, res, next) => {
  const acceptsGzip = String(req.headers["accept-encoding"] || "")
    .split(",")
    .some((item) => item.trim().toLowerCase().startsWith("gzip"));
  if (!acceptsGzip) return next();
  const originalSend = res.send.bind(res);
  (res as any).send = (body: any) => {
    if (res.headersSent || res.getHeader("Content-Encoding")) return originalSend(body);
    const contentType = String(res.getHeader("Content-Type") || "");
    if (!/json|javascript|text|css|html/.test(contentType)) return originalSend(body);
    const buffer = Buffer.isBuffer(body)
      ? body
      : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    if (buffer.byteLength < 1024) return originalSend(body);
    return zlib.gzip(buffer, (error, compressed) => {
      if (error) {
        originalSend(body);
        return;
      }
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Length", String(compressed.byteLength));
      originalSend(compressed);
    });
  };
  next();
});

app.use(express.json({ limit: "5mb" }));
app.use("/api/evaluation", (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

const GUEST_ARTICLE_LIMIT = Math.max(1, Math.min(50, Number(process.env.GUEST_ARTICLE_LIMIT || 4)));
const GUEST_DEEP_READ_LIMIT = Math.max(1, Math.min(20, Number(process.env.GUEST_DEEP_READ_LIMIT || 1)));
const GUEST_COOKIE_NAME = "jw_guest_id";

function cookieValue(req: express.Request, name: string): string {
  const raw = String(req.header("cookie") || "");
  for (const item of raw.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function ensureGuestId(req: express.Request, res: express.Response): string {
  const existing = cookieValue(req, GUEST_COOKIE_NAME);
  if (/^guest_[a-f0-9]{24}$/.test(existing)) return existing;
  const guestId = `guest_${crypto.randomBytes(12).toString("hex")}`;
  res.append(
    "Set-Cookie",
    `${GUEST_COOKIE_NAME}=${encodeURIComponent(guestId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  );
  return guestId;
}

function isGuestReadRoute(pathname: string): boolean {
  return (
    pathname === "/corpus" ||
    pathname === "/snapshot" ||
    pathname === "/auth/me" ||
    pathname === "/preferences" ||
    pathname === "/predictions"
  );
}

function isGuestDeepRoute(pathname: string): boolean {
  return (
    pathname === "/enrich" ||
    pathname.startsWith("/skill/") ||
    pathname === "/analyze" ||
    pathname === "/ask-nuance" ||
    pathname === "/strategic-advisor" ||
    pathname === "/predict" ||
    pathname === "/source/inspect" ||
    pathname === "/source/reextract-evidence" ||
    pathname === "/region/interpret" ||
    pathname === "/intelligence/frequency"
  );
}

function requestAuth(req: express.Request): RequestAuth | null {
  const headerToken = req.header("x-jianwei-token") || "";
  const bearer = (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const presented = bearer || headerToken;
  if (safeTokenEqual(presented, AUTH_TOKEN)) {
    return {
      userId: "legacy-token",
      username: "token-admin",
      role: "admin",
      legacyToken: true,
      mustChangePassword: false,
    };
  }
  if (bearer.startsWith("jw_")) {
    const user = resolveUserSession(bearer);
    return user ? {
      userId: user.id,
      username: user.username,
      role: user.role,
      legacyToken: false,
      mustChangePassword: user.mustChangePassword,
    } : null;
  }
  return null;
}

app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/auth/login" || req.path === "/auth/register") return next();
  if (!AUTH_ENABLED) {
    (req as any).auth = {
      userId: "local",
      username: "local",
      role: "admin",
      legacyToken: false,
      mustChangePassword: false,
    } satisfies RequestAuth;
    return next();
  }
  const auth = requestAuth(req);
  if (!auth) {
    const guestId = ensureGuestId(req, res);
    const guestAuth: RequestAuth = {
      userId: `guest:${guestId}`,
      username: "guest",
      role: "viewer",
      legacyToken: false,
      mustChangePassword: false,
      isGuest: true,
      guestId,
    };
    (req as any).auth = guestAuth;
    if (["GET", "HEAD", "OPTIONS"].includes(req.method) && isGuestReadRoute(req.path)) {
      return next();
    }
    if (req.method === "POST" && isGuestDeepRoute(req.path)) {
      const usage = NO_PERSIST
        ? { allowed: true, deepReads: 1, remaining: 0 }
        : consumeGuestDeepRead(guestId, GUEST_DEEP_READ_LIMIT);
      if (!usage.allowed) {
        return res.status(403).json({
          error: "guest_deep_read_limit",
          message: "游客只能使用一次深度解读，请注册并等待管理员审批。",
        });
      }
      return next();
    }
    return res.status(401).json({
      error: "registration_required",
      message: "该功能需要注册并完成审批。",
    });
  }
  (req as any).auth = auth;
  const passwordChangeAllowed =
    req.path === "/auth/me" ||
    req.path === "/auth/logout" ||
    req.path === "/auth/change-password";
  if (auth.mustChangePassword && !passwordChangeAllowed) {
    return res.status(403).json({ error: "password_change_required" });
  }
  const adminOnly =
    req.path.startsWith("/admin") ||
    req.path.startsWith("/users") ||
    (req.path === "/settings" && req.method !== "GET");
  if (adminOnly && auth.role !== "admin") {
    return res.status(403).json({ error: "forbidden: admin role required" });
  }
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    !req.path.startsWith("/auth/") &&
    req.path !== "/preferences" &&
    auth.role === "viewer"
  ) {
    return res.status(403).json({ error: "forbidden: editor role required" });
  }
  next();
});

// 未配置访问令牌时：破坏性端点仅允许本机回环访问，防止局域网/公网误删语料或外发 Key
if (!AUTH_ENABLED) {
  const DESTRUCTIVE_ROUTES: Array<{ method: string; path: string }> = [
    { method: "POST", path: "/settings" },
    { method: "POST", path: "/admin/reset" },
    { method: "POST", path: "/admin/backups" },
    { method: "POST", path: "/admin/backups/restore" },
    { method: "POST", path: "/feeds/ingest" },
    { method: "POST", path: "/source/inspect" },
    { method: "POST", path: "/source/reextract-evidence" },
    { method: "POST", path: "/evaluation/import" },
    { method: "POST", path: "/evaluation/freeze" },
  ];
  app.use("/api", (req, res, next) => {
    const isDestructive = DESTRUCTIVE_ROUTES.some(
      (r) => r.method === req.method.toUpperCase() && r.path === req.path
    );
    if (!isDestructive) return next();
    const ip = String(req.ip || "").replace(/^::ffff:/, "");
    if (ip === "::1" || ip === "localhost" || ip.startsWith("127.")) return next();
    res.status(403).json({
      error: "forbidden: destructive endpoint is local-only unless JIANWEI_AUTH_TOKEN is set",
    });
  });
}

registerAnnotationRoutes(app, applyRateLimit);
registerDeepEndpoints(app, applyRateLimit);
registerAnalysisRoutes(app, applyRateLimit);
registerEvaluationRoutes(app, applyRateLimit);
registerAuthRoutes(app, applyRateLimit, { authToken: AUTH_TOKEN, safeTokenEqual });
registerPredictionRoutes(app, applyRateLimit);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const auth = requestAuth(req);
  res.json({
    status: "ok",
    authRequired: AUTH_ENABLED && !auth,
    user: auth ? {
      username: auth.username,
      role: auth.role,
      mustChangePassword: auth.mustChangePassword,
    } : null,
    hasApiKey: geminiKeyOk() || deepseekKeyOk(),
    ai: {
      provider: activeProvider(),
      gemini: geminiKeyOk(),
      deepseek: deepseekKeyOk(),
    },
    app: "见微 Genway · AI新闻情报与认知分析平台",
    // 构建指纹：供 rebuild.sh 校验「正在跑的就是刚构建的产物」，避免假成功
    build: (() => {
      const startedAt = new Date(serverStartTime).toISOString();
      try {
        const entry = process.argv[1] || "";
        const st = fs.statSync(entry);
        return { entry: path.basename(entry), startedAt, bundleMtimeMs: Math.round(st.mtimeMs) };
      } catch {
        return { entry: "", startedAt, bundleMtimeMs: 0 };
      }
    })(),
  });
});


registerAiChatRoutes(app, applyRateLimit);
registerCorpusRoutes(app, applyRateLimit);
registerAdminRoutes(app, applyRateLimit, {
  serverStartTime,
  demoDataEnabled: DEMO_DATA_ENABLED,
});

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

app.post("/api/article-timeline", applyRateLimit, async (req, res) => {
  const article = req.body?.article;
  if (!article || !article.title) {
    return res.status(400).json({ error: "article object with title is required" });
  }

  const provider = activeProvider();
  if (!provider) {
    // Deterministic fallback if AI provider is not available
    const isTech = String(article.category || "").includes("科技") || String(article.title).includes("AI") || String(article.title).includes("电池");
    const isGov = String(article.category || "").includes("政策") || String(article.title).includes("关税") || String(article.title).includes("监管");
    
    return res.json({
      summary: `围绕《${article.title}》的产业链演变脉络：从前期技术/政策酝酿到当前实质突破，再到后续连锁溢出。`,
      timeline: [
        {
          phase: "antecedent",
          phaseLabel: "📜 前因与溯源",
          timeLabel: "T-180D ~ T-30D 酝酿期",
          title: isGov ? "地缘贸易规则重审与前期反补贴立案调查" : isTech ? "上一代架构瓶颈凸显与研发中试线持续投入" : "供需失衡与行业集中度提升",
          detail: `在此次事件爆发前，相关主体已在行业标准制定、供应链原材料备货及专利布局上进行了多轮博弈与测试。`,
          impact: "推升了行业准入门槛与单点技术迁移成本。",
          keySignals: ["专利公开激增", "前期政策吹风会", "供应链散件排期延长"]
        },
        {
          phase: "current",
          phaseLabel: "⚡ 当前关键节点",
          timeLabel: "当前 (T0) 突破发生",
          title: article.title,
          detail: article.summary || article.tongsuSummary || "核心指标落地或关键协议签署，正式确立新的事实标准。",
          impact: article.oneSentenceVerdict || "重塑产业链利润分配格局，倒逼同业竞品调整应对策略。",
          keySignals: ["核心性能突破", "正式通告下发", "同业股价与现货价格波动"]
        },
        {
          phase: "future",
          phaseLabel: "🔮 潜在未来触发点",
          timeLabel: "T+30D ~ T+180D 演变窗口",
          title: isGov ? "属地化合规审查落地与关税正式执行节点" : isTech ? "规模化量产良品率爬坡与二代商业化竞品入场" : "上下游议价权重排与新订单周期释放",
          detail: "未来 90 天内需重点关注下游应用端客户采纳率、监管司法审查终裁及供应链二次扩产节奏。",
          impact: "决定该技术或政策是否能成为跨周期主导范式。",
          keySignals: ["客户留存与复购率", "海关通关抽检率", "第三方基准评测报告"]
        }
      ]
    });
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
    // Fallback response
    return res.json({
      summary: `围绕《${article.title}》的产业链演变脉络：从前期技术/政策酝酿到当前实质突破，再到后续连锁溢出。`,
      timeline: [
        {
          phase: "antecedent",
          phaseLabel: "📜 前因与溯源",
          timeLabel: "前序发酵期 (T-180D ~ T-30D)",
          title: "行业前置技术研发与政策立项准备",
          detail: "前期积累的研发投入、实验数据沉淀与地缘政策酝酿构成事件爆发的底层土壤。",
          impact: "催化上下游供应链提前进行产能与技术选型预备。",
          keySignals: ["早期论文与专利申报", "属地政策意见征求稿"]
        },
        {
          phase: "current",
          phaseLabel: "⚡ 当前关键节点",
          timeLabel: "当前正在发生 (T0)",
          title: article.title,
          detail: article.summary || article.tongsuSummary || "实质性技术点火或官方通告出台，确立全新市场预期。",
          impact: article.oneSentenceVerdict || "重塑行业竞争格局与利润分配机制。",
          keySignals: ["正式发布会 / 官方公报", "行业现货价格与订单异动"]
        },
        {
          phase: "future",
          phaseLabel: "🔮 潜在未来触发点",
          timeLabel: "未来演变窗口 (T+30D ~ T+180D)",
          title: "商业化规模量产验收与次生政策监管终裁",
          detail: "未来需密切跟进良品率爬坡数据、关键客户装车/部署反馈及海外监管跟进举措。",
          impact: "验证商业闭环成立并决定中长期市场占有率。",
          keySignals: ["首批大宗交付验收", "合规审查与反制通报"]
        }
      ]
    });
  }
});


// —— 多源立场冲突仲裁（真实同话题分组 + 在线模型立场判定；无 Key/失败时如实返回） ——
app.post("/api/conflicts", applyRateLimit, async (_req, res) => {
  try {
    const ext: any[] = serverCorpus.filter(
      (a: any) => a.isExternal === true && ((a.title || "") + (a.summary || "")).trim().length > 2
    );
    if (ext.length < 2) {
      return res.json({ ok: true, candidates: [], note: "语料中外部条目不足 2 篇，无法进行跨源比对。" });
    }

    // 1) 按赛道分组（关键词词典，见 src/utils/sectorTaxonomy.ts）
    const groups = new Map<string, any[]>();
    for (const a of ext) {
      for (const id of serverDetectSectors(a)) {
        const arr = groups.get(id) || [];
        arr.push(a);
        groups.set(id, arr);
      }
    }

    const candidates: Array<{ sectorId: string; sectorName: string; items: any[] }> = [];
    for (const sector of serverSectorList()) {
      const items = groups.get(sector.id) || [];
      const sources = new Set(items.map((i) => i.sourceName));
      if (sources.size >= 2 && items.length >= 2) {
        candidates.push({ sectorId: sector.id, sectorName: sector.name, items });
      }
    }
    candidates.sort((a, b) => new Set(b.items.map((i) => i.sourceName)).size - new Set(a.items.map((i) => i.sourceName)).size);
    const top = candidates.slice(0, 3);

    const provider = activeProvider();
    if (!provider) {
      return res.json({ ok: false, reason: "no_api_key", candidateSectors: top.map((c) => c.sectorName) });
    }

    const results = [];
    for (const cand of top) {
      // 每个候选取两个不同来源的“最新”条目
      const picked: any[] = [];
      const usedSrc = new Set<string>();
      for (let i = cand.items.length - 1; i >= 0 && picked.length < 2; i -= 1) {
        const it = cand.items[i];
        if (usedSrc.has(it.sourceName)) continue;
        usedSrc.add(it.sourceName);
        picked.push(it);
      }
      if (picked.length < 2) continue;

      const A = picked[0];
      const B = picked[1];
      const prompt = `你是「见微 Genway」的多源立场仲裁员。请对同一话题（${cand.sectorName}）来自两家不同来源的报道做立场判定，仅输出 JSON：
{"sources":[{"source":"来源A名称","stance":"正面|中性|负面","quote":"该源核心论断原句（≤60字）"},{"source":"来源B名称","stance":"正面|中性|负面","quote":"该源核心论断原句（≤60字）"}],"divergence":"一致|分歧|部分分歧","summary":"≤120字的克制仲裁小结"}
来源A（${A.sourceName}）：${String(A.title)}。${String(A.summary || "")}
来源B（${B.sourceName}）：${String(B.title)}。${String(B.summary || "")}`;
      const text = await callAI(prompt, { json: true, temperature: 0.2 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      if (parsed && Array.isArray(parsed.sources)) {
        results.push({
          topic: cand.sectorName,
          sources: parsed.sources.map((s: any) => ({
            source: String(s?.source || "").slice(0, 80),
            stance: s?.stance === "正面" ? "正面" : s?.stance === "负面" ? "负面" : "中性",
            quote: String(s?.quote || "").slice(0, 120),
          })),
          divergence: String(parsed.divergence || "未知").slice(0, 20),
          summary: String(parsed.summary || "").slice(0, 300),
        });
      }
    }

    res.json({ ok: true, provider, candidates: results, candidateSectors: top.map((c) => c.sectorName) });
  } catch (e: any) {
    console.error("Conflicts error:", e);
    res.json({ ok: false, reason: "error" });
  }
});


async function startServer() {
  if (!NO_PERSIST) cleanupExpiredUserSessions();
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const distRoot = path.resolve(distPath);
    const gzipAssetCache = new Map<string, { mtimeMs: number; gzip: Buffer }>();
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const acceptsGzip = String(req.headers["accept-encoding"] || "")
        .split(",")
        .some((item) => item.trim().toLowerCase().startsWith("gzip"));
      if (!acceptsGzip || !/\.(?:js|css)$/i.test(req.path || "")) return next();
      const filePath = path.resolve(distRoot, `.${decodeURIComponent(req.path || "")}`);
      if (!filePath.startsWith(`${distRoot}${path.sep}`)) return next();
      let stat: fs.Stats;
      try {
        stat = fs.statSync(filePath);
      } catch {
        return next();
      }
      if (!stat.isFile()) return next();
      const cacheKey = filePath;
      const cached = gzipAssetCache.get(cacheKey);
      if (!cached || cached.mtimeMs !== stat.mtimeMs) {
        const raw = fs.readFileSync(filePath);
        gzipAssetCache.set(cacheKey, {
          mtimeMs: stat.mtimeMs,
          gzip: zlib.gzipSync(raw, { level: 6 }),
        });
      }
      const asset = gzipAssetCache.get(cacheKey)!;
      const etag = `W/"gz-${stat.size}-${Math.round(stat.mtimeMs)}"`;
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Type", req.path.endsWith(".css")
        ? "text/css; charset=utf-8"
        : "application/javascript; charset=utf-8");
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("ETag", etag);
      if (req.headers["if-none-match"] === etag) {
        res.status(304).end();
        return;
      }
      res.setHeader("Content-Length", String(asset.gzip.byteLength));
      res.status(200).end(req.method === "HEAD" ? undefined : asset.gzip);
    });
    app.use(express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
          return;
        }
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, BIND_HOST, () => {
    console.log(`见微 Genway Server running on http://${BIND_HOST}:${PORT}`);
    startFeedScheduler();
    startBackupScheduler();
    if (!NO_PERSIST) {
      const sessionCleanup = setInterval(() => cleanupExpiredUserSessions(), 60 * 60 * 1000);
      sessionCleanup.unref?.();
    }
  });
}

startServer();
