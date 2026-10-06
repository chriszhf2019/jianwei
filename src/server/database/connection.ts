import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export const DB_FILE = process.env.JIANWEI_DB_FILE || path.join(process.cwd(), "data", "corpus.db");

function ensureDirectory(): void {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

function articleSearchBodyForMigration(article: any): string {
  return [
    article?.title || "",
    article?.subtitle || "",
    article?.summary || "",
    ...(Array.isArray(article?.tags) ? article.tags : []),
  ].join(" ");
}

export function openDatabase(): DatabaseSync {
  ensureDirectory();
  const db = new DatabaseSync(DB_FILE);
  try {
    fs.chmodSync(DB_FILE, 0o600);
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
          insertSearch.run(row.id, articleSearchBodyForMigration(article));
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
  return db;
}

export function databaseFile(): string {
  return DB_FILE;
}
