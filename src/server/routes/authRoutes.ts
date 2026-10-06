import type { Express, Request, Response } from "express";
import type { UserRole } from "../database";
import {
  changeUserPassword,
  createUser,
  createUserSession,
  getUserPreferences,
  listUsers,
  recordAuditEvent,
  resetUserPassword,
  revokeUserSession,
  revokeUserSessions,
  saveUserPreferences,
  updateUser,
} from "../database";
import { NO_PERSIST } from "../settings";

export type RateLimiter = (req: Request, res: Response, next: () => void) => void;

export type RequestAuth = {
  userId: string;
  username: string;
  role: UserRole;
  legacyToken: boolean;
  mustChangePassword: boolean;
  isGuest?: boolean;
  guestId?: string;
};

export type AuthRouteOptions = {
  authToken: string;
  safeTokenEqual: (received: string, expected: string) => boolean;
};

const LOGIN_FAILURE_LIMIT = Math.max(3, Number(process.env.LOGIN_FAILURE_LIMIT || 5));
const LOGIN_FAILURE_WINDOW_MS = Math.max(
  60_000,
  Number(process.env.LOGIN_FAILURE_WINDOW_MS || 15 * 60 * 1000)
);
const loginFailures = new Map<string, number[]>();

function loginLimitKey(req: Request, username: string): string {
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
    if (!oldest) break;
    loginFailures.delete(oldest);
  }
}

/** 注册鉴权、用户管理与偏好接口（中间件仍由 server.ts 负责注入 req.auth）。 */
export function registerAuthRoutes(
  app: Express,
  applyRateLimit: RateLimiter,
  options: AuthRouteOptions
): void {
  const { authToken, safeTokenEqual } = options;

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
    if (accessToken && safeTokenEqual(accessToken, authToken)) {
      loginFailures.delete(limitKey);
      recordAuditEvent({ actor: "token-admin", action: "auth.login", status: "success" });
      return res.json({
        ok: true,
        token: authToken,
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
          ? (String(req.body.approvalStatus) as any)
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
}
