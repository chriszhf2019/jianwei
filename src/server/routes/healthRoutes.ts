import path from "node:path";
import fs from "node:fs";
import type { Express } from "express";
import { activeProvider, deepseekKeyOk, geminiKeyOk } from "../ai";
import { requestAuth } from "../authMiddleware";

export type HealthRouteOptions = {
  authToken: string;
  authEnabled: boolean;
  serverStartTime: number;
};

/** GET /api/health — 鉴权状态、AI 通道与构建指纹。 */
export function registerHealthRoutes(app: Express, options: HealthRouteOptions): void {
  const { authToken, authEnabled, serverStartTime } = options;

  app.get("/api/health", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const auth = requestAuth(req, authToken);
    res.json({
      status: "ok",
      authRequired: authEnabled && !auth,
      user: auth
        ? {
            username: auth.username,
            role: auth.role,
            mustChangePassword: auth.mustChangePassword,
          }
        : null,
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
}
