import express from "express";
import compression from "compression";
import path from "path";
import fs from "node:fs";
import https from "node:https";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { createServer as createViteServer } from "vite";
import { ingestAllFeeds } from "./src/server/feeds";
import { parseArticleDate } from "./src/utils/articleTime";
import { serverSectorList } from "./src/server/sectors";
import { deriveBlindspots, deriveSourceHealth, deriveTomorrowHeat } from "./src/utils/corpusSnapshot";
import { deriveArrivalHeatBundle, deriveCrossEventTop, deriveDensityCurve } from "./src/utils/arrivalPanels";
import { registerAnnotationRoutes } from "./src/server/annotations";
import { startFeedScheduler } from "./src/server/scheduler";
import { startBackupScheduler } from "./src/server/backupScheduler";
import { registerDeepEndpoints } from "./src/server/deepEndpoints";
import { registerAdminConsoleRoutes } from "./src/server/adminConsoleRoutes";
import { registerSourceRoutes } from "./src/server/sourceRoutes";
import { registerEvaluationRoutes } from "./src/server/evaluationRoutes";
import { registerConflictRoutes } from "./src/server/conflictRoutes";
import {
  settings,
  feedUrls,
  feedMaxAgeDays,
  NO_PERSIST,
  isDemoDataEnabled,
} from "./src/server/settings";
import {
  serverCorpus,
  lastIngest,
  appendFeedItems,
  corpusSortTime,
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
} from "./src/server/ai";
import { getOrCreatePredict, predictKey, applyRateLimit } from "./src/server/cache";
import { assessPublicExposure, resolveBindHost } from "./src/server/publicExposure";
import { zhFullDate, isoToday, nowHHmm } from "./src/server/date";
import {
  PROMPT_VERSIONS,
  attachFieldMeta,
  createFieldMeta,
  sanitizeEnrichPayload,
} from "./src/server/aiValidation";
import {
  evaluateQuoteMatch,
  findQuoteContext,
  sourceCheckKey,
} from "./src/server/sourceVerification";
import {
  createPredictionContract,
  createUser,
  createUserSession,
  consumeGuestDeepRead,
  ensureBootstrapUser,
  getUserPreferences,
  buildPredictionLedgerExport,
  deletePendingPredictionContract,
  listPredictionContracts,
  listPredictionLedgerSnapshots,
  listUsers,
  changeUserPassword,
  cleanupExpiredUserSessions,
  loadSourcePageText,
  loadPredictionLedgerSnapshot,
  persistSourceCheck,
  queryArticlesPage,
  recordAuditEvent,
  recordPredictionOutcomeReview,
  resolveUserSession,
  saveUserPreferences,
  resetUserPassword,
  revokeUserSessions,
  revokeUserSession,
  persistPredictionLedgerSnapshot,
  closeDatabase,
  resolvePredictionContract,
  updateUser,
  type UserRole,
  generateAnalysisKey,
  getAnalysisFromDatabase,
  saveAnalysisToDatabase,
} from "./src/server/database";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const serverStartTime = Date.now();
const AUTH_TOKEN = process.env.JIANWEI_AUTH_TOKEN || "";
const AUTH_ENABLED = !!AUTH_TOKEN;
const BIND_HOST = resolveBindHost(process.env.JIANWEI_BIND_HOST || process.env.BIND_HOST);
const TLS_CERT_PATH = String(process.env.JIANWEI_TLS_CERT || "").trim();
const TLS_KEY_PATH = String(process.env.JIANWEI_TLS_KEY || "").trim();
function tlsMaterialReadable(): boolean {
  if (!TLS_CERT_PATH || !TLS_KEY_PATH) return false;
  try {
    fs.accessSync(TLS_CERT_PATH, fs.constants.R_OK);
    fs.accessSync(TLS_KEY_PATH, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
const exposure = assessPublicExposure({
  bindHost: BIND_HOST,
  authToken: AUTH_TOKEN,
  encryptionSecret: process.env.JIANWEI_SECRET || "",
  adminUser: process.env.JIANWEI_ADMIN_USER || "",
  adminPassword: process.env.JIANWEI_ADMIN_PASSWORD || "",
  persistDisabled: NO_PERSIST,
  tlsCertPath: TLS_CERT_PATH,
  tlsKeyPath: TLS_KEY_PATH,
  tlsMaterialReadable: tlsMaterialReadable(),
  behindTls: process.env.JIANWEI_BEHIND_TLS,
});
const DEMO_DATA_ENABLED = isDemoDataEnabled();
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
    exposure,
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


registerAdminConsoleRoutes(app, {
  serverStartTime,
  exposure,
  demoDataEnabled: DEMO_DATA_ENABLED,
});

registerSourceRoutes(app);


registerEvaluationRoutes(app);


registerConflictRoutes(app);


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

  if (!exposure.ok) {
    console.error(exposure.note);
    for (const item of exposure.missing) console.error(`- ${item}`);
    process.exit(1);
  }
  const onListen = () => {
    const scheme = exposure.tls === "node" ? "https" : "http";
    console.log(`见微 Genway Server running on ${scheme}://${BIND_HOST}:${PORT}`);
    if (exposure.tls === "upstream") {
      console.log("进程本身仍是 HTTP，TLS 由前置代理终止。");
    }
    startFeedScheduler();
    startBackupScheduler();
    if (!NO_PERSIST) {
      const sessionCleanup = setInterval(() => cleanupExpiredUserSessions(), 60 * 60 * 1000);
      sessionCleanup.unref?.();
    }
  };
  if (exposure.tls === "node") {
    https.createServer({
      cert: fs.readFileSync(TLS_CERT_PATH),
      key: fs.readFileSync(TLS_KEY_PATH),
    }, app).listen(PORT, BIND_HOST, onListen);
  } else {
    app.listen(PORT, BIND_HOST, onListen);
  }
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
