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

export function generateAnalysisKey(input: {
  articleId?: string;
  title?: string;
  source?: string;
  content?: string;
}): string {
  if (input.articleId && String(input.articleId).trim()) {
    return `art_key_${crypto.createHash("sha256").update(String(input.articleId).trim()).digest("hex").slice(0, 32)}`;
  }
  const cleanTitle = String(input.title || "").trim().toLowerCase();
  const cleanSource = String(input.source || "").trim().toLowerCase();
  const cleanContent = String(input.content || "").trim().slice(0, 300).toLowerCase();
  const raw = `${cleanTitle}|${cleanSource}|${cleanContent}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
  return `corpus_key_${hash}`;
}

export function getAnalysisFromDatabase(key: string): {
  key: string;
  articleId?: string;
  title: string;
  source: string;
  category: string;
  provider: string;
  model: string;
  hitCount: number;
  payload: any;
  createdAt: string;
  updatedAt: string;
} | null {
  if (!fs.existsSync(databasePath()) || NO_PERSIST) return null;
  const db = openDatabase();
  try {
    const row = db.prepare(`
      SELECT analysis_key, article_id, title, source, category, provider, model, hit_count, payload, created_at, updated_at
      FROM article_analyses
      WHERE analysis_key = ?
    `).get(key) as any;
    if (!row) return null;
    db.prepare(`
      UPDATE article_analyses
      SET hit_count = hit_count + 1, updated_at = ?
      WHERE analysis_key = ?
    `).run(new Date().toISOString(), key);
    return {
      key: String(row.analysis_key),
      articleId: row.article_id ? String(row.article_id) : undefined,
      title: String(row.title),
      source: String(row.source || ""),
      category: String(row.category || ""),
      provider: String(row.provider || ""),
      model: String(row.model || ""),
      hitCount: Number(row.hit_count || 1),
      payload: JSON.parse(String(row.payload)),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  } catch {
    return null;
  }
}

export function saveAnalysisToDatabase(input: {
  key: string;
  articleId?: string;
  title: string;
  source?: string;
  category?: string;
  provider?: string;
  model?: string;
  payload: any;
}): void {
  if (NO_PERSIST) return;
  const db = openDatabase();
  const now = new Date().toISOString();
  const key = String(input.key);
  const articleId = input.articleId ? String(input.articleId) : null;
  const title = String(input.title || "").trim();
  const source = String(input.source || "").trim();
  const category = String(input.category || "科技前沿").trim();
  const provider = String(input.provider || "").trim();
  const model = String(input.model || "").trim();
  const payloadStr = JSON.stringify(input.payload);

    db.prepare(`
      INSERT INTO article_analyses (
        analysis_key, article_id, title, source, category, provider, model, hit_count, payload, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(analysis_key) DO UPDATE SET
        article_id = COALESCE(excluded.article_id, article_analyses.article_id),
        title = excluded.title,
        source = excluded.source,
        category = excluded.category,
        provider = excluded.provider,
        model = excluded.model,
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `).run(key, articleId, title, source, category, provider, model, payloadStr, now, now);

    // 如果关联了具体文章或属于语料库现存文章，合并持久化至 articles 表
    if (articleId) {
      const artRow = db.prepare("SELECT payload FROM articles WHERE id = ?").get(articleId) as any;
      if (artRow) {
        try {
          const currentArticle = JSON.parse(String(artRow.payload));
          const updatedArticle = {
            ...currentArticle,
            ...input.payload,
            id: currentArticle.id || articleId,
          };
          const updatedPayloadStr = JSON.stringify(updatedArticle);
          const payloadHash = crypto.createHash("sha256").update(updatedPayloadStr).digest("hex");
          db.prepare(`
            UPDATE articles
            SET payload = ?, payload_hash = ?, updated_at = ?
            WHERE id = ?
          `).run(updatedPayloadStr, payloadHash, now, articleId);
        } catch {
          /* 忽略个别异常 */
        }
      }
    }
}

export function listDatabaseAnalyses(options?: {
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): { items: any[]; total: number } {
  if (!fs.existsSync(databasePath()) || NO_PERSIST) return { items: [], total: 0 };
  const db = openDatabase();
  try {
    const q = String(options?.q || "").trim().toLowerCase();
    const category = String(options?.category || "").trim();
    const limit = Math.max(1, Math.min(500, Number(options?.limit || 50)));
    const offset = Math.max(0, Number(options?.offset || 0));

    const conditions: string[] = [];
    const params: any[] = [];

    if (q) {
      conditions.push("(LOWER(title) LIKE ? OR LOWER(source) LIKE ? OR LOWER(category) LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (category && category !== "all") {
      conditions.push("category = ?");
      params.push(category);
    }

    const whereStr = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM article_analyses ${whereStr}`).get(...params) as any;
    const rows = db.prepare(`
      SELECT analysis_key, article_id, title, source, category, provider, model, hit_count, created_at, updated_at
      FROM article_analyses
      ${whereStr}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    const items = rows.map((r) => ({
      key: String(r.analysis_key),
      articleId: r.article_id ? String(r.article_id) : null,
      title: String(r.title),
      source: String(r.source || ""),
      category: String(r.category || ""),
      provider: String(r.provider || ""),
      model: String(r.model || ""),
      hitCount: Number(r.hit_count || 1),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));

    return { items, total: Number(totalRow?.count || 0) };
  } catch {
    return { items: [], total: 0 };
  }
}

export function getDatabaseAnalysisDetail(key: string): any | null {
  if (!fs.existsSync(databasePath()) || NO_PERSIST) return null;
  const db = openDatabase();
  try {
    const row = db.prepare(`
      SELECT analysis_key, article_id, title, source, category, provider, model, hit_count, payload, created_at, updated_at
      FROM article_analyses
      WHERE analysis_key = ?
    `).get(key) as any;
    if (!row) return null;
    return {
      key: String(row.analysis_key),
      articleId: row.article_id ? String(row.article_id) : null,
      title: String(row.title),
      source: String(row.source || ""),
      category: String(row.category || ""),
      provider: String(row.provider || ""),
      model: String(row.model || ""),
      hitCount: Number(row.hit_count || 1),
      payload: JSON.parse(String(row.payload)),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  } catch {
    return null;
  }
}

export function deleteDatabaseAnalysis(key: string): boolean {
  if (!fs.existsSync(databasePath()) || NO_PERSIST) return false;
  const db = openDatabase();
  const info = db.prepare("DELETE FROM article_analyses WHERE analysis_key = ?").run(key);
  return Number(info.changes || 0) > 0;
}

export function batchDeleteDatabaseAnalyses(keys: string[]): number {
  if (!fs.existsSync(databasePath()) || NO_PERSIST || !Array.isArray(keys) || keys.length === 0) return 0;
  const db = openDatabase();
  try {
    const stmt = db.prepare("DELETE FROM article_analyses WHERE analysis_key = ?");
    let deleted = 0;
    db.exec("BEGIN IMMEDIATE");
    for (const k of keys) {
      const res = stmt.run(k);
      deleted += Number(res.changes || 0);
    }
    db.exec("COMMIT");
    return deleted;
  } catch {
    try { db.exec("ROLLBACK"); } catch {}
    return 0;
  }
}

export function getDatabaseOverview(): {
  dbFilePath: string;
  dbFileSize: number;
  dbFileSizeFormatted: string;
  articleCount: number;
  analysisCount: number;
  totalHitCount: number;
  auditCount: number;
  userCount: number;
  persistenceEnabled: boolean;
} {
  const filePath = databasePath();
  let fileSize = 0;
  if (fs.existsSync(filePath)) {
    try {
      fileSize = fs.statSync(filePath).size;
    } catch {
      fileSize = 0;
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!fs.existsSync(filePath) || NO_PERSIST) {
    return {
      dbFilePath: filePath,
      dbFileSize: fileSize,
      dbFileSizeFormatted: formatSize(fileSize),
      articleCount: 0,
      analysisCount: 0,
      totalHitCount: 0,
      auditCount: 0,
      userCount: 0,
      persistenceEnabled: !NO_PERSIST,
    };
  }

  const db = openDatabase();
  try {
    const artCount = Number((db.prepare("SELECT COUNT(*) as count FROM articles").get() as any)?.count || 0);
    const anaCount = Number((db.prepare("SELECT COUNT(*) as count FROM article_analyses").get() as any)?.count || 0);
    const hitSum = Number((db.prepare("SELECT SUM(hit_count) as total FROM article_analyses").get() as any)?.total || 0);
    const audCount = Number((db.prepare("SELECT COUNT(*) as count FROM audit_events").get() as any)?.count || 0);
    const usrCount = Number((db.prepare("SELECT COUNT(*) as count FROM users").get() as any)?.count || 0);

    return {
      dbFilePath: filePath,
      dbFileSize: fileSize,
      dbFileSizeFormatted: formatSize(fileSize),
      articleCount: artCount,
      analysisCount: anaCount,
      totalHitCount: hitSum,
      auditCount: audCount,
      userCount: usrCount,
      persistenceEnabled: !NO_PERSIST,
    };
  } catch {
    return {
      dbFilePath: filePath,
      dbFileSize: fileSize,
      dbFileSizeFormatted: formatSize(fileSize),
      articleCount: 0,
      analysisCount: 0,
      totalHitCount: 0,
      auditCount: 0,
      userCount: 0,
      persistenceEnabled: !NO_PERSIST,
    };
  }
}
