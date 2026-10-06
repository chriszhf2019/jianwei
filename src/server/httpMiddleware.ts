import zlib from "node:zlib";
import compression from "compression";
import type { Express, Request, Response, NextFunction } from "express";
import express from "express";

/** 安全响应头、可选 gzip 包装、JSON body 与 evaluation 缓存策略。 */
export function mountHttpMiddleware(app: Express): void {
  app.disable("x-powered-by");
  app.use(compression() as unknown as express.RequestHandler);

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
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
}
