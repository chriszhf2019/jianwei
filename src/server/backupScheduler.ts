import fs from "node:fs";
import path from "node:path";
import { backupCorpus, backupDirectory } from "./corpus";
import { listDatabaseBackups, recordAuditEvent } from "./database";
import { NO_PERSIST } from "./settings";

const BACKUP_INTERVAL_MS = Math.max(
  60 * 60 * 1000,
  Number(process.env.JIANWEI_BACKUP_INTERVAL_MS || 24 * 60 * 60 * 1000)
);
const STARTUP_DELAY_MS = Math.max(
  10_000,
  Number(process.env.JIANWEI_BACKUP_STARTUP_DELAY_MS || 5 * 60 * 1000)
);

let running = false;
let lastStatus: {
  at: string;
  status: "success" | "error" | "skipped";
  backupFile?: string;
  error?: string;
} | null = null;

function newestBackupAgeMs(): number | null {
  const directory = backupDirectory();
  if (!fs.existsSync(directory)) return null;
  const latest = fs.readdirSync(directory)
    .filter((file) => file.endsWith(".db"))
    .map((file) => {
      try {
        const manifest = JSON.parse(
          fs.readFileSync(path.join(directory, `${file}.manifest.json`), "utf-8")
        );
        return Date.parse(String(manifest?.createdAt || ""));
      } catch {
        return NaN;
      }
    })
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];
  return latest ? Date.now() - latest : null;
}

export async function runScheduledBackup(force = false): Promise<typeof lastStatus> {
  if (NO_PERSIST) return null;
  if (running) {
    return { at: new Date().toISOString(), status: "skipped", error: "backup_already_running" };
  }
  const age = newestBackupAgeMs();
  if (!force && age !== null && age < BACKUP_INTERVAL_MS - 5 * 60 * 1000) {
    lastStatus = { at: new Date().toISOString(), status: "skipped", error: "recent_backup_exists" };
    return lastStatus;
  }
  running = true;
  try {
    const backupPath = backupCorpus("scheduled");
    if (!backupPath) throw new Error("backup_failed");
    const backupFile = listDatabaseBackups(backupDirectory())[0]?.file;
    lastStatus = {
      at: new Date().toISOString(),
      status: "success",
      backupFile,
    };
    recordAuditEvent({
      actor: "scheduler",
      action: "backup.scheduled",
      entityType: "database_backup",
      entityId: backupFile,
      status: "success",
    });
    return lastStatus;
  } catch (error: any) {
    lastStatus = {
      at: new Date().toISOString(),
      status: "error",
      error: String(error?.message || error),
    };
    recordAuditEvent({
      actor: "scheduler",
      action: "backup.scheduled",
      entityType: "database_backup",
      status: "error",
      metadata: { error: lastStatus.error },
    });
    return lastStatus;
  } finally {
    running = false;
  }
}

export function scheduledBackupStatus() {
  return {
    enabled: !NO_PERSIST,
    intervalMs: BACKUP_INTERVAL_MS,
    startupDelayMs: STARTUP_DELAY_MS,
    running,
    lastStatus,
    newestBackupAgeMs: newestBackupAgeMs(),
  };
}

export function startBackupScheduler(): { initial: NodeJS.Timeout; interval: NodeJS.Timeout } | null {
  if (NO_PERSIST) return null;
  const initial = setTimeout(() => {
    void runScheduledBackup().catch((error) => console.error("scheduled backup failed:", error));
  }, STARTUP_DELAY_MS);
  const interval = setInterval(() => {
    void runScheduledBackup().catch((error) => console.error("scheduled backup failed:", error));
  }, BACKUP_INTERVAL_MS);
  initial.unref?.();
  interval.unref?.();
  return { initial, interval };
}
