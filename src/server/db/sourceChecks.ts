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

export function loadSourceCheck(checkKey: string, maxAgeMs: number): any | null {
  if (!fs.existsSync(databasePath())) return null;
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
  }
}

export function persistSourceCheck(checkKey: string, result: any): void {
  const db = openDatabase();
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
}

export function loadSourcePageText(checkKey: string): string | null {
  if (!fs.existsSync(databasePath())) return null;
  const db = openDatabase();
  const row = db.prepare("SELECT page_text FROM source_checks WHERE check_key = ?").get(checkKey) as
    | { page_text?: string | null }
    | undefined;
  return row?.page_text || null;
}

/** 按核验键批量读取已保存正文。短于 minimumLength 的快照不返回。 */
export function loadSourcePageTexts(
  checkKeys: string[],
  minimumLength = 200,
  maxChars = 4000,
): Map<string, string> {
  const wanted = [...new Set(checkKeys.map((key) => String(key || "").trim()).filter(Boolean))];
  const found = new Map<string, string>();
  if (wanted.length === 0 || !fs.existsSync(databasePath())) return found;
  const db = openDatabase();
  for (let offset = 0; offset < wanted.length; offset += 200) {
    const slice = wanted.slice(offset, offset + 200);
    const placeholders = slice.map(() => "?").join(",");
    const rows = db.prepare(
      `SELECT check_key, page_text FROM source_checks WHERE check_key IN (${placeholders}) AND page_text IS NOT NULL`
    ).all(...slice) as Array<{ check_key?: string; page_text?: string | null }>;
    for (const row of rows) {
      const text = String(row.page_text || "").trim();
      if (!row.check_key || text.length < minimumLength) continue;
      found.set(row.check_key, text.slice(0, maxChars));
    }
  }
  return found;
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
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  const rows = db.prepare(`
    SELECT check_key, source_url, status, content_hash, checked_at, payload
    FROM source_checks
    WHERE page_text IS NOT NULL AND length(trim(page_text)) >= 200
    ORDER BY checked_at DESC
    LIMIT ?
  `).all(Math.max(1, Math.min(100, limit))) as Array<{
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
    return [{
      checkKey: row.check_key,
      sourceUrl: row.source_url,
      status: String(row.status || ""),
      contentHash: row.content_hash || null,
      checkedAt: row.checked_at,
      claimReviewCount,
    }];
  });
}

export function clearTransientSourceChecks(): number {
  if (!fs.existsSync(databasePath())) return 0;
  const db = openDatabase();
  const result = db.prepare(
    "DELETE FROM source_checks WHERE status IN ('network_error', 'timeout', 'too_large')"
  ).run();
  return Number(result.changes || 0);
}

