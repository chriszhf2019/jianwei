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

function startOfLocalDayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export function getAiUsageToday(): {
  calls: number;
  promptChars: number;
  outputChars: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  tokenReportedCalls: number;
} {
  if (!fs.existsSync(databasePath())) {
    return { calls: 0, promptChars: 0, outputChars: 0, promptTokens: 0, outputTokens: 0, totalTokens: 0, tokenReportedCalls: 0 };
  }
  const db = openDatabase();
  const row = db.prepare(`
    SELECT
      COUNT(*) AS calls,
      COALESCE(SUM(prompt_chars), 0) AS promptChars,
      COALESCE(SUM(output_chars), 0) AS outputChars,
      COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
      COALESCE(SUM(output_tokens), 0) AS outputTokens,
      COALESCE(SUM(total_tokens), 0) AS totalTokens,
      COALESCE(SUM(CASE WHEN total_tokens IS NOT NULL THEN 1 ELSE 0 END), 0) AS tokenReportedCalls
    FROM ai_usage_events
    WHERE at >= ?
  `).get(startOfLocalDayIso()) as Record<string, number>;
  return {
    calls: Number(row?.calls || 0),
    promptChars: Number(row?.promptChars || 0),
    outputChars: Number(row?.outputChars || 0),
    promptTokens: Number(row?.promptTokens || 0),
    outputTokens: Number(row?.outputTokens || 0),
    totalTokens: Number(row?.totalTokens || 0),
    tokenReportedCalls: Number(row?.tokenReportedCalls || 0),
  };
}

export function getAiCostToday(): ListedSpend & { estimatedCostUsd: number | null; priceSource: string } {
  if (!fs.existsSync(databasePath())) {
    const empty = summarizeListedSpend([]);
    return { ...empty, estimatedCostUsd: null, priceSource: empty.note };
  }
  const db = openDatabase();
  const rows = db.prepare(`
    SELECT provider, model, prompt_tokens AS promptTokens, output_tokens AS outputTokens
    FROM ai_usage_events
    WHERE at >= ?
  `).all(startOfLocalDayIso()) as Array<{
    provider: string;
    model: string;
    promptTokens: number | null;
    outputTokens: number | null;
  }>;
  const spend = summarizeListedSpend(rows.map((row) => ({
    provider: String(row.provider || ""),
    model: String(row.model || ""),
    promptTokens: row.promptTokens == null ? null : Number(row.promptTokens),
    outputTokens: row.outputTokens == null ? null : Number(row.outputTokens),
  })));
  return {
    ...spend,
    estimatedCostUsd: spend.listedCostUsd,
    priceSource: spend.note,
  };
}

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
  if (!action) return;
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
  }
}

export function listAuditEvents(limit = 200): {
  events: Array<Record<string, any>>;
  chain: { valid: boolean; checked: number; brokenAt: number | null };
} {
  if (!fs.existsSync(databasePath())) return { events: [], chain: { valid: true, checked: 0, brokenAt: null } };
  const db = openDatabase();
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
}

export function recordAiUsageEvent(input: {
  at?: string;
  provider: string;
  model: string;
  promptChars: number;
  outputChars: number;
  promptTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  operation?: string;
  status?: "success" | "error";
  error?: string | null;
}): void {
  const db = openDatabase();
  db.prepare(`
    INSERT INTO ai_usage_events (
      at, provider, model, prompt_chars, output_chars,
      prompt_tokens, output_tokens, total_tokens, operation, status, error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.at || new Date().toISOString(),
    input.provider,
    input.model,
    Math.max(0, Math.round(input.promptChars || 0)),
    Math.max(0, Math.round(input.outputChars || 0)),
    input.promptTokens == null ? null : Math.max(0, Math.round(input.promptTokens)),
    input.outputTokens == null ? null : Math.max(0, Math.round(input.outputTokens)),
    input.totalTokens == null ? null : Math.max(0, Math.round(input.totalTokens)),
    input.operation || null,
    input.status || "success",
    input.error || null
  );
}

export function checkAiBudget(callLimit: number, tokenLimit: number): {
  allowed: boolean;
  reason?: "daily_call_limit" | "daily_token_limit";
  usage: ReturnType<typeof getAiUsageToday>;
} {
  const usage = getAiUsageToday();
  if (callLimit > 0 && usage.calls >= callLimit) {
    return { allowed: false, reason: "daily_call_limit", usage };
  }
  if (tokenLimit > 0 && usage.totalTokens >= tokenLimit) {
    return { allowed: false, reason: "daily_token_limit", usage };
  }
  return { allowed: true, usage };
}

