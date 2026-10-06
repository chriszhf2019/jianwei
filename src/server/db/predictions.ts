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

