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

