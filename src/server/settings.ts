import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { defaultEnabledFeedUrls, mergeEnableFeedUrls } from "../shared/qualityFeedPresets";

/**  bump when new enabledByDefault presets must land on existing installs without wiping customs */
export const FEEDS_PRESET_EPOCH = 2;

dotenv.config();

export type AIChoice = "auto" | "gemini" | "deepseek";

export interface RuntimeSettings {
  aiChoice: AIChoice;
  geminiApiKey: string;
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  geminiModel: string;
  deepseekModel: string;
  feeds: string[];
  /** 已合并到的优质源预设世代；小于 FEEDS_PRESET_EPOCH 时启动合并 enabledByDefault */
  feedsPresetEpoch: number;
  userName: string;
  sectorOverrides: Record<string, { keywords: string[] }>;
}

export const NO_PERSIST = process.env.JIANWEI_NO_SETTINGS === "1";
export const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");
const ENCRYPTION_SECRET = process.env.JIANWEI_SECRET || "";

function encryptValue(value: string): string | null {
  if (!value || !ENCRYPTION_SECRET) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

function decryptValue(payload: string): string {
  if (!payload.startsWith("v1:")) return payload;
  const [, ivB64, tagB64, dataB64] = payload.split(":");
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function encryptedFieldName(name: string): string {
  return `${name}Encrypted`;
}

function defaultSettings(): RuntimeSettings {
  return {
    aiChoice: (process.env.AI_PROVIDER as AIChoice | undefined) || "auto",
    geminiApiKey:
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
        ? process.env.GEMINI_API_KEY
        : "",
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    feeds: (process.env.NEWS_FEED_URLS || "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean).length > 0
      ? (process.env.NEWS_FEED_URLS || "").split(",").map((u) => u.trim()).filter(Boolean)
      : defaultEnabledFeedUrls(),
    feedsPresetEpoch: FEEDS_PRESET_EPOCH,
    userName: "",
    sectorOverrides: {},
  };
}

function loadSettings(): RuntimeSettings {
  const base = defaultSettings();
  if (NO_PERSIST) {
    return { ...base, aiChoice: "auto", geminiApiKey: "", deepseekApiKey: "", feeds: [], feedsPresetEpoch: FEEDS_PRESET_EPOCH };
  }
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) as Partial<RuntimeSettings> & Record<string, unknown>;
      const existingFeeds = Array.isArray(raw?.feeds) ? (raw.feeds as string[]) : base.feeds;
      const savedEpoch = Number(raw?.feedsPresetEpoch || 0);
      let feeds = existingFeeds;
      let feedsPresetEpoch = savedEpoch;
      // 升级合并：只追加缺失的 enabledByDefault（含教育源），不删除用户自定义
      if (savedEpoch < FEEDS_PRESET_EPOCH) {
        feeds = mergeEnableFeedUrls(existingFeeds, defaultEnabledFeedUrls());
        feedsPresetEpoch = FEEDS_PRESET_EPOCH;
      }
      return {
        ...base,
        ...raw,
        geminiApiKey: ENCRYPTION_SECRET
          ? decryptValue(String(raw[encryptedFieldName("geminiApiKey")] || raw.geminiApiKey || ""))
          : String(raw.geminiApiKey || ""),
        deepseekApiKey: ENCRYPTION_SECRET
          ? decryptValue(String(raw[encryptedFieldName("deepseekApiKey")] || raw.deepseekApiKey || ""))
          : String(raw.deepseekApiKey || ""),
        feeds,
        feedsPresetEpoch,
        sectorOverrides:
          raw?.sectorOverrides && typeof raw.sectorOverrides === "object"
            ? raw.sectorOverrides
            : {},
      };
    }
  } catch (e) {
    console.error("settings file unreadable, using defaults:", e);
  }
  return base;
}

export const settings: RuntimeSettings = loadSettings();

export function persistSettings(): void {
  if (NO_PERSIST) return;
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    const payload: Record<string, unknown> = { ...settings };
    if (ENCRYPTION_SECRET) {
      const geminiEnc = encryptValue(settings.geminiApiKey);
      const deepseekEnc = encryptValue(settings.deepseekApiKey);
      delete payload.geminiApiKey;
      delete payload.deepseekApiKey;
      payload[encryptedFieldName("geminiApiKey")] = geminiEnc || "";
      payload[encryptedFieldName("deepseekApiKey")] = deepseekEnc || "";
    } else {
      console.warn("JIANWEI_SECRET is not configured; settings file will keep API keys readable. Add it for at-rest encryption.");
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(payload, null, 2), "utf-8");
    try {
      fs.chmodSync(SETTINGS_FILE, 0o600);
    } catch {
      /* 某些文件系统不支持 POSIX 权限。 */
    }
  } catch (e) {
    console.error("failed to persist settings:", e);
  }
}

export function encryptionConfigured(): boolean {
  return !!ENCRYPTION_SECRET;
}

if (ENCRYPTION_SECRET) {
  // 启动时自动迁移：旧的明文 Key 文件会在下次落盘时转为加密字段。
  persistSettings();
}

export function feedUrls(): string[] {
  return settings.feeds;
}

/**
 * 将内存中已按 FEEDS_PRESET_EPOCH 合并的 feeds 落盘。
 * loadSettings 可能已把教育等 enabledByDefault 追加进 settings.feeds，但尚未写文件。
 */
export function persistMergedQualityFeedsIfNeeded(): boolean {
  if (NO_PERSIST) return false;
  try {
    let prevEpoch = 0;
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) as { feedsPresetEpoch?: number };
      prevEpoch = Number(raw?.feedsPresetEpoch || 0);
    } else {
      prevEpoch = -1;
    }
    if (prevEpoch < FEEDS_PRESET_EPOCH) {
      settings.feedsPresetEpoch = FEEDS_PRESET_EPOCH;
      persistSettings();
      return true;
    }
  } catch (e) {
    console.warn("[settings] persistMergedQualityFeedsIfNeeded failed:", e);
  }
  return false;
}

if (persistMergedQualityFeedsIfNeeded()) {
  console.info(
    `[settings] persisted quality-feed merge epoch=${FEEDS_PRESET_EPOCH}, feeds=${settings.feeds.length}`
  );
}
