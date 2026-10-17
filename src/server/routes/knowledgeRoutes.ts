import type { Express, Request, Response } from "express";
import {
  deleteKnowledgeItem,
  listKnowledgeItems,
  recordAuditEvent,
  saveKnowledgeItem,
  searchKnowledgeItems,
  updateKnowledgeItem,
} from "../database";
import { NO_PERSIST } from "../settings";
import type { RequestAuth } from "./authRoutes";
import {
  isRegisteredKnowledgeWriter,
  registrationRequiredPayload,
} from "../authMiddleware";

export type RateLimiter = (req: Request, res: Response, next: () => void) => void;

function actorFromAuth(auth: RequestAuth | undefined): string {
  if (!auth) return "local";
  if (auth.isGuest) return `guest:${auth.guestId || "unknown"}`;
  return auth.username || auth.userId || "local";
}

/**
 * 服务端知识库 API（切片 3）：
 * - GET  /api/knowledge          list（可选 category）
 * - GET  /api/knowledge/search   search（q + 可选 category）
 * - POST /api/knowledge          save
 * - PATCH/DELETE /api/knowledge/:id  更新/删除（面板需要）
 *
 * 与 articles（运行语料）分离；按登录用户隔离。游客可只读（通常为空），写入需登录。
 */
export function registerKnowledgeRoutes(app: Express, applyRateLimit: RateLimiter): void {
  app.get("/api/knowledge", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (NO_PERSIST) return res.json({ items: [], total: 0, storage: "disabled" });
    const auth = (req as any).auth as RequestAuth;
    const category = String(req.query.category || "").trim();
    const q = String(req.query.q || "").trim();
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const result = listKnowledgeItems({
      ownerUserId: auth?.userId || "local",
      includeAll: auth?.role === "admin" && String(req.query.view || "") === "all",
      category: category || undefined,
      q: q || undefined,
      limit,
      offset,
    });
    res.json({
      items: result.items,
      total: result.total,
      storage: "server",
      note: "knowledge_items 为已沉淀知识；articles 为运行语料。",
    });
  });

  app.get("/api/knowledge/search", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (NO_PERSIST) return res.json({ items: [], total: 0, storage: "disabled" });
    const auth = (req as any).auth as RequestAuth;
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({ error: "missing_query", message: "请提供 q 检索词。" });
    }
    const category = String(req.query.category || "").trim();
    const result = searchKnowledgeItems(q, {
      ownerUserId: auth?.userId || "local",
      includeAll: auth?.role === "admin" && String(req.query.view || "") === "all",
      category: category || undefined,
      limit: Number(req.query.limit || 50),
    });
    res.json({ items: result.items, total: result.total, storage: "server", q });
  });

  app.post("/api/knowledge", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "knowledge_persistence_disabled" });
    const auth = (req as any).auth as RequestAuth;
    if (!isRegisteredKnowledgeWriter(auth)) {
      return res.status(401).json(registrationRequiredPayload("沉淀知识库需要登录。游客可浏览公开语料，写入需注册并审批。"));
    }
    try {
      const item = saveKnowledgeItem(req.body || {}, auth.userId);
      recordAuditEvent({
        actor: actorFromAuth(auth),
        action: "knowledge.deposit",
        entityType: "knowledge",
        entityId: item.id,
        metadata: { title: item.title, category: item.category, articleId: item.articleId },
      });
      res.status(201).json({ ok: true, item });
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (msg.includes("knowledge_item_forbidden")) {
        return res.status(403).json({ error: "knowledge_item_forbidden" });
      }
      if (msg.includes("invalid_knowledge_item")) {
        return res.status(400).json({ error: "invalid_knowledge_item" });
      }
      res.status(400).json({ error: "invalid_knowledge_item" });
    }
  });

  app.patch("/api/knowledge/:id", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "knowledge_persistence_disabled" });
    const auth = (req as any).auth as RequestAuth;
    if (!isRegisteredKnowledgeWriter(auth)) {
      return res.status(401).json(registrationRequiredPayload("更新知识库需要登录。"));
    }
    const updated = updateKnowledgeItem(
      String(req.params.id || ""),
      req.body || {},
      auth.userId,
      auth.role === "admin"
    );
    if (!updated) return res.status(404).json({ error: "knowledge_item_not_found" });
    recordAuditEvent({
      actor: actorFromAuth(auth),
      action: "knowledge.update",
      entityType: "knowledge",
      entityId: updated.id,
      metadata: { category: updated.category },
    });
    res.json({ ok: true, item: updated });
  });

  app.delete("/api/knowledge/:id", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "knowledge_persistence_disabled" });
    const auth = (req as any).auth as RequestAuth;
    if (!isRegisteredKnowledgeWriter(auth)) {
      return res.status(401).json(registrationRequiredPayload("删除知识库条目需要登录。"));
    }
    const ok = deleteKnowledgeItem(
      String(req.params.id || ""),
      auth.userId,
      auth.role === "admin"
    );
    if (!ok) return res.status(404).json({ error: "knowledge_item_not_found" });
    recordAuditEvent({
      actor: actorFromAuth(auth),
      action: "knowledge.delete",
      entityType: "knowledge",
      entityId: String(req.params.id || ""),
    });
    res.json({ ok: true });
  });
}
