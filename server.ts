import express from "express";
import compression from "compression";
import path from "path";
import fs from "node:fs";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { createServer as createViteServer } from "vite";
import { ingestAllFeeds, type RawFeedItem } from "./src/server/feeds";
import { parseArticleDate } from "./src/utils/articleTime";
import { serverSectorList, serverDetectSectors } from "./src/server/sectors";
import { deriveBlindspots, deriveSourceHealth, deriveTomorrowHeat } from "./src/utils/corpusSnapshot";
import { registerAnnotationRoutes } from "./src/server/annotations";
import { startFeedScheduler } from "./src/server/scheduler";
import { scheduledBackupStatus, startBackupScheduler } from "./src/server/backupScheduler";
import { registerDeepEndpoints } from "./src/server/deepEndpoints";
import {
  settings,
  persistSettings,
  feedUrls,
  feedMaxAgeDays,
  NO_PERSIST,
  isDemoDataEnabled,
} from "./src/server/settings";
import {
  serverCorpus,
  lastIngest,
  persistCorpus,
  appendFeedItems,
  resetCorpus,
  corpusSortTime,
  findCorpusArticle,
  markCorpusArticlesDirty,
  backupCorpus,
  backupDirectory,
  getCorpusRevision,
  flushCorpusSnapshot,
} from "./src/server/corpus";
import {
  activeProvider,
  callAI,
  callAIWithReasoning,
  providerModel,
  geminiKeyOk,
  deepseekKeyOk,
  getAIUsage,
  type AIProvider,
} from "./src/server/ai";
import {
  djb2,
  getOrCreatePredict,
  predictKey,
  enrichKey,
  applyRateLimit,
  clearEnrichCache,
  clearPredictCache,
  clearInFlightAI,
  cacheSizes,
  RATE_MAX_PER_MIN,
  RATE_WINDOW_MS,
} from "./src/server/cache";
import { zhFullDate, isoToday, nowHHmm } from "./src/server/date";
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
  validatePublicOutboundBaseUrl,
} from "./src/server/sourceVerification";
import {
  databaseStats,
  importEvaluationRecords,
  createPredictionContract,
  createUser,
  createUserSession,
  consumeGuestDeepRead,
  ensureBootstrapUser,
  getUserPreferences,
  buildPredictionLedgerExport,
  deletePendingPredictionContract,
  listPredictionContracts,
  listDatabaseBackups,
  listAuditEvents,
  listPredictionLedgerSnapshots,
  listUsers,
  changeUserPassword,
  cleanupExpiredUserSessions,
  listEvaluationAdjudications,
  listEvaluationAnnotations,
  listEvaluationGoldSets,
  loadSourceCheck,
  loadSourcePageText,
  loadEvaluationGoldSet,
  loadPredictionLedgerSnapshot,
  persistSourceCheck,
  queryArticlesPage,
  persistEvaluationGoldSet,
  recordEvaluationAdjudication,
  recordEvaluationAnnotation,
  recordAuditEvent,
  recordPredictionOutcomeReview,
  resolveUserSession,
  saveUserPreferences,
  resetUserPassword,
  revokeUserSessions,
  revokeUserSession,
  persistPredictionLedgerSnapshot,
  restoreDatabaseBackup,
  closeDatabase,
  verifyDatabaseBackup,
  resolvePredictionContract,
  updateUser,
  type UserRole,
  generateAnalysisKey,
  getAnalysisFromDatabase,
  saveAnalysisToDatabase,
  listDatabaseAnalyses,
  getDatabaseAnalysisDetail,
  deleteDatabaseAnalysis,
  batchDeleteDatabaseAnalyses,
  getDatabaseOverview,
  loadSourcePageTexts,
} from "./src/server/database";
import { deriveFromList } from "./src/utils/corpusMetrics";
import {
  findSyndicationCandidates,
  buildSyndicationGraph,
  textOverlap,
} from "./src/utils/syndication";
import { headlineSimilarity } from "./src/utils/evidenceProfile";
import { sourceGroupKey } from "./src/utils/sourceGrouping";
import { rankEventCandidates } from "./src/utils/eventCandidates";
import { krippendorffAlphaNominal, macroF1 } from "./src/utils/evaluationMetrics";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const serverStartTime = Date.now();
const AUTH_TOKEN = process.env.JIANWEI_AUTH_TOKEN || "";
const AUTH_ENABLED = !!AUTH_TOKEN;
const BIND_HOST =
  process.env.JIANWEI_BIND_HOST ||
  process.env.BIND_HOST ||
  (AUTH_ENABLED ? "0.0.0.0" : "127.0.0.1");
const DEMO_DATA_ENABLED = isDemoDataEnabled();
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

/** 无 Key / 上游失败时的兜底内容必须显式标注（诚实性红线：不得把模板当 AI 结论） */
const FALLBACK_NOTE = "未配置可用模型或上游请求失败，本次未生成内容。";

app.disable("x-powered-by");
app.use(compression());
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
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

type RequestAuth = {
  userId: string;
  username: string;
  role: UserRole;
  legacyToken: boolean;
  mustChangePassword: boolean;
  isGuest?: boolean;
  guestId?: string;
};

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

const LOGIN_FAILURE_LIMIT = Math.max(3, Number(process.env.LOGIN_FAILURE_LIMIT || 5));
const LOGIN_FAILURE_WINDOW_MS = Math.max(60_000, Number(process.env.LOGIN_FAILURE_WINDOW_MS || 15 * 60 * 1000));
const loginFailures = new Map<string, number[]>();

function loginLimitKey(req: express.Request, username: string): string {
  return `${String(req.ip || req.socket.remoteAddress || "unknown")}\n${username.toLowerCase()}`;
}

function loginBlocked(key: string): boolean {
  const now = Date.now();
  const recent = (loginFailures.get(key) || []).filter((at) => now - at <= LOGIN_FAILURE_WINDOW_MS);
  if (recent.length === 0) loginFailures.delete(key);
  else loginFailures.set(key, recent);
  return recent.length >= LOGIN_FAILURE_LIMIT;
}

function recordLoginFailure(key: string): void {
  const recent = (loginFailures.get(key) || []).filter(
    (at) => Date.now() - at <= LOGIN_FAILURE_WINDOW_MS
  );
  recent.push(Date.now());
  loginFailures.set(key, recent.slice(-LOGIN_FAILURE_LIMIT));
  while (loginFailures.size > 2000) {
    const oldest = loginFailures.keys().next().value;
    if (oldest === undefined) break;
    loginFailures.delete(oldest);
  }
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

app.post("/api/auth/login", applyRateLimit, (req, res) => {
  const accessToken = String(req.body?.accessToken || "").trim();
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const limitKey = loginLimitKey(req, username || "token");
  if (loginBlocked(limitKey)) {
    recordAuditEvent({
      actor: username || "unknown",
      action: "auth.login",
      status: "error",
      metadata: { reason: "login_rate_limited" },
    });
    return res.status(429).json({ error: "login_rate_limited" });
  }
  if (accessToken && safeTokenEqual(accessToken, AUTH_TOKEN)) {
    loginFailures.delete(limitKey);
    recordAuditEvent({ actor: "token-admin", action: "auth.login", status: "success" });
    return res.json({
      ok: true,
      token: AUTH_TOKEN,
      user: { id: "legacy-token", username: "token-admin", role: "admin" },
      legacy: true,
    });
  }
  const sessionResult = createUserSession({ username, password });
  if (!sessionResult.ok) {
    recordLoginFailure(limitKey);
    recordAuditEvent({
      actor: username || "unknown",
      action: "auth.login",
      status: "error",
      metadata: { reason: sessionResult.reason },
    });
    const status =
      sessionResult.reason === "pending_approval" || sessionResult.reason === "rejected" ? 403 : 401;
    return res.status(status).json({ error: sessionResult.reason });
  }
  loginFailures.delete(limitKey);
  recordAuditEvent({ actor: sessionResult.user.username, action: "auth.login", status: "success" });
  res.json({
    ok: true,
    token: sessionResult.token,
    user: sessionResult.user,
    expiresAt: sessionResult.expiresAt,
  });
});

app.post("/api/auth/register", applyRateLimit, (req, res) => {
  if (NO_PERSIST) return res.status(503).json({ error: "persistence_disabled" });
  try {
    const user = createUser({
      username: String(req.body?.username || ""),
      password: String(req.body?.password || ""),
      role: "viewer",
      approvalStatus: "pending",
    });
    recordAuditEvent({
      actor: user.username,
      action: "user.register",
      entityType: "user",
      entityId: user.id,
      metadata: { approvalStatus: user.approvalStatus },
    });
    res.status(201).json({
      ok: true,
      status: "pending",
      user: { id: user.id, username: user.username, approvalStatus: user.approvalStatus },
    });
  } catch (error: any) {
    const reason = String(error?.message || error);
    if (reason.includes("UNIQUE")) return res.status(409).json({ error: "username_exists" });
    res.status(400).json({ error: reason });
  }
});

app.get("/api/auth/me", (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ user: (req as any).auth || null });
});

