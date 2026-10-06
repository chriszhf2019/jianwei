import fs from "node:fs";
import crypto from "node:crypto";
import { parseArticleDate } from "../../utils/articleTime";
import { NO_PERSIST } from "../settings";
import { DB_FILE, openDatabase } from "./connection";

function articleSearchBody(article: any): string {
  return [
    article?.title || "",
    article?.subtitle || "",
    article?.summary || "",
    ...(Array.isArray(article?.tags) ? article.tags : []),
  ].join(" ");
}

function articleSortTime(article: any): number {
  const raw = article?.publishedAt || article?.sourceDate || article?.date;
  return parseArticleDate(raw) ?? 0;
}


/** 返回 null 表示数据库尚未初始化，区别于“已初始化但内容为空”。 */
export function loadArticlesFromDatabase(): any[] | null {
  if (!fs.existsSync(DB_FILE)) return null;
  const db = openDatabase();
  try {
    const rows = db.prepare("SELECT payload FROM articles ORDER BY sort_time DESC").all() as Array<{ payload: string }>;
    return rows.flatMap((row) => {
      try {
        return [JSON.parse(row.payload)];
      } catch {
        return [];
      }
    });
  } finally {
    db.close();
  }
}

export function queryArticlesPage(input: {
  region?: string;
  q?: string;
  limit: number;
  offset: number;
}): { items: any[]; total: number; filteredTotal: number } | null {
  if (!fs.existsSync(DB_FILE)) return null;
  const db = openDatabase();
  try {
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    const region = String(input.region || "").trim();
    const q = String(input.q || "").trim().toLowerCase();
    if (region) {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM article_regions
          WHERE article_regions.article_id = articles.id
            AND article_regions.region = ?
        )
      `);
      params.push(region);
    }
    if (q) {
      if (q.length >= 3 && !/\s/.test(q)) {
        conditions.push("articles.id IN (SELECT article_id FROM article_search WHERE article_search MATCH ?)");
        params.push(`"${q.replace(/"/g, '""')}"`);
      } else {
        conditions.push(`
          LOWER(
            COALESCE(json_extract(payload, '$.title'), '') || ' ' ||
            COALESCE(json_extract(payload, '$.subtitle'), '') || ' ' ||
            COALESCE(json_extract(payload, '$.summary'), '') || ' ' ||
            COALESCE(json_extract(payload, '$.tags'), '')
          ) LIKE ?
        `);
        params.push(`%${q}%`);
      }
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = db.prepare("SELECT COUNT(*) AS count FROM articles").get() as { count?: number };
    const filteredRow = db.prepare(`SELECT COUNT(*) AS count FROM articles ${where}`).get(...params) as { count?: number };
    const rows = db.prepare(`
      SELECT payload
      FROM articles
      ${where}
      ORDER BY sort_time DESC
      LIMIT ? OFFSET ?
    `).all(...params, input.limit, input.offset) as Array<{ payload: string }>;
    const items = rows.flatMap((row) => {
      try {
        return [JSON.parse(row.payload)];
      } catch {
        return [];
      }
    });
    return {
      items,
      total: Number(totalRow?.count || 0),
      filteredTotal: Number(filteredRow?.count || 0),
    };
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export function persistArticlesToDatabase(articles: any[]): void {
  const db = openDatabase();
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec("CREATE TEMP TABLE IF NOT EXISTS current_article_ids (id TEXT PRIMARY KEY)");
      db.exec("DELETE FROM current_article_ids");
      const markCurrent = db.prepare("INSERT OR IGNORE INTO current_article_ids (id) VALUES (?)");
      const upsert = db.prepare(`
        INSERT INTO articles (
          id, sort_time, source_name, published_at, is_external, payload, updated_at, payload_hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          sort_time = excluded.sort_time,
          source_name = excluded.source_name,
          published_at = excluded.published_at,
          is_external = excluded.is_external,
          payload = excluded.payload,
          updated_at = excluded.updated_at,
          payload_hash = excluded.payload_hash
        WHERE articles.payload_hash IS NULL OR articles.payload_hash != excluded.payload_hash
      `);
      const deleteRegions = db.prepare("DELETE FROM article_regions WHERE article_id = ?");
      const insertRegion = db.prepare(
        "INSERT OR IGNORE INTO article_regions (article_id, region) VALUES (?, ?)"
      );
      const deleteSearch = db.prepare("DELETE FROM article_search WHERE article_id = ?");
      const insertSearch = db.prepare("INSERT INTO article_search (article_id, body) VALUES (?, ?)");
      const now = new Date().toISOString();
      for (const article of articles) {
        const id = String(article?.id || "");
        if (!id) continue;
        const payload = JSON.stringify(article);
        const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
        markCurrent.run(id);
        upsert.run(
          id,
          articleSortTime(article),
          String(article?.sourceName || ""),
          article?.publishedAt ? String(article.publishedAt) : null,
          article?.isExternal === true ? 1 : 0,
          payload,
          now,
          payloadHash
        );
        deleteRegions.run(id);
        const regions = new Set<string>(
          (Array.isArray(article?.regionMentions) ? article.regionMentions : [])
            .map((item: any) => String(item?.region || "").trim())
            .filter(Boolean)
        );
        for (const region of regions) insertRegion.run(id, region);
        deleteSearch.run(id);
        insertSearch.run(id, articleSearchBody(article));
      }
      db.exec("DELETE FROM articles WHERE id NOT IN (SELECT id FROM current_article_ids)");
      db.exec("DELETE FROM article_regions WHERE article_id NOT IN (SELECT id FROM current_article_ids)");
      db.exec("DELETE FROM article_search WHERE article_id NOT IN (SELECT id FROM current_article_ids)");
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

export function databaseStats(): {
  file: string;
  articles: number;
  sourceChecks: number;
  aiUsageEvents: number;
  initialized: boolean;
} {
  if (!fs.existsSync(DB_FILE)) {
    return { file: DB_FILE, articles: 0, sourceChecks: 0, aiUsageEvents: 0, initialized: false };
  }
  const db = openDatabase();
  try {
    const row = db.prepare("SELECT COUNT(*) AS count FROM articles").get() as { count: number };
    const sourceCheck = db.prepare("SELECT COUNT(*) AS count FROM source_checks").get() as { count: number };
    const aiUsage = db.prepare("SELECT COUNT(*) AS count FROM ai_usage_events").get() as { count: number };
    return {
      file: DB_FILE,
      articles: Number(row?.count || 0),
      sourceChecks: Number(sourceCheck?.count || 0),
      aiUsageEvents: Number(aiUsage?.count || 0),
      initialized: true,
    };
  } finally {
    db.close();
  }
}

