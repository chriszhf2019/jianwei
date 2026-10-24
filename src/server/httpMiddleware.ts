import zlib from "node:zlib";
import type { Express, Request, Response, NextFunction } from "express";
import express from "express";

/** 安全响应头、Brotli/Gzip 压缩、JSON body 与 evaluation 缓存策略。 */
export function mountHttpMiddleware(app: Express): void {
  app.disable("x-powered-by");

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // 优先 Brotli，退回 gzip；小于 1KB 或已压缩的响应不动。
  app.use((req: Request, res: Response, next: NextFunction) => {
    const accept = String(req.headers["accept-encoding"] || "").toLowerCase();
    const useBrotli = accept.includes("br");
    const useGzip = accept.includes("gzip");
    if (!useBrotli && !useGzip) return next();

    const originalSend = res.send.bind(res);
    (res as any).send = (body: any) => {
      if (res.headersSent || res.getHeader("Content-Encoding")) return originalSend(body);
      const contentType = String(res.getHeader("Content-Type") || "");
      if (!/json|javascript|text|css|html/.test(contentType)) return originalSend(body);
      const buffer = Buffer.isBuffer(body)
        ? body
        : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
      if (buffer.byteLength < 1024) return originalSend(body);

      const done = (error: Error | null, compressed: Buffer) => {
        if (error) {
          originalSend(body);
          return;
        }
        res.setHeader("Content-Encoding", useBrotli ? "br" : "gzip");
        res.setHeader("Vary", "Accept-Encoding");
        res.setHeader("Content-Length", String(compressed.byteLength));
        originalSend(compressed);
      };

      if (useBrotli) {
        zlib.brotliCompress(
          buffer,
          {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
              [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            },
          },
          done
        );
      } else {
        zlib.gzip(buffer, done);
      }
    };
    next();
  });

  app.use(express.json({ limit: "5mb" }));
  app.use("/api/evaluation", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
}
