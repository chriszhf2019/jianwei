import path from "node:path";
import fs from "node:fs";
import zlib from "node:zlib";
import https from "node:https";
import express, { type Express } from "express";
import { createServer as createViteServer } from "vite";
import { startFeedScheduler } from "./scheduler";
import { startBackupScheduler } from "./backupScheduler";
import { cleanupExpiredUserSessions } from "./database";
import { NO_PERSIST } from "./settings";

export type StartServerOptions = {
  app: Express;
  port: number;
  bindHost: string;
  tlsCertPath?: string;
  tlsKeyPath?: string;
};

/** 挂载 Vite/静态资源并监听端口，启动定时摄取与备份。 */
export async function startServer(options: StartServerOptions): Promise<void> {
  const { app, port, bindHost, tlsCertPath, tlsKeyPath } = options;

  if (!NO_PERSIST) cleanupExpiredUserSessions();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const distRoot = path.resolve(distPath);
    const assetCache = new Map<string, { mtimeMs: number; gzip: Buffer; br: Buffer }>();
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const accept = String(req.headers["accept-encoding"] || "").toLowerCase();
      const useBrotli = accept.includes("br");
      const acceptsGzip = accept.split(",").some((item) => item.trim().toLowerCase().startsWith("gzip"));
      if ((!useBrotli && !acceptsGzip) || !/\.(?:js|css)$/i.test(req.path || "")) return next();
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
      const cached = assetCache.get(cacheKey);
      if (!cached || cached.mtimeMs !== stat.mtimeMs) {
        const raw = fs.readFileSync(filePath);
        assetCache.set(cacheKey, {
          mtimeMs: stat.mtimeMs,
          gzip: zlib.gzipSync(raw, { level: 6 }),
          br: zlib.brotliCompressSync(raw, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
              [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            },
          }),
        });
      }
      const asset = assetCache.get(cacheKey)!;
      const encoding = useBrotli ? "br" : "gzip";
      const payload = useBrotli ? asset.br : asset.gzip;
      const etag = `W/"${encoding}-${stat.size}-${Math.round(stat.mtimeMs)}"`;
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader(
        "Content-Type",
        req.path.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8"
      );
      res.setHeader("Content-Encoding", encoding);
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("ETag", etag);
      if (req.headers["if-none-match"] === etag) {
        res.status(304).end();
        return;
      }
      res.setHeader("Content-Length", String(payload.byteLength));
      res.status(200).end(req.method === "HEAD" ? undefined : payload);
    });
    app.use(
      express.static(distPath, {
        maxAge: "1y",
        immutable: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
            return;
          }
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      })
    );
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const onStarted = (scheme: string) => {
    console.log(`见微 Genway Server running on ${scheme}://${bindHost}:${port}`);
    startFeedScheduler();
    startBackupScheduler();
    if (!NO_PERSIST) {
      const sessionCleanup = setInterval(() => cleanupExpiredUserSessions(), 60 * 60 * 1000);
      sessionCleanup.unref?.();
    }
  };

  const hasTls = Boolean(
    tlsCertPath &&
    tlsKeyPath &&
    fs.existsSync(tlsCertPath) &&
    fs.existsSync(tlsKeyPath)
  );

  if (hasTls) {
    try {
      const cert = fs.readFileSync(tlsCertPath!, "utf-8");
      const key = fs.readFileSync(tlsKeyPath!, "utf-8");
      const httpsServer = https.createServer({ cert, key }, app);
      httpsServer.listen(port, bindHost, () => {
        onStarted("https");
      });
      return;
    } catch (e) {
      console.error("Failed to start HTTPS server with provided credentials, falling back to HTTP:", e);
    }
  }

  app.listen(port, bindHost, () => {
    onStarted("http");
  });
}
