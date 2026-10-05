import express from "express";
import compression from "compression";
import path from "path";
import fs from "node:fs";
import https from "node:https";
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
import { registerAuthMiddleware } from "./src/server/authMiddleware";
import { registerAuthAccountRoutes } from "./src/server/authAccountRoutes";
import {
  AUTH_ENABLED,
  AUTH_TOKEN,
  GUEST_ARTICLE_LIMIT,
  requestAuth,
} from "./src/server/authSupport";
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
  ensureBootstrapUser,
  cleanupExpiredUserSessions,
  loadSourcePageText,
  persistSourceCheck,
  closeDatabase,
} from "./src/server/database";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const serverStartTime = Date.now();
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

registerAuthMiddleware(app);

registerAnnotationRoutes(app, applyRateLimit);
registerDeepEndpoints(app, applyRateLimit);

registerAuthAccountRoutes(app);

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