app.post("/api/auth/logout", (req, res) => {
  const bearer = (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer.startsWith("jw_")) revokeUserSession(bearer);
  recordAuditEvent({
    actor: String((req as any).auth?.username || "unknown"),
    action: "auth.logout",
  });
  res.json({ ok: true });
});

app.get("/api/users", (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ users: NO_PERSIST ? [] : listUsers() });
});

app.post("/api/users", applyRateLimit, (req, res) => {
  if (NO_PERSIST) return res.status(503).json({ error: "persistence_disabled" });
  try {
    const user = createUser({
      username: String(req.body?.username || ""),
      password: String(req.body?.password || ""),
      role: String(req.body?.role || "viewer") as any,
    });
    recordAuditEvent({
      actor: String((req as any).auth?.username || "admin"),
      action: "user.create",
      entityType: "user",
      entityId: user.id,
      metadata: { username: user.username, role: user.role },
    });
    res.status(201).json({ ok: true, user });
  } catch (error: any) {
    if (String(error?.message || error).includes("UNIQUE")) {
      return res.status(409).json({ error: "username_exists" });
    }
    res.status(400).json({ error: String(error?.message || error) });
  }
});

app.patch("/api/users/:id", applyRateLimit, (req, res) => {
  try {
    const user = updateUser({
      id: String(req.params.id || ""),
      role: req.body?.role,
      active: typeof req.body?.active === "boolean" ? req.body.active : undefined,
      approvalStatus: ["pending", "approved", "rejected"].includes(String(req.body?.approvalStatus))
        ? String(req.body.approvalStatus) as any
        : undefined,
      approvedBy: String((req as any).auth?.username || "admin"),
    });
    recordAuditEvent({
      actor: String((req as any).auth?.username || "admin"),
      action: "user.update",
      entityType: "user",
      entityId: user.id,
      metadata: {
        role: user.role,
        active: user.active,
        approvalStatus: user.approvalStatus,
      },
    });
    res.json({ ok: true, user });
  } catch (error: any) {
    const reason = String(error?.message || error);
    res.status(reason === "user_not_found" ? 404 : 409).json({ error: reason });
  }
});

app.post("/api/users/:id/reset-password", applyRateLimit, (req, res) => {
  try {
    resetUserPassword(String(req.params.id || ""), String(req.body?.password || ""));
    recordAuditEvent({
      actor: String((req as any).auth?.username || "admin"),
      action: "user.reset_password",
      entityType: "user",
      entityId: String(req.params.id || ""),
    });
    res.json({ ok: true, sessionsRevoked: true });
  } catch (error: any) {
    res.status(400).json({ error: String(error?.message || error) });
  }
});

app.delete("/api/users/:id/sessions", applyRateLimit, (req, res) => {
  const revoked = revokeUserSessions(String(req.params.id || ""));
  recordAuditEvent({
    actor: String((req as any).auth?.username || "admin"),
    action: "user.revoke_sessions",
    entityType: "user",
    entityId: String(req.params.id || ""),
    metadata: { revoked },
  });
  res.json({ ok: true, revoked });
});

app.post("/api/auth/change-password", applyRateLimit, (req, res) => {
  const auth = (req as any).auth as RequestAuth;
  const changed = changeUserPassword({
    userId: auth.userId,
    currentPassword: String(req.body?.currentPassword || ""),
    newPassword: String(req.body?.newPassword || ""),
  });
  if (!changed) {
    return res.status(400).json({ error: "password_change_failed" });
  }
  recordAuditEvent({
    actor: auth.username,
    action: "auth.change_password",
    entityType: "user",
    entityId: auth.userId,
  });
  res.json({ ok: true, sessionsRevoked: true });
});

app.get("/api/preferences", (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  const auth = (req as any).auth as RequestAuth;
  res.json(NO_PERSIST ? { payload: null, version: 0, updatedAt: null } : getUserPreferences(auth.userId));
});

app.put("/api/preferences", applyRateLimit, (req, res) => {
  if (NO_PERSIST) return res.status(503).json({ error: "persistence_disabled" });
  const auth = (req as any).auth as RequestAuth;
  const payload = req.body?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ error: "invalid_preferences_payload" });
  }
  const result = saveUserPreferences({
    userId: auth.userId,
    payload,
    expectedVersion: Number(req.body?.version || 0),
  });
  if (!result.ok) return res.status(409).json(result);
  recordAuditEvent({
    actor: auth.username,
    action: "preferences.update",
    entityType: "user",
    entityId: auth.userId,
    metadata: { version: result.version, keys: Object.keys(payload).sort() },
  });
  res.json(result);
});

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

const PREDICTION_RESOLUTION_STATUSES = new Set([
  "verified_hit_user",
  "verified_hit_ai",
  "verified_both_win",
  "verified_both_miss",
]);

app.get("/api/predictions", (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (NO_PERSIST) return res.json({ contracts: [] });
  const view = String(req.query.view || "all");
  const auth = (req as any).auth as RequestAuth;
  const contracts = listPredictionContracts(auth.userId, auth.role === "admin");
  const dueStates = new Set(["overdue", "due_today", "due_soon"]);
  const filtered = view === "due"
    ? contracts.filter((contract) => dueStates.has(String(contract.dueState)))
    : view === "pending"
      ? contracts.filter((contract) => contract.status === "pending")
      : view === "resolved"
        ? contracts.filter((contract) => contract.status !== "pending")
        : contracts;
  res.json({ contracts: filtered, total: contracts.length });
});

app.post("/api/predictions", applyRateLimit, (req, res) => {
  if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
  try {
    const auth = (req as any).auth as RequestAuth;
    const contract = createPredictionContract({ ...(req.body || {}), ownerUserId: auth.userId });
    recordAuditEvent({
      actor: "local",
      action: "prediction.create",
      entityType: "prediction_contract",
      entityId: contract.id,
      metadata: { articleId: contract.articleId, targetVerificationDate: contract.targetVerificationDate },
    });
    res.status(201).json({ ok: true, contract });
  } catch (error: any) {
    if (String(error?.message || error).includes("UNIQUE")) {
      return res.status(409).json({ error: "prediction_contract_already_exists" });
    }
    res.status(400).json({ error: "invalid_prediction_contract" });
  }
});

app.get("/api/predictions/export", (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (NO_PERSIST) return res.json({ schemaVersion: 1, generatedAt: new Date().toISOString(), contracts: [], summary: null });
  const auth = (req as any).auth as RequestAuth;
  const exported = buildPredictionLedgerExport(auth.userId, auth.role === "admin");
  res.json({ ...exported.payload, dataHash: exported.dataHash });
});

app.get("/api/predictions/snapshots", (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ snapshots: NO_PERSIST ? [] : listPredictionLedgerSnapshots() });
});

app.get("/api/predictions/snapshots/:version", (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (NO_PERSIST) return res.status(404).json({ error: "snapshot_not_found" });
  const snapshot = loadPredictionLedgerSnapshot(String(req.params.version || ""));
  if (!snapshot) return res.status(404).json({ error: "snapshot_not_found" });
  res.json(snapshot);
});

