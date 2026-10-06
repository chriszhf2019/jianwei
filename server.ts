import express from "express";
import compression from "compression";
import path from "path";
import fs from "node:fs";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { createServer as createViteServer } from "vite";

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
import { registerSourceRoutes } from "./src/server/routes/sourceRoutes";
import { registerArticleTimelineRoutes } from "./src/server/routes/articleTimelineRoutes";
import { registerConflictsRoutes } from "./src/server/routes/conflictsRoutes";
import { repairEvidenceQuoteChecks } from "./src/server/repairEvidenceQuoteChecks";
import {
  NO_PERSIST,
} from "./src/server/settings";
import {
  ALLOW_DEMO_DATA,
} from "./src/server/corpus";
import {
  activeProvider,
  geminiKeyOk,
  deepseekKeyOk,
} from "./src/server/ai";
import {
  applyRateLimit,
} from "./src/server/cache";
import {
  consumeGuestDeepRead,
  ensureBootstrapUser,
  cleanupExpiredUserSessions,
  resolveUserSession,
} from "./src/server/database";

const app = express();
const PORT = 3000;
const serverStartTime = Date.now();
const AUTH_TOKEN = process.env.JIANWEI_AUTH_TOKEN || "";
const AUTH_ENABLED = !!AUTH_TOKEN;
const BIND_HOST = "0.0.0.0";
const DEMO_DATA_ENABLED = ALLOW_DEMO_DATA;
const BOOTSTRAP_ADMIN_USER = process.env.JIANWEI_ADMIN_USER || "";
const BOOTSTRAP_ADMIN_PASSWORD = process.env.JIANWEI_ADMIN_PASSWORD || "";

if (AUTH_ENABLED && BOOTSTRAP_ADMIN_USER && BOOTSTRAP_ADMIN_PASSWORD) {
  try {
    ensureBootstrapUser(BOOTSTRAP_ADMIN_USER, BOOTSTRAP_ADMIN_PASSWORD);
  } catch (error) {
    console.error("failed to bootstrap admin user:", error);
  }
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

registerSourceRoutes(app, applyRateLimit);
registerArticleTimelineRoutes(app, applyRateLimit);
registerConflictsRoutes(app, applyRateLimit);

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
