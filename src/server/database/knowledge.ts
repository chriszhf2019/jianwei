import fs from "node:fs";
import { NO_PERSIST } from "../settings";
import { DB_FILE, openDatabase } from "./connection";

export type KnowledgeRecord = {
  id: string;
  articleId?: string;
  title: string;
  category: string;
  tags: string[];
  sourceName?: string;
  publishedAt?: string;
  oneSentenceVerdict: string;
  keyTakeaways: string[];
  coreMechanisms?: string;
  decisionImplication?: string;
  personalNote?: string;
  createdAt: string;
  updatedAt?: string;
  ownerUserId?: string;
  ledger?: "server" | "local";
};

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((item) => String(item)).filter(Boolean);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function rowToItem(row: any): KnowledgeRecord {
  let payload: Record<string, any> = {};
  try {
    payload = JSON.parse(String(row.payload || "{}"));
  } catch {
    payload = {};
  }
  const tags = parseJsonArray(row.tags ?? payload.tags);
  const keyTakeaways = parseJsonArray(row.key_takeaways ?? payload.keyTakeaways);
  return {
    id: String(row.id),
    articleId: row.article_id ? String(row.article_id) : payload.articleId ? String(payload.articleId) : undefined,
    title: String(row.title || payload.title || ""),
    category: String(row.category || payload.category || ""),
    tags,
    sourceName: row.source_name
      ? String(row.source_name)
      : payload.sourceName
        ? String(payload.sourceName)
        : undefined,
    publishedAt: row.published_at
      ? String(row.published_at)
      : payload.publishedAt
        ? String(payload.publishedAt)
        : undefined,
    oneSentenceVerdict: String(row.one_sentence_verdict || payload.oneSentenceVerdict || ""),
    keyTakeaways,
    coreMechanisms: row.core_mechanisms
      ? String(row.core_mechanisms)
      : payload.coreMechanisms
        ? String(payload.coreMechanisms)
        : undefined,
    decisionImplication: row.decision_implication
      ? String(row.decision_implication)
      : payload.decisionImplication
        ? String(payload.decisionImplication)
        : undefined,
    personalNote: row.personal_note
      ? String(row.personal_note)
      : payload.personalNote
        ? String(payload.personalNote)
        : undefined,
    createdAt: String(row.created_at || payload.createdAt || ""),
    updatedAt: row.updated_at ? String(row.updated_at) : payload.updatedAt ? String(payload.updatedAt) : undefined,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    ledger: "server",
  };
}

function normalizeItem(input: Record<string, any>, ownerUserId: string): KnowledgeRecord {
  const now = new Date().toISOString();
  const id = String(input?.id || "").trim() || `kb-${Date.now()}`;
  const title = String(input?.title || "").trim();
  if (!title) throw new Error("invalid_knowledge_item");
  const createdAt = String(input?.createdAt || now).slice(0, 40);
  return {
    id: id.slice(0, 120),
    articleId: input?.articleId ? String(input.articleId).slice(0, 120) : undefined,
    title: title.slice(0, 500),
    category: String(input?.category || "综合战略").trim().slice(0, 80) || "综合战略",
    tags: (Array.isArray(input?.tags) ? input.tags : [])
      .map((tag: unknown) => String(tag).trim())
      .filter(Boolean)
      .slice(0, 30),
    sourceName: input?.sourceName ? String(input.sourceName).slice(0, 200) : undefined,
    publishedAt: input?.publishedAt ? String(input.publishedAt).slice(0, 80) : undefined,
    oneSentenceVerdict: String(input?.oneSentenceVerdict || "").trim().slice(0, 2000),
    keyTakeaways: (Array.isArray(input?.keyTakeaways) ? input.keyTakeaways : [])
      .map((item: unknown) => String(item).trim())
      .filter(Boolean)
      .slice(0, 40),
    coreMechanisms: input?.coreMechanisms ? String(input.coreMechanisms).slice(0, 4000) : undefined,
    decisionImplication: input?.decisionImplication
      ? String(input.decisionImplication).slice(0, 4000)
      : undefined,
    personalNote: input?.personalNote ? String(input.personalNote).slice(0, 4000) : undefined,
    createdAt,
    updatedAt: now,
    ownerUserId: ownerUserId.slice(0, 120) || "local",
    ledger: "server",
  };
}

/** 已沉淀知识：与 articles（运行语料）分离的可检索知识库。 */
export function saveKnowledgeItem(
  input: Record<string, any>,
  ownerUserId = "local"
): KnowledgeRecord {
  if (NO_PERSIST) throw new Error("knowledge_persistence_disabled");
  const item = normalizeItem(input, ownerUserId);
  const db = openDatabase();
  try {
    const payload = JSON.stringify(item);
    db.prepare(`
      INSERT INTO knowledge_items (
        id, owner_user_id, article_id, title, category, tags, source_name, published_at,
        one_sentence_verdict, key_takeaways, core_mechanisms, decision_implication,
        personal_note, payload, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_user_id = excluded.owner_user_id,
        article_id = excluded.article_id,
        title = excluded.title,
        category = excluded.category,
        tags = excluded.tags,
        source_name = excluded.source_name,
        published_at = excluded.published_at,
        one_sentence_verdict = excluded.one_sentence_verdict,
        key_takeaways = excluded.key_takeaways,
        core_mechanisms = excluded.core_mechanisms,
        decision_implication = excluded.decision_implication,
        personal_note = excluded.personal_note,
        payload = excluded.payload,
        updated_at = excluded.updated_at
      WHERE knowledge_items.owner_user_id = excluded.owner_user_id
    `).run(
      item.id,
      String(item.ownerUserId || "local"),
      item.articleId || null,
      item.title,
      item.category,
      JSON.stringify(item.tags),
      item.sourceName || null,
      item.publishedAt || null,
      item.oneSentenceVerdict,
      JSON.stringify(item.keyTakeaways),
      item.coreMechanisms || null,
      item.decisionImplication || null,
      item.personalNote || null,
      payload,
      item.createdAt,
      String(item.updatedAt || item.createdAt)
    );
    const owned = db.prepare(
      "SELECT id FROM knowledge_items WHERE id = ? AND owner_user_id = ?"
    ).get(item.id, String(item.ownerUserId || "local"));
    if (!owned) throw new Error("knowledge_item_forbidden");
    return item;
  } finally {
    db.close();
  }
}