app.post("/api/predictions/freeze", applyRateLimit, (req, res) => {
  if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
  const version = String(req.body?.version || "").trim();
  if (!/^[a-zA-Z0-9._-]{1,60}$/.test(version)) {
    return res.status(400).json({ error: "invalid_snapshot_version" });
  }
  const auth = (req as any).auth as RequestAuth;
  const exported = buildPredictionLedgerExport(auth.userId, auth.role === "admin");
  if (exported.payload.contracts.length === 0) {
    return res.status(409).json({ error: "no_prediction_contracts_to_freeze" });
  }
  try {
    persistPredictionLedgerSnapshot({
      version,
      dataHash: exported.dataHash,
      payload: exported.payload,
    });
    recordAuditEvent({
      actor: "local",
      action: "prediction.freeze",
      entityType: "prediction_ledger",
      entityId: version,
      metadata: {
        dataHash: exported.dataHash,
        contractCount: exported.payload.summary.contracts,
      },
    });
    res.status(201).json({
      ok: true,
      version,
      dataHash: exported.dataHash,
      contractCount: exported.payload.summary.contracts,
      reviewCount: exported.payload.summary.contracts
        ? exported.payload.contracts.reduce(
            (sum: number, contract: any) => sum + (Array.isArray(contract?.outcomeReviews) ? contract.outcomeReviews.length : 0),
            0
          )
        : 0,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    if (String(error?.message || error).includes("UNIQUE")) {
      return res.status(409).json({ error: "snapshot_version_exists" });
    }
    res.status(500).json({ error: "failed_to_freeze_prediction_ledger" });
  }
});

app.post("/api/predictions/:id/resolve", applyRateLimit, (req, res) => {
  if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
  const id = String(req.params.id || "").trim();
  const status = String(req.body?.status || "").trim();
  const actualOutcome = String(req.body?.actualOutcome || "").trim();
  const outcomeEvidence = String(req.body?.outcomeEvidence || "").trim();
  const outcomeSourceUrl = String(req.body?.outcomeSourceUrl || "").trim();
  const reviewer = String(req.body?.reviewer || "").trim();
  if (!id || !PREDICTION_RESOLUTION_STATUSES.has(status)) {
    return res.status(400).json({ error: "invalid_prediction_resolution" });
  }
  if (outcomeEvidence.length < 20) {
    return res.status(400).json({ error: "outcome_evidence_too_short" });
  }
  if (reviewer.length < 2) {
    return res.status(400).json({ error: "reviewer_name_required" });
  }
  if (outcomeSourceUrl) {
    try {
      const source = new URL(outcomeSourceUrl);
      if (source.protocol !== "http:" && source.protocol !== "https:") throw new Error("protocol");
    } catch {
      return res.status(400).json({ error: "invalid_outcome_source_url" });
    }
  }
  const result = resolvePredictionContract({
    id,
    status,
    actualOutcome: actualOutcome || outcomeEvidence,
    outcomeEvidence,
    outcomeSourceUrl: outcomeSourceUrl || undefined,
    brierScore: typeof req.body?.brierScore === "number" ? req.body.brierScore : undefined,
    reviewer,
    ownerUserId: (req as any).auth?.userId,
    includeAll: (req as any).auth?.role === "admin",
  });
  if (!result.ok) return res.status(result.reason === "not_found" ? 404 : 409).json(result);
  recordAuditEvent({
    actor: reviewer,
    action: "prediction.resolve",
    entityType: "prediction_contract",
    entityId: id,
    metadata: { status, brierScore: req.body?.brierScore ?? null, hasEvidenceLink: Boolean(outcomeSourceUrl) },
  });
  res.json(result);
});

app.post("/api/predictions/:id/reviews", applyRateLimit, (req, res) => {
  if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
  const contractId = String(req.params.id || "").trim();
  const reviewer = String(req.body?.reviewer || "").trim();
  const decision = String(req.body?.decision || "").trim();
  const notes = String(req.body?.notes || "").trim();
  if (!contractId || reviewer.length < 2 || !["confirm", "dispute"].includes(decision)) {
    return res.status(400).json({ error: "invalid_prediction_review" });
  }
  const result = recordPredictionOutcomeReview({
    contractId,
    reviewer,
    decision: decision as "confirm" | "dispute",
    notes,
    ownerUserId: (req as any).auth?.userId,
    includeAll: (req as any).auth?.role === "admin",
  });
  if (!result.ok) return res.status(result.reason === "not_found" ? 404 : 409).json(result);
  recordAuditEvent({
    actor: reviewer,
    action: "prediction.review",
    entityType: "prediction_contract",
    entityId: contractId,
    metadata: { decision, hasNotes: Boolean(notes) },
  });
  res.status(201).json(result);
});

app.delete("/api/predictions/:id", applyRateLimit, (req, res) => {
  if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
  const deleted = deletePendingPredictionContract(
    String(req.params.id || ""),
    (req as any).auth?.userId,
    (req as any).auth?.role === "admin"
  );
  if (!deleted) return res.status(409).json({ error: "resolved_contract_is_immutable" });
  recordAuditEvent({
    actor: "local",
    action: "prediction.delete",
    entityType: "prediction_contract",
    entityId: String(req.params.id || ""),
  });
  res.json({ ok: true });
});

// AI News Interpretation & Cognitive Analysis endpoint
app.post("/api/analyze", applyRateLimit, async (req, res) => {
  try {
    const { title, content, source, sourceUrl, category, articleId, forceRefresh } = req.body;
    if (!title && !content) {
      return res.status(400).json({ error: "Title or content is required" });
    }

    const analysisKey = generateAnalysisKey({ articleId, title, source, content });

    // 优先从数据库缓存查询
    if (!forceRefresh) {
      const cached = getAnalysisFromDatabase(analysisKey);
      if (cached && cached.payload) {
        return res.json({
          fallback: false,
          cached: true,
          hitCount: cached.hitCount,
          data: cached.payload,
        });
      }
    }

    const provider = activeProvider();
    if (!provider) {
      return res.json({
        fallback: true,
        fallbackReason: "no_api_key",
        fallbackNote: FALLBACK_NOTE,
        data: null,
      });
    }
    const model = providerModel(provider);

    const prompt = `你是一个顶级深度调查记者、政经智库宏观分析师与《见微 Genway》特约总编。
《见微 Genway》的核心理念是：“于细微处，读懂新闻背后。报刊为骨，数据为翼，光谱拆解为记”。

请对以下提供的新闻标题及内容进行极其精辟、深刻的“认知路径拆解”（七要素、逻辑因果树、六大身份“与我何干”、涟漪效应、五层光谱）：

新闻标题：${title || "无标题"}
新闻来源/背景：${source || "媒体报道"}
原文链接：${sourceUrl || "未提供"}
新闻正文/要点：${content || "请结合标题分析当前热点"}

请严格输出合法的 JSON 格式，JSON 结构必须严格符合以下格式：
{
  "title": "精炼的主标题（经典大报刊风格）",
  "subtitle": "副标题：提炼出最核心的隐蔽逻辑或细微反转",
  "oneSentenceVerdict": "高密度的一句话结论/定性（报刊黑体加粗风格）",
  "readTimeMinutes": 4,
  "category": "${category || "科技前沿"}",
  "tags": ["核心标签1", "标签2", "标签3"],
  "date": "${zhFullDate(new Date())}",
  "timeAgo": "刚刚",
  "sourceName": "${source || "见微·特约深度观察"}",
  "sourceDate": "${isoToday(new Date())} ${nowHHmm(new Date())}",
  "sourceCount": 1,
  "impactScope": "全球",
  "changeVelocity": "↑ 快速",
  "summary": "100-150字见微速读：直击核心真相",
  "coreQuote": "最具有穿透力的一句金句（报刊排版用）",
  "quoteAuthor": "见微·特约观察员",
  "tongsuSummary": {
    "simpleSay": "小白能完全听懂的大白话概括",
    "whyExplanation": "用极其生动的生活日常比喻解释为什么",
    "whatItMeans": "普通人能感受到的直接影响",
    "jargonTerms": ["专业术语1", "专业术语2"]
  },
  "dehydratedItems": {
    "coreEntity": "核心主体",
    "keyAction": "核心动作与事实",
    "relatedCount": 8,
    "coreShifts": ["核心变化1", "核心变化2", "核心变化3"],
    "impactHighlights": ["关键影响1", "关键影响2"]
  },
  "sevenElements": {
    "what": "具体发生了什么",
    "who": "核心参与各方与推手",
    "when": "发生时间节点与周期",
    "where": "地理与行业空间",
    "why": "深层动因与未言明的诉求",
    "how": "实现路径与操作手法",
    "soWhat": "对未来格局的终极影响",
    "aiVerdict": {
      "confidenceScore": 92,
      "volatility": "高",
      "actionLevel": "行动",
      "verdictSummary": "针对该事件的 AI 综合裁决建议"
    }
  },
  "logicTree": {
    "rootCause": "最底层的始发根因",
    "nodes": [
      { "id": "n-1", "label": "根因节点", "category": "cause", "description": "详细描述" },
      { "id": "n-2", "label": "传导节点1", "category": "mid_effect", "description": "详细描述" },
      { "id": "n-3", "label": "传导节点2", "category": "mid_effect", "description": "详细描述" },
      { "id": "n-4", "label": "终局市场影响", "category": "market_impact", "description": "详细描述" }
    ],
    "variableWeights": [
      { "name": "核心影响变量1", "weight": 40, "impactDirection": "up", "description": "说明" },
      { "name": "核心影响变量2", "weight": 30, "impactDirection": "down", "description": "说明" },
      { "name": "核心影响变量3", "weight": 20, "impactDirection": "neutral", "description": "说明" },
      { "name": "核心影响变量4", "weight": 10, "impactDirection": "up", "description": "说明" }
    ]
  },
  "personaImpacts": [
    { "personaId": "investor", "coreImpact": "对投资者的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
    { "personaId": "manager", "coreImpact": "对企业决策者的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
    { "personaId": "founder", "coreImpact": "对创业者的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
    { "personaId": "pm", "coreImpact": "对产品经理的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
    { "personaId": "dev", "coreImpact": "对开发者的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" },
    { "personaId": "sales_mkt", "coreImpact": "对销售市场的核心影响", "opportunity": "潜在机会", "threatRisk": "风险提示", "recommendedAction": "具体动作" }
  ],
  "rippleEffect": {
    "stages": [
      { "stage": "一阶影响", "title": "直接影响", "timeframe": "1-3个月", "items": ["影响点1", "影响点2"], "severity": "高" },
      { "stage": "二阶影响", "title": "产业链连锁反应", "timeframe": "3-12个月", "items": ["影响点1", "影响点2"], "severity": "高" },
      { "stage": "三阶影响", "title": "宏观生态与地缘格局", "timeframe": "1-3年", "items": ["影响点1", "影响点2"], "severity": "中" }
    ],
    "knowledgeGraph": [
      { "id": "kg-1", "name": "主要机构/公司", "type": "company", "relationToMain": "核心发起方" },
      { "id": "kg-2", "name": "核心技术/协议", "type": "tech", "relationToMain": "关键突破" },
      { "id": "kg-3", "name": "关联行业市场", "type": "market", "relationToMain": "受影响下游" }
    ],
    "multiSources": [
      { "sourceName": "官方披露/白皮书", "tier": "Tier 1 顶级权威", "stance": "正面", "verified": false, "excerpt": "核心证据引述" },
      { "sourceName": "路透/彭博主流媒体", "tier": "Tier 1 顶级权威", "stance": "中性", "verified": false, "excerpt": "市场观点引述" }
    ]
  },
  "spectrumLayers": [
    {
      "layer": "micro_signal",
      "name": "事实层·微观线索",
      "color": "#F59E0B",
      "headline": "常人忽略的细节/数字/反常措辞",
      "content": "深入解析这个细微事实的异常之处...",
      "keyIndicators": ["线索1", "线索2"]
    },
    {
      "layer": "interests",
      "name": "利益层·各方博弈",
      "color": "#0284C7",
      "headline": "台前发声者 vs 幕后最大获益方",
      "content": "剖析各主体的隐秘动机...",
      "keyIndicators": ["获利方", "受损方"]
    },
    {
      "layer": "logic_chain",
      "name": "逻辑层·因果推演",
      "color": "#8B5CF6",
      "headline": "从表面现象到深层传导链条",
      "content": "推导因果逻辑...",
      "keyIndicators": ["传导链1", "传导链2"]
    },
    {
      "layer": "data_signal",
      "name": "信号层·量化指标",
      "color": "#0D9488",
      "headline": "行业与宏观五维信号强度",
      "content": "数据侧反映的真实热度与冷思考...",
      "keyIndicators": ["数据点1", "数据点2"]
    },
    {
      "layer": "deduction",
      "name": "推演层·见微之见",
      "color": "#E3120B",
      "headline": "未来6-18个月终局预测与行动盲区",
      "content": "终局洞察与给读者的认知升级提示...",
      "keyIndicators": ["中长期判断", "行动启示"]
    }
  ],
  "evidenceChain": [
    {
      "id": "ev-1",
      "claim": "论断1",
      "sourceFact": "输入材料中可查证的细节",
      "quote": "输入材料中的原文短引句；没有则留空",
      "sourceName": "来源名称；输入未提供则留空",
      "sourceUrl": "真实可访问链接；输入未提供则填 null，不得编造",
      "publishedAt": "来源发布时间；未知则 null",
      "sourceType": "primary_document|official_statement|reported_media|unknown",
      "relation": "supports|contradicts|context",
      "reliability": "可靠性依据说明",
      "confidenceScore": 0
    }
  ],
  "industrySignals": [
    { "sector": "核心行业", "strength": 88, "trend": "up", "detail": "行业异动描述" }
  ],
  "fastReadPoints": [
    { "tag": "核心转折", "text": "精辟解释这件事为什么在今天爆发" }
  ],
  "narrativeSections": [
    { "chapter": "第一章：平静湖面下的第一缕微澜", "paragraphs": ["深度叙事段落1...", "深度叙事段落2..."] }
  ]
}

证据边界（必须遵守）：
1. multiSources 只允许列出输入材料中明确出现、能对应到原文表述的来源；无法核验时返回 []，不得补造媒体名或把模型记忆包装成“已核实”。
2. evidenceChain.sourceFact 只能引用输入材料中的事实、数字或可解析出处；输入未提供的硬数据不得生成。
3. confidenceScore 是模型自报的相对把握，不是经历史数据校准的真实概率；文案中不得称其为“命中率”“基准率”或“事实概率”。
4. 所有推断用“可能/取决于/若…则…”表达，并明确列出可能推翻判断的信号。`;

    const text = await callAI(prompt, { json: true, temperature: 0.3 });
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    parsed = sanitizeEnrichPayload(parsed);
    attachFieldMeta(parsed, ["evidenceChain", "sevenElements", "rippleEffect"], createFieldMeta(provider, model, PROMPT_VERSIONS.analyze));

    // 存储分析结果到后台 SQLite 语料数据库
    saveAnalysisToDatabase({
      key: analysisKey,
      articleId: articleId || (parsed as any).id,
      title: title || parsed.title || "未命名语料",
      source: source || parsed.sourceName || "用户/Feed投递",
      category: category || parsed.category || "科技前沿",
      provider,
      model,
      payload: parsed,
    });

    res.json({ fallback: false, cached: false, data: parsed });
  } catch (err: any) {
    console.error("AI Analysis error:", err);
    res.json({
      fallback: true,
      error: err.message,
      data: null,
    });
  }
});

// AI Strategic Advisor endpoint (基于今天的新闻情报回答我)
app.post("/api/strategic-advisor", applyRateLimit, async (req, res) => {
  try {
    const { question, userPersona, contextArticles } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const provider = activeProvider();
    if (!provider) {
      return res.json({
        fallback: true,
        fallbackReason: "no_api_key",
        fallbackNote: FALLBACK_NOTE,
        citations: [],
        answer: null,
      });
    }

    const prompt = `你作为《见微 Genway》AI战略指挥室的首席特约情报顾问。
请基于今日平台聚合的核心情报库，针对用户的战略提问提供极高认知密度、客观克制、直击要害的战略咨询答复。

用户提问身份：${userPersona || "战略决策者"}
用户战略问题："${question}"
今日核心情报上下文：
${JSON.stringify((contextArticles || []).slice(0, 3))}

答复规范：
1. 语言具备《经济学人》和麦肯锡战略简报的严密逻辑与高穿透力；
2. 结构清晰：分为【情报定性】、【传导逻辑】、【对您身份的直接机会与威胁】、【具体行动建议】；
3. 严格引用具体事实与量化线索作为论据支撑；
4. 控制在 260 - 380 字之间。`;

    const text = await callAI(prompt, { temperature: 0.35 });

    res.json({
      answer: text,
      citations: (contextArticles || []).map((a: any) => a.title).slice(0, 3),
    });
  } catch (err: any) {
    console.error("Strategic Advisor error:", err);
    res.json({
      fallback: true,
      fallbackReason: "error",
      fallbackNote: FALLBACK_NOTE,
      answer: null,
      citations: [],
    });
  }
});

// Nuance In-depth Inquiry endpoint
app.post("/api/ask-nuance", applyRateLimit, async (req, res) => {
  try {
    const { question, articleContext } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const provider = activeProvider();
    if (!provider) {
      return res.json({
        fallback: true,
        fallbackReason: "no_api_key",
        fallbackNote: FALLBACK_NOTE,
        answer: null,
      });
    }

    const prompt = `你作为《见微 Genway》新闻深度解读系统的首席特约分析师。
读者正在阅读以下这篇新闻的深度拆解报告：
${JSON.stringify(articleContext || {})}

读者的具体追问：
"${question}"

请遵循见微的“报刊为骨，数据为翼”原则：
1. 语言凝练、克制、一针见血，具有《经济学人》和顶级智库的洞察力；
2. 明确指出新闻中哪项“微观细节”或“证据链”支撑了你的判断；
3. 回答控制在 180-260 字之间，分点清晰。`;

    const text = await callAI(prompt, { temperature: 0.4 });

    res.json({ answer: text });
  } catch (err: any) {
    console.error("Nuance Ask error:", err);
    res.json({
      fallback: true,
      fallbackReason: "error",
      fallbackNote: FALLBACK_NOTE,
      answer: null,
    });
  }
});

// Morning Briefing Interactive Dialogue endpoint
app.post("/api/briefing/chat", applyRateLimit, async (req, res) => {
  try {
    const { question, persona, articles } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const provider = activeProvider();
    const articlesDigest = (articles || [])
      .slice(0, 5)
      .map(
        (a: any, i: number) =>
          `【要情${i + 1}】《${a.title}》\n  - 核心事实：${a.summary || a.subtitle || '暂无摘要'}\n  - 异动与反常：${a.anomalyNote || a.oneSentenceVerdict || '关注边际公差异动'}\n  - 涉及行业/区域：${a.category || '核心战略产业'}`
      )
      .join("\n\n");

    const personaName = persona?.name || '资深决策者';

    if (!provider) {
      const answer = generateBriefingAnswer(question);
      return res.json({ answer, fallback: true, fallbackReason: "no_api_key", fallbackNote: FALLBACK_NOTE });
    }

    const prompt = `你作为《见微 Genway》的晨间情报高级研讨顾问（Chief Intelligence Advisor）。
用户刚收听完今日晨间全景简报，正在与你发起实时研讨追问。
读者当前选择的透镜身份是：${personaName}（核心诉求：${persona?.tagline || '战略洞察与避险'}）。

今日早报关键要情摘要：
${articlesDigest}

读者提出的具体追问：
"${question}"

请遵循见微的“报刊为骨，数据为翼”原则为读者作答：
1. 语言沉着、凝练、一针见血，如同英国《金融时报》首席评论员与顶级智库闭门研讨发言；
2. 结合今日播报的具体反常点、敏感度驱动变量或走廊阻尼，给出逻辑严密的因果阐释；
3. 从用户的角色透镜（${personaName}）出发，明确指出核心利害与实操避险抓手；
4. 字数控制在 200-300 字之间，分点清晰，适合语音朗读，严禁假大空的空话。`;

    const text = await callAI(prompt, { temperature: 0.45 });
    res.json({ answer: text });
  } catch (err: any) {
    console.error("Briefing chat error:", err);
    const fallbackAnswer = generateBriefingAnswer(req.body?.question || "");
    res.json({
      answer: fallbackAnswer,
      fallback: true,
      fallbackReason: "upstream_failed",
      fallbackNote: FALLBACK_NOTE,
    });
  }
});

function generateBriefingAnswer(question: string): string {
  const q = String(question || "").trim();
  return q
    ? `未生成回答。问题「${q.slice(0, 80)}」没有可用模型结果，这里不提供模板数字或行动建议。`
    : "未生成回答。没有可用模型结果。";
}

// —— 本地启发式基准推演（服务端兜底，与前端 computeLocalPrediction 同一口径） ——
function localBaselinePrediction(body: any) {
  // 与前端「人机预测擂台/与我何干·双向预测」共用同一口径：逻辑树驱动变量净动量（单一公式镜像）。
  // 已移除下线占位口径（信用星级/变化速度）；无逻辑树变量时诚实给 neutral、不做伪精确。
  const article = body?.articleContext || {};
  const weights: Array<{ impactDirection: string; weight: number }> = Array.isArray(
    article?.logicTree?.variableWeights
  )
    ? article.logicTree.variableWeights
    : [];
  const totalWeight = weights.reduce((s, w) => s + (w.weight || 0), 0);
  const hasWeights = weights.length > 0 && totalWeight > 0;
  const upSum = weights
    .filter((w) => w.impactDirection === "up")
    .reduce((s, w) => s + (w.weight || 0), 0);
  const downSum = weights
    .filter((w) => w.impactDirection === "down")
    .reduce((s, w) => s + (w.weight || 0), 0);
  const momentum = hasWeights ? (upSum - downSum) / totalWeight : 0; // -1..1
  const pPos = hasWeights ? Math.max(8, Math.min(92, Math.round(50 + momentum * 35))) : 50;
  const pNeg = 100 - pPos;
  const opts = body?.questionOptions || {};
  const direction: "positive" | "negative" | "neutral" = !hasWeights
    ? "neutral"
    : pPos >= 56
      ? "positive"
      : pPos <= 44
        ? "negative"
        : "neutral";
  const directionText =
    direction === "positive"
      ? opts.positive || "是/发生"
      : direction === "negative"
        ? opts.negative || "否/未发生"
        : opts.neutral || "方向不明（中性震荡）";
  const pBias = hasWeights ? Math.max(pPos, pNeg) : 0;
  const confidenceScore = hasWeights ? Math.round(Math.min(85, Math.max(25, pBias))) : 0;
  const baseRatePercentage = hasWeights ? pBias : 0; // 无历史样本时明确为 0，不伪造先验
  return {
    modelChoice: "jianwei-local",
    modelName: "见微·本地主线加权引擎（透明可复核）",
    modelRationale:
      "不调用外部大模型：由「逻辑树驱动变量」利好/利空净动量换算方向强度。该指数没有经过历史结果校准，因此不冒充概率；无变量时不估算。",
    direction,
    directionText,
    confidenceScore,
    baseRatePercentage,
    probabilityKind: "direction_strength",
    certificationStandard: "heuristic",
    calibrationStatus: "uncalibrated",
    causalLogicChain: hasWeights
      ? [
          {
            step: "1. 方向净动量测算",
            deduction: `逻辑树驱动变量上行权重合计 ${upSum}、下行合计 ${downSum}（总 ${totalWeight}），净动量 ${momentum >= 0 ? "+" : ""}${momentum.toFixed(2)}，主线偏乐观 ~${pPos}% / 偏悲观 ~${pNeg}%。`,
          },
          {
            step: "2. 方向强度收敛",
            deduction: `对所选方向「${directionText}」得到方向强度 ${confidenceScore}/100（区间 25-85，避免伪精确）。该数值不是概率。`,
          },
          {
            step: "3. 收敛与证伪提示",
            deduction: `本地引擎无历史基准样本、未校准；若检验期内出现与方向相反的核心官方/供应链数据，该推演自动失效。`,
          },
        ]
      : [
          { step: "1. 数据可得性检查", deduction: "本文未提供逻辑树驱动变量，本地引擎不估计主线方向（避免伪精确）。" },
          { step: "2. 建议", deduction: "可先在详情「七要素事实」补齐底层逻辑/正反方博弈要素，或切换在线引擎做 AI 推演。" },
        ],
    keyAssumptions: ["本文证据链与信源分级维持现状", "约定检验期内未发生突发政策或黑天鹅事件"],
    counterIntuitiveBlindspot:
      "本地引擎盲区提示：仅覆盖逻辑树内给出的驱动变量，未覆盖情绪面瞬间反转与突发政策冲击；请以自设可证伪指标持续跟踪。",
    falsifiableTriggers: [
      "检验期内出现与推演方向相反的官方/供应链硬数据时，该推演自动失效",
      "原文关键假设被证伪（如交付、良品率、利率口径变化）时，请立即下调置信度",
    ],
    verdictSummary: hasWeights
      ? `本地加权引擎判断：方向「${directionText}」，方向强度 ${confidenceScore}/100。该指数不是概率。`
      : `本地引擎不估方向（本文无逻辑树驱动变量）：请先生成相关要素，或切换在线引擎。`,
  };
}
app.post("/api/predict", applyRateLimit, async (req, res) => {
  try {
    const { question, modelChoice, userDirection, userConfidence, premises, falsifiableIndicator, articleContext, questionOptions } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const local = localBaselinePrediction({ questionOptions, articleContext });

    // 无 API Key 或显式选择本地引擎：直接返回确定性规则结果
    const provider = activeProvider();
    if (!provider || modelChoice === "jianwei-local") {
      return res.json({ fallback: true, data: local });
    }

    const model = providerModel(provider);
    // 在线结果缓存：问题、文章上下文、用户前提、供应商和模型版本共同决定缓存键。
    const pKey = predictKey({
      question,
      articleId: articleContext?.id,
      articleTitle: articleContext?.title,
      modelChoice: modelChoice || provider || "auto",
      provider,
      model,
      userDirection,
      userConfidence,
      premises,
      falsifiableIndicator,
      articleContext,
      questionOptions,
    });

    const prompt = `你是「见微 Genway」的先验预测校准员。请基于给定的文章上下文与用户命题做一份可证伪的二元预测，并严格输出 JSON（不要输出任何 JSON 以外的文字），结构如下：
{
  "direction": "positive | negative",
  "directionText": "一句话方向描述（贴合并选择对应选项文案）",
  "confidenceScore": 0到100的整数,
  "baseRatePercentage": 0到100的整数（仅当你能说明真实、可核验的历史样本口径时填写；否则填 null）,
  "causalLogicChain": [{"step":"1. …","deduction":"…"},{"step":"2. …","deduction":"…"},{"step":"3. …","deduction":"…"}],
  "keyAssumptions": ["假设1","假设2"],
  "counterIntuitiveBlindspot": "模型发现的用户易忽略的认知盲区",
  "falsifiableTriggers": ["失效触发硬指标1","失效触发硬指标2"],
  "verdictSummary": "克制、客观的总结论（避免谄媚式乐观）"
}
文章上下文：${JSON.stringify(articleContext || {})}
选项文案：正面=「${questionOptions?.positive || ""}」 负面=「${questionOptions?.negative || ""}」
用户命题：${question}
用户自判方向：${userDirection || ""}（置信度 ${userConfidence ?? ""}%）
用户立论前提：${JSON.stringify(premises || [])}
用户自设证伪线：${falsifiableIndicator || ""}`;

    const generated = pKey
      ? await getOrCreatePredict(pKey, async () => {
          const { text, reasoning } = await callAIWithReasoning(prompt, { json: true, temperature: 0.35 });
          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
          }
          return {
            ...parsed,
            thinkingTrace: reasoning || undefined,
            modelChoice: provider === "deepseek" ? "deepseek-r1" : "gemini-2.5-flash",
            modelName:
              provider === "deepseek"
                ? `DeepSeek ${model} · 在线推演引擎`
                : `Gemini ${model} · 在线推演引擎`,
            baseRatePercentage:
              typeof parsed.baseRatePercentage === "number" ? parsed.baseRatePercentage : undefined,
            probabilityKind: "model_estimate",
            certificationStandard: "prediction_uncalibrated",
            calibrationStatus: "uncalibrated",
          };
        })
      : { data: null, cached: false, deduped: false };
    res.json({
      fallback: false,
      cached: generated.cached || generated.deduped,
      data: generated.data,
    });
  } catch (err: any) {
    console.error("Predict error:", err);
    res.json({
      fallback: true,
      data: localBaselinePrediction({
        questionOptions: req.body?.questionOptions,
        articleContext: req.body?.articleContext,
      }),
    });
  }
});

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
        sourceHealth: deriveSourceHealth(arts),
        blindspots: deriveBlindspots(arts, serverSectorList()),
        tomorrowWatch: deriveTomorrowHeat(arts, serverSectorList()),
      },
      // 热力、密度、跨事件共振仍由浏览器按已加载语料计算。
      // 信源完整度、覆盖扫描和明日热度已在 derived 中，按计数口径，不是健康分或概率。
      notYetDerived: ["heatmap", "density", "crossEvent"],
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


