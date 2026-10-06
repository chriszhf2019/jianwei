import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { parseArticleDate } from "../../utils/articleTime";
import { summarizeListedSpend, type ListedSpend } from "../../utils/aiPriceTable";
import { predictionDueInfo } from "../../utils/predictionLedger";
import { NO_PERSIST } from "../settings";
import {
  openDatabase,
  closeDatabase,
  databasePath,
  databaseFile,
  databaseCacheEpoch,
  articleSearchEnabled,
  articleSearchBody,
  articleSortTime,
  noopStatement,
} from "./connection";

export type UserRole = "admin" | "analyst" | "editor" | "viewer";
export type UserApprovalStatus = "pending" | "approved" | "rejected";

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")): string {
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = String(stored || "").split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 32);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

function sessionTokenHash(token: string): string {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function passwordPolicyError(password: string): string | null {
  const value = String(password || "");
  if (value.length < 6) return "password_too_short";
  return null;
}

export function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
  mustChangePassword?: boolean;
  approvalStatus?: UserApprovalStatus;
  approvedBy?: string;
}): {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  approvalStatus: UserApprovalStatus;
} {
  const username = String(input.username || "").trim().slice(0, 120);
  const password = String(input.password || "");
  const passwordError = passwordPolicyError(password);
  if (!/^[\p{L}\p{N}_.@-]{2,120}$/u.test(username)) {
    throw new Error("invalid_username");
  }
  if (passwordError) {
    throw new Error(passwordError);
  }
  if (!["admin", "analyst", "editor", "viewer"].includes(input.role)) throw new Error("invalid_role");
  const approvalStatus = input.approvalStatus || "approved";
  if (!["pending", "approved", "rejected"].includes(approvalStatus)) throw new Error("invalid_approval_status");
  const id = `user-${crypto.randomBytes(12).toString("hex")}`;
  const now = new Date().toISOString();
  const db = openDatabase();
  db.prepare(`
    INSERT INTO users (
      id, username, password_hash, role, active, must_change_password,
      approval_status, approved_at, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    username,
    hashPassword(password),
    input.role,
    input.mustChangePassword ? 1 : 0,
    approvalStatus,
    approvalStatus === "approved" ? now : null,
    approvalStatus === "approved" ? (input.approvedBy || "system") : null,
    now,
    now
  );
  return {
    id,
    username,
    role: input.role,
    mustChangePassword: Boolean(input.mustChangePassword),
    approvalStatus,
  };
}

export function updateUser(input: {
  id: string;
  role?: UserRole;
  active?: boolean;
  approvalStatus?: UserApprovalStatus;
  approvedBy?: string;
}): {
  id: string;
  username: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  approvalStatus: UserApprovalStatus;
} {
  const db = openDatabase();
  const current = db.prepare(
    "SELECT id, username, role, active, must_change_password, approval_status, approved_at, approved_by FROM users WHERE id = ?"
  ).get(String(input.id)) as any;
  if (!current) throw new Error("user_not_found");
  const nextRole = input.role || String(current.role) as UserRole;
  const nextActive = input.active === undefined ? Number(current.active) === 1 : input.active;
  const nextApproval = input.approvalStatus || String(current.approval_status || "approved") as UserApprovalStatus;
  if (!["admin", "analyst", "editor", "viewer"].includes(nextRole)) throw new Error("invalid_role");
  if (!["pending", "approved", "rejected"].includes(nextApproval)) throw new Error("invalid_approval_status");
  const removingAdmin =
    String(current.role) === "admin" &&
    Number(current.active) === 1 &&
    (nextRole !== "admin" || !nextActive);
  if (removingAdmin) {
    const adminCount = db.prepare(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND active = 1"
    ).get() as { count?: number };
    if (Number(adminCount?.count || 0) <= 1) throw new Error("cannot_remove_last_admin");
  }
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET role = ?, active = ?, approval_status = ?, approved_at = ?, approved_by = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nextRole,
    nextActive ? 1 : 0,
    nextApproval,
    nextApproval === "approved"
      ? (String(current.approval_status) === "approved" && current.approved_at ? String(current.approved_at) : now)
      : null,
    nextApproval === "approved"
      ? (String(current.approval_status) === "approved" && current.approved_by ? String(current.approved_by) : (input.approvedBy || "admin"))
      : null,
    now,
    String(input.id)
  );
  if (!nextActive || nextRole !== String(current.role) || nextApproval !== "approved") {
    db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(String(input.id));
  }
  return {
    id: String(current.id),
    username: String(current.username),
    role: nextRole,
    active: nextActive,
    mustChangePassword: Number(current.must_change_password) === 1,
    approvalStatus: nextApproval,
  };
}

export function resetUserPassword(id: string, password: string): void {
  const passwordError = passwordPolicyError(password);
  if (passwordError) throw new Error(passwordError);
  const db = openDatabase();
  const result = db.prepare(
    "UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?"
  ).run(hashPassword(String(password)), new Date().toISOString(), String(id));
  if (!result.changes) throw new Error("user_not_found");
  db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(String(id));
}

export function changeUserPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): boolean {
  if (passwordPolicyError(input.newPassword)) return false;
  const db = openDatabase();
  const row = db.prepare(
    "SELECT password_hash FROM users WHERE id = ? AND active = 1"
  ).get(String(input.userId)) as { password_hash?: string } | undefined;
  if (!row || !verifyPassword(String(input.currentPassword || ""), String(row.password_hash))) {
    return false;
  }
  db.prepare(
    "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?"
  ).run(hashPassword(String(input.newPassword)), new Date().toISOString(), String(input.userId));
  db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(String(input.userId));
  return true;
}

export function revokeUserSessions(userId: string): number {
  const db = openDatabase();
  const result = db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(String(userId));
  return Number(result.changes || 0);
}

export function listUsers(): Array<{
  id: string;
  username: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  approvalStatus: UserApprovalStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  return (db.prepare(`
    SELECT id, username, role, active, must_change_password, approval_status,
           approved_at AS approvedAt, approved_by AS approvedBy,
           created_at AS createdAt, updated_at AS updatedAt
    FROM users ORDER BY created_at ASC
  `).all() as any[]).map((row) => ({
    id: String(row.id),
    username: String(row.username),
    role: String(row.role) as UserRole,
    active: Number(row.active) === 1,
    mustChangePassword: Number(row.must_change_password) === 1,
    approvalStatus: String(row.approvalStatus || "approved") as UserApprovalStatus,
    approvedAt: row.approvedAt ? String(row.approvedAt) : null,
    approvedBy: row.approvedBy ? String(row.approvedBy) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }));
}

export function createUserSession(input: {
  username: string;
  password: string;
  ttlMs?: number;
}):
  | {
      ok: true;
      token: string;
      user: { id: string; username: string; role: UserRole; mustChangePassword: boolean };
      expiresAt: string;
    }
  | { ok: false; reason: "invalid_credentials" | "pending_approval" | "rejected" | "inactive" } {
  const db = openDatabase();
  const row = db.prepare(`
    SELECT id, username, password_hash, role, active, must_change_password, approval_status
    FROM users WHERE username = ?
  `).get(String(input.username || "").trim()) as any;
  if (!row || !verifyPassword(String(input.password || ""), String(row.password_hash))) {
    return { ok: false, reason: "invalid_credentials" };
  }
  if (Number(row.active) !== 1) return { ok: false, reason: "inactive" };
  if (String(row.approval_status || "approved") === "pending") return { ok: false, reason: "pending_approval" };
  if (String(row.approval_status || "approved") === "rejected") return { ok: false, reason: "rejected" };
  const token = `jw_${crypto.randomBytes(32).toString("base64url")}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (input.ttlMs || 30 * 24 * 3600 * 1000)).toISOString();
  db.prepare(`
    INSERT INTO user_sessions (token_hash, user_id, expires_at, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionTokenHash(token), row.id, expiresAt, now.toISOString(), now.toISOString());
  const maxSessions = Math.max(1, Math.min(20, Number(process.env.USER_MAX_SESSIONS || 5)));
  db.prepare(`
    DELETE FROM user_sessions
    WHERE user_id = ?
      AND token_hash NOT IN (
        SELECT token_hash FROM user_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ${maxSessions}
      )
  `).run(row.id, row.id);
  return {
    ok: true,
    token,
    user: {
      id: String(row.id),
      username: String(row.username),
      role: String(row.role) as UserRole,
      mustChangePassword: Number(row.must_change_password) === 1,
    },
    expiresAt,
  };
}

export function resolveUserSession(token: string): {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
} | null {
  if (!token || !fs.existsSync(databasePath())) return null;
  const db = openDatabase();
  const row = db.prepare(`
    SELECT u.id, u.username, u.role, u.active, u.must_change_password, s.expires_at
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(sessionTokenHash(token)) as any;
  if (!row || Number(row.active) !== 1 || Date.parse(String(row.expires_at)) <= Date.now()) {
    if (row) db.prepare("DELETE FROM user_sessions WHERE token_hash = ?").run(sessionTokenHash(token));
    return null;
  }
  db.prepare("UPDATE user_sessions SET last_seen_at = ? WHERE token_hash = ?")
    .run(new Date().toISOString(), sessionTokenHash(token));
  return {
    id: String(row.id),
    username: String(row.username),
    role: String(row.role) as UserRole,
    mustChangePassword: Number(row.must_change_password) === 1,
  };
}

export function revokeUserSession(token: string): void {
  if (!token || !fs.existsSync(databasePath())) return;
  const db = openDatabase();
  db.prepare("DELETE FROM user_sessions WHERE token_hash = ?").run(sessionTokenHash(token));
}

export function consumeGuestDeepRead(
  guestId: string,
  limit = 1
): { allowed: boolean; deepReads: number; remaining: number } {
  const id = String(guestId || "").trim();
  if (!id) return { allowed: false, deepReads: limit, remaining: 0 };
  const db = openDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO guest_usage (guest_id, deep_reads, created_at, updated_at)
      VALUES (?, 0, ?, ?)
      ON CONFLICT(guest_id) DO NOTHING
    `).run(id, now, now);
    const row = db.prepare(
      "SELECT deep_reads FROM guest_usage WHERE guest_id = ?"
    ).get(id) as { deep_reads?: number } | undefined;
    const current = Math.max(0, Number(row?.deep_reads || 0));
    if (current >= limit) {
      db.exec("COMMIT");
      return { allowed: false, deepReads: current, remaining: 0 };
    }
    const next = current + 1;
    db.prepare(
      "UPDATE guest_usage SET deep_reads = ?, updated_at = ? WHERE guest_id = ?"
    ).run(next, now, id);
    db.exec("COMMIT");
    return { allowed: true, deepReads: next, remaining: Math.max(0, limit - next) };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function cleanupExpiredUserSessions(): number {
  if (!fs.existsSync(databasePath())) return 0;
  const db = openDatabase();
  const result = db.prepare(
    "DELETE FROM user_sessions WHERE expires_at <= ?"
  ).run(new Date().toISOString());
  return Number(result.changes || 0);
}

export function ensureBootstrapUser(username: string, password: string): void {
  if (!username || !password || !fs.existsSync(databasePath())) return;
  const db = openDatabase();
  const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  if (exists) return;
  createUser({ username, password, role: "admin", mustChangePassword: true });
}

export function getUserPreferences(userId: string): { payload: Record<string, any> | null; version: number; updatedAt: string | null } {
  if (!fs.existsSync(databasePath())) return { payload: null, version: 0, updatedAt: null };
  const db = openDatabase();
  const row = db.prepare(
    "SELECT payload, version, updated_at FROM user_preferences WHERE user_id = ?"
  ).get(String(userId || "local")) as { payload?: string; version?: number; updated_at?: string } | undefined;
  if (!row?.payload) return { payload: null, version: 0, updatedAt: null };
  try {
    return {
      payload: JSON.parse(row.payload),
      version: Number(row.version || 1),
      updatedAt: row.updated_at || null,
    };
  } catch {
    return { payload: null, version: 0, updatedAt: null };
  }
}

export function saveUserPreferences(input: {
  userId: string;
  payload: Record<string, any>;
  expectedVersion: number;
}): { ok: true; version: number; updatedAt: string } | { ok: false; reason: "version_conflict" | "payload_too_large" } {
  const serialized = JSON.stringify(input.payload || {});
  if (serialized.length > 200_000) return { ok: false, reason: "payload_too_large" };
  const db = openDatabase();
  const row = db.prepare(
    "SELECT version FROM user_preferences WHERE user_id = ?"
  ).get(String(input.userId || "local")) as { version?: number } | undefined;
  const currentVersion = Number(row?.version || 0);
  if (input.expectedVersion !== currentVersion) return { ok: false, reason: "version_conflict" };
  const nextVersion = currentVersion + 1;
  const updatedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_preferences (user_id, payload, version, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      payload = excluded.payload,
      version = excluded.version,
      updated_at = excluded.updated_at
  `).run(String(input.userId || "local"), serialized, nextVersion, updatedAt);
  return { ok: true, version: nextVersion, updatedAt };
}
