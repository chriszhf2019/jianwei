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
  getArticleHashCacheRef,
  setArticleHashCacheRef,
  clearArticleHashCacheRef,
} from "./connection";

export function loadArticlesFromDatabase(): any[] | null {
  if (!fs.existsSync(databasePath())) return null;
  const db = openDatabase();
  const rows = db.prepare("SELECT payload FROM articles ORDER BY sort_time DESC").all() as Array<{ payload: string }>;
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.payload)];
    } catch {
      return [];
    }
  });
}

export function queryArticlesPage(input: {
  region?: string;
  q?: string;
  limit: number;
  offset: number;
}): { items: any[]; total: number; filteredTotal: number } | null {
  if (!fs.existsSync(databasePath())) return null;
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
      if (articleSearchEnabled() && q.length >= 3 && !/\s/.test(q)) {
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
  }
}

/** 检索投影的代码版本。变更分词或地区提取时递增，以便只重建一次索引。 */
const ARTICLE_INDEX_VERSION = "1";

export function planArticlePersistence(
  incoming: Array<{ id: string; hash: string }>,
  known: ReadonlyMap<string, string>,
  indexStale: boolean,
): { writeIds: string[]; reindexIds: string[]; removedIds: string[] } {
  const nextIds = new Set<string>();
  const mode = new Map<string, "write" | "reindex">();
  for (const item of incoming) {
    const id = String(item.id || "");
    if (!id) continue;
    nextIds.add(id);
    if (known.get(id) === item.hash) {
      if (indexStale) mode.set(id, "reindex");
      else mode.delete(id);
      continue;
    }
    mode.set(id, "write");
  }
  const writeIds: string[] = [];
  const reindexIds: string[] = [];
  for (const [id, next] of mode) {
    if (next === "write") writeIds.push(id);
    else reindexIds.push(id);
  }
  const removedIds: string[] = [];
  for (const id of known.keys()) {
    if (!nextIds.has(id)) removedIds.push(id);
  }
  return { writeIds, reindexIds, removedIds };
}

/** dirtyIds 为 null 时全部重算；否则只重算脏 id，以及库里还没有哈希的 id。 */
export function articleIdsToHash(
  ids: Iterable<string>,
  known: ReadonlyMap<string, string>,
  dirtyIds: ReadonlySet<string> | null,
): Set<string> {
  const need = new Set<string>();
  for (const rawId of ids) {
    const id = String(rawId || "");
    if (!id) continue;
    const knownHash = known.get(id);
    if (dirtyIds == null || dirtyIds.has(id) || !knownHash) need.add(id);
  }
  return need;
}

type ArticleHashCache = {
  path: string;
  hashes: Map<string, string>;
  indexVersion: string | null;
};

function articleHashState(db: DatabaseSync): ArticleHashCache {
  const file = databasePath();
  const cached = getArticleHashCacheRef();
  if (cached?.path === file) return cached as ArticleHashCache;
  const rows = db.prepare("SELECT id, payload_hash FROM articles").all() as Array<{ id: string; payload_hash?: string | null }>;
  const hashes = new Map<string, string>();
  for (const row of rows) hashes.set(String(row.id), row.payload_hash ? String(row.payload_hash) : "");
  const versionRow = db.prepare(
    "SELECT value FROM app_meta WHERE key = ?"
  ).get("article_index_version") as { value?: string } | undefined;
  const next: ArticleHashCache = {
    path: file,
    hashes,
    indexVersion: versionRow?.value ? String(versionRow.value) : null,
  };
  setArticleHashCacheRef(next as any);
  return next;
}

