import crypto from "node:crypto";
import fs from "node:fs";
import { NO_PERSIST } from "../settings";
import { DB_FILE, openDatabase } from "./connection";

function auditEventHash(event: {
  at: string;
  actor: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  status: string;
  metadata?: unknown;
  previousHash?: string | null;
}): string {
  return crypto.createHash("sha256").update(JSON.stringify({
    hashVersion: "audit-v1",
    at: event.at,
    actor: event.actor,
    action: event.action,
    entityType: event.entityType || null,
    entityId: event.entityId || null,
    status: event.status,
    metadata: event.metadata ?? null,
    previousHash: event.previousHash || null,
  })).digest("hex");
}

export function recordAuditEvent(input: {
  actor?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  status?: "success" | "error";
  metadata?: unknown;
}): void {
  if (NO_PERSIST) return;
  const db = openDatabase();
  const at = new Date().toISOString();
  const actor = String(input.actor || "local").trim().slice(0, 120);
  const action = String(input.action || "").trim().slice(0, 120);
  if (!action) {
    db.close();
    return;
  }
  const entityType = input.entityType ? String(input.entityType).slice(0, 80) : null;
  const entityId = input.entityId ? String(input.entityId).slice(0, 160) : null;
  const status = input.status || "success";
  let metadata: string | null = null;
  try {
    metadata = input.metadata === undefined ? null : JSON.stringify(input.metadata).slice(0, 8000);
  } catch {
    metadata = JSON.stringify({ serializationError: true });
  }
  try {
    db.exec("BEGIN IMMEDIATE");
    const previous = db.prepare(
      "SELECT integrity_hash FROM audit_events ORDER BY id DESC LIMIT 1"
    ).get() as { integrity_hash?: string } | undefined;
    const previousHash = previous?.integrity_hash || null;
    const integrityHash = auditEventHash({
      at,
      actor,
      action,
      entityType,
      entityId,
      status,
      metadata: metadata ? JSON.parse(metadata) : null,
      previousHash,
    });
    db.prepare(`
      INSERT INTO audit_events (
        at, actor, action, entity_type, entity_id, status, metadata, previous_hash, integrity_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(at, actor, action, entityType, entityId, status, metadata, previousHash, integrityHash);
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* 忽略回滚失败。 */
    }
    console.error("failed to record audit event:", error);
  } finally {
    db.close();
  }
}

export function listAuditEvents(limit = 200): {
  events: Array<Record<string, any>>;
  chain: { valid: boolean; checked: number; brokenAt: number | null };
} {
  if (!fs.existsSync(DB_FILE)) return { events: [], chain: { valid: true, checked: 0, brokenAt: null } };
  const db = openDatabase();
  try {
    const rows = db.prepare(`
      SELECT id, at, actor, action, entity_type, entity_id, status, metadata,
             previous_hash, integrity_hash
      FROM audit_events
      ORDER BY id ASC
    `).all() as any[];
    let expectedPrevious: string | null = null;
    let brokenAt: number | null = null;
    const events = rows.map((row) => {
      let metadata: unknown = null;
      try {
        metadata = row.metadata ? JSON.parse(String(row.metadata)) : null;
      } catch {
        metadata = { unreadable: true };
      }
      const expectedHash = auditEventHash({
        at: String(row.at),
        actor: String(row.actor),
        action: String(row.action),
        entityType: row.entity_type == null ? null : String(row.entity_type),
        entityId: row.entity_id == null ? null : String(row.entity_id),
        status: String(row.status),
        metadata,
        previousHash: row.previous_hash == null ? null : String(row.previous_hash),
      });
      const valid = (
        String(row.previous_hash || "") === String(expectedPrevious || "") &&
        String(row.integrity_hash) === expectedHash
      );
      if (!valid && brokenAt === null) brokenAt = Number(row.id);
      expectedPrevious = String(row.integrity_hash || expectedPrevious || "");
      return {
        id: Number(row.id),
        at: String(row.at),
        actor: String(row.actor),
        action: String(row.action),
        entityType: row.entity_type ? String(row.entity_type) : null,
        entityId: row.entity_id ? String(row.entity_id) : null,
        status: String(row.status),
        metadata,
        previousHash: row.previous_hash ? String(row.previous_hash) : null,
        integrityHash: String(row.integrity_hash),
        integrityValid: valid,
      };
    });
    return {
      events: events.slice(-Math.max(1, Math.min(1000, limit))).reverse(),
      chain: { valid: brokenAt === null, checked: events.length, brokenAt },
    };
  } finally {
    db.close();
  }
}

