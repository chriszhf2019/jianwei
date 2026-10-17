import crypto from "node:crypto";
import type { Express, Request, Response, NextFunction } from "express";
import {
  consumeGuestDeepRead,
  peekGuestDeepRead,
  resolveUserSession,
  type GuestDeepReadUsage,
} from "./database";
import { NO_PERSIST } from "./settings";
import type { RequestAuth } from "./routes/authRoutes";

export type AuthConfig = {
  authToken: string;
  authEnabled: boolean;
};

export const GUEST_DEEP_READ_LIMIT = Math.max(1, Math.min(20, Number(process.env.GUEST_DEEP_READ_LIMIT || 1)));
const GUEST_COOKIE_NAME = "jw_guest_id";

export function safeTokenEqual(received: string, expected: string): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function cookieValue(req: Request, name: string): string {
  const raw = String(req.header("cookie") || "");
  for (const item of raw.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function ensureGuestId(req: Request, res: Response): string {
  const headerGuestId = String(req.header("x-jianwei-guest-id") || "").trim();
  if (/^guest_[a-f0-9]{24}$/.test(headerGuestId)) {
    res.setHeader("x-jianwei-guest-id", headerGuestId);
    return headerGuestId;
  }
  const existing = cookieValue(req, GUEST_COOKIE_NAME);
  if (/^guest_[a-f0-9]{24}$/.test(existing)) {
    res.setHeader("x-jianwei-guest-id", existing);
    return existing;
  }
  const guestId = `guest_${crypto.randomBytes(12).toString("hex")}`;
  res.append(
    "Set-Cookie",
    `${GUEST_COOKIE_NAME}=${encodeURIComponent(guestId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  );
  res.setHeader("x-jianwei-guest-id", guestId);
  return guestId;
}

function isGuestReadRoute(pathname: string): boolean {
  return (
    pathname === "/corpus" ||
    pathname === "/snapshot" ||
    pathname === "/auth/me" ||
    pathname === "/preferences" ||
    pathname === "/predictions" ||
    pathname === "/knowledge" ||
    pathname === "/knowledge/search" ||
    pathname.startsWith("/knowledge/")
  );
}

/** 「大白话」等轻量试读：不消耗游客唯一深度解读额度。 */
export function isGuestLightSkillRoute(pathname: string): boolean {
  return pathname === "/skill/plain";
}

/** 游客可免费 POST：抓取正文不占用深度解读额度（失败/成功均不扣）。 */
export function isGuestFreePostRoute(pathname: string): boolean {
  return pathname === "/fetch-article";
}

/** 深度解读额度延后扣减：处理器成功后才扣，校验失败/AI 失败不扣次。 */
export function isGuestDeferredQuotaRoute(pathname: string): boolean {
  if (
    pathname === "/enrich" ||
    pathname === "/analyze" ||
    pathname === "/ask-nuance"
  ) {
    return true;
  }
  // 除大白话外的 skill：与 enrich 共享同一 articleId 额度
  if (pathname.startsWith("/skill/") && !isGuestLightSkillRoute(pathname)) {
    return true;
  }
  return false;
}

export function isGuestDeepRoute(pathname: string): boolean {
  if (isGuestLightSkillRoute(pathname)) return false;
  if (isGuestFreePostRoute(pathname)) return false;
  if (isGuestDeferredQuotaRoute(pathname)) return false;
  return (
    pathname === "/strategic-advisor" ||
    pathname === "/predict" ||
    pathname === "/source/inspect" ||
    pathname === "/source/reextract-evidence" ||
    pathname === "/region/interpret" ||
    pathname === "/intelligence/frequency"
  );
}

export function guestDeepLimitPayload(usage: Pick<GuestDeepReadUsage, "deepReads" | "remaining">) {
  const remaining = Math.max(0, Number(usage.remaining || 0));
  return {
    error: "guest_deep_read_limit" as const,
    message:
      remaining <= 0
        ? "游客深度解读次数已用完，请注册并等待管理员审批。"
        : `游客深度解读额度不足（剩余 ${remaining} 次），请注册并等待管理员审批。`,
    remaining,
    limit: GUEST_DEEP_READ_LIMIT,
    deepReads: Math.max(0, Number(usage.deepReads || 0)),
  };
}

/** 延后扣费路由：先 peek；已达上限则 403。返回 false 表示已写响应。 */
export function ensureGuestDeferredQuota(req: { body?: any; auth?: RequestAuth }, res: Response): boolean {
  const auth = (req as any).auth as RequestAuth | undefined;
  if (!auth?.isGuest) return true;
  if (NO_PERSIST) return true;
  const articleId = String(
    req.body?.articleId || req.body?.articleContext?.id || ""
  ).trim();
  const peek = peekGuestDeepRead(auth.guestId || "", GUEST_DEEP_READ_LIMIT, articleId || undefined);
  if (!peek.allowed) {
    res.status(403).json(guestDeepLimitPayload(peek));
    return false;
  }
  return true;
}

/** 成功路径扣费；同一 articleId 不重复计数。 */
export function chargeGuestDeepSuccess(
  req: { body?: any; auth?: RequestAuth },
  articleId?: string
): GuestDeepReadUsage | null {
  const auth = (req as any).auth as RequestAuth | undefined;
  if (!auth?.isGuest || NO_PERSIST) return null;
  const id = String(articleId || req.body?.articleId || req.body?.articleContext?.id || "").trim();
  return consumeGuestDeepRead(auth.guestId || "", GUEST_DEEP_READ_LIMIT, id || undefined);
}

export function requestAuth(req: Request, authToken: string): RequestAuth | null {
  const headerToken = req.header("x-jianwei-token") || "";
  const bearer = (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const presented = bearer || headerToken;
  if (safeTokenEqual(presented, authToken)) {
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
    return user
      ? {
          userId: user.id,
          username: user.username,
          role: user.role,
          legacyToken: false,
          mustChangePassword: user.mustChangePassword,
        }
      : null;
  }
  return null;
}

/** 挂载 /api 鉴权、游客限流与角色门禁。 */
export function mountAuthMiddleware(app: Express, config: AuthConfig): void {
  const { authToken, authEnabled } = config;

  app.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path === "/auth/login" || req.path === "/auth/register") {
      return next();
    }
    if (!authEnabled) {
      (req as any).auth = {
        userId: "local",
        username: "local",
        role: "admin",
        legacyToken: false,
        mustChangePassword: false,
      } satisfies RequestAuth;
      return next();
    }
    const auth = requestAuth(req, authToken);
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
      if (req.method === "POST" && isGuestLightSkillRoute(req.path)) {
        return next();
      }
      if (req.method === "POST" && isGuestFreePostRoute(req.path)) {
        return next();
      }
      if (req.method === "POST" && isGuestDeferredQuotaRoute(req.path)) {
        return next();
      }
      if (req.method === "POST" && isGuestDeepRoute(req.path)) {
        const usage = NO_PERSIST
          ? { allowed: true, deepReads: 1, remaining: 0 }
          : consumeGuestDeepRead(guestId, GUEST_DEEP_READ_LIMIT);
        if (!usage.allowed) {
          return res.status(403).json(guestDeepLimitPayload(usage));
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
      !req.path.startsWith("/knowledge") &&
      auth.role === "viewer"
    ) {
      return res.status(403).json({ error: "forbidden: editor role required" });
    }
    next();
  });
}

/**
 * 未配置访问令牌时：破坏性端点仅允许本机回环访问，
 * 防止局域网/公网误删语料或外发 Key。
 */
export function mountDestructiveLocalOnlyGuard(app: Express, authEnabled: boolean): void {
  if (authEnabled) return;

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

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
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