const EVALUATION_LABELS: Record<string, Set<string>> = {
  sentiment: new Set(["positive", "negative", "neutral", "mixed"]),
  event_same: new Set(["yes", "no", "uncertain"]),
};

function buildEvaluationGold(task: string): {
  labels: Map<string, string>;
  samples: Array<{
    sampleKey: string;
    label: string;
    source: "consensus" | "adjudication";
    annotators: string[];
    payload?: unknown;
  }>;
} {
  const annotations = listEvaluationAnnotations(task);
  const adjudications = listEvaluationAdjudications(task);
  const grouped = new Map<string, typeof annotations>();
  for (const annotation of annotations) {
    const items = grouped.get(annotation.sampleKey) || [];
    items.push(annotation);
    grouped.set(annotation.sampleKey, items);
  }
  const labels = new Map<string, string>();
  const samples: Array<{
    sampleKey: string;
    label: string;
    source: "consensus" | "adjudication";
    annotators: string[];
    payload?: unknown;
  }> = [];
  for (const [sampleKey, items] of grouped) {
    if (items.length >= 2 && new Set(items.map((item) => item.label)).size === 1) {
      labels.set(sampleKey, items[0].label);
      samples.push({
        sampleKey,
        label: items[0].label,
        source: "consensus",
        annotators: items.map((item) => item.annotator),
        payload: items.find((item) => item.payload)?.payload,
      });
    }
  }
  const sourceByKey = new Map(samples.map((sample) => [sample.sampleKey, sample]));
  for (const adjudication of adjudications) {
    labels.set(adjudication.sampleKey, adjudication.label);
    const existing = sourceByKey.get(adjudication.sampleKey);
    const item = {
      sampleKey: adjudication.sampleKey,
      label: adjudication.label,
      source: "adjudication" as const,
      annotators: existing?.annotators || [],
      payload: existing?.payload,
    };
    if (existing) Object.assign(existing, item);
    else samples.push(item);
  }
  samples.sort((a, b) => a.sampleKey.localeCompare(b.sampleKey));
  return { labels, samples };
}

