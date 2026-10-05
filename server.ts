import express from "express";
import compression from "compression";
import path from "path";
import fs from "node:fs";
import https from "node:https";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { createServer as createViteServer } from "vite";
import { registerAnnotationRoutes } from "./src/server/annotations";
import { startFeedScheduler } from "./src/server/scheduler";
import { startBackupScheduler } from "./src/server/backupScheduler";
import { registerDeepEndpoints } from "./src/server/deepEndpoints";
import { registerAdminConsoleRoutes } from "./src/server/adminConsoleRoutes";
import { registerSourceRoutes } from "./src/server/sourceRoutes";
import { registerEvaluationRoutes } from "./src/server/evaluationRoutes";
import { registerConflictRoutes } from "./src/server/conflictRoutes";
import { registerPredictionRoutes } from "./src/server/predictionRoutes";
import { registerAiChatRoutes } from "./src/server/aiChatRoutes";
import { registerCorpusFeedRoutes } from "./src/server/corpusFeedRoutes";
import { NO_PERSIST, isDemoDataEnabled } from "./src/server/settings";
import { serverCorpus, flushCorpusSnapshot } from "./src/server/corpus";
import { activeProvider, geminiKeyOk, deepseekKeyOk } from "./src/server/ai";
import { applyRateLimit } from "./src/server/cache";
import { assessPublicExposure, resolveBindHost } from "./src/server/publicExposure";
import {
  evaluateQuoteMatch,
  findQuoteContext,
  sourceCheckKey,
} from "./src/server/sourceVerification";
import {
  createUser,
  createUserSession,
  consumeGuestDeepRead,
  ensureBootstrapUser,
  getUserPreferences,
  listUsers,
  changeUserPassword,
  cleanupExpiredUserSessions,
  loadSourcePageText,
  persistSourceCheck,
  recordAuditEvent,
  resolveUserSession,
  saveUserPreferences,
  resetUserPassword,
  revokeUserSessions,
  revokeUserSession,
  closeDatabase,
  updateUser,
  type UserRole,
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

registerPredictionRoutes(app);

registerAiChatRoutes(app);

registerCorpusFeedRoutes(app, {
  demoDataEnabled: DEMO_DATA_ENABLED,
  guestArticleLimit: GUEST_ARTICLE_LIMIT,
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
