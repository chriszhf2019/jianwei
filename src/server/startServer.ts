import path from "node:path";
import fs from "node:fs";
import zlib from "node:zlib";
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
};

/** 挂载 Vite/静态资源并监听端口，启动定时摄取与备份。 */
export async function startServer(options: StartServerOptions): Promise<void> {
  const { app, port, bindHost } = options;

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
      res.setHeader(
        "Content-Type",
        req.path.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8"
      );
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

  app.listen(port, bindHost, () => {
    console.log(`见微 Genway Server running on http://${bindHost}:${port}`);
    startFeedScheduler();
    startBackupScheduler();
    if (!NO_PERSIST) {
      const sessionCleanup = setInterval(() => cleanupExpiredUserSessions(), 60 * 60 * 1000);
      sessionCleanup.unref?.();
    }
  });
}
