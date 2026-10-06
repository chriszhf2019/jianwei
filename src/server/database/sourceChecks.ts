import fs from "node:fs";
import { DB_FILE, openDatabase } from "./connection";

export function loadSourceCheck(checkKey: string, maxAgeMs: number): any | null {
  if (!fs.existsSync(DB_FILE)) return null;
  const db = openDatabase();
  try {
    const row = db.prepare(
      "SELECT checked_at, payload FROM source_checks WHERE check_key = ?"
    ).get(checkKey) as { checked_at?: string; payload?: string } | undefined;
    if (!row?.payload || !row.checked_at) return null;
    const checkedAt = Date.parse(row.checked_at);
    if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > maxAgeMs) return null;
    return JSON.parse(row.payload);
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export function persistSourceCheck(checkKey: string, result: any): void {
  const db = openDatabase();
  try {
    const { pageText, ...payload } = result || {};
    db.prepare(`
      INSERT INTO source_checks (check_key, source_url, status, content_hash, checked_at, payload, page_text)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(check_key) DO UPDATE SET
        source_url = excluded.source_url,
        status = excluded.status,
        content_hash = excluded.content_hash,
        checked_at = excluded.checked_at,
        payload = excluded.payload,
        page_text = excluded.page_text
    `).run(
      checkKey,
      String(result?.requestedUrl || result?.finalUrl || ""),
      String(result?.status || "unknown"),
      result?.contentHash ? String(result.contentHash) : null,
      String(result?.fetchedAt || new Date().toISOString()),
      JSON.stringify(payload),
      pageText ? String(pageText).slice(0, 200_000) : null
    );
  } finally {
    db.close();
  }
}

export function loadSourcePageText(checkKey: string): string | null {
  if (!fs.existsSync(DB_FILE)) return null;
  const db = openDatabase();
  try {
    const row = db.prepare("SELECT page_text FROM source_checks WHERE check_key = ?").get(checkKey) as
      | { page_text?: string | null }
      | undefined;
    return row?.page_text || null;
  } finally {
    db.close();
  }
}

export function clearTransientSourceChecks(): number {
  if (!fs.existsSync(DB_FILE)) return 0;
  const db = openDatabase();
  try {
    const result = db.prepare(
      "DELETE FROM source_checks WHERE status IN ('network_error', 'timeout', 'too_large')"
    ).run();
    return Number(result.changes || 0);
  } finally {
    db.close();
  }
}

