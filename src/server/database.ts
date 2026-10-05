import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { parseArticleDate } from "../utils/articleTime";
import { predictionDueInfo } from "../utils/predictionLedger";
import { NO_PERSIST } from "./settings";

function databasePath(): string {
  return process.env.JIANWEI_DB_FILE || path.join(process.cwd(), "data", "corpus.db");
}

type OpenDatabase = { path: string; db: DatabaseSync };
let openDatabaseCache: OpenDatabase | null = null;
let databaseEpoch = 0;

/** 连接关闭或换库后递增。语料层据此丢掉“未改动”标记，下次保存会重新计算哈希。 */
export function databaseCacheEpoch(): number {
  return databaseEpoch;
}

/** 释放当前共享连接。恢复备份前必须调用，否则 Linux 上已打开的文件描述符仍指向旧 inode。 */
export function closeDatabase(): void {
  articleHashCache = null;
  databaseEpoch += 1;
  if (!openDatabaseCache) return;
  try {
    openDatabaseCache.db.close();
  } catch {
    /* 连接已关闭时忽略。 */
  }
  openDatabaseCache = null;
}

function openDatabase(): DatabaseSync {
  const file = databasePath();
  if (openDatabaseCache?.path === file) return openDatabaseCache.db;
  closeDatabase();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* 某些文件系统不支持 POSIX 权限。 */
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      sort_time INTEGER NOT NULL DEFAULT 0,
      source_name TEXT NOT NULL DEFAULT '',
      published_at TEXT,
      is_external INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_articles_sort_time ON articles(sort_time DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_name);
    CREATE INDEX IF NOT EXISTS idx_articles_source_sort ON articles(source_name, sort_time DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_external_sort ON articles(is_external, sort_time DESC);

    CREATE TABLE IF NOT EXISTS article_regions (
      article_id TEXT NOT NULL,
      region TEXT NOT NULL,
      PRIMARY KEY (article_id, region)
    );
    CREATE INDEX IF NOT EXISTS idx_article_regions_region ON article_regions(region, article_id);

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS article_search USING fts5(
      article_id UNINDEXED,
      body,
      tokenize='trigram'
    );

    CREATE TABLE IF NOT EXISTS source_checks (
      check_key TEXT PRIMARY KEY,
      source_url TEXT NOT NULL,
      status TEXT NOT NULL,
      content_hash TEXT,
      checked_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_source_checks_checked_at ON source_checks(checked_at DESC);

    CREATE TABLE IF NOT EXISTS ai_usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_chars INTEGER NOT NULL DEFAULT 0,
      output_chars INTEGER NOT NULL DEFAULT 0,
      prompt_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      operation TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ai_usage_at ON ai_usage_events(at DESC);

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      metadata TEXT,
      previous_hash TEXT,
      integrity_hash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_events_at ON audit_events(at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action, at DESC);

    CREATE TABLE IF NOT EXISTS article_analyses (
      analysis_key TEXT PRIMARY KEY,
      article_id TEXT,
      title TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '科技前沿',
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      hit_count INTEGER NOT NULL DEFAULT 1,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_article_analyses_article_id ON article_analyses(article_id);
    CREATE INDEX IF NOT EXISTS idx_article_analyses_updated ON article_analyses(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_article_analyses_category ON article_analyses(category);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      approval_status TEXT NOT NULL DEFAULT 'approved',
      approved_at TEXT,
      approved_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, expires_at);

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guest_usage (
      guest_id TEXT PRIMARY KEY,
      deep_reads INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_guest_usage_updated ON guest_usage(updated_at DESC);

    CREATE TABLE IF NOT EXISTS evaluation_annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      sample_key TEXT NOT NULL,
      annotator TEXT NOT NULL,
      label TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(task, sample_key, annotator)
    );
    CREATE INDEX IF NOT EXISTS idx_evaluation_task ON evaluation_annotations(task, sample_key);

    CREATE TABLE IF NOT EXISTS evaluation_adjudications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      sample_key TEXT NOT NULL,
      adjudicator TEXT NOT NULL,
      label TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(task, sample_key)
    );
    CREATE INDEX IF NOT EXISTS idx_adjudications_task ON evaluation_adjudications(task, sample_key);

    CREATE TABLE IF NOT EXISTS evaluation_gold_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      version TEXT NOT NULL,
      sample_count INTEGER NOT NULL,
      data_hash TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(task, version)
    );
    CREATE INDEX IF NOT EXISTS idx_gold_sets_task ON evaluation_gold_sets(task, created_at DESC);

    CREATE TABLE IF NOT EXISTS prediction_contracts (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      question TEXT NOT NULL,
      created_at TEXT NOT NULL,
      target_verification_date TEXT NOT NULL,
      status TEXT NOT NULL,
      resolved_at TEXT,
      payload TEXT NOT NULL,
      integrity_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prediction_contracts_status
      ON prediction_contracts(status, target_verification_date);

    CREATE TABLE IF NOT EXISTS prediction_outcome_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      decision TEXT NOT NULL,
      notes TEXT,
      payload TEXT NOT NULL,
      integrity_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(contract_id, reviewer)
    );
    CREATE INDEX IF NOT EXISTS idx_prediction_reviews_contract
      ON prediction_outcome_reviews(contract_id, created_at);

    CREATE TABLE IF NOT EXISTS prediction_ledger_snapshots (
      version TEXT PRIMARY KEY,
      contract_count INTEGER NOT NULL,
      review_count INTEGER NOT NULL,
      data_hash TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prediction_snapshots_created
      ON prediction_ledger_snapshots(created_at DESC);
  `);
  const predictionColumns = db.prepare("PRAGMA table_info(prediction_contracts)").all() as Array<{ name: string }>;
  if (!predictionColumns.some((column) => column.name === "owner_user_id")) {
    db.exec("ALTER TABLE prediction_contracts ADD COLUMN owner_user_id TEXT NOT NULL DEFAULT 'local'");
  }
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (!userColumns.some((column) => column.name === "must_change_password")) {
    db.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0");
  }
  if (!userColumns.some((column) => column.name === "approval_status")) {
    db.exec("ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'");
  }
  if (!userColumns.some((column) => column.name === "approved_at")) {
    db.exec("ALTER TABLE users ADD COLUMN approved_at TEXT");
  }
  if (!userColumns.some((column) => column.name === "approved_by")) {
    db.exec("ALTER TABLE users ADD COLUMN approved_by TEXT");
  }
  const sourceColumns = db.prepare("PRAGMA table_info(source_checks)").all() as Array<{ name: string }>;
  if (!sourceColumns.some((column) => column.name === "page_text")) {
    db.exec("ALTER TABLE source_checks ADD COLUMN page_text TEXT");
  }
  // 旧版逐引句结论没有正文快照，无法复核；清除后由当前证据和页面快照重新生成。
  db.prepare(
    "DELETE FROM source_checks WHERE page_text IS NULL AND status IN ('verified_quote', 'quote_not_found', 'quote_too_short')"
  ).run();
  const articleColumns = db.prepare("PRAGMA table_info(articles)").all() as Array<{ name: string }>;
  if (!articleColumns.some((column) => column.name === "payload_hash")) {
    db.exec("ALTER TABLE articles ADD COLUMN payload_hash TEXT");
  }
  const articleCount = Number((db.prepare("SELECT COUNT(*) AS count FROM articles").get() as any)?.count || 0);
  const regionCount = Number((db.prepare("SELECT COUNT(*) AS count FROM article_regions").get() as any)?.count || 0);
  const searchCount = Number((db.prepare("SELECT COUNT(*) AS count FROM article_search").get() as any)?.count || 0);
  if (articleCount > 0 && (regionCount === 0 || searchCount === 0)) {
    const rows = db.prepare("SELECT id, payload FROM articles").all() as Array<{ id: string; payload: string }>;
    const insertRegion = db.prepare("INSERT OR IGNORE INTO article_regions (article_id, region) VALUES (?, ?)");
    const deleteSearch = db.prepare("DELETE FROM article_search WHERE article_id = ?");
    const insertSearch = db.prepare("INSERT INTO article_search (article_id, body) VALUES (?, ?)");
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const row of rows) {
        try {
          const article = JSON.parse(row.payload);
          const regions = new Set<string>(
            (Array.isArray(article?.regionMentions) ? article.regionMentions : [])
              .map((item: any) => String(item?.region || "").trim())
              .filter(Boolean)
          );
          for (const region of regions) insertRegion.run(row.id, region);
          deleteSearch.run(row.id);
          insertSearch.run(row.id, articleSearchBody(article));
        } catch {
          /* 单条损坏数据不阻断索引迁移。 */
        }
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  openDatabaseCache = { path: file, db };
  return db;
}

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

export function databaseFile(): string {
  return databasePath();
}

/** 返回 null 表示数据库尚未初始化，区别于“已初始化但内容为空”。 */
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
let articleHashCache: ArticleHashCache | null = null;

function articleHashState(db: DatabaseSync): ArticleHashCache {
  const file = databasePath();
  if (articleHashCache?.path === file) return articleHashCache;
  const rows = db.prepare("SELECT id, payload_hash FROM articles").all() as Array<{ id: string; payload_hash?: string | null }>;
  const hashes = new Map<string, string>();
  for (const row of rows) hashes.set(String(row.id), row.payload_hash ? String(row.payload_hash) : "");
  const versionRow = db.prepare(
    "SELECT value FROM app_meta WHERE key = ?"
  ).get("article_index_version") as { value?: string } | undefined;
  articleHashCache = {
    path: file,
    hashes,
    indexVersion: versionRow?.value ? String(versionRow.value) : null,
  };
  return articleHashCache;
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
  const deleteSearch = db.prepare("DELETE FROM article_search WHERE article_id = ?");
  const insertSearch = db.prepare("INSERT INTO article_search (article_id, body) VALUES (?, ?)");
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

function predictionIntegrityHash(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function createPredictionContract(input: Record<string, any>): Record<string, any> {
  const id = String(input?.id || "").trim();
  const articleId = String(input?.articleId || "").trim();
  const question = String(input?.question || "").trim();
  const targetVerificationDate = String(input?.targetVerificationDate || "").trim();
  if (!id || !articleId || !question || !targetVerificationDate) {
    throw new Error("invalid_prediction_contract");
  }
  const now = new Date().toISOString();
  const ownerUserId = String(input?.ownerUserId || "local").trim().slice(0, 120) || "local";
  const contract = {
    ...input,
    id,
    articleId,
    question,
    targetVerificationDate,
    createdAt: String(input?.createdAt || now),
    dataCutoffAt: String(input?.dataCutoffAt || input?.createdAt || now),
    status: "pending" as const,
    actualOutcome: undefined,
    outcomeEvidence: undefined,
    outcomeSourceUrl: undefined,
    resolutionDate: undefined,
    ownerUserId,
  };
  const payload = JSON.stringify(contract);
  const hash = predictionIntegrityHash(contract);
  const db = openDatabase();
  db.prepare(`
    INSERT INTO prediction_contracts (
      id, article_id, question, created_at, target_verification_date,
      status, resolved_at, payload, integrity_hash, updated_at, owner_user_id
    ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?)
  `).run(
    id,
    articleId,
    question,
    contract.createdAt,
    targetVerificationDate,
    payload,
    hash,
    now,
    ownerUserId
  );
  return { ...contract, ledger: "server", integrityHash: hash, integrityValid: true };
}

export function resolvePredictionContract(input: {
  id: string;
  status: string;
  actualOutcome: string;
  outcomeEvidence: string;
  outcomeSourceUrl?: string;
  brierScore?: number;
  reviewer?: string;
  ownerUserId?: string;
  includeAll?: boolean;
}): { ok: false; reason: "not_found" | "already_resolved" } | {
  ok: true;
  contract: Record<string, any>;
  integrityHash: string;
} {
  const db = openDatabase();
  const row = db.prepare(
    "SELECT payload, status, owner_user_id FROM prediction_contracts WHERE id = ?"
  ).get(String(input.id)) as { payload?: string; status?: string; owner_user_id?: string } | undefined;
  if (!row?.payload) return { ok: false, reason: "not_found" };
  if (!input.includeAll && String(row.owner_user_id || "local") !== String(input.ownerUserId || "local")) {
    return { ok: false, reason: "not_found" };
  }
  const current = JSON.parse(row.payload);
  if (row.status !== "pending" || current?.status !== "pending") {
    return { ok: false, reason: "already_resolved" };
  }
  const resolvedAt = new Date().toISOString();
  const contract = {
    ...current,
    status: input.status,
    actualOutcome: String(input.actualOutcome || "").slice(0, 1000),
    outcomeEvidence: String(input.outcomeEvidence || "").slice(0, 2000),
    outcomeSourceUrl: input.outcomeSourceUrl ? String(input.outcomeSourceUrl).slice(0, 2000) : undefined,
    resolutionDate: resolvedAt,
    brierScore: typeof input.brierScore === "number" ? input.brierScore : undefined,
  };
  const hash = predictionIntegrityHash(contract);
  const result = db.prepare(`
    UPDATE prediction_contracts
    SET status = ?, resolved_at = ?, payload = ?, integrity_hash = ?, updated_at = ?
    WHERE id = ? AND status = 'pending'
  `).run(
    input.status,
    resolvedAt,
    JSON.stringify(contract),
    hash,
    resolvedAt,
    input.id
  );
  if (!result.changes) return { ok: false, reason: "already_resolved" };
  const reviewer = String(input.reviewer || "结果录入者").trim().slice(0, 80);
  const reviewPayload = {
    contractId: String(input.id),
    reviewer,
    decision: "confirm",
    notes: "首次结果录入与证据提交",
    createdAt: resolvedAt,
  };
  db.prepare(`
    INSERT OR IGNORE INTO prediction_outcome_reviews (
      contract_id, reviewer, decision, notes, payload, integrity_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(input.id),
    reviewer,
    "confirm",
    reviewPayload.notes,
    JSON.stringify(reviewPayload),
    predictionIntegrityHash(reviewPayload),
    resolvedAt
  );
  return {
    ok: true,
    contract: { ...contract, ledger: "server", integrityHash: hash, integrityValid: true },
    integrityHash: hash,
  };
}

export function listPredictionContracts(ownerUserId?: string, includeAll = false): Array<Record<string, any>> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  const reviewsByContract = new Map<string, any[]>();
  const reviewRows = db.prepare(`
    SELECT contract_id, payload, integrity_hash
    FROM prediction_outcome_reviews
    ORDER BY created_at ASC
  `).all() as any[];
  for (const row of reviewRows) {
    try {
      const review = JSON.parse(String(row.payload));
      const item = {
        ...review,
        integrityValid: predictionIntegrityHash(review) === String(row.integrity_hash),
      };
      const items = reviewsByContract.get(String(row.contract_id)) || [];
      items.push(item);
      reviewsByContract.set(String(row.contract_id), items);
    } catch {
      /* 损坏的复核记录不进入共识计算。 */
    }
  }
  const rows = db.prepare(`
    SELECT payload, integrity_hash, status, resolved_at
    FROM prediction_contracts
    ${includeAll ? "" : "WHERE owner_user_id = ?"}
    ORDER BY created_at DESC
  `).all(...(includeAll ? [] : [String(ownerUserId || "local")])) as any[];
  return rows.map((row) => {
    try {
      const contract = JSON.parse(String(row.payload));
      const due = predictionDueInfo(
        String(contract?.targetVerificationDate || ""),
        String(row.status || contract.status) as any
      );
      const outcomeReviews = reviewsByContract.get(String(contract.id)) || [];
      const validReviews = outcomeReviews.filter((review) => review.integrityValid);
      const confirmations = validReviews.filter((review) => review.decision === "confirm").length;
      const disputes = validReviews.filter((review) => review.decision === "dispute").length;
      const reviewStatus =
        disputes > 0 ? "disputed" :
        confirmations >= 2 ? "confirmed" :
        "provisional";
      return {
        ...contract,
        status: String(row.status || contract.status),
        resolutionDate: row.resolved_at || contract.resolutionDate,
        ledger: "server",
        integrityHash: String(row.integrity_hash),
        integrityValid: predictionIntegrityHash(contract) === String(row.integrity_hash),
        dueState: due.state,
        daysUntilDue: due.daysUntilDue,
        outcomeReviews,
        reviewStatus,
        reviewCount: validReviews.length,
        confirmationCount: confirmations,
        disputeCount: disputes,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export function recordPredictionOutcomeReview(input: {
  contractId: string;
  reviewer: string;
  decision: "confirm" | "dispute";
  notes?: string;
  ownerUserId?: string;
  includeAll?: boolean;
}): { ok: true; review: Record<string, any> } | {
  ok: false;
  reason: "not_found" | "not_resolved" | "reviewer_already_recorded";
} {
  const db = openDatabase();
  const contract = db.prepare(
    "SELECT status, owner_user_id FROM prediction_contracts WHERE id = ?"
  ).get(String(input.contractId)) as { status?: string; owner_user_id?: string } | undefined;
  if (!contract) return { ok: false, reason: "not_found" };
  if (!input.includeAll && String(contract.owner_user_id || "local") !== String(input.ownerUserId || "local")) {
    return { ok: false, reason: "not_found" };
  }
  if (contract.status === "pending") return { ok: false, reason: "not_resolved" };
  const createdAt = new Date().toISOString();
  const review = {
    contractId: String(input.contractId),
    reviewer: String(input.reviewer).trim().slice(0, 80),
    decision: input.decision,
    notes: String(input.notes || "").trim().slice(0, 1000),
    createdAt,
  };
  try {
    db.prepare(`
      INSERT INTO prediction_outcome_reviews (
        contract_id, reviewer, decision, notes, payload, integrity_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      review.contractId,
      review.reviewer,
      review.decision,
      review.notes,
      JSON.stringify(review),
      predictionIntegrityHash(review),
      createdAt
    );
  } catch (error: any) {
    if (String(error?.message || error).includes("UNIQUE")) {
      return { ok: false, reason: "reviewer_already_recorded" };
    }
    throw error;
  }
  return { ok: true, review: { ...review, integrityValid: true } };
}

export function deletePendingPredictionContract(id: string, ownerUserId?: string, includeAll = false): boolean {
  const db = openDatabase();
  const result = db.prepare(
    `DELETE FROM prediction_contracts
     WHERE id = ? AND status = 'pending'
     ${includeAll ? "" : "AND owner_user_id = ?"}`
  ).run(...(includeAll ? [String(id || "")] : [String(id || ""), String(ownerUserId || "local")]));
  return Number(result.changes || 0) > 0;
}

export function buildPredictionLedgerExport(ownerUserId?: string, includeAll = false): {
  payload: Record<string, any>;
  dataHash: string;
} {
  const contracts = [...listPredictionContracts(ownerUserId, includeAll)].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    contracts,
    summary: {
      contracts: contracts.length,
      resolved: contracts.filter((contract) => contract.status !== "pending").length,
      confirmedReviews: contracts.filter((contract) => contract.reviewStatus === "confirmed").length,
      disputedReviews: contracts.filter((contract) => contract.reviewStatus === "disputed").length,
      integrityValid: contracts.filter((contract) => contract.integrityValid === true).length,
    },
  };
  const dataHash = predictionIntegrityHash(payload);
  return { payload, dataHash };
}

export function persistPredictionLedgerSnapshot(input: {
  version: string;
  dataHash: string;
  payload: Record<string, any>;
}): void {
  const db = openDatabase();
  const contracts = Array.isArray(input.payload?.contracts) ? input.payload.contracts : [];
  const reviewCount = contracts.reduce(
    (sum, contract) => sum + (Array.isArray(contract?.outcomeReviews) ? contract.outcomeReviews.length : 0),
    0
  );
  db.prepare(`
    INSERT INTO prediction_ledger_snapshots (
      version, contract_count, review_count, data_hash, payload, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.version,
    contracts.length,
    reviewCount,
    input.dataHash,
    JSON.stringify(input.payload),
    new Date().toISOString()
  );
}

export function listPredictionLedgerSnapshots(): Array<{
  version: string;
  contractCount: number;
  reviewCount: number;
  dataHash: string;
  createdAt: string;
}> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  return (db.prepare(`
    SELECT version, contract_count AS contractCount, review_count AS reviewCount,
           data_hash AS dataHash, created_at AS createdAt
    FROM prediction_ledger_snapshots
    ORDER BY created_at DESC
  `).all() as any[]).map((row) => ({
    version: String(row.version),
    contractCount: Number(row.contractCount),
    reviewCount: Number(row.reviewCount),
    dataHash: String(row.dataHash),
    createdAt: String(row.createdAt),
  }));
}

export function loadPredictionLedgerSnapshot(version: string): Record<string, any> | null {
  if (!fs.existsSync(databasePath())) return null;
  const db = openDatabase();
  try {
    const row = db.prepare(
      "SELECT payload, data_hash FROM prediction_ledger_snapshots WHERE version = ?"
    ).get(String(version)) as { payload?: string; data_hash?: string } | undefined;
    if (!row?.payload) return null;
    const payload = JSON.parse(row.payload);
    return {
      ...payload,
      snapshotVersion: String(version),
      dataHash: String(row.data_hash || ""),
      integrityValid: predictionIntegrityHash(payload) === String(row.data_hash || ""),
    };
  } catch {
    return null;
  }
}

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

/**
 * AI 模型参考价格表（USD per 1M tokens）。
 * 来源：各供应商官网公开定价（2025-09 参考），实际价格以供应商官网为准。
 * 未列出的模型按 provider 默认价估算；无法匹配时返回 null。
 */
const AI_PRICE_TABLE: Record<string, { input: number; output: number; label: string }> = {
  // DeepSeek
  "deepseek:deepseek-chat": { input: 0.14, output: 0.28, label: "DeepSeek Chat" },
  "deepseek:deepseek-reasoner": { input: 0.55, output: 2.19, label: "DeepSeek Reasoner" },
  // Gemini
  "gemini:gemini-2.0-flash": { input: 0.1, output: 0.4, label: "Gemini 2.0 Flash" },
  "gemini:gemini-1.5-flash": { input: 0.075, output: 0.3, label: "Gemini 1.5 Flash" },
  "gemini:gemini-1.5-pro": { input: 1.25, output: 5.0, label: "Gemini 1.5 Pro" },
};

const PROVIDER_DEFAULT_PRICE: Record<string, { input: number; output: number }> = {
  deepseek: { input: 0.27, output: 1.1 }, // DeepSeek 均值
  gemini: { input: 0.1, output: 0.4 },   // Gemini Flash 默认
};

export function estimateAiCost(provider: string, model: string, promptTokens: number, outputTokens: number): number | null {
  if (promptTokens <= 0 && outputTokens <= 0) return null;
  const key = `${provider}:${model}`;
  const price = AI_PRICE_TABLE[key] || PROVIDER_DEFAULT_PRICE[provider];
  if (!price) return null;
  const cost = (promptTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
  return Math.round(cost * 10000) / 10000; // 保留 4 位小数
}

export function getAiCostToday(): { estimatedCostUsd: number | null; priceSource: string } {
  if (!fs.existsSync(databasePath())) {
    return { estimatedCostUsd: null, priceSource: "无数据" };
  }
  const db = openDatabase();
  const rows = db.prepare(`
    SELECT provider, model,
      COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
      COALESCE(SUM(output_tokens), 0) AS outputTokens
    FROM ai_usage_events
    WHERE at >= ? AND total_tokens IS NOT NULL
    GROUP BY provider, model
  `).all(startOfLocalDayIso()) as Array<{ provider: string; model: string; promptTokens: number; outputTokens: number }>;
  let total = 0;
  let hasAny = false;
  for (const row of rows) {
    const cost = estimateAiCost(row.provider, row.model, Number(row.promptTokens || 0), Number(row.outputTokens || 0));
    if (cost != null) { total += cost; hasAny = true; }
  }
  return {
    estimatedCostUsd: hasAny ? Math.round(total * 10000) / 10000 : null,
    priceSource: "供应商官网公开定价（2025-09 参考）",
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

export function recordEvaluationAnnotation(input: {
  task: string;
  sampleKey: string;
  annotator: string;
  label: string;
  payload?: unknown;
}): void {
  const db = openDatabase();
  const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO evaluation_annotations (
        task, sample_key, annotator, label, payload, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task, sample_key, annotator) DO UPDATE SET
        label = excluded.label,
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `).run(
      input.task,
      input.sampleKey,
      input.annotator,
      input.label,
      input.payload === undefined ? null : JSON.stringify(input.payload),
      now,
      now
    );
}

export function listEvaluationAnnotations(task: string): Array<{
  task: string;
  sampleKey: string;
  annotator: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  payload?: unknown;
}> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  return (db.prepare(`
    SELECT task, sample_key AS sampleKey, annotator, label, payload,
           created_at AS createdAt, updated_at AS updatedAt
    FROM evaluation_annotations
    WHERE task = ?
    ORDER BY sample_key, annotator
  `).all(task) as any[]).map((row) => ({
    task: String(row.task),
    sampleKey: String(row.sampleKey),
    annotator: String(row.annotator),
    label: String(row.label),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    payload: row.payload ? JSON.parse(String(row.payload)) : undefined,
  }));
}

export function recordEvaluationAdjudication(input: {
  task: string;
  sampleKey: string;
  adjudicator: string;
  label: string;
  notes?: string;
}): void {
  const db = openDatabase();
  const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO evaluation_adjudications (
        task, sample_key, adjudicator, label, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task, sample_key) DO UPDATE SET
        adjudicator = excluded.adjudicator,
        label = excluded.label,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run(
      input.task,
      input.sampleKey,
      input.adjudicator,
      input.label,
      input.notes || null,
      now,
      now
    );
}

export function listEvaluationAdjudications(task: string): Array<{
  task: string;
  sampleKey: string;
  adjudicator: string;
  label: string;
  notes?: string;
  updatedAt: string;
}> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  return (db.prepare(`
    SELECT task, sample_key AS sampleKey, adjudicator, label, notes, updated_at AS updatedAt
    FROM evaluation_adjudications
    WHERE task = ?
    ORDER BY sample_key
  `).all(task) as any[]).map((row) => ({
    task: String(row.task),
    sampleKey: String(row.sampleKey),
    adjudicator: String(row.adjudicator),
    label: String(row.label),
    notes: row.notes ? String(row.notes) : undefined,
    updatedAt: String(row.updatedAt),
  }));
}

export function importEvaluationRecords(input: {
  annotations: Array<{
    task: string;
    sampleKey: string;
    annotator: string;
    label: string;
    payload?: unknown;
  }>;
  adjudications: Array<{
    task: string;
    sampleKey: string;
    adjudicator: string;
    label: string;
    notes?: string;
  }>;
}): { annotations: number; adjudications: number } {
  const db = openDatabase();
  const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      const annotationStatement = db.prepare(`
        INSERT INTO evaluation_annotations (
          task, sample_key, annotator, label, payload, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task, sample_key, annotator) DO UPDATE SET
          label = excluded.label,
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `);
      const adjudicationStatement = db.prepare(`
        INSERT INTO evaluation_adjudications (
          task, sample_key, adjudicator, label, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task, sample_key) DO UPDATE SET
          adjudicator = excluded.adjudicator,
          label = excluded.label,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `);
      for (const item of input.annotations) {
        annotationStatement.run(
          item.task,
          item.sampleKey,
          item.annotator,
          item.label,
          item.payload === undefined ? null : JSON.stringify(item.payload),
          now,
          now
        );
      }
      for (const item of input.adjudications) {
        adjudicationStatement.run(
          item.task,
          item.sampleKey,
          item.adjudicator,
          item.label,
          item.notes || null,
          now,
          now
        );
      }
      db.exec("COMMIT");
      return {
        annotations: input.annotations.length,
        adjudications: input.adjudications.length,
      };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
}

export function persistEvaluationGoldSet(input: {
  task: string;
  version: string;
  dataHash: string;
  payload: unknown;
}): { sampleCount: number; createdAt: string } {
  const db = openDatabase();
  const createdAt = new Date().toISOString();
  const sampleCount = Array.isArray((input.payload as any)?.samples)
    ? (input.payload as any).samples.length
    : 0;
    db.prepare(`
      INSERT INTO evaluation_gold_sets (
        task, version, sample_count, data_hash, payload, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      input.task,
      input.version,
      sampleCount,
      input.dataHash,
      JSON.stringify(input.payload),
      createdAt
    );
  return { sampleCount, createdAt };
}

export function listEvaluationGoldSets(task?: string): Array<{
  task: string;
  version: string;
  sampleCount: number;
  dataHash: string;
  createdAt: string;
}> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  const rows = task
    ? db.prepare(`
        SELECT task, version, sample_count AS sampleCount, data_hash AS dataHash, created_at AS createdAt
        FROM evaluation_gold_sets
        WHERE task = ?
        ORDER BY created_at DESC
      `).all(task)
    : db.prepare(`
        SELECT task, version, sample_count AS sampleCount, data_hash AS dataHash, created_at AS createdAt
        FROM evaluation_gold_sets
        ORDER BY created_at DESC
      `).all();
  return (rows as any[]).map((row) => ({
    task: String(row.task),
    version: String(row.version),
    sampleCount: Number(row.sampleCount),
    dataHash: String(row.dataHash),
    createdAt: String(row.createdAt),
  }));
}

export function loadEvaluationGoldSet(task: string, version: string): any | null {
  if (!fs.existsSync(databasePath())) return null;
  const db = openDatabase();
  const row = db.prepare(`
    SELECT payload FROM evaluation_gold_sets WHERE task = ? AND version = ?
  `).get(task, version) as { payload?: string } | undefined;
  return row?.payload ? JSON.parse(row.payload) : null;
}

export function backupDatabase(destination: string): boolean {
  const file = databasePath();
  if (!fs.existsSync(file)) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temp = `${destination}.tmp`;
  if (fs.existsSync(temp)) fs.unlinkSync(temp);
  closeDatabase();
  const db = new DatabaseSync(file);
  try {
    db.exec(`VACUUM INTO '${temp.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
  fs.renameSync(temp, destination);
  const databaseHash = crypto.createHash("sha256").update(fs.readFileSync(destination)).digest("hex");
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    file: path.basename(destination),
    bytes: fs.statSync(destination).size,
    databaseHash,
    integrityCheck: "ok",
    source: path.basename(file),
  };
  fs.writeFileSync(`${destination}.manifest.json`, JSON.stringify(manifest, null, 2), "utf-8");
  return true;
}

function databaseIntegrityCheck(filePath: string): { ok: boolean; articles: number; detail: string } {
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(filePath, { readOnly: true });
    const result = db.prepare("PRAGMA integrity_check").get() as Record<string, unknown> | undefined;
    const detail = String(
      result?.integrity_check ??
      result?.["integrity_check"] ??
      Object.values(result || {})[0] ??
      "unknown"
    );
    const articleRow = db.prepare("SELECT COUNT(*) AS count FROM articles").get() as { count?: number };
    return {
      ok: detail.toLowerCase() === "ok",
      articles: Number(articleRow?.count || 0),
      detail,
    };
  } catch (error: any) {
    return { ok: false, articles: 0, detail: String(error?.message || error) };
  } finally {
    db?.close();
  }
}

export function verifyDatabaseBackup(filePath: string): {
  ok: boolean;
  reason?: "missing" | "manifest_missing" | "hash_mismatch" | "integrity_failed";
  file: string;
  manifestFile: string;
  databaseHash: string;
  articles: number;
  detail: string;
} {
  const manifestFile = `${filePath}.manifest.json`;
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: "missing", file: filePath, manifestFile, databaseHash: "", articles: 0, detail: "backup file missing" };
  }
  if (!fs.existsSync(manifestFile)) {
    return { ok: false, reason: "manifest_missing", file: filePath, manifestFile, databaseHash: "", articles: 0, detail: "backup manifest missing" };
  }
  let manifest: any;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8"));
  } catch {
    return { ok: false, reason: "manifest_missing", file: filePath, manifestFile, databaseHash: "", articles: 0, detail: "backup manifest unreadable" };
  }
  const databaseHash = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  if (databaseHash !== String(manifest?.databaseHash || "")) {
    return { ok: false, reason: "hash_mismatch", file: filePath, manifestFile, databaseHash, articles: 0, detail: "backup hash mismatch" };
  }
  const integrity = databaseIntegrityCheck(filePath);
  if (!integrity.ok) {
    return { ok: false, reason: "integrity_failed", file: filePath, manifestFile, databaseHash, articles: integrity.articles, detail: integrity.detail };
  }
  return { ok: true, file: filePath, manifestFile, databaseHash, articles: integrity.articles, detail: "ok" };
}

export function listDatabaseBackups(directory: string): Array<{
  file: string;
  createdAt: string;
  bytes: number;
  databaseHash: string;
  articles: number;
  integrityValid: boolean;
  reason?: string;
}> {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith(".db"))
    .sort()
    .reverse()
    .map((file) => {
      const fullPath = path.join(directory, file);
      const verification = verifyDatabaseBackup(fullPath);
      let manifest: any = {};
      try {
        manifest = JSON.parse(fs.readFileSync(verification.manifestFile, "utf-8"));
      } catch {
        manifest = {};
      }
      return {
        file,
        createdAt: String(manifest?.createdAt || ""),
        bytes: Number(manifest?.bytes || 0),
        databaseHash: verification.databaseHash,
        articles: verification.articles,
        integrityValid: verification.ok,
        ...(verification.reason ? { reason: verification.reason } : {}),
      };
    });
}

export function restoreDatabaseBackup(
  backupPath: string,
  options: { confirmation: string }
): { ok: boolean; reason?: string; restoredAt?: string; rollbackFile?: string; articles?: number } {
  if (options.confirmation !== "RESTORE") return { ok: false, reason: "confirmation_required" };
  const verification = verifyDatabaseBackup(backupPath);
  if (!verification.ok) return { ok: false, reason: verification.reason || "verification_failed" };
  const restoreTemp = `${databasePath()}.restore.tmp`;
  const restoreManifest = `${restoreTemp}.manifest.json`;
  if (fs.existsSync(restoreTemp)) fs.unlinkSync(restoreTemp);
  if (fs.existsSync(restoreManifest)) fs.unlinkSync(restoreManifest);
  fs.copyFileSync(backupPath, restoreTemp);
  fs.copyFileSync(verification.manifestFile, restoreManifest);
  const tempVerification = verifyDatabaseBackup(restoreTemp);
  if (!tempVerification.ok) {
    fs.unlinkSync(restoreTemp);
    fs.unlinkSync(restoreManifest);
    return { ok: false, reason: "temporary_restore_failed" };
  }
  const rollbackFile = `${databasePath()}.rollback-${Date.now()}`;
  let movedOriginal = false;
  closeDatabase();
  try {
    if (fs.existsSync(databasePath())) {
      fs.renameSync(databasePath(), rollbackFile);
      movedOriginal = true;
    }
    fs.renameSync(restoreTemp, databasePath());
    if (fs.existsSync(restoreManifest)) fs.unlinkSync(restoreManifest);
    fs.chmodSync(databasePath(), 0o600);
    const restored = databaseIntegrityCheck(databasePath());
    if (!restored.ok) throw new Error(restored.detail);
    return {
      ok: true,
      restoredAt: new Date().toISOString(),
      rollbackFile,
      articles: restored.articles,
    };
  } catch (error: any) {
    try {
      if (fs.existsSync(databasePath())) fs.unlinkSync(databasePath());
      if (movedOriginal && fs.existsSync(rollbackFile)) fs.renameSync(rollbackFile, databasePath());
    } catch {
      /* 保留 rollback 文件供人工恢复。 */
    }
    return { ok: false, reason: String(error?.message || error), rollbackFile };
  }
}

/* ==========================================================================
   Article & Corpus AI Analysis Persistence Functions
   ========================================================================== */

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