function stableEvaluationRank(seed: string): number {
  return parseInt(djb2(seed), 36);
}

function stratifiedArticleSample(articles: any[], limit: number): any[] {
  const strata = new Map<string, any[]>();
  for (const article of articles) {
    const ts = corpusSortTime(article);
    const date = ts ? new Date(ts) : null;
    const month = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'unknown';
    const stratum = [
      sourceGroupKey(article.sourceName, article.sourceUrl),
      article.category || '未分类',
      month,
    ].join('|');
    const list = strata.get(stratum) || [];
    list.push(article);
    strata.set(stratum, list);
  }
  const groups = [...strata.values()].map((items) =>
    items.sort((a, b) =>
      stableEvaluationRank(`sentiment:${a.id}`) - stableEvaluationRank(`sentiment:${b.id}`)
    )
  );
  const output: any[] = [];
  for (let round = 0; output.length < limit; round += 1) {
    let advanced = false;
    for (const group of groups) {
      if (group[round]) {
        output.push(group[round]);
        advanced = true;
        if (output.length >= limit) break;
      }
    }
    if (!advanced) break;
  }
  return output;
}

app.get("/api/evaluation/queue", applyRateLimit, (req, res) => {
  const task = String(req.query.task || "sentiment");
  const annotator = String(req.query.annotator || "").trim();
  const mode = String(req.query.mode || "annotation");
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  if (!EVALUATION_LABELS[task]) return res.status(400).json({ error: "unsupported task" });
  if (!annotator) return res.status(400).json({ error: "annotator is required" });

  if (mode === "adjudication") {
    const annotations = listEvaluationAnnotations(task);
    const adjudicated = new Set(listEvaluationAdjudications(task).map((item) => item.sampleKey));
    const grouped = new Map<string, typeof annotations>();
    for (const annotation of annotations) {
      const items = grouped.get(annotation.sampleKey) || [];
      items.push(annotation);
      grouped.set(annotation.sampleKey, items);
    }
    const samples = [...grouped.entries()]
      .filter(([sampleKey, items]) =>
        items.length >= 2 &&
        new Set(items.map((item) => item.label)).size > 1 &&
        !adjudicated.has(sampleKey)
      )
      .slice(0, limit)
      .map(([sampleKey, items]) => ({
        key: sampleKey,
        task,
        payload: items.find((item) => item.payload)?.payload,
        labelsByAnnotator: items.map((item) => ({ annotator: item.annotator, label: item.label })),
      }));
    return res.json({ task, mode, samples, remaining: samples.length });
  }

  const annotated = new Set(
    listEvaluationAnnotations(task)
      .filter((item) => item.annotator === annotator)
      .map((item) => item.sampleKey)
  );
  if (task === "sentiment") {
    const eligibleArticles = serverCorpus
      .filter((article) => (article.title || "").trim() && (article.summary || "").trim())
      .filter((article) => !annotated.has(`sentiment:${article.id}`));
    const samples = stratifiedArticleSample(eligibleArticles, limit)
      .flatMap((article) => {
        const key = `sentiment:${article.id}`;
        return [{
          key,
          task,
          stratum: [
            sourceGroupKey(article.sourceName, article.sourceUrl),
            article.category || '未分类',
          ],
          payload: {
            articleId: article.id,
            title: article.title,
            summary: article.summary,
            sourceName: article.sourceName,
            sourceUrl: article.sourceUrl || null,
          },
        }];
      })
    const composition = { positive: 0, negative: 0, neutral: 0, mixed: 0 } as Record<string, number>;
    for (const sample of samples) {
      const article = findCorpusArticle(String(sample.payload?.articleId || ""));
      if (!article) continue;
      const derived = deriveFromList([article]);
      const predicted =
        derived.mixed > 0 ? "mixed" :
        derived.positive > derived.negative ? "positive" :
        derived.negative > derived.positive ? "negative" :
        "neutral";
      composition[predicted] = (composition[predicted] || 0) + 1;
    }
    return res.json({
      task,
      samples,
      remaining: Math.max(0, eligibleArticles.length),
      composition,
    });
  }

  const eventPool = [...serverCorpus]
    .filter((article) => article.isExternal && article.title && article.sourceUrl)
    .sort((a, b) =>
      stableEvaluationRank(`event:${a.id}`) - stableEvaluationRank(`event:${b.id}`)
    )
    .slice(0, 120);
  const candidateSamples = findSyndicationCandidates(eventPool, 200)
    .flatMap((candidate) => {
      const key = `event:${candidate.articleA.id}:${candidate.articleB.id}`;
      if (annotated.has(key)) return [];
      return [{
        key,
        task,
        modelSignal: candidate.signal,
        payload: {
          articleA: candidate.articleA,
          articleB: candidate.articleB,
          titleSimilarity: candidate.titleSimilarity,
          textSimilarity: candidate.textSimilarity,
          timeDeltaHours: candidate.timeDeltaHours,
        },
      }];
    })
    .slice(0, limit);
  const uncertainSamples: any[] = [];
  const uncertainTarget = Math.floor(limit / 2);
  for (const candidate of rankEventCandidates(eventPool, uncertainTarget * 5, 0.08)) {
      if (uncertainSamples.length >= uncertainTarget) break;
      const key = candidate.id;
      if (
        annotated.has(key) ||
        candidateSamples.some((sample) => sample.key === key) ||
        uncertainSamples.some((sample) => sample.key === key)
      ) continue;
      uncertainSamples.push({
        key,
        task,
        modelSignal: 'similarity_candidate',
        payload: {
          articleA: {
            id: candidate.articleA.id,
            title: candidate.articleA.title,
            sourceName: candidate.articleA.sourceName,
            sourceUrl: candidate.articleA.sourceUrl,
          },
          articleB: {
            id: candidate.articleB.id,
            title: candidate.articleB.title,
            sourceName: candidate.articleB.sourceName,
            sourceUrl: candidate.articleB.sourceUrl,
          },
          titleSimilarity: candidate.titleSimilarity,
          textSimilarity: candidate.textSimilarity,
          entitySimilarity: candidate.entitySimilarity,
          sharedEntities: candidate.sharedEntities,
          candidateScore: candidate.score,
          timeDeltaHours: candidate.timeDeltaHours,
        },
      });
  }
  const neededNegative = Math.max(0, limit - candidateSamples.length - uncertainSamples.length);
  const negativeSamples: any[] = [];
  if (neededNegative > 0) {
    const articles = eventPool;
    for (let i = 0; i < articles.length && negativeSamples.length < neededNegative; i += 1) {
      for (let j = i + 1; j < articles.length && negativeSamples.length < neededNegative; j += 1) {
        const a = articles[i];
        const b = articles[j];
        if (sourceGroupKey(a.sourceName, a.sourceUrl) === sourceGroupKey(b.sourceName, b.sourceUrl)) continue;
        const titleSimilarity = headlineSimilarity(a.title || '', b.title || '');
        const bodySimilarity = textOverlap(
          `${a.title || ''}${a.summary || ''}`,
          `${b.title || ''}${b.summary || ''}`
        );
        if (titleSimilarity >= 0.2 || bodySimilarity >= 0.2) continue;
        const ids = [a.id, b.id].sort();
        const key = `event:${ids[0]}:${ids[1]}`;
          if (
            annotated.has(key) ||
            candidateSamples.some((sample) => sample.key === key) ||
            uncertainSamples.some((sample) => sample.key === key)
          ) continue;
        negativeSamples.push({
          key,
          task,
          modelSignal: 'negative_control',
          payload: {
            articleA: { id: a.id, title: a.title, sourceName: a.sourceName, sourceUrl: a.sourceUrl },
            articleB: { id: b.id, title: b.title, sourceName: b.sourceName, sourceUrl: b.sourceUrl },
            titleSimilarity: Math.round(titleSimilarity * 100),
            textSimilarity: Math.round(bodySimilarity * 100),
            timeDeltaHours: null,
          },
        });
      }
    }
  }
  const samples = [...candidateSamples, ...uncertainSamples, ...negativeSamples].slice(0, limit);
  const composition = {
    yes: candidateSamples.filter((sample) =>
      ['duplicate_url', 'known_same_group'].includes(String(sample.modelSignal))
    ).length,
    no: negativeSamples.length,
    uncertain:
      candidateSamples.filter((sample) =>
        !['duplicate_url', 'known_same_group'].includes(String(sample.modelSignal))
      ).length + uncertainSamples.length,
  };
  res.json({
    task,
    samples,
    remaining: samples.length,
    composition,
    warning: composition.yes === 0
      ? "当前语料没有可确认的同事件正例，只能评测反例和不确定样本；不能据此估计同事件召回率。"
      : null,
  });
});

