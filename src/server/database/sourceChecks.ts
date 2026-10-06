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

export interface SourceArchiveEntry {
  checkKey: string;
  sourceUrl: string;
  status: string;
  contentHash: string | null;
  checkedAt: string;
  claimReviewCount: number;
}

/** 已保存正文的来源页面。没有正文的失败抓取不进入档案。 */
export function listSourceArchives(limit = 40): SourceArchiveEntry[] {
  if (!fs.existsSync(DB_FILE)) return [];
  const db = openDatabase();
  try {
    const rows = db
      .prepare(
        `
    SELECT check_key, source_url, status, content_hash, checked_at, payload
    FROM source_checks
    WHERE page_text IS NOT NULL AND length(trim(page_text)) >= 200
    ORDER BY checked_at DESC
    LIMIT ?
  `
      )
      .all(Math.max(1, Math.min(100, limit))) as Array<{
      check_key?: string;
      source_url?: string;
      status?: string;
      content_hash?: string | null;
      checked_at?: string;
      payload?: string;
    }>;
    return rows.flatMap((row) => {
      if (!row.check_key || !row.source_url || !row.checked_at) return [];
      let claimReviewCount = 0;
      try {
        const payload = JSON.parse(String(row.payload || "{}"));
        claimReviewCount = Array.isArray(payload?.claimReviews) ? payload.claimReviews.length : 0;
      } catch {
        claimReviewCount = 0;
      }
      return [
        {
          checkKey: row.check_key,
          sourceUrl: row.source_url,
          status: String(row.status || ""),
          contentHash: row.content_hash || null,
          checkedAt: row.checked_at,
          claimReviewCount,
        },
      ];
    });
  } finally {
    db.close();
  }
}