function replaceArticleProjections(
  deleteRegions: { run: (...args: any[]) => unknown },
  insertRegion: { run: (...args: any[]) => unknown },
  deleteSearch: { run: (...args: any[]) => unknown },
  insertSearch: { run: (...args: any[]) => unknown },
  id: string,
  article: any,
): void {
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

export function persistArticlesToDatabase(
  articles: any[],
  dirtyIds?: ReadonlySet<string> | null,
): void {
  const db = openDatabase();
  const state = articleHashState(db);
  const indexStale = state.indexVersion !== ARTICLE_INDEX_VERSION;
  const byId = new Map<string, { article: any; payload?: string; hash: string }>();
  for (const article of articles) {
    const id = String(article?.id || "");
    if (!id) continue;
    byId.set(id, { article, hash: "" });
  }
  const toHash = articleIdsToHash(byId.keys(), state.hashes, dirtyIds === undefined ? null : dirtyIds);
  for (const [id, item] of byId) {
    if (!toHash.has(id)) {
      item.hash = state.hashes.get(id) || "";
      continue;
    }
    const payload = JSON.stringify(item.article);
    item.payload = payload;
    item.hash = crypto.createHash("sha256").update(payload).digest("hex");
  }
  const plan = planArticlePersistence(
    [...byId.entries()].map(([id, item]) => ({ id, hash: item.hash })),
    state.hashes,
    indexStale,
  );
  if (
    plan.writeIds.length === 0 &&
    plan.reindexIds.length === 0 &&
    plan.removedIds.length === 0 &&
    !indexStale
  ) {
    return;
  }
  const deleteRegions = db.prepare("DELETE FROM article_regions WHERE article_id = ?");
  const insertRegion = db.prepare(
    "INSERT OR IGNORE INTO article_regions (article_id, region) VALUES (?, ?)"
  );
  const ftsEnabled = articleSearchEnabled();
  const deleteSearch = ftsEnabled
    ? db.prepare("DELETE FROM article_search WHERE article_id = ?")
    : noopStatement;
  const insertSearch = ftsEnabled
    ? db.prepare("INSERT INTO article_search (article_id, body) VALUES (?, ?)")
    : noopStatement;
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
  const deleteArticle = db.prepare("DELETE FROM articles WHERE id = ?");
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const id of plan.writeIds) {
      const item = byId.get(id);
      if (!item?.payload) continue;
      upsert.run(
        id,
        articleSortTime(item.article),
        String(item.article?.sourceName || ""),
        item.article?.publishedAt ? String(item.article.publishedAt) : null,
        item.article?.isExternal === true ? 1 : 0,
        item.payload,
        now,
        item.hash
      );
      replaceArticleProjections(deleteRegions, insertRegion, deleteSearch, insertSearch, id, item.article);
    }
    for (const id of plan.reindexIds) {
      const item = byId.get(id);
      if (!item) continue;
      replaceArticleProjections(deleteRegions, insertRegion, deleteSearch, insertSearch, id, item.article);
    }
    for (const id of plan.removedIds) {
      deleteArticle.run(id);
      deleteRegions.run(id);
      deleteSearch.run(id);
    }
    if (indexStale) {
      db.prepare(`
        INSERT INTO app_meta (key, value) VALUES ('article_index_version', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(ARTICLE_INDEX_VERSION);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  for (const id of plan.writeIds) {
    const item = byId.get(id);
    if (item) state.hashes.set(id, item.hash);
  }
  for (const id of plan.removedIds) state.hashes.delete(id);
  if (indexStale) state.indexVersion = ARTICLE_INDEX_VERSION;
}

export function databaseStats(): {
  file: string;
  articles: number;
  sourceChecks: number;
  aiUsageEvents: number;
  initialized: boolean;
} {
  if (!fs.existsSync(databasePath())) {
    return { file: databasePath(), articles: 0, sourceChecks: 0, aiUsageEvents: 0, initialized: false };
  }
  const db = openDatabase();
  const row = db.prepare("SELECT COUNT(*) AS count FROM articles").get() as { count: number };
  const sourceCheck = db.prepare("SELECT COUNT(*) AS count FROM source_checks").get() as { count: number };
  const aiUsage = db.prepare("SELECT COUNT(*) AS count FROM ai_usage_events").get() as { count: number };
  return {
    file: databasePath(),
    articles: Number(row?.count || 0),
    sourceChecks: Number(sourceCheck?.count || 0),
    aiUsageEvents: Number(aiUsage?.count || 0),
    initialized: true,
  };
}

