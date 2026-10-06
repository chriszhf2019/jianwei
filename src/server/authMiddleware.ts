import type express from "express";
import { NO_PERSIST } from "./settings";
import { consumeGuestDeepRead } from "./database";
import {
  AUTH_ENABLED,
  GUEST_DEEP_READ_LIMIT,
  ensureGuestId,
  isGuestDeepRoute,
  isGuestReadRoute,
  requestAuth,
  type RequestAuth,
} from "./authSupport";

/** 鉴权、游客限额，以及未开令牌时破坏性接口只准本机。 */
export function registerAuthMiddleware(app: express.Express): void {
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

  if (!AUTH_ENABLED) {
    const DESTRUCTIVE_ROUTES: Array<{ method: string; path: string }> = [
      { method: "POST", path: "/settings" },
      { method: "POST", path: "/admin/reset" },
      { method: "POST", path: "/admin/backups" },
      { method: "POST", path: "/admin/backups/restore" },
      { method: "POST", path: "/feeds/ingest" },
      { method: "POST", path: "/source/inspect" },
      { method: "POST", path: "/fetch-article" },
      { method: "POST", path: "/source/reextract-evidence" },
      { method: "POST", path: "/evaluation/import" },
      { method: "POST", path: "/evaluation/freeze" },
    ];
    app.use("/api", (req, res, next) => {
      const isDestructive = DESTRUCTIVE_ROUTES.some(
        (route) => route.method === req.method.toUpperCase() && route.path === req.path
      );
      if (!isDestructive) return next();
      const ip = String(req.ip || "").replace(/^::ffff:/, "");
      if (ip === "::1" || ip === "localhost" || ip.startsWith("127.")) return next();
      res.status(403).json({
        error: "forbidden: destructive endpoint is local-only unless JIANWEI_AUTH_TOKEN is set",
      });
    });
  }
}
