import type { Express, Request, Response } from "express";
import {
  buildPredictionLedgerExport,
  createPredictionContract,
  deletePendingPredictionContract,
  listPredictionContracts,
  listPredictionLedgerSnapshots,
  loadPredictionLedgerSnapshot,
  persistPredictionLedgerSnapshot,
  recordAuditEvent,
  recordPredictionOutcomeReview,
  resolvePredictionContract,
} from "../database";
import { NO_PERSIST } from "../settings";
import type { RequestAuth } from "./authRoutes";

export type RateLimiter = (req: Request, res: Response, next: () => void) => void;

const PREDICTION_RESOLUTION_STATUSES = new Set([
  "verified_hit_user",
  "verified_hit_ai",
  "verified_both_win",
  "verified_both_miss",
]);

/** 预测契约账本相关路由：列表/立约/裁决/复核/冻结快照。 */
export function registerPredictionRoutes(app: Express, applyRateLimit: RateLimiter): void {
  app.get("/api/predictions", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (NO_PERSIST) return res.json({ contracts: [] });
    const view = String(req.query.view || "all");
    const auth = (req as any).auth as RequestAuth;
    const contracts = listPredictionContracts(auth.userId, auth.role === "admin");
    const dueStates = new Set(["overdue", "due_today", "due_soon"]);
    const filtered =
      view === "due"
        ? contracts.filter((contract) => dueStates.has(String(contract.dueState)))
        : view === "pending"
          ? contracts.filter((contract) => contract.status === "pending")
          : view === "resolved"
            ? contracts.filter((contract) => contract.status !== "pending")
            : contracts;
    res.json({ contracts: filtered, total: contracts.length });
  });

  app.post("/api/predictions", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
    try {
      const auth = (req as any).auth as RequestAuth;
      const contract = createPredictionContract({ ...(req.body || {}), ownerUserId: auth.userId });
      recordAuditEvent({
        actor: "local",
        action: "prediction.create",
        entityType: "prediction_contract",
        entityId: contract.id,
        metadata: { articleId: contract.articleId, targetVerificationDate: contract.targetVerificationDate },
      });
      res.status(201).json({ ok: true, contract });
    } catch (error: any) {
      if (String(error?.message || error).includes("UNIQUE")) {
        return res.status(409).json({ error: "prediction_contract_already_exists" });
      }
      res.status(400).json({ error: "invalid_prediction_contract" });
    }
  });

  app.get("/api/predictions/export", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (NO_PERSIST) {
      return res.json({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        contracts: [],
        summary: null,
      });
    }
    const auth = (req as any).auth as RequestAuth;
    const exported = buildPredictionLedgerExport(auth.userId, auth.role === "admin");
    res.json({ ...exported.payload, dataHash: exported.dataHash });
  });

  app.get("/api/predictions/snapshots", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ snapshots: NO_PERSIST ? [] : listPredictionLedgerSnapshots() });
  });

  app.get("/api/predictions/snapshots/:version", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (NO_PERSIST) return res.status(404).json({ error: "snapshot_not_found" });
    const snapshot = loadPredictionLedgerSnapshot(String(req.params.version || ""));
    if (!snapshot) return res.status(404).json({ error: "snapshot_not_found" });
    res.json(snapshot);
  });

  app.post("/api/predictions/freeze", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
    const version = String(req.body?.version || "").trim();
    if (!/^[a-zA-Z0-9._-]{1,60}$/.test(version)) {
      return res.status(400).json({ error: "invalid_snapshot_version" });
    }
    const auth = (req as any).auth as RequestAuth;
    const exported = buildPredictionLedgerExport(auth.userId, auth.role === "admin");
    if (exported.payload.contracts.length === 0) {
      return res.status(409).json({ error: "no_prediction_contracts_to_freeze" });
    }
    try {
      persistPredictionLedgerSnapshot({
        version,
        dataHash: exported.dataHash,
        payload: exported.payload,
      });
      recordAuditEvent({
        actor: "local",
        action: "prediction.freeze",
        entityType: "prediction_ledger",
        entityId: version,
        metadata: {
          dataHash: exported.dataHash,
          contractCount: exported.payload.summary.contracts,
        },
      });
      res.status(201).json({
        ok: true,
        version,
        dataHash: exported.dataHash,
        contractCount: exported.payload.summary.contracts,
        reviewCount: exported.payload.summary.contracts
          ? exported.payload.contracts.reduce(
              (sum: number, contract: any) =>
                sum + (Array.isArray(contract?.outcomeReviews) ? contract.outcomeReviews.length : 0),
              0
            )
          : 0,
        createdAt: new Date().toISOString(),
      });
    } catch (error: any) {
      if (String(error?.message || error).includes("UNIQUE")) {
        return res.status(409).json({ error: "snapshot_version_exists" });
      }
      res.status(500).json({ error: "failed_to_freeze_prediction_ledger" });
    }
  });

  app.post("/api/predictions/:id/resolve", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
    const id = String(req.params.id || "").trim();
    const status = String(req.body?.status || "").trim();
    const actualOutcome = String(req.body?.actualOutcome || "").trim();
    const outcomeEvidence = String(req.body?.outcomeEvidence || "").trim();
    const outcomeSourceUrl = String(req.body?.outcomeSourceUrl || "").trim();
    const reviewer = String(req.body?.reviewer || "").trim();
    if (!id || !PREDICTION_RESOLUTION_STATUSES.has(status)) {
      return res.status(400).json({ error: "invalid_prediction_resolution" });
    }
    if (outcomeEvidence.length < 20) {
      return res.status(400).json({ error: "outcome_evidence_too_short" });
    }
    if (reviewer.length < 2) {
      return res.status(400).json({ error: "reviewer_name_required" });
    }
    if (outcomeSourceUrl) {
      try {
        const source = new URL(outcomeSourceUrl);
        if (source.protocol !== "http:" && source.protocol !== "https:") throw new Error("protocol");
      } catch {
        return res.status(400).json({ error: "invalid_outcome_source_url" });
      }
    }
    const result = resolvePredictionContract({
      id,
      status,
      actualOutcome: actualOutcome || outcomeEvidence,
      outcomeEvidence,
      outcomeSourceUrl: outcomeSourceUrl || undefined,
      brierScore: typeof req.body?.brierScore === "number" ? req.body.brierScore : undefined,
      reviewer,
      ownerUserId: (req as any).auth?.userId,
      includeAll: (req as any).auth?.role === "admin",
    });
    if (!result.ok) return res.status(result.reason === "not_found" ? 404 : 409).json(result);
    recordAuditEvent({
      actor: reviewer,
      action: "prediction.resolve",
      entityType: "prediction_contract",
      entityId: id,
      metadata: { status, brierScore: req.body?.brierScore ?? null, hasEvidenceLink: Boolean(outcomeSourceUrl) },
    });
    res.json(result);
  });

  app.post("/api/predictions/:id/reviews", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
    const contractId = String(req.params.id || "").trim();
    const reviewer = String(req.body?.reviewer || "").trim();
    const decision = String(req.body?.decision || "").trim();
    const notes = String(req.body?.notes || "").trim();
    if (!contractId || reviewer.length < 2 || !["confirm", "dispute"].includes(decision)) {
      return res.status(400).json({ error: "invalid_prediction_review" });
    }
    const result = recordPredictionOutcomeReview({
      contractId,
      reviewer,
      decision: decision as "confirm" | "dispute",
      notes,
      ownerUserId: (req as any).auth?.userId,
      includeAll: (req as any).auth?.role === "admin",
    });
    if (!result.ok) return res.status(result.reason === "not_found" ? 404 : 409).json(result);
    recordAuditEvent({
      actor: reviewer,
      action: "prediction.review",
      entityType: "prediction_contract",
      entityId: contractId,
      metadata: { decision, hasNotes: Boolean(notes) },
    });
    res.status(201).json(result);
  });

  app.delete("/api/predictions/:id", applyRateLimit, (req, res) => {
    if (NO_PERSIST) return res.status(503).json({ error: "prediction_ledger_persistence_disabled" });
    const deleted = deletePendingPredictionContract(
      String(req.params.id || ""),
      (req as any).auth?.userId,
      (req as any).auth?.role === "admin"
    );
    if (!deleted) return res.status(409).json({ error: "resolved_contract_is_immutable" });
    recordAuditEvent({
      actor: "local",
      action: "prediction.delete",
      entityType: "prediction_contract",
      entityId: String(req.params.id || ""),
    });
    res.json({ ok: true });
  });
}