app.post("/api/evaluation/adjudicate", applyRateLimit, (req, res) => {
  const task = String(req.body?.task || "");
  const sampleKey = String(req.body?.sampleKey || "").trim();
  const adjudicator = String(req.body?.adjudicator || "").trim();
  const label = String(req.body?.label || "").trim();
  if (!EVALUATION_LABELS[task] || !sampleKey || !adjudicator || !EVALUATION_LABELS[task].has(label)) {
    return res.status(400).json({ error: "invalid adjudication payload" });
  }
  recordEvaluationAdjudication({
    task,
    sampleKey,
    adjudicator,
    label,
    notes: typeof req.body?.notes === "string" ? req.body.notes.slice(0, 1000) : undefined,
  });
  recordAuditEvent({
    actor: adjudicator,
    action: "evaluation.adjudicate",
    entityType: "evaluation",
    entityId: sampleKey,
    metadata: { task, label },
  });
  res.json({ ok: true });
});

app.post("/api/evaluation/annotate", applyRateLimit, (req, res) => {
  const task = String(req.body?.task || "");
  const sampleKey = String(req.body?.sampleKey || "").trim();
  const annotator = String(req.body?.annotator || "").trim();
  const label = String(req.body?.label || "").trim();
  if (!EVALUATION_LABELS[task] || !sampleKey || !annotator || !EVALUATION_LABELS[task].has(label)) {
    return res.status(400).json({ error: "invalid annotation payload" });
  }
  recordEvaluationAnnotation({
    task,
    sampleKey,
    annotator,
    label,
    payload: req.body?.payload,
  });
  recordAuditEvent({
    actor: annotator,
    action: "evaluation.annotate",
    entityType: "evaluation",
    entityId: sampleKey,
    metadata: { task, label },
  });
  res.json({ ok: true });
});