export function updateKnowledgeItem(
  id: string,
  updates: Record<string, any>,
  ownerUserId = "local",
  includeAll = false
): KnowledgeRecord | null {
  if (NO_PERSIST) return null;
  if (!fs.existsSync(DB_FILE)) return null;
  const db = openDatabase();
  try {
    const row = includeAll
      ? (db.prepare("SELECT * FROM knowledge_items WHERE id = ?").get(String(id)) as any)
      : (db
          .prepare("SELECT * FROM knowledge_items WHERE id = ? AND owner_user_id = ?")
          .get(String(id), String(ownerUserId || "local")) as any);
    if (!row) return null;
    const current = rowToItem(row);
    const merged = normalizeItem(
      {
        ...current,
        ...updates,
        id: current.id,
        createdAt: current.createdAt,
        ownerUserId: current.ownerUserId || ownerUserId,
      },
      String(current.ownerUserId || ownerUserId || "local")
    );
    db.prepare(`
      UPDATE knowledge_items SET
        article_id = ?, title = ?, category = ?, tags = ?, source_name = ?, published_at = ?,
        one_sentence_verdict = ?, key_takeaways = ?, core_mechanisms = ?, decision_implication = ?,
        personal_note = ?, payload = ?, updated_at = ?
      WHERE id = ? AND owner_user_id = ?
    `).run(
      merged.articleId || null,
      merged.title,
      merged.category,
      JSON.stringify(merged.tags),
      merged.sourceName || null,
      merged.publishedAt || null,
      merged.oneSentenceVerdict,
      JSON.stringify(merged.keyTakeaways),
      merged.coreMechanisms || null,
      merged.decisionImplication || null,
      merged.personalNote || null,
      JSON.stringify(merged),
      String(merged.updatedAt || merged.createdAt),
      merged.id,
      String(merged.ownerUserId || "local")
    );
    return merged;
  } finally {
    db.close();
  }
}

export function deleteKnowledgeItem(
  id: string,
  ownerUserId = "local",
  includeAll = false
): boolean {
  if (NO_PERSIST) return false;
  if (!fs.existsSync(DB_FILE)) return false;
  const db = openDatabase();
  try {
    const result = includeAll
      ? db.prepare("DELETE FROM knowledge_items WHERE id = ?").run(String(id))
      : db
          .prepare("DELETE FROM knowledge_items WHERE id = ? AND owner_user_id = ?")
          .run(String(id), String(ownerUserId || "local"));
    return Number(result.changes || 0) > 0;
  } finally {
    db.close();
  }
}

export function listKnowledgeItems(options?: {
  ownerUserId?: string;
  includeAll?: boolean;
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): { items: KnowledgeRecord[]; total: number } {
  if (!fs.existsSync(DB_FILE) || NO_PERSIST) return { items: [], total: 0 };
  const db = openDatabase();
  try {
    const ownerUserId = String(options?.ownerUserId || "local");
    const includeAll = Boolean(options?.includeAll);
    const q = String(options?.q || "").trim().toLowerCase();
    const category = String(options?.category || "").trim();
    const limit = Math.max(1, Math.min(500, Number(options?.limit || 100)));
    const offset = Math.max(0, Number(options?.offset || 0));

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (!includeAll) {
      where.push("owner_user_id = ?");
      params.push(ownerUserId);
    }
    if (category && category !== "all") {
      where.push("category = ?");
      params.push(category);
    }
    if (q) {
      where.push(
        "(lower(title) LIKE ? OR lower(one_sentence_verdict) LIKE ? OR lower(IFNULL(personal_note,'')) LIKE ? OR lower(tags) LIKE ? OR lower(payload) LIKE ?)"
      );
      const like = `%${q.replace(/[%_]/g, "")}%`;
      params.push(like, like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = Number(
      (db.prepare(`SELECT COUNT(*) AS count FROM knowledge_items ${whereSql}`).get(...params) as any)
        ?.count || 0
    );
    const rows = db
      .prepare(
        `SELECT * FROM knowledge_items ${whereSql} ORDER BY created_at DESC, updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as any[];
    return { items: rows.map(rowToItem), total };
  } finally {
    db.close();
  }
}

export function searchKnowledgeItems(
  query: string,
  options?: { ownerUserId?: string; includeAll?: boolean; category?: string; limit?: number }
): { items: KnowledgeRecord[]; total: number } {
  return listKnowledgeItems({
    ...options,
    q: query,
    limit: options?.limit ?? 50,
  });
}