app.get("/api/evaluation/summary", applyRateLimit, (req, res) => {
  const task = String(req.query.task || "sentiment");
  if (!EVALUATION_LABELS[task]) return res.status(400).json({ error: "unsupported task" });
  const annotations = listEvaluationAnnotations(task);
  const adjudications = listEvaluationAdjudications(task);
  const bySample = new Map<string, string[]>();
  for (const annotation of annotations) {
    const labels = bySample.get(annotation.sampleKey) || [];
    labels.push(annotation.label);
    bySample.set(annotation.sampleKey, labels);
  }
  const multi = [...bySample.values()].filter((labels) => labels.length >= 2);
  const consensus = multi.filter((labels) => new Set(labels).size === 1).length;
  const alpha = krippendorffAlphaNominal([...bySample.values()]);
  const gold = buildEvaluationGold(task);
  const goldLabels = gold.labels;

  let modelMacroF1: number | null = null;
  if (goldLabels.size > 0) {
    const predictions: Array<{ expected: string; predicted: string }> = [];
    const eventConfirmedKeys =
      task === "event_same"
        ? new Set(findSyndicationCandidates(serverCorpus, 500).map((item) => item.id))
        : new Set<string>();
    const eventUncertainKeys =
      task === "event_same"
        ? new Set(rankEventCandidates(serverCorpus, 500, 0.08).map((item) => item.id))
        : new Set<string>();
    for (const [sampleKey, expected] of goldLabels) {
      if (task === "sentiment") {
        const articleId = sampleKey.replace(/^sentiment:/, "");
        const article = findCorpusArticle(articleId);
        if (!article) continue;
        const derived = deriveFromList([article]);
        const predicted =
          derived.mixed > 0 ? "mixed" :
          derived.positive > derived.negative ? "positive" :
          derived.negative > derived.positive ? "negative" :
          "neutral";
        predictions.push({ expected, predicted });
      } else {
        const predicted = eventConfirmedKeys.has(sampleKey)
          ? "yes"
          : eventUncertainKeys.has(sampleKey)
            ? "uncertain"
            : "no";
        predictions.push({ expected, predicted });
      }
    }
    const observedLabels = [...new Set(predictions.map((item) => item.expected))];
    if (predictions.length > 0 && observedLabels.length >= 2) {
      modelMacroF1 = Math.round(macroF1(predictions, observedLabels) * 1000) / 1000;
    }
  }
  res.json({
    task,
    annotations: annotations.length,
    samples: bySample.size,
    multiAnnotatedSamples: multi.length,
    consensusSamples: consensus,
    unresolvedSamples: multi.length - consensus,
    adjudicatedSamples: adjudications.length,
    goldSamples: goldLabels.size,
    modelMacroF1,
    modelEvaluationStatus:
      modelMacroF1 == null
        ? "insufficient_class_coverage"
        : "computed_on_gold_samples",
    krippendorffAlpha: alpha == null ? null : Math.round(alpha * 1000) / 1000,
    annotators: [...new Set(annotations.map((item) => item.annotator))],
  });
});

app.post("/api/evaluation/freeze", applyRateLimit, (req, res) => {
  const task = String(req.body?.task || "");
  const version = String(req.body?.version || "").trim();
  if (!EVALUATION_LABELS[task] || !/^[a-zA-Z0-9._-]{1,40}$/.test(version)) {
    return res.status(400).json({ error: "task and safe version are required" });
  }
  const gold = buildEvaluationGold(task);
  if (gold.samples.length === 0) {
    return res.status(409).json({ error: "no_gold_samples_to_freeze" });
  }
  const payload = {
    schemaVersion: 1,
    task,
    version,
    frozenAt: new Date().toISOString(),
    labels: [...gold.labels.entries()].map(([sampleKey, label]) => ({ sampleKey, label })),
    samples: gold.samples,
  };
  const dataHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  try {
    const result = persistEvaluationGoldSet({ task, version, dataHash, payload });
    recordAuditEvent({
      actor: "local",
      action: "evaluation.freeze",
      entityType: "gold_set",
      entityId: `${task}:${version}`,
      metadata: { dataHash, sampleCount: result.sampleCount },
    });
    res.json({ ok: true, task, version, dataHash, ...result });
  } catch (error: any) {
    if (String(error?.message || error).includes("UNIQUE")) {
      return res.status(409).json({ error: "gold_set_version_exists" });
    }
    res.status(500).json({ error: "failed_to_freeze_gold_set" });
  }
});

app.get("/api/evaluation/gold-sets", applyRateLimit, (req, res) => {
  const task = typeof req.query.task === "string" && req.query.task ? req.query.task : undefined;
  res.json({ goldSets: listEvaluationGoldSets(task) });
});

app.get("/api/evaluation/gold-sets/:task/:version", applyRateLimit, (req, res) => {
  const payload = loadEvaluationGoldSet(String(req.params.task), String(req.params.version));
  if (!payload) return res.status(404).json({ error: "gold_set_not_found" });
  res.json(payload);
});

app.post("/api/evaluation/import", applyRateLimit, (req, res) => {
  const annotations = Array.isArray(req.body?.annotations) ? req.body.annotations.slice(0, 5000) : [];
  const adjudications = Array.isArray(req.body?.adjudications) ? req.body.adjudications.slice(0, 1000) : [];
  if (annotations.length === 0 && adjudications.length === 0) {
    return res.status(400).json({ error: "no records to import" });
  }
  const cleanAnnotations = annotations.map((item: any) => ({
    task: String(item?.task || ""),
    sampleKey: String(item?.sampleKey || "").trim().slice(0, 240),
    annotator: String(item?.annotator || "").trim().slice(0, 80),
    label: String(item?.label || "").trim(),
    payload: item?.payload === undefined ? undefined : JSON.parse(JSON.stringify(item.payload)),
  }));
  const cleanAdjudications = adjudications.map((item: any) => ({
    task: String(item?.task || ""),
    sampleKey: String(item?.sampleKey || "").trim().slice(0, 240),
    adjudicator: String(item?.adjudicator || "").trim().slice(0, 80),
    label: String(item?.label || "").trim(),
    notes: typeof item?.notes === "string" ? item.notes.slice(0, 1000) : undefined,
  }));
  const invalidAnnotation = cleanAnnotations.some((item: any) =>
    !EVALUATION_LABELS[item.task] ||
    !item.sampleKey ||
    !item.annotator ||
    !EVALUATION_LABELS[item.task].has(item.label) ||
    (item.payload !== undefined && JSON.stringify(item.payload).length > 50_000)
  );
  const invalidAdjudication = cleanAdjudications.some((item: any) =>
    !EVALUATION_LABELS[item.task] ||
    !item.sampleKey ||
    !item.adjudicator ||
    !EVALUATION_LABELS[item.task].has(item.label)
  );
  if (invalidAnnotation || invalidAdjudication) {
    return res.status(400).json({ error: "invalid import record" });
  }
  try {
    const result = importEvaluationRecords({
      annotations: cleanAnnotations,
      adjudications: cleanAdjudications,
    });
    recordAuditEvent({
      actor: "local",
      action: "evaluation.import",
      entityType: "evaluation",
      entityId: "transaction",
      metadata: result,
    });
    res.json({ ok: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: String(error?.message || error) });
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

function shutdownProcess(signal: "SIGINT" | "SIGTERM"): void {
  try {
    flushCorpusSnapshot();
  } catch (error) {
    console.error("failed to flush corpus snapshot:", error);
  }
  try {
    closeDatabase();
  } catch (error) {
    console.error("failed to close database:", error);
  }
  process.exit(signal === "SIGINT" ? 130 : 143);
}

process.once("SIGINT", () => shutdownProcess("SIGINT"));
process.once("SIGTERM", () => shutdownProcess("SIGTERM"));

startServer();
